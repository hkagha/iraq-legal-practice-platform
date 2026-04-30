import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  organization_id: string | null;
  first_name: string;
  last_name: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
  email: string;
  phone: string | null;
  role: string;
  avatar_url: string | null;
  job_title: string | null;
  language_preference: string;
  is_active: boolean;
  password_set_by_admin: boolean;
  password_last_changed_at: string | null;
  password_changed_by: string | null;
}

interface Organization {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  logo_url: string | null;
  subscription_tier: string;
  subscription_status: string;
}

interface PortalUser {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string | null;
  full_name_ar: string | null;
  phone: string | null;
  preferred_language: string | null;
  last_selected_org_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organization: Organization | null;
  portalUser: PortalUser | null;
  isLoading: boolean;
  /** True once we've finished checking BOTH profiles and portal_users for the current session. */
  identityResolved: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; code?: string }>;
  signUp: (data: SignUpData) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  /** Re-fetch profile/organization for the current session. Used by impersonation to pick up org swaps. */
  refreshIdentity: () => Promise<void>;
  isRole: (role: string) => boolean;
  getFullName: () => string;
  getInitials: () => string;
}

interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  organizationName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authDebug = (...args: unknown[]) => {
  // Temporary production diagnostics for the staff-login identity race.
  console.log('[AuthContext]', ...args);
};

const summarizeIdentityRow = (row: any) => row ? {
  id: row.id,
  auth_user_id: row.auth_user_id,
  email: row.email,
  role: row.role,
  organization_id: row.organization_id,
  is_active: row.is_active,
} : null;

const errorSummary = (error: unknown) => {
  if (!error) return null;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in error) return String((error as { message?: unknown }).message);
  return String(error);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [portalUser, setPortalUser] = useState<PortalUser | null>(null);
  const [identityResolved, setIdentityResolved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const activityInterval = useRef<NodeJS.Timeout | null>(null);
  const authEventSequence = useRef(0);
  const latestIdentityRun = useRef(0);

  /**
   * Resolve the identity for an authenticated auth.users row. A given auth user
   * is either a staff member (has a row in `profiles`) or a portal user (has a
   * row in `portal_users`). We check both, in that order, and surface whichever
   * exists.
   */
  const resolveIdentity = useCallback(async (userId: string, accessToken?: string) => {
    const runId = ++latestIdentityRun.current;
    authDebug('resolveIdentity:start', { runId, userId, hasAccessToken: Boolean(accessToken) });
    setIdentityResolved(false);

    // Workaround for a race in supabase-js: occasionally the SIGNED_IN event
    // fires before the client has committed the session to its internal getter,
    // so subsequent PostgREST calls go out with the anon key (Authorization)
    // and RLS returns no rows for the user (treating them as anon). When we
    // have the access token from the auth event, attach it explicitly.
    const authedFetch = accessToken
      ? async <T,>(table: string, query: string): Promise<{ data: T | null; status: number; error: string | null }> => {
          const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/${table}?${query}`;
          authDebug('authedFetch:request', { runId, table, query });
          const res = await fetch(url, {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          });
          if (!res.ok) {
            const error = await res.text();
            authDebug('authedFetch:error', { runId, table, status: res.status, error });
            return { data: null, status: res.status, error };
          }
          const arr = await res.json();
          const row = (Array.isArray(arr) && arr.length > 0 ? arr[0] : null) as T | null;
          authDebug('authedFetch:success', { runId, table, status: res.status, row: summarizeIdentityRow(row) });
          return { data: row, status: res.status, error: null };
        }
      : null;

    // Try staff profile first.
    let profileRow: any = null;
    if (authedFetch) {
      authDebug('profile:query:explicit-token', { runId, userId });
      const { data } = await authedFetch<any>('profiles', `select=*&id=eq.${userId}`);
      profileRow = data;
    } else {
      authDebug('profile:query:supabase-client', { runId, userId });
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      authDebug('profile:result:supabase-client', { runId, status, error: error?.message ?? null, row: summarizeIdentityRow(data) });
      profileRow = data;
    }

    if (profileRow && profileRow.role !== 'client') {
      authDebug('profile:branch:staff-found:setProfile', { runId, profile: summarizeIdentityRow(profileRow) });
      setProfile(profileRow as unknown as Profile);
      setPortalUser(null);
      if (profileRow.organization_id) {
        authDebug('organization:query', { runId, organizationId: profileRow.organization_id, usingExplicitToken: Boolean(authedFetch) });
        const { data: org, error: orgError, status: orgStatus } = authedFetch
          ? await authedFetch<any>('organizations', `select=*&id=eq.${profileRow.organization_id}`)
          : await supabase
              .from('organizations')
              .select('*')
              .eq('id', profileRow.organization_id)
              .maybeSingle();
        authDebug('organization:result', { runId, status: orgStatus, error: errorSummary(orgError), found: Boolean(org), organizationId: org?.id ?? null });
        if (org) setOrganization(org as unknown as Organization);
        else setOrganization(null);
      } else {
        authDebug('organization:branch:profile-has-no-org', { runId });
        setOrganization(null);
      }
      authDebug('resolveIdentity:complete:staff', { runId });
      setIdentityResolved(true);
      return { kind: 'staff' as const, profile: profileRow as unknown as Profile };
    }
    authDebug('profile:branch:not-found', { runId, userId });

    // Otherwise check for a portal_users row.
    let portalRow: any = null;
    if (authedFetch) {
      authDebug('portal:query:explicit-token', { runId, userId });
      const { data } = await authedFetch<any>('portal_users', `select=*&auth_user_id=eq.${userId}`);
      portalRow = data;
    } else {
      authDebug('portal:query:supabase-client', { runId, userId });
      const { data, error, status } = await supabase
        .from('portal_users')
        .select('*')
        .eq('auth_user_id', userId)
        .maybeSingle();
      authDebug('portal:result:supabase-client', { runId, status, error: error?.message ?? null, row: summarizeIdentityRow(data) });
      portalRow = data;
    }

    if (portalRow) {
      authDebug('portal:branch:portal-found:setPortalUser', { runId, portalUser: summarizeIdentityRow(portalRow) });
      setPortalUser(portalRow as unknown as PortalUser);
      setProfile(null);
      setOrganization(null);
      authDebug('resolveIdentity:complete:portal', { runId });
      setIdentityResolved(true);
      return { kind: 'portal' as const, portalUser: portalRow as unknown as PortalUser };
    }

    // Neither — orphaned auth user.
    authDebug('resolveIdentity:complete:orphan', { runId, userId });
    setProfile(null);
    setPortalUser(null);
    setOrganization(null);
    setIdentityResolved(true);
    return { kind: 'orphan' as const };
  }, []);

  // Backward-compat alias used by signUp below.
  const fetchProfile = useCallback(
    async (userId: string) => {
      const result = await resolveIdentity(userId);
      return result.kind === 'staff' ? result.profile : null;
    },
    [resolveIdentity],
  );

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const eventId = ++authEventSequence.current;
      authDebug('auth-event:received', {
        eventId,
        event,
        hasSession: Boolean(session),
        userId: session?.user?.id ?? null,
        email: session?.user?.email ?? null,
      });
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Mark identity as unresolved IMMEDIATELY so any consumer effects
        // (e.g. login page segmentation checks) wait until resolveIdentity
        // has populated profile/portalUser. Without this, there is a render
        // window where user is set but profile is still null, identityResolved
        // is still true (from a prior unauthenticated mount), and segmentation
        // logic falsely concludes the user is an orphan.
        authDebug('auth-event:branch:has-user:set-session-user-unresolved', { eventId, event, userId: session.user.id });
        setIdentityResolved(false);
        const token = session.access_token;
        setTimeout(() => {
          authDebug('auth-event:deferred-resolveIdentity', { eventId, event, userId: session.user.id });
          resolveIdentity(session.user.id, token);
        }, 0);
      } else {
        authDebug('auth-event:branch:no-session:clear-identity', { eventId, event });
        setProfile(null);
        setOrganization(null);
        setPortalUser(null);
        setIdentityResolved(true);
      }
      setIsLoading(false);
    });

    // THEN check for existing session
    const getSessionStartedAtEvent = authEventSequence.current;
    authDebug('initial-session:request', { getSessionStartedAtEvent });
    supabase.auth.getSession().then(({ data: { session } }) => {
      authDebug('initial-session:result', {
        getSessionStartedAtEvent,
        latestAuthEvent: authEventSequence.current,
        ignored: authEventSequence.current !== getSessionStartedAtEvent,
        hasSession: Boolean(session),
        userId: session?.user?.id ?? null,
        email: session?.user?.email ?? null,
      });
      if (authEventSequence.current !== getSessionStartedAtEvent) {
        authDebug('initial-session:ignored-stale-result');
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        authDebug('initial-session:branch:has-user:resolveIdentity', { userId: session.user.id });
        resolveIdentity(session.user.id, session.access_token);
      } else {
        authDebug('initial-session:branch:no-session:set-resolved');
        setIdentityResolved(true);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [resolveIdentity]);

  // Update last_active_at every 5 minutes for staff users (portal users don't have a profiles row)
  useEffect(() => {
    if (user && profile) {
      activityInterval.current = setInterval(() => {
        supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', user.id).then(() => {});
      }, 5 * 60 * 1000);
    }
    return () => {
      if (activityInterval.current) clearInterval(activityInterval.current);
    };
  }, [user, profile]);

  const signIn = async (email: string, password: string) => {
    authDebug('signIn:start', { email });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    authDebug('signIn:result', { email, error: error?.message ?? null });
    if (error) return { error: error.message, code: (error as { code?: string }).code };
    return { error: null };
  };

  const signUp = async (data: SignUpData) => {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          role: 'firm_admin',
        },
      },
    });
    if (error) return { error: error.message };
    if (!authData.user) return { error: 'Registration failed' };

    // Create organization
    const slug = data.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: data.organizationName,
        name_ar: data.organizationName,
        slug: `${slug}-${Date.now().toString(36)}`,
        phone: data.phone,
      })
      .select()
      .single();

    if (orgError) return { error: orgError.message };

    // Update profile with org and role
    await supabase
      .from('profiles')
      .update({
        organization_id: org.id,
        role: 'firm_admin',
        phone: data.phone,
      })
      .eq('id', authData.user.id);

    await fetchProfile(authData.user.id);
    return { error: null };
  };

  const signOut = async () => {
    authDebug('signOut:start', { userId: user?.id ?? null, email: user?.email ?? null, hadProfile: Boolean(profile), hadPortalUser: Boolean(portalUser) });
    await supabase.auth.signOut();
    authDebug('signOut:after-auth-signOut:clear-state');
    setUser(null);
    setSession(null);
    setProfile(null);
    setOrganization(null);
    setPortalUser(null);
    setIdentityResolved(true);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    await supabase.from('profiles').update(updates as any).eq('id', user.id);
    await fetchProfile(user.id);
  };

  const isRole = (role: string) => profile?.role === role;

  const getFullName = () => {
    const lang = localStorage.getItem('qanuni_language') || 'en';
    if (profile) {
      if (lang === 'ar' && profile.first_name_ar && profile.last_name_ar) {
        return `${profile.first_name_ar} ${profile.last_name_ar}`;
      }
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (portalUser) {
      if (lang === 'ar' && portalUser.full_name_ar) return portalUser.full_name_ar;
      return portalUser.full_name || portalUser.email;
    }
    return '';
  };

  const getInitials = () => {
    if (profile) {
      const first = profile.first_name?.[0] || '';
      const last = profile.last_name?.[0] || '';
      return (first + last).toUpperCase();
    }
    if (portalUser) {
      const name = portalUser.full_name || portalUser.email || '';
      const parts = name.trim().split(/\s+/);
      const first = parts[0]?.[0] || '';
      const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
      return (first + last).toUpperCase() || (portalUser.email[0] || '').toUpperCase();
    }
    return '';
  };

  const refreshIdentity = useCallback(async () => {
    if (!user) return;
    const token = session?.access_token;
    await resolveIdentity(user.id, token);
  }, [user, session, resolveIdentity]);

  return (
    <AuthContext.Provider value={{
      user, session, profile, organization, portalUser, isLoading, identityResolved,
      signIn, signUp, signOut, updateProfile, refreshIdentity,
      isRole, getFullName, getInitials,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
