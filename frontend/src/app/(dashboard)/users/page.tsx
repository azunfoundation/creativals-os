'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { users as usersApi, roles as rolesApi, departments as deptApi } from '@/lib/api';
import type { User, Role, Department } from '@/lib/api';
import { getInitials, formatDate } from '@/lib/utils';
import UserFormModal from './components/UserFormModal';

// ── Role Colors ────────────────────────────────────────────────
const ROLE_COLOR_MAP: Record<string, { bg: string; color: string }> = {
  founder:          { bg: 'rgba(124,58,237,0.15)', color: '#a78bfa' },
  admin:            { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
  project_manager:  { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
  designer:         { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  developer:        { bg: 'rgba(239,68,68,0.15)',  color: '#f87171' },
  hr:               { bg: 'rgba(236,72,153,0.15)', color: '#f472b6' },
  accounts:         { bg: 'rgba(20,184,166,0.15)', color: '#2dd4bf' },
};

function RoleBadge({ role }: { role: Role }) {
  const colors = ROLE_COLOR_MAP[role.name] || { bg: 'var(--surface-elevated)', color: 'var(--text-secondary)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px',
      borderRadius: '9999px',
      fontSize: '0.6875rem',
      fontWeight: 600,
      background: colors.bg,
      color: colors.color,
      whiteSpace: 'nowrap',
    }}>
      {role.display_name}
    </span>
  );
}

function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  return (
    <span className={`badge ${status === 'active' ? 'badge-success' : 'badge-muted'}`}>
      {status}
    </span>
  );
}

// ── Mock data for when API is unavailable ─────────────────────
const MOCK_USERS: User[] = [
  { id: 1, name: 'Rahul Sharma', email: 'rahul@creativals.in', employee_id: 'CRE001', roles: [{ id: 1, name: 'founder', display_name: 'Founder' }], departments: [{ id: 1, name: 'Leadership' }], status: 'active', permissions: [], avatar_url: null, phone: '+91 98765 43210' },
  { id: 2, name: 'Priya Singh', email: 'priya@creativals.in', employee_id: 'CRE002', roles: [{ id: 3, name: 'project_manager', display_name: 'Project Manager' }], departments: [{ id: 2, name: 'Projects' }], status: 'active', permissions: [], avatar_url: null },
  { id: 3, name: 'Arjun Kumar', email: 'arjun@creativals.in', employee_id: 'CRE003', roles: [{ id: 4, name: 'designer', display_name: 'Designer' }], departments: [{ id: 3, name: 'Design' }], status: 'active', permissions: [], avatar_url: null },
  { id: 4, name: 'Meera Reddy', email: 'meera@creativals.in', employee_id: 'CRE004', roles: [{ id: 5, name: 'developer', display_name: 'Developer' }], departments: [{ id: 3, name: 'Design' }], status: 'active', permissions: [], avatar_url: null },
  { id: 5, name: 'Vikram Nair', email: 'vikram@creativals.in', employee_id: 'CRE005', roles: [{ id: 7, name: 'accounts', display_name: 'Accounts' }], departments: [{ id: 4, name: 'Finance' }], status: 'inactive', permissions: [], avatar_url: null },
  { id: 6, name: 'Anjali Patel', email: 'anjali@creativals.in', employee_id: 'CRE006', roles: [{ id: 6, name: 'hr', display_name: 'HR Manager' }], departments: [{ id: 5, name: 'HR' }], status: 'active', permissions: [], avatar_url: null },
];

const MOCK_ROLES: Role[] = [
  { id: 1, name: 'founder', display_name: 'Founder' },
  { id: 2, name: 'admin', display_name: 'Admin' },
  { id: 3, name: 'project_manager', display_name: 'Project Manager' },
  { id: 4, name: 'designer', display_name: 'Designer' },
  { id: 5, name: 'developer', display_name: 'Developer' },
  { id: 6, name: 'hr', display_name: 'HR Manager' },
  { id: 7, name: 'accounts', display_name: 'Accounts' },
];

const MOCK_DEPTS: Department[] = [
  { id: 1, name: 'Leadership', members_count: 1 },
  { id: 2, name: 'Projects', members_count: 3 },
  { id: 3, name: 'Design', members_count: 4 },
  { id: 4, name: 'Finance', members_count: 2 },
  { id: 5, name: 'HR', members_count: 1 },
];

// ── Page ───────────────────────────────────────────────────────
export default function UsersPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Fetch users (fallback to mock)
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', { search, statusFilter, deptFilter, roleFilter, page }],
    queryFn: async () => {
      try {
        const res = await usersApi.list({ search, status: statusFilter, page, per_page: 10 });
        return res.data;
      } catch {
        return { data: MOCK_USERS, meta: { current_page: 1, last_page: 1, per_page: 10, total: MOCK_USERS.length } };
      }
    },
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      try {
        const res = await rolesApi.list();
        return res.data as Role[];
      } catch { return MOCK_ROLES; }
    },
  });

  const { data: deptsData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      try {
        const res = await deptApi.list();
        return res.data as Department[];
      } catch { return MOCK_DEPTS; }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteConfirm(null);
    },
  });

  const displayUsers: User[] = usersData?.data || MOCK_USERS;
  const meta = usersData?.meta || { current_page: 1, last_page: 1, total: MOCK_USERS.length };

  // Client-side filter when using mock data
  const filteredUsers = displayUsers.filter((u) => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && u.status !== statusFilter) return false;
    if (deptFilter && !u.departments.some((d) => d.id === Number(deptFilter))) return false;
    if (roleFilter && !u.roles.some((r) => r.id === Number(roleFilter))) return false;
    return true;
  });

  const handleEdit = (user: User) => {
    setEditUser(user);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditUser(null);
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)' }}>User Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage team members, roles, and access.
          </p>
        </div>
        <button
          id="invite-user-btn"
          onClick={() => { setEditUser(null); setModalOpen(true); }}
          className="btn btn-primary"
        >
          <Plus size={16} /> Invite User
        </button>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        marginBottom: '1rem', flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{
            position: 'absolute', left: '0.75rem', top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }} />
          <input
            id="user-search"
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="form-input"
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>

        <Filter size={15} style={{ color: 'var(--text-muted)' }} />

        {/* Status */}
        <select
          id="filter-status"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="form-input"
          style={{ width: 140 }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* Department */}
        <select
          id="filter-dept"
          value={deptFilter}
          onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
          className="form-input"
          style={{ width: 160 }}
        >
          <option value="">All departments</option>
          {(deptsData || MOCK_DEPTS).map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {/* Role */}
        <select
          id="filter-role"
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="form-input"
          style={{ width: 160 }}
        >
          <option value="">All roles</option>
          {(rolesData || MOCK_ROLES).map((r) => (
            <option key={r.id} value={r.id}>{r.display_name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="data-table-wrap">
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8 }} />
              ))}
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-state-icon">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>No users found</p>
            <p style={{ fontSize: '0.875rem' }}>Try adjusting your filters or invite a new user.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Employee ID</th>
                <th>Roles</th>
                <th>Department</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  {/* Avatar + Name */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="avatar avatar-md">
                        {user.avatar_url
                          ? <img src={user.avatar_url} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          : getInitials(user.name)
                        }
                      </div>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{user.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{user.email}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                    {user.employee_id || '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      {user.roles.map((r) => <RoleBadge key={r.id} role={r} />)}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {user.departments[0]?.name || '—'}
                  </td>
                  <td><StatusBadge status={user.status} /></td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem' }}>
                      <button
                        id={`edit-user-${user.id}`}
                        onClick={() => handleEdit(user)}
                        className="btn btn-ghost btn-sm btn-icon"
                        title="Edit user"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        id={`delete-user-${user.id}`}
                        onClick={() => setDeleteConfirm(user.id)}
                        className="btn btn-danger btn-sm btn-icon"
                        title="Delete user"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta.last_page > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: '1rem',
          padding: '0 0.25rem',
        }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Showing {filteredUsers.length} of {meta.total} users
          </span>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.current_page === 1}
              className="btn btn-secondary btn-sm"
            >
              <ChevronLeft size={14} />
            </button>
            {[...Array(meta.last_page)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className="btn btn-sm"
                style={{
                  background: meta.current_page === i + 1 ? 'var(--accent)' : 'var(--surface-elevated)',
                  color: meta.current_page === i + 1 ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
              disabled={meta.current_page === meta.last_page}
              className="btn btn-secondary btn-sm"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm !== null && (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <span className="modal-title">Delete User?</span>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                This action cannot be undone. The user will lose all access to Creativals OS.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button
                className="btn btn-danger"
                style={{ background: 'var(--danger)', color: '#fff' }}
                onClick={() => deleteMutation.mutate(deleteConfirm)}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {modalOpen && (
        <UserFormModal
          user={editUser}
          roles={rolesData || MOCK_ROLES}
          departments={deptsData || MOCK_DEPTS}
          onClose={handleCloseModal}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            handleCloseModal();
          }}
        />
      )}
    </div>
  );
}
