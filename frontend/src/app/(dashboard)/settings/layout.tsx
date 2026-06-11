'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Sliders, Users, FileSpreadsheet, Database, User } from 'lucide-react';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { label: 'My Profile', href: '/settings/profile', icon: User },
    { label: 'General Settings', href: '/settings/general', icon: Building2 },
    { label: 'Number Sequences', href: '/settings/sequences', icon: Sliders },
    { label: 'CRM Configuration', href: '/settings/crm', icon: Users },
    { label: 'Audit Logs', href: '/settings/audits', icon: FileSpreadsheet },
    { label: 'Backups & Recovery', href: '/settings/backups', icon: Database },
  ];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Settings Navigation Tabs */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '0.25rem', 
          borderBottom: '1px solid var(--border)', 
          marginBottom: '2rem',
          paddingBottom: '2px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.875rem',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Settings Page Content */}
      <div>{children}</div>
    </div>
  );
}
