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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organization: Organization | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (data: SignUpData) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const activityInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) {
      setProfile(data as unknown as Profile);
      if (data.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', data.organization_id)
          .single();
        if (org) setOrganization(org as unknown as Organization);
      }
    }
    return data as unknown as Profile | null;
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Use setTimeout to avoid deadlocks with Supabase
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setProfile(null);
        setOrganization(null);
      }
      setIsLoading(false);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Update last_active_at every 5 minutes
  useEffect(() => {
    if (user) {
      activityInterval.current = setInterval(() => {
        supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', user.id).then(() => {});
      }, 5 * 60 * 1000);
    }
    return () => {
      if (activityInterval.current) clearInterval(activityInterval.current);
    };
  }, [user]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
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
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setOrganization(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    await supabase.from('profiles').update(updates as any).eq('id', user.id);
    await fetchProfile(user.id);
  };

  const isRole = (role: string) => profile?.role === role;

  const getFullName = () => {
    if (!profile) return '';
    const lang = localStorage.getItem('qanuni_language') || 'en';
    if (lang === 'ar' && profile.first_name_ar && profile.last_name_ar) {
      return `${profile.first_name_ar} ${profile.last_name_ar}`;
    }
    return `${profile.first_name} ${profile.last_name}`;
  };

  const getInitials = () => {
    if (!profile) return '';
    const first = profile.first_name?.[0] || '';
    const last = profile.last_name?.[0] || '';
    return (first + last).toUpperCase();
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, organization, isLoading,
      signIn, signUp, signOut, updateProfile,
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
