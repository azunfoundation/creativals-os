'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check, X, AlertCircle, Clock, CheckCircle2, AlertOctagon,
  Search, Filter, Users, Folder, Calendar, ThumbsUp, ThumbsDown
} from 'lucide-react';
import {
  timesheets as timesheetsApi,
  projects as projectsApi,
  users as usersApi,
  Timesheet, Project, User
} from '@/lib/api';
import { formatDate, getInitials } from '@/lib/utils';

// ============================================================
// Mock Data (Fallbacks for offline development)
// ============================================================

const MOCK_PROJECTS: Project[] = [
  { id: 1, name: 'Rebranding Stark Industries', project_number: 'PRJ-001', status: 'active', completion_percentage: 65, start_date: '2026-05-01', end_date: '2026-10-31', budget_hours: 350, budget: 1500000 },
  { id: 2, name: 'Wayne Corporate Website', project_number: 'PRJ-002', status: 'planning', completion_percentage: 15, start_date: '2026-07-01', end_date: '2026-12-15', budget_hours: 500, budget: 2200000 },
  { id: 3, name: 'Acme Mobile App', project_number: 'PRJ-003', status: 'completed', completion_percentage: 100, start_date: '2026-01-10', end_date: '2026-05-30', budget_hours: 400, budget: 1200000 }
];

const MOCK_SUBMITTED_TIMESHEETS: Timesheet[] = [
  {
    id: 301,
    user_id: 2,
    user: { id: 2, name: 'Rohan Mehta', email: 'rohan@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null },
    project_id: 1,
    project: MOCK_PROJECTS[0],
    task_id: 102,
    task: { id: 102, project_id: 1, title: 'Landing Page UX Wireframes', status: 'in_progress', priority: 'high', completion_percentage: 60 },
    date: '2026-06-08',
    hours: 7.5,
    description: 'Developed and finalized high-fidelity landing page grid layout wireframes.',
    billable: true,
    status: 'submitted',
    submitted_at: '2026-06-10T12:00:00Z'
  },
  {
    id: 302,
    user_id: 3,
    user: { id: 3, name: 'Sarah Dsouza', email: 'sarah@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null },
    project_id: 1,
    project: MOCK_PROJECTS[0],
    task_id: 101,
    task: { id: 101, project_id: 1, title: 'Brand Identity Exploration', status: 'done', priority: 'urgent', completion_percentage: 100 },
    date: '2026-06-08',
    hours: 8,
    description: 'Assembled identity colors palette based on feedback.',
    billable: true,
    status: 'submitted',
    submitted_at: '2026-06-10T14:30:00Z'
  },
  {
    id: 303,
    user_id: 2,
    user: { id: 2, name: 'Rohan Mehta', email: 'rohan@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null },
    project_id: 2,
    project: MOCK_PROJECTS[1],
    task_id: 104,
    task: { id: 104, project_id: 2, title: 'Secure Database Schema Design', status: 'in_progress', priority: 'high', completion_percentage: 40 },
    date: '2026-06-09',
    hours: 6.5,
    description: 'Postgres ERD model generation and indexing rules.',
    billable: true,
    status: 'submitted',
    submitted_at: '2026-06-10T17:15:00Z'
  },
  {
    id: 304,
    user_id: 3,
    user: { id: 3, name: 'Sarah Dsouza', email: 'sarah@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null },
    project_id: 3,
    project: MOCK_PROJECTS[2],
    task_id: 105,
    task: { id: 105, project_id: 3, title: 'Payment Gateway Integration', status: 'done', priority: 'urgent', completion_percentage: 100 },
    date: '2026-06-09',
    hours: 5,
    description: 'Stripe Webhook signature validation fixes.',
    billable: true,
    status: 'submitted',
    submitted_at: '2026-06-10T18:00:00Z'
  },
  {
    id: 305,
    user_id: 1,
    user: { id: 1, name: 'Amit Verma', email: 'amit@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null },
    project_id: 1,
    project: MOCK_PROJECTS[0],
    date: '2026-06-05',
    hours: 4,
    description: 'Approved client onboarding brief documentation.',
    billable: false,
    status: 'approved',
    submitted_at: '2026-06-07T10:00:00Z'
  },
  {
    id: 306,
    user_id: 1,
    user: { id: 1, name: 'Amit Verma', email: 'amit@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null },
    project_id: 2,
    project: MOCK_PROJECTS[1],
    date: '2026-06-04',
    hours: 8,
    description: 'Rejected layout strategy consulting.',
    billable: true,
    status: 'rejected',
    rejected_notes: 'Hours mismatch. Re-log actual hours spent during review.',
    submitted_at: '2026-06-04T19:00:00Z'
  }
];

export default function TimesheetApprovalsPage() {
  const queryClient = useQueryClient();

  // Selection state for checkboxes
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');

  // Filters state
  const [userFilter, setUserFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('submitted'); // Default to pending approvals
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // ============================================================
  // Queries
  // ============================================================

  const { data: timesheets = MOCK_SUBMITTED_TIMESHEETS, isLoading } = useQuery<Timesheet[]>({
    queryKey: ['allTimesheetsForApprovals'],
    queryFn: async () => {
      try {
        const res = await timesheetsApi.list();
        return res.data.data;
      } catch {
        return MOCK_SUBMITTED_TIMESHEETS;
      }
    }
  });

  const { data: projects = MOCK_PROJECTS } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await projectsApi.list();
      return res.data.data;
    }
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await usersApi.list({ per_page: 100 });
      return res.data.data;
    }
  });

  // ============================================================
  // Mutations
  // ============================================================

  const approveMutation = useMutation({
    mutationFn: (id: number) => timesheetsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTimesheetsForApprovals'] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) => timesheetsApi.reject(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTimesheetsForApprovals'] });
    }
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      for (const id of ids) {
        await timesheetsApi.approve(id);
      }
    },
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['allTimesheetsForApprovals'] });
      alert('Selected entries approved successfully.');
    }
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async ({ ids, notes }: { ids: number[]; notes: string }) => {
      for (const id of ids) {
        await timesheetsApi.reject(id, notes);
      }
    },
    onSuccess: () => {
      setSelectedIds([]);
      setRejectionNotes('');
      setShowRejectModal(false);
      queryClient.invalidateQueries({ queryKey: ['allTimesheetsForApprovals'] });
      alert('Selected entries rejected.');
    }
  });

  // ============================================================
  // Handlers & Selection
  // ============================================================

  const toggleSelectAll = (filteredItems: Timesheet[]) => {
    // Only select items that are in 'submitted' status since other statuses can't be actioned
    const actionableItems = filteredItems.filter(t => t.status === 'submitted');
    
    if (selectedIds.length === actionableItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(actionableItems.map(t => t.id));
    }
  };

  const toggleSelectItem = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Approve all ${selectedIds.length} selected timesheet logs?`)) {
      bulkApproveMutation.mutate(selectedIds);
    }
  };

  const handleBulkRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0 || !rejectionNotes.trim()) return;
    bulkRejectMutation.mutate({ ids: selectedIds, notes: rejectionNotes.trim() });
  };

  const handleSingleApprove = (id: number) => {
    if (confirm('Approve this timesheet entry?')) {
      approveMutation.mutate(id);
    }
  };

  const handleSingleReject = (id: number) => {
    const notes = prompt('Enter reason for rejection:');
    if (notes === null) return; // user cancelled prompt
    if (!notes.trim()) {
      alert('Rejection notes are required.');
      return;
    }
    rejectMutation.mutate({ id, notes: notes.trim() });
  };

  // ============================================================
  // Filtering & Metrics
  // ============================================================

  const filteredTimesheets = useMemo(() => {
    return timesheets.filter(entry => {
      if (userFilter && entry.user_id !== parseInt(userFilter)) return false;
      if (projectFilter && entry.project_id !== parseInt(projectFilter)) return false;
      if (statusFilter && entry.status !== statusFilter) return false;
      
      if (startDateFilter && entry.date < startDateFilter) return false;
      if (endDateFilter && entry.date > endDateFilter) return false;

      return true;
    });
  }, [timesheets, userFilter, projectFilter, statusFilter, startDateFilter, endDateFilter]);

  // Metric summaries
  const stats = useMemo(() => {
    const pending = timesheets.filter(t => t.status === 'submitted').length;
    const approved = timesheets.filter(t => t.status === 'approved').length;
    const rejected = timesheets.filter(t => t.status === 'rejected').length;
    return { pending, approved, rejected };
  }, [timesheets]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* ── Page Header ── */}
      <div style={{ marginBottom: '1.25rem', flexShrink: 0 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Timesheet Approvals</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
          PM Hub: Audit team hours logging, review billable deliverables, and process weekly pipeline entries.
        </p>
      </div>

      {/* ── Metrics Grid ── */}
      <div className="kpi-grid kpi-grid-3" style={{ marginBottom: '1.5rem', gap: '0.75rem', flexShrink: 0 }}>
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent)' }}>
          <span className="kpi-label">Pending Approval</span>
          <div className="kpi-value" style={{ color: 'var(--accent)' }}>{stats.pending}</div>
          <span className="kpi-trend flat">Awaiting PM action</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--success)' }}>
          <span className="kpi-label">Approved This Week</span>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>{stats.approved}</div>
          <span className="kpi-trend up">Audit trails saved</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <span className="kpi-label">Rejected Log Blocks</span>
          <div className="kpi-value" style={{ color: 'var(--danger)' }}>{stats.rejected}</div>
          <span className="kpi-trend down">Requires corrections</span>
        </div>
      </div>

      {/* ── Advanced Filters ── */}
      <div className="card-elevated" style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', marginBottom: '1.25rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          
          <Filter size={15} style={{ color: 'var(--text-muted)' }} />

          {/* User selector */}
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="form-input"
            style={{ width: '150px', height: '36px', padding: '0 0.5rem', fontSize: '0.8125rem' }}
          >
            <option value="">All Employees</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          {/* Project selector */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="form-input"
            style={{ width: '180px', height: '36px', padding: '0 0.5rem', fontSize: '0.8125rem' }}
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input"
            style={{ width: '130px', height: '36px', padding: '0 0.5rem', fontSize: '0.8125rem' }}
          >
            <option value="">All Statuses</option>
            <option value="submitted">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="draft">Drafts</option>
          </select>

          {/* Date range filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            <span>From:</span>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="form-input"
              style={{ width: '135px', height: '36px', padding: '0 0.5rem', fontSize: '0.75rem' }}
            />
            <span>To:</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="form-input"
              style={{ width: '135px', height: '36px', padding: '0 0.5rem', fontSize: '0.75rem' }}
            />
          </div>

          {/* Reset button */}
          {(userFilter || projectFilter || statusFilter !== 'submitted' || startDateFilter || endDateFilter) && (
            <button
              onClick={() => {
                setUserFilter('');
                setProjectFilter('');
                setStatusFilter('submitted');
                setStartDateFilter('');
                setEndDateFilter('');
              }}
              style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', padding: '0.5rem' }}
            >
              <X size={12} /> Clear Filters
            </button>
          )}

        </div>
      </div>

      {/* ── Bulk Actions Header ── */}
      {selectedIds.length > 0 && (
        <div style={{
          background: 'var(--accent-subtle)',
          border: '1px solid var(--accent)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.625rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          animation: 'slideDown 0.15s ease'
        }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {selectedIds.length} timesheet logs selected for processing
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleBulkApprove}
              className="btn btn-primary btn-sm"
              style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
            >
              <ThumbsUp size={12} style={{ marginRight: '4px' }} />
              Bulk Approve
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              className="btn btn-danger btn-sm"
            >
              <ThumbsDown size={12} style={{ marginRight: '4px' }} />
              Bulk Reject
            </button>
          </div>
        </div>
      )}

      {/* ── Approvals Table ── */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', minHeight: 0 }}>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {statusFilter === 'submitted' && (
                  <th style={{ width: '40px', padding: '0.75rem 1rem' }}>
                    <input
                      type="checkbox"
                      checked={filteredTimesheets.length > 0 && selectedIds.length === filteredTimesheets.filter(t => t.status === 'submitted').length}
                      onChange={() => toggleSelectAll(filteredTimesheets)}
                      style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                  </th>
                )}
                <th>Employee</th>
                <th>Date Logged</th>
                <th>Project</th>
                <th>Task Scope / Desc</th>
                <th style={{ textAlign: 'center' }}>Hours</th>
                <th>Type</th>
                <th>Submitted</th>
                <th>Status</th>
                {statusFilter === 'submitted' && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredTimesheets.map((entry) => {
                let statusColor = 'badge-muted';
                if (entry.status === 'approved') statusColor = 'badge-success';
                if (entry.status === 'submitted') statusColor = 'badge-info';
                if (entry.status === 'rejected') statusColor = 'badge-danger';

                const isSelected = selectedIds.includes(entry.id);

                return (
                  <tr key={entry.id} style={{ background: isSelected ? 'rgba(124,58,237, 0.05)' : 'transparent' }}>
                    {statusFilter === 'submitted' && (
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectItem(entry.id)}
                          style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                        />
                      </td>
                    )}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="avatar avatar-sm">
                          {getInitials(entry.user?.name || 'User')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{entry.user?.name || 'Unknown'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{entry.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>{formatDate(entry.date)}</td>
                    <td style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                      {entry.project?.name || `Project #${entry.project_id}`}
                    </td>
                    <td>
                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{entry.task?.title || 'General Scope'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'pre-wrap' }}>{entry.description || '—'}</div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, fontFamily: 'monospace' }}>{entry.hours} hrs</td>
                    <td>
                      <span className={`badge ${entry.billable ? 'badge-success' : 'badge-muted'}`} style={{ fontSize: '0.55rem', padding: '1px 4px' }}>
                        {entry.billable ? 'Billable' : 'Non-Billable'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {entry.submitted_at ? formatDate(entry.submitted_at) : '—'}
                    </td>
                    <td>
                      <span className={`badge ${statusColor}`}>
                        {entry.status}
                      </span>
                      {entry.status === 'rejected' && entry.rejected_notes && (
                        <div style={{ fontSize: '0.6875rem', color: 'var(--danger)', marginTop: '2px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Reason: {entry.rejected_notes}
                        </div>
                      )}
                    </td>
                    
                    {/* Action buttons */}
                    {statusFilter === 'submitted' && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleSingleApprove(entry.id)}
                            style={{ padding: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--success-subtle)', color: 'var(--success)', borderRadius: 'var(--radius-sm)' }}
                            className="hover:opacity-80"
                            title="Approve"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => handleSingleReject(entry.id)}
                            style={{ padding: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--danger-subtle)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)' }}
                            className="hover:opacity-80"
                            title="Reject"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {filteredTimesheets.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    No pending approval timesheet logs matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================
          BULK REJECT WITH NOTES MODAL
          ============================================================ */}
      {showRejectModal && (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Bulk Reject Logs</h3>
              <button onClick={() => setShowRejectModal(false)} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>
            
            <form onSubmit={handleBulkRejectSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  You are rejecting {selectedIds.length} timesheet log entries. Provide rejection explanation details below. The users will be prompted to re-log.
                </p>

                <div className="form-group">
                  <label className="form-label">Reason Notes *</label>
                  <textarea
                    required
                    placeholder="Provide detailed reasons for rejection..."
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    className="form-input"
                    style={{ minHeight: '80px', resize: 'vertical', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowRejectModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}>
                  Reject Entries
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
