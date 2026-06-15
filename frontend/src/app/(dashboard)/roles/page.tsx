'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roles as rolesApi, permissions as permissionsApi } from '@/lib/api';
import type { Role, Permission } from '@/lib/api';
import { Save, Lock, Info, ChevronDown, ChevronRight, Plus, Trash2, Copy, X } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/hooks/useToast';

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

// Permission modules — each perm has an id (numeric) and a name (string)
const PERMISSION_MODULES: Record<string, {
  label: string;
  permissions: Array<{ id: number; name: string; display: string }>;
}> = {
  crm: {
    label: 'CRM',
    permissions: [
      { id: 1,  name: 'crm.view',    display: 'View' },
      { id: 2,  name: 'crm.create',  display: 'Create' },
      { id: 3,  name: 'crm.edit',    display: 'Edit' },
      { id: 4,  name: 'crm.delete',  display: 'Delete' },
    ],
  },
  clients: {
    label: 'Clients',
    permissions: [
      { id: 5,  name: 'clients.view',   display: 'View' },
      { id: 6,  name: 'clients.create', display: 'Create' },
      { id: 7,  name: 'clients.edit',   display: 'Edit' },
      { id: 8,  name: 'clients.delete', display: 'Delete' },
    ],
  },
  quotes: {
    label: 'Quotes',
    permissions: [
      { id: 9,  name: 'quotes.view',    display: 'View' },
      { id: 10, name: 'quotes.create',  display: 'Create' },
      { id: 11, name: 'quotes.edit',    display: 'Edit' },
      { id: 12, name: 'quotes.approve', display: 'Approve' },
    ],
  },
  invoices: {
    label: 'Invoices',
    permissions: [
      { id: 13, name: 'invoices.view',   display: 'View' },
      { id: 14, name: 'invoices.create', display: 'Create' },
      { id: 15, name: 'invoices.edit',   display: 'Edit' },
      { id: 16, name: 'invoices.delete', display: 'Delete' },
    ],
  },
  projects: {
    label: 'Projects',
    permissions: [
      { id: 17, name: 'projects.view',   display: 'View' },
      { id: 18, name: 'projects.create', display: 'Create' },
      { id: 19, name: 'projects.edit',   display: 'Edit' },
      { id: 20, name: 'projects.delete', display: 'Delete' },
    ],
  },
  tasks: {
    label: 'Tasks',
    permissions: [
      { id: 21, name: 'tasks.view',   display: 'View' },
      { id: 22, name: 'tasks.create', display: 'Create' },
      { id: 23, name: 'tasks.edit',   display: 'Edit' },
      { id: 24, name: 'tasks.assign', display: 'Assign' },
    ],
  },
  hr: {
    label: 'HR & Payroll',
    permissions: [
      { id: 25, name: 'hr.view',           display: 'View' },
      { id: 26, name: 'hr.manage',         display: 'Manage' },
      { id: 27, name: 'payroll.view',      display: 'View Payroll' },
      { id: 28, name: 'payroll.process',   display: 'Process Payroll' },
    ],
  },
  reports: {
    label: 'Reports',
    permissions: [
      { id: 29, name: 'reports.view',   display: 'View' },
      { id: 30, name: 'reports.export', display: 'Export' },
    ],
  },
  settings: {
    label: 'Settings',
    permissions: [
      { id: 31, name: 'settings.view',   display: 'View' },
      { id: 32, name: 'settings.manage', display: 'Manage' },
    ],
  },
};

// Build a name→id lookup for API calls
const PERM_NAME_TO_ID: Record<string, number> = {};
Object.values(PERMISSION_MODULES).forEach((mod) => {
  mod.permissions.forEach((p) => { PERM_NAME_TO_ID[p.name] = p.id; });
});

// Preset permissions (by name) for each role
const ROLE_PRESET_PERMISSIONS: Record<string, string[]> = {
  founder: Object.values(PERMISSION_MODULES).flatMap((m) => m.permissions.map((p) => p.name)),
  admin:   Object.values(PERMISSION_MODULES).flatMap((m) => m.permissions.map((p) => p.name)),
  project_manager: ['crm.view','clients.view','quotes.view','quotes.create','quotes.edit','invoices.view','projects.view','projects.create','projects.edit','tasks.view','tasks.create','tasks.edit','tasks.assign','reports.view'],
  designer:        ['projects.view','tasks.view','tasks.edit','tasks.create'],
  developer:       ['projects.view','tasks.view','tasks.edit','tasks.create'],
  hr:              ['hr.view','hr.manage','payroll.view','payroll.process','reports.view'],
  accounts:        ['invoices.view','invoices.create','invoices.edit','quotes.view','reports.view','reports.export'],
  sales:           ['crm.view','crm.create','crm.edit','clients.view','quotes.view','quotes.create'],
  client_success:  ['crm.view','clients.view','projects.view','tasks.view'],
  intern:          ['projects.view','tasks.view'],
  viewer:          ['projects.view','reports.view'],
};

export default function RolesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [selectedRole, setSelectedRole] = useState<Role>(MOCK_ROLES[0]);

  // selectedPermissions is a Set<string> of permission *names*
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(ROLE_PRESET_PERMISSIONS[MOCK_ROLES[0].name] || [])
  );

  // Which modules are collapsed
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());

  // Modal State Variables
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Form Fields
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');

  // Load roles data
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      try {
        const res = await rolesApi.list();
        const payload = res.data as any;
        return (Array.isArray(payload) ? payload : (payload?.data ?? [])) as Role[];
      } catch { return MOCK_ROLES; }
    },
  });

  // Sync selected role permissions when rolesData loads or updates
  useEffect(() => {
    if (rolesData && rolesData.length > 0) {
      const current = rolesData.find((r) => r.id === selectedRole.id) || rolesData.find((r) => r.name === selectedRole.name) || rolesData[0];
      setSelectedRole(current);
      if (Array.isArray((current as any).permissions)) {
        const names = (current as any).permissions.map((p: any) => typeof p === 'string' ? p : p.name);
        setSelectedPermissions(new Set(names));
      } else {
        setSelectedPermissions(new Set(ROLE_PRESET_PERMISSIONS[current.name] || []));
      }
    }
  }, [rolesData]);

  // Fetch real permissions from API and build name→id map
  const { data: permissionsData } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      try {
        const res = await permissionsApi.list();
        const payload = res.data as any;
        return (Array.isArray(payload) ? payload : (payload?.data ?? [])) as Permission[];
      } catch { return []; }
    },
  });

  const saveMutation = useMutation({
    mutationFn: (permIds: number[]) => rolesApi.syncPermissions(selectedRole.id, permIds),
    onSuccess: () => {
      showToast('Permissions saved successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to save permissions.', 'error');
    },
  });

  // Create Custom Role
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) => rolesApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      showToast('Role created successfully!', 'success');
      setIsCreateModalOpen(false);
      setNewRoleName('');
      setNewRoleDescription('');
      const created = res.data as Role;
      if (created) {
        setSelectedRole(created);
        setSelectedPermissions(new Set());
      }
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to create role.', 'error');
    }
  });

  // Clone Role
  const cloneMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; sourcePermIds: number[] }) => {
      const res = await rolesApi.create({ name: data.name, description: data.description });
      const newRole = res.data as Role;
      if (newRole && data.sourcePermIds.length > 0) {
        await rolesApi.syncPermissions(newRole.id, data.sourcePermIds);
      }
      return newRole;
    },
    onSuccess: (newRole) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      showToast('Role cloned successfully!', 'success');
      setIsCloneModalOpen(false);
      setNewRoleName('');
      setNewRoleDescription('');
      if (newRole) {
        setSelectedRole(newRole);
      }
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to clone role.', 'error');
    }
  });

  // Delete Custom Role
  const deleteMutation = useMutation({
    mutationFn: (id: number) => rolesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      showToast('Role deleted successfully!', 'success');
      setIsDeleteConfirmOpen(false);
      setSelectedRole(MOCK_ROLES[0]);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to delete role.', 'error');
      setIsDeleteConfirmOpen(false);
    }
  });

  const roles = rolesData || MOCK_ROLES;
  const isSystemRole = SYSTEM_ROLES.includes(selectedRole.name);

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    setSelectedPermissions(new Set(ROLE_PRESET_PERMISSIONS[role.name] || []));
  };

  // Toggle a single permission by name
  const togglePermission = (permName: string) => {
    if (isSystemRole) return;
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permName)) next.delete(permName);
      else next.add(permName);
      return next;
    });
  };

  // Toggle all perms in a module
  const toggleModule = (moduleName: string) => {
    if (isSystemRole) return;
    const modPerms = PERMISSION_MODULES[moduleName].permissions.map((p) => p.name);
    const allChecked = modPerms.every((p) => selectedPermissions.has(p));
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        modPerms.forEach((p) => next.delete(p));
      } else {
        modPerms.forEach((p) => next.add(p));
      }
      return next;
    });
  };

  // Toggle expand/collapse for a module group
  const toggleCollapse = (moduleName: string) => {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleName)) next.delete(moduleName);
      else next.add(moduleName);
      return next;
    });
  };

  // FIX: convert permission NAMES → numeric IDs for the API call
  const handleSave = () => {
    // Build id list from selected permission names
    // Prefer API permissions map if available, otherwise fall back to local PERM_NAME_TO_ID
    const apiPermMap: Record<string, number> = {};
    if (permissionsData && permissionsData.length > 0) {
      permissionsData.forEach((p) => { apiPermMap[p.name] = p.id; });
    }
    const nameToId = Object.keys(apiPermMap).length > 0 ? apiPermMap : PERM_NAME_TO_ID;

    const permIds = [...selectedPermissions]
      .map((name) => nameToId[name])
      .filter((id): id is number => id !== undefined);

    saveMutation.mutate(permIds);
  };

  const checkedCount = selectedPermissions.size;
  const totalCount = Object.values(PERMISSION_MODULES).reduce(
    (acc, m) => acc + m.permissions.length, 0
  );

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
          <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
              {roles.length} Roles
            </p>
            <button
              onClick={() => {
                setNewRoleName('');
                setNewRoleDescription('');
                setIsCreateModalOpen(true);
              }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.25rem',
                fontSize: '0.75rem', fontWeight: 600, padding: '2px 6px', borderRadius: '4px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-subtle)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >
              <Plus size={12} /> Add Role
            </button>
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
                      {role.display_name || role.name}
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
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: selectedRole.color || 'var(--text-muted)',
                  }} />
                  <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedRole.display_name || selectedRole.name}
                  </h2>
                  {isSystemRole && (
                    <span className="badge badge-accent" style={{ gap: '0.25rem', display: 'inline-flex', alignItems: 'center' }}>
                      <Lock size={9} /> System Role
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {checkedCount} of {totalCount} permissions granted
                </p>
                {selectedRole.description && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: 0, fontStyle: 'italic' }}>
                    {selectedRole.description}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                {!isSystemRole && (
                  <button
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.5rem',
                      background: 'none',
                      border: '1px solid var(--danger-subtle)',
                      color: 'var(--danger)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Delete Role"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--danger-subtle)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <button
                  onClick={() => {
                    setNewRoleName(`${selectedRole.name}_copy`);
                    setNewRoleDescription(`Clone of ${selectedRole.display_name || selectedRole.name}. ${selectedRole.description || ''}`);
                    setIsCloneModalOpen(true);
                  }}
                  className="btn btn-secondary"
                  style={{ gap: '0.25rem', display: 'flex', alignItems: 'center' }}
                  title="Clone Role"
                >
                  <Copy size={14} />
                  <span>Clone</span>
                </button>
                <button
                  id="save-permissions"
                  onClick={handleSave}
                  disabled={isSystemRole || saveMutation.isPending}
                  className="btn btn-primary"
                  style={{ gap: '0.5rem', display: 'flex', alignItems: 'center' }}
                >
                  <Save size={15} />
                  {saveMutation.isPending ? 'Saving…' : 'Save Permissions'}
                </button>
              </div>
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
              const allChecked = modPerms.every((p) => selectedPermissions.has(p));
              const someChecked = modPerms.some((p) => selectedPermissions.has(p));
              const checkedInModule = modPerms.filter((p) => selectedPermissions.has(p)).length;
              const isCollapsed = collapsedModules.has(key);

              return (
                <div key={key} className="card" style={{ padding: '0.875rem 1.25rem' }}>
                  {/* Module header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: isCollapsed ? 0 : '0.875rem',
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
                      {/* Permission count badge */}
                      <span style={{
                        fontSize: '0.6875rem', fontWeight: 600,
                        background: checkedInModule > 0 ? 'var(--accent-subtle)' : 'var(--surface-elevated)',
                        color: checkedInModule > 0 ? 'var(--accent)' : 'var(--text-muted)',
                        padding: '1px 6px', borderRadius: '9999px',
                        border: `1px solid ${checkedInModule > 0 ? 'rgba(124,58,237,0.3)' : 'transparent'}`,
                      }}>
                        {checkedInModule}/{modPerms.length}
                      </span>
                    </div>

                    {/* Collapse toggle */}
                    <button
                      onClick={() => toggleCollapse(key)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                        padding: '2px',
                      }}
                      title={isCollapsed ? 'Expand' : 'Collapse'}
                    >
                      {isCollapsed
                        ? <ChevronRight size={15} />
                        : <ChevronDown size={15} />
                      }
                    </button>
                  </div>

                  {/* Permission rows — hidden when collapsed */}
                  {!isCollapsed && (
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
                            background: selectedPermissions.has(perm.name)
                              ? 'var(--accent-subtle)'
                              : 'var(--surface-elevated)',
                            border: `1px solid ${selectedPermissions.has(perm.name) ? 'rgba(124,58,237,0.3)' : 'transparent'}`,
                            cursor: isSystemRole ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            id={`perm-${perm.name}`}
                            checked={selectedPermissions.has(perm.name)}
                            onChange={() => togglePermission(perm.name)}
                            disabled={isSystemRole}
                            style={{ accentColor: 'var(--accent)', width: 13, height: 13 }}
                          />
                          <span style={{
                            fontSize: '0.8125rem',
                            color: selectedPermissions.has(perm.name) ? 'var(--accent)' : 'var(--text-secondary)',
                            fontWeight: selectedPermissions.has(perm.name) ? 500 : 400,
                          }}>
                            {perm.display}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CREATE ROLE MODAL ─────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }} onClick={() => setIsCreateModalOpen(false)}>
          <div style={{
            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '1.5rem', maxWidth: 450, width: '100%',
            boxShadow: 'var(--shadow-lg)', animation: 'slideUp 0.2s ease',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Create Custom Role</h3>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const slug = newRoleName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
              createMutation.mutate({ name: slug, description: newRoleDescription });
            }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Role Key Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. support-agent"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="form-input"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Lowercased and slugified automatically.
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  placeholder="Brief description of the role's purpose..."
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  className="form-input"
                  style={{ minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn btn-primary">
                  {createMutation.isPending ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CLONE ROLE MODAL ──────────────────────────────────────── */}
      {isCloneModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }} onClick={() => setIsCloneModalOpen(false)}>
          <div style={{
            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '1.5rem', maxWidth: 450, width: '100%',
            boxShadow: 'var(--shadow-lg)', animation: 'slideUp 0.2s ease',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Clone Role: {selectedRole.display_name || selectedRole.name}</h3>
              <button onClick={() => setIsCloneModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const slug = newRoleName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
              
              // Get current checked permission IDs
              const apiPermMap: Record<string, number> = {};
              if (permissionsData && permissionsData.length > 0) {
                permissionsData.forEach((p) => { apiPermMap[p.name] = p.id; });
              }
              const nameToId = Object.keys(apiPermMap).length > 0 ? apiPermMap : PERM_NAME_TO_ID;
              const permIds = [...selectedPermissions]
                .map((name) => nameToId[name])
                .filter((id): id is number => id !== undefined);

              cloneMutation.mutate({ name: slug, description: newRoleDescription, sourcePermIds: permIds });
            }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">New Role Key Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. support-agent"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="form-input"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Lowercased and slugified automatically.
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  placeholder="Brief description of the role's purpose..."
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  className="form-input"
                  style={{ minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsCloneModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={cloneMutation.isPending} className="btn btn-primary">
                  {cloneMutation.isPending ? 'Cloning...' : 'Clone Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE ROLE CONFIRM ───────────────────────────────────── */}
      {isDeleteConfirmOpen && (
        <ConfirmModal
          title={`Delete Role: ${selectedRole.display_name || selectedRole.name}`}
          message={`Are you sure you want to permanently delete the custom role '${selectedRole.display_name || selectedRole.name}'? This action cannot be undone and will fail if the role is currently assigned to users.`}
          confirmLabel={deleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
          cancelLabel="Cancel"
          danger={true}
          onConfirm={() => deleteMutation.mutate(selectedRole.id)}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      )}

    </div>
  );
}
