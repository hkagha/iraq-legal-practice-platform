import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/utils';
import {
  Building, Palette, Receipt, Hash, Users, Shield, Mail,
  User, Lock, Bell, Globe, CreditCard, Download, AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GeneralSettings from '@/components/settings/GeneralSettings';
import BrandingSettings from '@/components/settings/BrandingSettings';
import BillingConfigSettings from '@/components/settings/BillingConfigSettings';
import NumberingSettings from '@/components/settings/NumberingSettings';
import PlaceholderPage from '@/components/PlaceholderPage';

type SectionKey = 
  | 'general' | 'branding' | 'billingConfig' | 'numbering'
  | 'teamMembers' | 'rolesPermissions' | 'invitations'
  | 'myProfile' | 'security' | 'notificationPrefs' | 'languageAppearance'
  | 'subscription' | 'dataExport' | 'dangerZone';

interface NavItem {
  key: SectionKey;
  icon: React.ElementType;
  adminOnly?: boolean;
}

interface NavGroup {
  groupKey: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    groupKey: 'organization',
    items: [
      { key: 'general', icon: Building },
      { key: 'branding', icon: Palette },
      { key: 'billingConfig', icon: Receipt },
      { key: 'numbering', icon: Hash },
    ],
  },
  {
    groupKey: 'team',
    items: [
      { key: 'teamMembers', icon: Users },
      { key: 'rolesPermissions', icon: Shield },
      { key: 'invitations', icon: Mail },
    ],
  },
  {
    groupKey: 'personal',
    items: [
      { key: 'myProfile', icon: User },
      { key: 'security', icon: Lock },
      { key: 'notificationPrefs', icon: Bell },
      { key: 'languageAppearance', icon: Globe },
    ],
  },
  {
    groupKey: 'system',
    items: [
      { key: 'subscription', icon: CreditCard, adminOnly: true },
      { key: 'dataExport', icon: Download, adminOnly: true },
      { key: 'dangerZone', icon: AlertTriangle, adminOnly: true },
    ],
  },
];

export default function SettingsPage() {
  const { language, isRTL, t } = useLanguage();
  const { isRole } = useAuth();
  const [activeSection, setActiveSection] = useState<SectionKey>('general');
  const isAdmin = isRole('firm_admin');

  const getLabel = (key: string) => t(`settings.sections.${key}`);
  const getGroupLabel = (key: string) => t(`settings.groups.${key}`);

  const filteredGroups = navGroups.map(g => ({
    ...g,
    items: g.items.filter(item => !item.adminOnly || isAdmin),
  })).filter(g => g.items.length > 0);

  const allItems = filteredGroups.flatMap(g => g.items);

  const renderContent = () => {
    switch (activeSection) {
      case 'general': return <GeneralSettings />;
      case 'branding': return <BrandingSettings />;
      case 'billingConfig': return <BillingConfigSettings />;
      case 'numbering': return <NumberingSettings />;
      default:
        const item = allItems.find(i => i.key === activeSection);
        return (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {item && <item.icon size={48} className="text-muted-foreground mb-4" />}
            <h3 className="text-heading-lg text-foreground mb-2">{getLabel(activeSection)}</h3>
            <p className="text-body-md text-muted-foreground">{t('placeholder.comingSoon')}</p>
          </div>
        );
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        titleAr="الإعدادات"
        subtitle="Manage your organization, team, and preferences"
        subtitleAr="إدارة مؤسستك وفريقك وتفضيلاتك"
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Settings', labelAr: 'الإعدادات' },
        ]}
      />

      {/* Mobile: dropdown selector */}
      <div className="md:hidden mb-6">
        <Select value={activeSection} onValueChange={(v) => setActiveSection(v as SectionKey)}>
          <SelectTrigger className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filteredGroups.map(group => (
              <React.Fragment key={group.groupKey}>
                <div className="px-3 py-1.5 text-body-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {getGroupLabel(group.groupKey)}
                </div>
                {group.items.map(item => (
                  <SelectItem key={item.key} value={item.key} className="h-10 ps-6">
                    {getLabel(item.key)}
                  </SelectItem>
                ))}
              </React.Fragment>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-0 md:gap-0">
        {/* Desktop sidebar */}
        <nav className={cn(
          'hidden md:block w-60 shrink-0 bg-card rounded-lg p-4',
          isRTL ? 'border-s border-border' : 'border-e border-border',
        )}>
          {filteredGroups.map((group, gi) => (
            <div key={group.groupKey} className={cn(gi > 0 && 'mt-6')}>
              <div className="text-body-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                {getGroupLabel(group.groupKey)}
              </div>
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activeSection === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveSection(item.key)}
                    className={cn(
                      'w-full flex items-center gap-2.5 h-9 px-3 rounded-md text-body-md transition-colors',
                      isActive
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )}
                  >
                    <Icon size={16} />
                    <span>{getLabel(item.key)}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Content area */}
        <div className="flex-1 md:ps-8 max-w-3xl">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
