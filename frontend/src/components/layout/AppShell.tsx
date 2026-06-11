'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard, Users, Building2, Package, FileText, Receipt,
  FolderKanban, CheckSquare, Clock, Calendar, CreditCard,
  Banknote, BarChart3, Settings, ChevronLeft, ChevronRight,
  Search, Bell, Sun, Moon, LogOut, User, ChevronDown,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { alerts as alertsApi } from '@/lib/api';
import AlertsDrawer from './AlertsDrawer';

const NAV_ITEMS = [
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
  { label: 'Settings',    icon: Settings,         href: '/settings' },
];

interface AlertsDrawerProps {
  open: boolean;
  onClose: () => void;
}

// Lazy import placeholder to avoid circular deps
function AlertsBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span style={{
      position: 'absolute', top: '-4px', right: '-4px',
      minWidth: 18, height: 18,
      background: 'var(--danger)',
      color: '#fff',
      borderRadius: '9999px',
      fontSize: '0.625rem',
      fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 4px',
      border: '2px solid var(--surface)',
    }}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();

  const [collapsed, setCollapsed] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const { data: alerts = [] } = useQuery<any[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      try {
        const res = await alertsApi.list();
        const payload = res.data as any;
        if (payload && Array.isArray(payload.data)) {
          return payload.data;
        }
        return Array.isArray(payload) ? payload : [];
      } catch {
        return [];
      }
    },
    refetchInterval: 30000,
  });
  const unreadCount = alerts.filter((a) => !a.read).length;
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Ctrl+K global listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((p) => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const sidebarWidth = collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)';

  return (
    <>
      <div className="app-shell">
        {/* ── Sidebar ── */}
        <aside
          style={{
            width: sidebarWidth,
            background: 'var(--surface)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'hidden',
            transition: 'width 0.3s ease',
          }}
        >
          {/* Logo */}
          <div style={{
            height: 'var(--topbar-height)',
            display: 'flex',
            alignItems: 'center',
            padding: collapsed ? '0 1rem' : '0 1.25rem',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
            gap: '0.75rem',
            overflow: 'hidden',
          }}>
            <div style={{
              width: 32, height: 32, minWidth: 32,
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              borderRadius: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(124,58,237,0.4)',
            }}>
              <LayoutDashboard size={15} color="#fff" />
            </div>
            {!collapsed && (
              <span style={{
                fontSize: '1rem', fontWeight: 700,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.02em',
              }}>
                Creativals OS
              </span>
            )}
          </div>

          {/* Nav */}
          <nav style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}>
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: collapsed ? '0.5rem' : '0.5rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    background: isActive ? 'var(--accent-subtle)' : 'transparent',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = 'var(--surface-elevated)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  <item.icon size={17} style={{ flexShrink: 0 }} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Collapse toggle */}
          <div style={{
            padding: '0.75rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}>
            {/* User info */}
            {user && !collapsed && (
              <div style={{
                display: 'flex', alignItems: 'center',
                gap: '0.625rem',
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}>
                <div className="avatar avatar-sm" style={{ flexShrink: 0 }}>
                  {user.avatar_url
                    ? <img src={user.avatar_url} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    : getInitials(user.name)
                  }
                </div>
                <div style={{ overflow: 'hidden', minWidth: 0 }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.roles[0]?.display_name || 'User'}
                  </div>
                </div>
              </div>
            )}

            {/* Collapse button */}
            <button
              onClick={() => setCollapsed((p) => !p)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-muted)',
                background: 'none', border: 'none',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                transition: 'all 0.15s ease',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--surface-elevated)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'none';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
              }}
            >
              {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
            </button>
          </div>
        </aside>

        {/* ── Main Area ── */}
        <div className="main-area">
          {/* Topbar */}
          <header className="topbar">
            {/* Search */}
            <button
              id="cmd-palette-trigger"
              onClick={() => setCmdOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.4rem 0.875rem',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-muted)',
                fontSize: '0.875rem',
                cursor: 'pointer',
                minWidth: 220,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              }}
            >
              <Search size={15} />
              <span style={{ flex: 1, textAlign: 'left' }}>Search…</span>
              <kbd style={{
                display: 'inline-flex', alignItems: 'center', gap: '2px',
                padding: '1px 6px',
                background: 'var(--border)',
                borderRadius: 4,
                fontSize: '0.6875rem',
                fontFamily: 'monospace',
                color: 'var(--text-muted)',
              }}>⌘K</kbd>
            </button>

            <div style={{ flex: 1 }} />

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              {/* Theme toggle */}
              <button
                id="theme-toggle"
                onClick={toggleTheme}
                title="Toggle theme"
                className="btn btn-ghost btn-icon"
              >
                {mounted && resolvedTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>

              {/* Notifications */}
              <button
                id="alerts-bell"
                onClick={() => setAlertsOpen(true)}
                className="btn btn-ghost btn-icon"
                style={{ position: 'relative' }}
                title="Notifications"
              >
                <Bell size={17} />
                <AlertsBadge count={unreadCount} />
              </button>

              {/* User Menu */}
              <div style={{ position: 'relative' }}>
                <button
                  id="user-menu-trigger"
                  onClick={() => setUserMenuOpen((p) => !p)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.25rem 0.5rem 0.25rem 0.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'none', border: '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--surface-elevated)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'none';
                    (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                  }}
                >
                  <div className="avatar avatar-sm">
                    {user?.avatar_url
                      ? <img src={user.avatar_url} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      : getInitials(user?.name || 'U')
                    }
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {user?.name?.split(' ')[0] || 'User'}
                  </span>
                  <ChevronDown size={14} />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                      width: 200,
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-lg)',
                      zIndex: 50,
                      overflow: 'hidden',
                      animation: 'slideDown 0.15s ease',
                    }}>
                      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</div>
                      </div>
                      <div style={{ padding: '0.375rem' }}>
                        <Link
                          href="/settings/profile"
                          onClick={() => setUserMenuOpen(false)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.625rem',
                            padding: '0.5rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-secondary)',
                            fontSize: '0.875rem',
                            textDecoration: 'none',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
                        >
                          <User size={15} /> Profile
                        </Link>
                        <button
                          id="logout-btn"
                          onClick={handleLogout}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.625rem',
                            padding: '0.5rem 0.75rem', width: '100%',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--danger)',
                            fontSize: '0.875rem',
                            background: 'none', border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--danger-subtle)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <LogOut size={15} /> Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="page-content">
            {children}
          </main>
        </div>
      </div>

      {/* ── Command Palette ── */}
      {cmdOpen && (
        <CommandPaletteInline
          onClose={() => setCmdOpen(false)}
          onNavigate={(href) => { setCmdOpen(false); router.push(href); }}
        />
      )}

      {/* ── Alerts Drawer ── */}
      {alertsOpen && (
        <AlertsDrawer
          open={alertsOpen}
          onClose={() => setAlertsOpen(false)}
        />
      )}
    </>
  );
}

// ── Inline Command Palette ──────────────────────────────────────
function CommandPaletteInline({ onClose, onNavigate }: { onClose: () => void; onNavigate: (href: string) => void }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const QUICK_ACTIONS = [
    { label: 'New Lead', desc: 'Create a CRM lead', href: '/crm/new' },
    { label: 'New Quote', desc: 'Draft a quote', href: '/quotes/new' },
    { label: 'New Invoice', desc: 'Create an invoice', href: '/invoices/new' },
    { label: 'New Project', desc: 'Start a project', href: '/projects/new' },
    { label: 'New Task', desc: 'Add a task', href: '/tasks/new' },
  ];

  const filteredNav = NAV_ITEMS.filter((n) =>
    n.label.toLowerCase().includes(query.toLowerCase())
  );
  const filteredActions = QUICK_ACTIONS.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.desc.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="cmdk-overlay"
      onClick={onClose}
    >
      <div
        className="cmdk-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.875rem 1rem',
          borderBottom: '1px solid var(--border)',
        }}>
          <Search size={17} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
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
                  onClick={() => onNavigate(item.href)}
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
                  onClick={() => onNavigate(action.href)}
                />
              ))}
            </CmdGroup>
          )}

          {filteredNav.length === 0 && filteredActions.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No results for &quot;{query}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CmdGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.25rem' }}>
      <div style={{ padding: '0.375rem 0.75rem', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function CmdItem({ label, desc, icon, onClick }: { label: string; desc?: string; icon?: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        width: '100%', padding: '0.5rem 0.75rem',
        borderRadius: 'var(--radius-sm)',
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-primary)', fontSize: '0.9rem',
        textAlign: 'left', transition: 'all 0.1s ease',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-elevated)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {icon && <span style={{ color: 'var(--text-secondary)', display: 'flex' }}>{icon}</span>}
      <div>
        <div>{label}</div>
        {desc && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{desc}</div>}
      </div>
    </button>
  );
}

// ── Inline Alerts Drawer ────────────────────────────────────────
const MOCK_ALERTS = [
  { id: 1, type: 'info', title: 'Invoice #INV-0042 overdue', body: 'Apex Designs has an invoice overdue by 7 days.', time: '2h ago', read: false },
  { id: 2, type: 'success', title: 'Project delivered', body: 'Brand Identity for NovaTech marked as complete.', time: '5h ago', read: false },
  { id: 3, type: 'warning', title: 'Leave request pending', body: 'Ravi Kumar has a leave request awaiting approval.', time: '1d ago', read: false },
  { id: 4, type: 'info', title: 'New quote viewed', body: 'Client opened Quote #Q-0019.', time: '2d ago', read: true },
  { id: 5, type: 'success', title: 'Payroll processed', body: 'June payroll has been processed successfully.', time: '3d ago', read: true },
];

const ALERT_COLORS: Record<string, string> = {
  info: 'var(--info)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
};

function AlertsDrawerInline({ onClose }: { onClose: () => void }) {
  const [alerts, setAlerts] = useState(MOCK_ALERTS);

  const markAllRead = () => setAlerts((a) => a.map((al) => ({ ...al, read: true })));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 60 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 380,
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        zIndex: 61,
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s ease',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.25rem 1rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Notifications</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {alerts.filter((a) => !a.read).length} unread
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={markAllRead}
              style={{ fontSize: '0.75rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
            >
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-icon"
              style={{ padding: '0.25rem' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {alerts.length === 0 ? (
            <div className="empty-state">
              <Bell size={40} style={{ opacity: 0.3 }} />
              <span>No notifications</span>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  display: 'flex', gap: '0.75rem',
                  padding: '0.875rem',
                  borderRadius: 'var(--radius-md)',
                  background: alert.read ? 'transparent' : 'var(--surface-elevated)',
                  marginBottom: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: '1px solid transparent',
                }}
                onClick={() => setAlerts((a) => a.map((al) => al.id === alert.id ? { ...al, read: true } : al))}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: alert.read ? 'transparent' : 'var(--accent)',
                  marginTop: '0.375rem',
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: alert.read ? 400 : 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {alert.title}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {alert.body}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
                    {alert.time}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
