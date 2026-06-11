'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Eye, EyeOff } from 'lucide-react';
import { users as usersApi } from '@/lib/api';
import type { User, Role, Department } from '@/lib/api';

interface UserFormModalProps {
  user: User | null;
  roles: Role[];
  departments: Department[];
  onClose: () => void;
  onSuccess: () => void;
}

interface FormState {
  name: string;
  email: string;
  password: string;
  phone: string;
  employee_id: string;
  status: 'active' | 'inactive';
  role_ids: number[];
  department_ids: number[];
}

const DEFAULT_FORM: FormState = {
  name: '',
  email: '',
  password: '',
  phone: '',
  employee_id: '',
  status: 'active',
  role_ids: [],
  department_ids: [],
};

export default function UserFormModal({ user, roles, departments, onClose, onSuccess }: UserFormModalProps) {
  const isEdit = user !== null;
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<FormState & { server: string }>>({});

  // Pre-fill for edit
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        email: user.email,
        password: '',
        phone: user.phone || '',
        employee_id: user.employee_id || '',
        status: user.status,
        role_ids: user.roles.map((r) => r.id),
        department_ids: user.departments.map((d) => d.id),
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [user]);

  const createMutation = useMutation({
    mutationFn: (data: FormState) =>
      usersApi.create({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
        employee_id: data.employee_id || undefined,
        status: data.status,
        role_ids: data.role_ids,
        department_ids: data.department_ids,
      }),
    onSuccess,
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create user.';
      setErrors((p) => ({ ...p, server: msg }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormState) =>
      usersApi.update(user!.id, {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        employee_id: data.employee_id || undefined,
        status: data.status,
        role_ids: data.role_ids,
        department_ids: data.department_ids,
      }),
    onSuccess,
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update user.';
      setErrors((p) => ({ ...p, server: msg }));
    },
  });

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
    if (!isEdit && !form.password) errs.password = 'Password is required';
    if (!isEdit && form.password && form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (isEdit) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  const toggleRole = (id: number) => {
    setForm((p) => ({
      ...p,
      role_ids: p.role_ids.includes(id)
        ? p.role_ids.filter((r) => r !== id)
        : [...p.role_ids, id],
    }));
  };

  const toggleDept = (id: number) => {
    setForm((p) => ({
      ...p,
      department_ids: p.department_ids.includes(id)
        ? p.department_ids.filter((d) => d !== id)
        : [...p.department_ids, id],
    }));
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit User' : 'Invite New User'}</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            style={{ padding: '0.25rem' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form id="user-form" onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Server error */}
            {errors.server && (
              <div style={{
                padding: '0.75rem 1rem',
                background: 'var(--danger-subtle)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--danger)',
                fontSize: '0.875rem',
              }}>
                {errors.server}
              </div>
            )}

            {/* Row 1: Name + Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="user-name">Full Name *</label>
                <input
                  id="user-name"
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={form.name}
                  onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setErrors((p) => ({ ...p, name: undefined })); }}
                  className={`form-input${errors.name ? ' error' : ''}`}
                />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="user-email">Email Address *</label>
                <input
                  id="user-email"
                  type="email"
                  placeholder="name@company.com"
                  value={form.email}
                  onChange={(e) => { setForm((p) => ({ ...p, email: e.target.value })); setErrors((p) => ({ ...p, email: undefined })); }}
                  className={`form-input${errors.email ? ' error' : ''}`}
                />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>
            </div>

            {/* Password (create only) */}
            {!isEdit && (
              <div className="form-group">
                <label className="form-label" htmlFor="user-password">Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="user-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={(e) => { setForm((p) => ({ ...p, password: e.target.value })); setErrors((p) => ({ ...p, password: undefined })); }}
                    className={`form-input${errors.password ? ' error' : ''}`}
                    style={{ paddingRight: '2.75rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    style={{
                      position: 'absolute', right: '0.75rem', top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <span className="form-error">{errors.password}</span>}
              </div>
            )}

            {/* Row 2: Phone + Employee ID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="user-phone">Phone</label>
                <input
                  id="user-phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="user-emp-id">Employee ID</label>
                <input
                  id="user-emp-id"
                  type="text"
                  placeholder="e.g. CRE007"
                  value={form.employee_id}
                  onChange={(e) => setForm((p) => ({ ...p, employee_id: e.target.value }))}
                  className="form-input"
                />
              </div>
            </div>

            {/* Status */}
            <div className="form-group">
              <label className="form-label" htmlFor="user-status">Status</label>
              <select
                id="user-status"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as 'active' | 'inactive' }))}
                className="form-input"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Roles (checkbox list) */}
            <div className="form-group">
              <label className="form-label">Roles</label>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: '0.375rem',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
              }}>
                {roles.map((role) => (
                  <label
                    key={role.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      cursor: 'pointer',
                      padding: '0.375rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <input
                      type="checkbox"
                      id={`role-${role.id}`}
                      checked={form.role_ids.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                      style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
                    />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{role.display_name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Departments (checkbox list) */}
            <div className="form-group">
              <label className="form-label">Departments</label>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: '0.375rem',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
              }}>
                {departments.map((dept) => (
                  <label
                    key={dept.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      cursor: 'pointer',
                      padding: '0.375rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <input
                      type="checkbox"
                      id={`dept-${dept.id}`}
                      checked={form.department_ids.includes(dept.id)}
                      onChange={() => toggleDept(dept.id)}
                      style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
                    />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{dept.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              id="user-form-submit"
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading
                ? (isEdit ? 'Saving…' : 'Inviting…')
                : (isEdit ? 'Save Changes' : 'Send Invite')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
