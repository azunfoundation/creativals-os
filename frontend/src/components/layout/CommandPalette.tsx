'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Building2, Package, FileText, Receipt,
  FolderKanban, CheckSquare, Clock, Calendar, CreditCard,
  Banknote, BarChart3, Settings, Search, UserCog, ShieldCheck,
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',   icon: LayoutDashboard, href: '/dashboard' },
  { label: 'CRM',         icon: Users,           href: '/crm' },
  { label: 'Clients',     icon: Building2,        href: '/clients' },
  { label: 'Services',    icon: Package,          href: '/services' },
  { label: 'Quotes',      icon: FileText,         href: '/quotes' },
  { label: 'Invoices',    icon: Receipt,          href: '/invoices' },
  { label: 'Projects',    icon: FolderKanban,     href: '/projects' },
  { label: 'Tasks',       icon: CheckSquare,      href: '/tasks' },
  { label: 'Timesheets',  icon: Clock,            href: '/timesheets' },
  { label: 'Attendance',  icon: Calendar,         href: '/attendance' },
  { label: 'Expenses',    icon: CreditCard,       href: '/expenses' },
  { label: 'Payroll',     icon: Banknote,         href: '/payroll' },
  { label: 'Reports',     icon: BarChart3,        href: '/reports' },
  { label: 'Users',       icon: UserCog,          href: '/users' },
  { label: 'Roles',       icon: ShieldCheck,      href: '/roles' },
  { label: 'Settings',    icon: Settings,         href: '/settings' },
];

const QUICK_ACTIONS = [
  { label: 'New Lead',    desc: 'Create a CRM lead',  href: '/crm/new' },
  { label: 'New Quote',   desc: 'Draft a quote',       href: '/quotes/new' },
  { label: 'New Invoice', desc: 'Create an invoice',   href: '/invoices/new' },
  { label: 'New Project', desc: 'Start a project',     href: '/projects/new' },
  { label: 'New Task',    desc: 'Add a task',          href: '/tasks/new' },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  // Global Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (!open) {
          // parent should handle this
        }
      }
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Reset query on open
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const navigate = useCallback((href: string) => {
    onClose();
    router.push(href);
  }, [onClose, router]);

  if (!open) return null;

  const filteredNav = NAV_ITEMS.filter((n) =>
    n.label.toLowerCase().includes(query.toLowerCase())
  );
  const filteredActions = QUICK_ACTIONS.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.desc.toLowerCase().includes(query.toLowerCase())
  );
  const hasResults = filteredNav.length > 0 || filteredActions.length > 0;

  return (
    <div
      className="cmdk-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="cmdk-modal"
        onClick={(e) => e.stopPropagation()}
        role="search"
      >
        {/* Input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.875rem 1rem',
          borderBottom: '1px solid var(--border)',
        }}>
          <Search size={17} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            id="command-palette-input"
            autoFocus
            type="text"
            placeholder="Search pages, actions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'none', border: 'none', outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '1rem',
            }}
          />
          <kbd style={{
            padding: '2px 8px',
            background: 'var(--border)',
            borderRadius: 4,
            fontSize: '0.6875rem',
            color: 'var(--text-muted)',
            fontFamily: 'monospace',
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0.5rem' }}>
          {filteredNav.length > 0 && (
            <CmdGroup label="Navigation">
              {filteredNav.map((item) => (
                <CmdItem
                  key={item.href}
                  label={item.label}
                  icon={<item.icon size={15} />}
                  onClick={() => navigate(item.href)}
                />
              ))}
            </CmdGroup>
          )}

          {filteredActions.length > 0 && (
            <CmdGroup label="Quick Actions">
              {filteredActions.map((action) => (
                <CmdItem
                  key={action.href}
                  label={action.label}
                  desc={action.desc}
                  onClick={() => navigate(action.href)}
                />
              ))}
            </CmdGroup>
          )}

          {!hasResults && (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
            }}>
              No results for &quot;{query}&quot;
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: '0.625rem 1rem',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '1rem',
        }}>
          {[
            { key: '↑↓', label: 'Navigate' },
            { key: '↵', label: 'Open' },
            { key: 'ESC', label: 'Close' },
          ].map((hint) => (
            <div key={hint.key} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <kbd style={{
                padding: '1px 6px',
                background: 'var(--border)',
                borderRadius: 3,
                fontSize: '0.625rem',
                fontFamily: 'monospace',
                color: 'var(--text-secondary)',
              }}>{hint.key}</kbd>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{hint.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CmdGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.25rem' }}>
      <div style={{
        padding: '0.375rem 0.75rem',
        fontSize: '0.6875rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function CmdItem({
  label, desc, icon, onClick,
}: {
  label: string;
  desc?: string;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        width: '100%', padding: '0.5rem 0.75rem',
        borderRadius: 'var(--radius-sm)',
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-primary)', fontSize: '0.9rem',
        textAlign: 'left', transition: 'background 0.1s ease',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-elevated)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {icon && (
        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
      )}
      <div>
        <div>{label}</div>
        {desc && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{desc}</div>}
      </div>
    </button>
  );
}
