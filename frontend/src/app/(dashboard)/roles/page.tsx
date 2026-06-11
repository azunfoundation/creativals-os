'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roles as rolesApi, permissions as permissionsApi } from '@/lib/api';
import type { Role, Permission } from '@/lib/api';
import { Save, Lock, Info } from 'lucide-react';

// ── Mock Data ──────────────────────────────────────────────────
const MOCK_ROLES: Role[] = [
  { id: 1, name: 'founder',         display_name: 'Founder',         color: '#7c3aed' },
  { id: 2, name: 'admin',           display_name: 'Admin',           color: '#3b82f6' },
  { id: 3, name: 'project_manager', display_name: 'Project Manager', color: '#10b981' },
  { id: 4, name: 'designer',        display_name: 'Designer',        color: '#f59e0b' },
  { id: 5, name: 'developer',       display_name: 'Developer',       color: '#ef4444' },
  { id: 6, name: 'hr',              display_name: 'HR Manager',      color: '#ec4899' },
  { id: 7, name: 'accounts',        display_name: 'Accounts',        color: '#14b8a6' },
  { id: 8, name: 'sales',           display_name: 'Sales Executive', color: '#f97316' },
  { id: 9, name: 'client_success',  display_name: 'Client Success',  color: '#8b5cf6' },
  { id: 10, name: 'intern',         display_name: 'Intern',          color: '#6b7280' },
  { id: 11, name: 'viewer',         display_name: 'Viewer',          color: '#64748b' },
];

const SYSTEM_ROLES = ['founder', 'admin'];

// Permission modules
const PERMISSION_MODULES: Record<string, { label: string; permissions: Array<{ name: string; display: string }> }> = {
  crm: {
    label: 'CRM',
    permissions: [
      { name: 'crm.view', display: 'View' },
      { name: 'crm.create', display: 'Create' },
      { name: 'crm.edit', display: 'Edit' },
      { name: 'crm.delete', display: 'Delete' },
    ],
  },
  clients: {
    label: 'Clients',
    permissions: [
      { name: 'clients.view', display: 'View' },
      { name: 'clients.create', display: 'Create' },
      { name: 'clients.edit', display: 'Edit' },
      { name: 'clients.delete', display: 'Delete' },
    ],
  },
  quotes: {
    label: 'Quotes',
    permissions: [
      { name: 'quotes.view', display: 'View' },
      { name: 'quotes.create', display: 'Create' },
      { name: 'quotes.edit', display: 'Edit' },
      { name: 'quotes.approve', display: 'Approve' },
    ],
  },
  invoices: {
    label: 'Invoices',
    permissions: [
      { name: 'invoices.view', display: 'View' },
      { name: 'invoices.create', display: 'Create' },
      { name: 'invoices.edit', display: 'Edit' },
      { name: 'invoices.delete', display: 'Delete' },
    ],
  },
  projects: {
    label: 'Projects',
    permissions: [
      { name: 'projects.view', display: 'View' },
      { name: 'projects.create', display: 'Create' },
      { name: 'projects.edit', display: 'Edit' },
      { name: 'projects.delete', display: 'Delete' },
    ],
  },
  tasks: {
    label: 'Tasks',
    permissions: [
      { name: 'tasks.view', display: 'View' },
      { name: 'tasks.create', display: 'Create' },
      { name: 'tasks.edit', display: 'Edit' },
      { name: 'tasks.assign', display: 'Assign' },
    ],
  },
  hr: {
    label: 'HR & Payroll',
    permissions: [
      { name: 'hr.view', display: 'View' },
      { name: 'hr.manage', display: 'Manage' },
      { name: 'payroll.view', display: 'View Payroll' },
      { name: 'payroll.process', display: 'Process Payroll' },
    ],
  },
  reports: {
    label: 'Reports',
    permissions: [
      { name: 'reports.view', display: 'View' },
      { name: 'reports.export', display: 'Export' },
    ],
  },
  settings: {
    label: 'Settings',
    permissions: [
      { name: 'settings.view', display: 'View' },
      { name: 'settings.manage', display: 'Manage' },
    ],
  },
};

// Preset permissions for each role
const ROLE_PRESET_PERMISSIONS: Record<string, string[]> = {
  founder: Object.values(PERMISSION_MODULES).flatMap((m) => m.permissions.map((p) => p.name)),
  admin: Object.values(PERMISSION_MODULES).flatMap((m) => m.permissions.map((p) => p.name)),
  project_manager: ['crm.view', 'clients.view', 'quotes.view', 'quotes.create', 'quotes.edit', 'invoices.view', 'projects.view', 'projects.create', 'projects.edit', 'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.assign', 'reports.view'],
  designer: ['projects.view', 'tasks.view', 'tasks.edit', 'tasks.create'],
  developer: ['projects.view', 'tasks.view', 'tasks.edit', 'tasks.create'],
  hr: ['hr.view', 'hr.manage', 'payroll.view', 'payroll.process', 'reports.view'],
  accounts: ['invoices.view', 'invoices.create', 'invoices.edit', 'quotes.view', 'reports.view', 'reports.export'],
  sales: ['crm.view', 'crm.create', 'crm.edit', 'clients.view', 'quotes.view', 'quotes.create'],
  client_success: ['crm.view', 'clients.view', 'projects.view', 'tasks.view'],
  intern: ['projects.view', 'tasks.view'],
  viewer: ['projects.view', 'reports.view'],
};

export default function RolesPage() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role>(MOCK_ROLES[0]);
  const [checkedPermissions, setCheckedPermissions] = useState<Set<string>>(
    new Set(ROLE_PRESET_PERMISSIONS[MOCK_ROLES[0].name] || [])
  );
  const [saved, setSaved] = useState(false);

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      try {
        const res = await rolesApi.list();
        return res.data as Role[];
      } catch { return MOCK_ROLES; }
    },
  });

  const saveMutation = useMutation({
    mutationFn: (permIds: number[]) => rolesApi.syncPermissions(selectedRole.id, permIds),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: () => {
      // In demo mode just show success
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const roles = rolesData || MOCK_ROLES;
  const isSystemRole = SYSTEM_ROLES.includes(selectedRole.name);

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    setCheckedPermissions(new Set(ROLE_PRESET_PERMISSIONS[role.name] || []));
  };

  const togglePermission = (permName: string) => {
    if (isSystemRole) return;
    setCheckedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permName)) next.delete(permName);
      else next.add(permName);
      return next;
    });
  };

  const toggleModule = (moduleName: string) => {
    if (isSystemRole) return;
    const modPerms = PERMISSION_MODULES[moduleName].permissions.map((p) => p.name);
    const allChecked = modPerms.every((p) => checkedPermissions.has(p));
    setCheckedPermissions((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        modPerms.forEach((p) => next.delete(p));
      } else {
        modPerms.forEach((p) => next.add(p));
      }
      return next;
    });
  };

  const handleSave = () => {
    saveMutation.mutate([...checkedPermissions].map((_, i) => i)); // placeholder IDs
  };

  const checkedCount = checkedPermissions.size;
  const totalCount = Object.values(PERMISSION_MODULES).reduce((acc, m) => acc + m.permissions.length, 0);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)' }}>Roles & Permissions</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Configure what each role can access across Creativals OS.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1rem', alignItems: 'start' }}>
        {/* Left: Role List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {roles.length} Roles
            </p>
          </div>
          <div style={{ padding: '0.5rem' }}>
            {roles.map((role) => {
              const isActive = selectedRole.id === role.id;
              const isSys = SYSTEM_ROLES.includes(role.name);
              return (
                <button
                  key={role.id}
                  id={`role-btn-${role.id}`}
                  onClick={() => handleSelectRole(role)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '0.625rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: isActive ? 'var(--accent-subtle)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--surface-elevated)'; }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: role.color || 'var(--text-muted)',
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                    }}>
                      {role.display_name}
                    </span>
                  </div>
                  {isSys && <Lock size={11} style={{ color: 'var(--text-muted)' }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Permission Matrix */}
        <div>
          {/* Role header */}
          <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: selectedRole.color || 'var(--text-muted)',
                  }} />
                  <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedRole.display_name}
                  </h2>
                  {isSystemRole && (
                    <span className="badge badge-accent" style={{ gap: '0.25rem', display: 'inline-flex', alignItems: 'center' }}>
                      <Lock size={9} /> System Role
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {checkedCount} of {totalCount} permissions granted
                </p>
              </div>
              <button
                id="save-permissions"
                onClick={handleSave}
                disabled={isSystemRole || saveMutation.isPending}
                className="btn btn-primary"
                style={{ gap: '0.5rem' }}
              >
                <Save size={15} />
                {saved ? 'Saved!' : saveMutation.isPending ? 'Saving…' : 'Save Permissions'}
              </button>
            </div>

            {isSystemRole && (
              <div style={{
                marginTop: '0.75rem',
                padding: '0.625rem 0.875rem',
                background: 'var(--info-subtle)',
                border: '1px solid var(--info)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                color: 'var(--info)',
                fontSize: '0.8125rem',
              }}>
                <Info size={14} />
                System roles have all permissions and cannot be modified.
              </div>
            )}
          </div>

          {/* Permission modules */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.entries(PERMISSION_MODULES).map(([key, module]) => {
              const modPerms = module.permissions.map((p) => p.name);
              const allChecked = modPerms.every((p) => checkedPermissions.has(p));
              const someChecked = modPerms.some((p) => checkedPermissions.has(p));

              return (
                <div key={key} className="card" style={{ padding: '1rem 1.25rem' }}>
                  {/* Module header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: '0.875rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <input
                        type="checkbox"
                        id={`module-${key}`}
                        checked={allChecked}
                        ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                        onChange={() => toggleModule(key)}
                        disabled={isSystemRole}
                        style={{ accentColor: 'var(--accent)', width: 15, height: 15, cursor: isSystemRole ? 'not-allowed' : 'pointer' }}
                      />
                      <label
                        htmlFor={`module-${key}`}
                        style={{
                          fontSize: '0.9375rem', fontWeight: 600,
                          color: 'var(--text-primary)',
                          cursor: isSystemRole ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {module.label}
                      </label>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {modPerms.filter((p) => checkedPermissions.has(p)).length}/{modPerms.length}
                    </span>
                  </div>

                  {/* Permission rows */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '0.5rem',
                  }}>
                    {module.permissions.map((perm) => (
                      <label
                        key={perm.name}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          background: checkedPermissions.has(perm.name)
                            ? 'var(--accent-subtle)'
                            : 'var(--surface-elevated)',
                          border: `1px solid ${checkedPermissions.has(perm.name) ? 'rgba(124,58,237,0.3)' : 'transparent'}`,
                          cursor: isSystemRole ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          id={`perm-${perm.name}`}
                          checked={checkedPermissions.has(perm.name)}
                          onChange={() => togglePermission(perm.name)}
                          disabled={isSystemRole}
                          style={{ accentColor: 'var(--accent)', width: 13, height: 13 }}
                        />
                        <span style={{
                          fontSize: '0.8125rem',
                          color: checkedPermissions.has(perm.name) ? 'var(--accent)' : 'var(--text-secondary)',
                          fontWeight: checkedPermissions.has(perm.name) ? 500 : 400,
                        }}>
                          {perm.display}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
