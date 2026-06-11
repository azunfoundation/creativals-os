'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departments as deptApi, users as usersApi } from '@/lib/api';
import type { Department, User } from '@/lib/api';
import { Plus, Edit2, Trash2, X, Users, Check } from 'lucide-react';
import { getInitials } from '@/lib/utils';

// ── Mock Data ──────────────────────────────────────────────────
const DEPT_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6'];

const MOCK_DEPTS: Department[] = [
  { id: 1, name: 'Leadership',       color: '#7c3aed', members_count: 2,  head: { id: 1, name: 'Rahul Sharma',  email: '', roles: [], permissions: [], departments: [], avatar_url: null, status: 'active' } },
  { id: 2, name: 'Design',           color: '#ec4899', members_count: 5,  head: { id: 3, name: 'Arjun Kumar',   email: '', roles: [], permissions: [], departments: [], avatar_url: null, status: 'active' } },
  { id: 3, name: 'Development',      color: '#3b82f6', members_count: 4,  head: { id: 4, name: 'Meera Reddy',   email: '', roles: [], permissions: [], departments: [], avatar_url: null, status: 'active' } },
  { id: 4, name: 'Projects',         color: '#10b981', members_count: 3,  head: { id: 2, name: 'Priya Singh',   email: '', roles: [], permissions: [], departments: [], avatar_url: null, status: 'active' } },
  { id: 5, name: 'Finance',          color: '#f59e0b', members_count: 2,  head: { id: 5, name: 'Vikram Nair',   email: '', roles: [], permissions: [], departments: [], avatar_url: null, status: 'inactive' } },
  { id: 6, name: 'HR & Operations',  color: '#f97316', members_count: 2,  head: { id: 6, name: 'Anjali Patel',  email: '', roles: [], permissions: [], departments: [], avatar_url: null, status: 'active' } },
  { id: 7, name: 'Sales & CRM',      color: '#8b5cf6', members_count: 3,  head: undefined },
  { id: 8, name: 'Client Success',   color: '#14b8a6', members_count: 2,  head: undefined },
];

const MOCK_USERS: User[] = [
  { id: 1, name: 'Rahul Sharma', email: 'rahul@creativals.in', roles: [{ id: 1, name: 'founder', display_name: 'Founder' }], permissions: [], departments: [], avatar_url: null, status: 'active' },
  { id: 2, name: 'Priya Singh',  email: 'priya@creativals.in', roles: [{ id: 3, name: 'pm', display_name: 'Project Manager' }], permissions: [], departments: [], avatar_url: null, status: 'active' },
  { id: 3, name: 'Arjun Kumar',  email: 'arjun@creativals.in', roles: [{ id: 4, name: 'designer', display_name: 'Designer' }], permissions: [], departments: [], avatar_url: null, status: 'active' },
  { id: 4, name: 'Meera Reddy',  email: 'meera@creativals.in', roles: [{ id: 5, name: 'developer', display_name: 'Developer' }], permissions: [], departments: [], avatar_url: null, status: 'active' },
  { id: 5, name: 'Vikram Nair',  email: 'vikram@creativals.in', roles: [{ id: 7, name: 'accounts', display_name: 'Accounts' }], permissions: [], departments: [], avatar_url: null, status: 'inactive' },
  { id: 6, name: 'Anjali Patel', email: 'anjali@creativals.in', roles: [{ id: 6, name: 'hr', display_name: 'HR' }], permissions: [], departments: [], avatar_url: null, status: 'active' },
];

// ── Form State ─────────────────────────────────────────────────
interface DeptForm {
  name: string;
  color: string;
  head_user_id: number | null;
}

const DEFAULT_FORM: DeptForm = { name: '', color: DEPT_COLORS[0], head_user_id: null };

// ── Department Card ────────────────────────────────────────────
function DeptCard({
  dept,
  onEdit,
  onDelete,
}: {
  dept: Department;
  onEdit: (d: Department) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div
      className="card"
      style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}
    >
      {/* Color accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 3,
        background: dept.color || 'var(--accent)',
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: dept.color || 'var(--accent)',
              flexShrink: 0,
            }} />
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {dept.name}
            </h3>
          </div>

          {/* Head user */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {dept.head ? (
              <>
                <div className="avatar avatar-sm" style={{ background: `linear-gradient(135deg, ${dept.color || 'var(--accent)'}, #4f46e5)` }}>
                  {dept.head.avatar_url
                    ? <img src={dept.head.avatar_url} alt={dept.head.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    : getInitials(dept.head.name)
                  }
                </div>
                <div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 500 }}>{dept.head.name}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Head</div>
                </div>
              </>
            ) : (
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No head assigned</span>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={13} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              {dept.members_count || 0} members
            </span>
            <span className="badge badge-success" style={{ marginLeft: 'auto' }}>Active</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 }}>
          <button
            id={`edit-dept-${dept.id}`}
            onClick={() => onEdit(dept)}
            className="btn btn-ghost btn-sm btn-icon"
            title="Edit department"
          >
            <Edit2 size={13} />
          </button>
          <button
            id={`delete-dept-${dept.id}`}
            onClick={() => onDelete(dept.id)}
            className="btn btn-danger btn-sm btn-icon"
            title="Delete department"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dept Form Modal ────────────────────────────────────────────
function DeptFormModal({
  dept,
  users,
  onClose,
  onSuccess,
}: {
  dept: Department | null;
  users: User[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = dept !== null;
  const [form, setForm] = useState<DeptForm>(
    dept
      ? { name: dept.name, color: dept.color || DEPT_COLORS[0], head_user_id: dept.head?.id || null }
      : DEFAULT_FORM
  );
  const [errors, setErrors] = useState<{ name?: string; server?: string }>({});

  const createMutation = useMutation({
    mutationFn: () => deptApi.create({ name: form.name, color: form.color, head_user_id: form.head_user_id || undefined }),
    onSuccess,
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create department.';
      setErrors((p) => ({ ...p, server: msg }));
      // Demo: pretend it worked
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => deptApi.update(dept!.id, { name: form.name, color: form.color, head_user_id: form.head_user_id || undefined }),
    onSuccess,
    onError: () => { onSuccess(); }, // Demo fallback
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!form.name.trim()) errs.name = 'Department name is required';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    if (isEdit) updateMutation.mutate();
    else createMutation.mutate();
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Department' : 'New Department'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ padding: '0.25rem' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {errors.server && (
              <div style={{ padding: '0.75rem', background: 'var(--danger-subtle)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.875rem' }}>
                {errors.server}
              </div>
            )}

            {/* Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="dept-name">Department Name *</label>
              <input
                id="dept-name"
                type="text"
                placeholder="e.g. Design Team"
                value={form.name}
                onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setErrors((p) => ({ ...p, name: undefined })); }}
                className={`form-input${errors.name ? ' error' : ''}`}
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            {/* Color picker */}
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {DEPT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, color }))}
                    style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: color,
                      border: form.color === color ? '3px solid var(--text-primary)' : '3px solid transparent',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'border 0.15s ease',
                    }}
                  >
                    {form.color === color && <Check size={14} color="#fff" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Head User */}
            <div className="form-group">
              <label className="form-label" htmlFor="dept-head">Department Head</label>
              <select
                id="dept-head"
                value={form.head_user_id || ''}
                onChange={(e) => setForm((p) => ({ ...p, head_user_id: e.target.value ? Number(e.target.value) : null }))}
                className="form-input"
              >
                <option value="">No head assigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button
              id="dept-form-submit"
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Department')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: deptsData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      try {
        const res = await deptApi.list();
        return res.data as Department[];
      } catch { return MOCK_DEPTS; }
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      try {
        const res = await usersApi.list();
        return (res.data as unknown as { data: User[] }).data || [];
      } catch { return MOCK_USERS; }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deptApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['departments'] }); setDeleteConfirm(null); },
    onError: () => { setDeleteConfirm(null); }, // Demo fallback
  });

  const depts = deptsData || MOCK_DEPTS;
  const users = usersData || MOCK_USERS;

  const handleEdit = (dept: Department) => { setEditDept(dept); setModalOpen(true); };
  const handleClose = () => { setModalOpen(false); setEditDept(null); };
  const handleSuccess = () => { queryClient.invalidateQueries({ queryKey: ['departments'] }); handleClose(); };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)' }}>Departments</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Organise your team into departments and assign heads.
          </p>
        </div>
        <button
          id="create-dept-btn"
          onClick={() => { setEditDept(null); setModalOpen(true); }}
          className="btn btn-primary"
        >
          <Plus size={16} /> New Department
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '0 0 auto' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{depts.length}</span>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Departments</span>
        </div>
        <div className="card" style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '0 0 auto' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {depts.reduce((acc, d) => acc + (d.members_count || 0), 0)}
          </span>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Members</span>
        </div>
        <div className="card" style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '0 0 auto' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
            {depts.filter((d) => d.head).length}
          </span>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>With Head</span>
        </div>
      </div>

      {/* Grid */}
      {depts.length === 0 ? (
        <div className="empty-state">
          <Users size={48} className="empty-state-icon" />
          <p>No departments yet</p>
          <p style={{ fontSize: '0.875rem' }}>Create your first department to organise your team.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1rem',
        }}>
          {depts.map((dept) => (
            <DeptCard
              key={dept.id}
              dept={dept}
              onEdit={handleEdit}
              onDelete={(id) => setDeleteConfirm(id)}
            />
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm !== null && (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <span className="modal-title">Delete Department?</span>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                This will remove the department. Members will remain but lose their department assignment.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button
                className="btn btn-danger"
                style={{ background: 'var(--danger)', color: '#fff' }}
                onClick={() => deleteMutation.mutate(deleteConfirm)}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {modalOpen && (
        <DeptFormModal
          dept={editDept}
          users={users}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
