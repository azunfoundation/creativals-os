'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, LayoutGrid, List, Filter, X,
  Calendar, DollarSign, UserCheck, Briefcase,
  ArrowUpDown, ExternalLink, Check, Trash2, Clock,
  ArrowRight, Users, CheckCircle2, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import {
  projects as projectsApi,
  leads as leadsApi,
  invoices as invoicesApi,
  users as usersApi,
  departments as departmentsApi,
  Project, Lead, Invoice, User, Department
} from '@/lib/api';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';

// ============================================================
// Mock Data (Fallbacks for offline development)
// ============================================================

const MOCK_PROJECTS: Project[] = [
  {
    id: 1,
    project_number: 'PRJ-001',
    name: 'Rebranding Stark Industries',
    client_name: 'Stark Industries',
    client_id: 2,
    invoice_number: 'INV-0012',
    invoice_id: 1,
    manager_id: 1,
    manager: { id: 1, name: 'Amit Verma', email: 'amit@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null },
    status: 'active',
    completion_percentage: 65,
    start_date: '2026-05-01',
    end_date: '2026-10-31',
    budget_hours: 350,
    budget: 1500000,
    description: 'Comprehensive rebranding project including brand guidelines, social media assets, and website redesign.',
    departments: [{ id: 1, name: 'Design' }, { id: 2, name: 'Marketing' }],
    members: [
      { id: 1, name: 'Amit Verma', email: 'amit@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null },
      { id: 2, name: 'Rohan Mehta', email: 'rohan@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null }
    ]
  },
  {
    id: 2,
    project_number: 'PRJ-002',
    name: 'Wayne Corporate Website',
    client_name: 'Wayne Enterprises',
    client_id: 3,
    invoice_number: 'INV-0015',
    invoice_id: 2,
    manager_id: 2,
    manager: { id: 2, name: 'Rohan Mehta', email: 'rohan@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null },
    status: 'planning',
    completion_percentage: 15,
    start_date: '2026-07-01',
    end_date: '2026-12-15',
    budget_hours: 500,
    budget: 2200000,
    description: 'Developing a secure, modern corporate website with interactive investor relations portal.',
    departments: [{ id: 3, name: 'Development' }],
    members: [
      { id: 2, name: 'Rohan Mehta', email: 'rohan@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null }
    ]
  },
  {
    id: 3,
    project_number: 'PRJ-003',
    name: 'Acme Mobile App',
    client_name: 'Acme Corp',
    client_id: 1,
    invoice_number: 'INV-0010',
    invoice_id: 3,
    manager_id: 3,
    manager: { id: 3, name: 'Sarah Dsouza', email: 'sarah@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null },
    status: 'completed',
    completion_percentage: 100,
    start_date: '2026-01-10',
    end_date: '2026-05-30',
    budget_hours: 400,
    budget: 1200000,
    description: 'Cross-platform customer loyalty app built on React Native.',
    departments: [{ id: 3, name: 'Development' }, { id: 1, name: 'Design' }],
    members: [
      { id: 3, name: 'Sarah Dsouza', email: 'sarah@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null }
    ]
  },
  {
    id: 4,
    project_number: 'PRJ-004',
    name: 'SEO & Content for Hooli',
    client_name: 'Hooli Inc',
    client_id: 4,
    invoice_number: 'INV-0018',
    invoice_id: 4,
    manager_id: 1,
    manager: { id: 1, name: 'Amit Verma', email: 'amit@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null },
    status: 'on_hold',
    completion_percentage: 45,
    start_date: '2026-03-01',
    end_date: '2026-09-01',
    budget_hours: 150,
    budget: 500000,
    description: 'Search engine optimization and weekly content writing campaign.',
    departments: [{ id: 2, name: 'Marketing' }],
    members: [
      { id: 1, name: 'Amit Verma', email: 'amit@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null }
    ]
  }
];

const STATUS_CONFIG = {
  planning: { label: 'Planning', color: '#3b82f6', bg: 'var(--info-subtle)', borderLeft: 'border-l-blue-500' },
  active: { label: 'Active', color: '#a855f7', bg: 'var(--accent-subtle)', borderLeft: 'border-l-purple-500' },
  on_hold: { label: 'On Hold', color: '#f59e0b', bg: 'var(--warning-subtle)', borderLeft: 'border-l-orange-500' },
  completed: { label: 'Completed', color: '#10b981', bg: 'var(--success-subtle)', borderLeft: 'border-l-green-500' },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'var(--danger-subtle)', borderLeft: 'border-l-red-500' }
};

export default function ProjectsPage() {
  const queryClient = useQueryClient();

  // Layout states
  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');
  const [showDrawer, setShowDrawer] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');

  // Drag and drop states for Board view
  const [draggedProjectId, setDraggedProjectId] = useState<number | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  // Form states for new project
  const [newName, setNewName] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [newInvoiceId, setNewInvoiceId] = useState('');
  const [newManagerId, setNewManagerId] = useState('');
  const [newDepartmentIds, setNewDepartmentIds] = useState<number[]>([]);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newBudgetHours, setNewBudgetHours] = useState('');
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // ============================================================
  // Queries
  // ============================================================

  const { data: projectsData = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      try {
        const res = await projectsApi.list();
        return res.data.data;
      } catch {
        return MOCK_PROJECTS;
      }
    }
  });

  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: async () => {
      try {
        const res = await leadsApi.list();
        return res.data.data;
      } catch {
        return [];
      }
    }
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: async () => {
      try {
        const res = await invoicesApi.list();
        return res.data.data;
      } catch {
        return [];
      }
    }
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const res = await usersApi.list({ per_page: 100 });
        return res.data.data;
      } catch {
        return [];
      }
    }
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      try {
        const res = await departmentsApi.list();
        return res.data;
      } catch {
        return [];
      }
    }
  });

  // ============================================================
  // Mutations
  // ============================================================

  const createProjectMutation = useMutation({
    mutationFn: (data: any) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowDrawer(false);
      resetForm();
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: number) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number, status: Project['status'] }) =>
      projectsApi.update(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const previousProjects = queryClient.getQueryData<Project[]>(['projects']);
      if (previousProjects) {
        queryClient.setQueryData<Project[]>(
          ['projects'],
          previousProjects.map((p) => (p.id === id ? { ...p, status } : p))
        );
      }
      return { previousProjects };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(['projects'], context.previousProjects);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

  // ============================================================
  // Handlers and Filtering
  // ============================================================

  const resetForm = () => {
    setNewName('');
    setNewClientId('');
    setNewInvoiceId('');
    setNewManagerId('');
    setNewDepartmentIds([]);
    setNewStartDate('');
    setNewEndDate('');
    setNewBudgetHours('');
    setNewBudgetAmount('');
    setNewDescription('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedClient = leads.find(l => l.id === parseInt(newClientId));
    const selectedInvoice = invoices.find(i => i.id === parseInt(newInvoiceId));
    const selectedManager = users.find(u => u.id === parseInt(newManagerId));
    const selectedDepts = departments.filter(d => newDepartmentIds.includes(d.id));

    const payload = {
      name: newName,
      client_id: newClientId ? parseInt(newClientId) : undefined,
      client_name: selectedClient ? selectedClient.company_name : 'Walk-in Client',
      invoice_id: newInvoiceId ? parseInt(newInvoiceId) : undefined,
      invoice_number: selectedInvoice ? selectedInvoice.invoice_number : undefined,
      manager_id: newManagerId ? parseInt(newManagerId) : undefined,
      manager: selectedManager || undefined,
      departments: selectedDepts,
      start_date: newStartDate,
      end_date: newEndDate,
      budget_hours: parseFloat(newBudgetHours) || 0,
      budget: parseFloat(newBudgetAmount) || 0,
      description: newDescription,
      status: 'planning',
      completion_percentage: 0
    };

    createProjectMutation.mutate(payload);
  };

  const handleDragStart = (id: number) => {
    setDraggedProjectId(id);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverStatus(status);
  };

  const handleDrop = (status: Project['status']) => {
    if (draggedProjectId !== null) {
      updateStatusMutation.mutate({ id: draggedProjectId, status });
    }
    setDraggedProjectId(null);
    setDragOverStatus(null);
  };

  const toggleDeptId = (deptId: number) => {
    setNewDepartmentIds(prev =>
      prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]
    );
  };

  // Filter projects
  const filteredProjects = projectsData.filter(project => {
    if (searchQuery) {
      const nameMatch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
      const numberMatch = project.project_number?.toLowerCase().includes(searchQuery.toLowerCase());
      const clientMatch = project.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!nameMatch && !numberMatch && !clientMatch) return false;
    }
    if (statusFilter && project.status !== statusFilter) return false;
    if (managerFilter && project.manager_id !== parseInt(managerFilter)) return false;
    return true;
  });

  // KPI calculations
  const totalProjectsCount = projectsData.length;
  const activeCount = projectsData.filter(p => p.status === 'active').length;
  const completedCount = projectsData.filter(p => p.status === 'completed').length;
  const totalBudgetVal = projectsData.reduce((sum, p) => sum + (p.budget || 0), 0);

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      
      {/* ── Metrics Row ── */}
      <div className="kpi-grid kpi-grid-4" style={{ marginBottom: '1.5rem', gap: '0.75rem' }}>
        <div className="kpi-card">
          <span className="kpi-label">Total Projects</span>
          <div className="kpi-value">{totalProjectsCount}</div>
          <span className="kpi-trend flat">All Projects</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Active Projects</span>
          <div className="kpi-value" style={{ color: 'var(--accent)' }}>{activeCount}</div>
          <span className="kpi-trend up" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>Ongoing</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Completed Projects</span>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>{completedCount}</div>
          <span className="kpi-trend up">{completedCount} Delivered</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Total Budget</span>
          <div className="kpi-value" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalBudgetVal)}</div>
          <span className="kpi-trend flat">Portfolio Value</span>
        </div>
      </div>

      {/* ── Action Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Projects</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
            Monitor agency contracts, visual delivery streams, and production capacity.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* View Toggle */}
          <div style={{ background: 'var(--surface-elevated)', borderRadius: 'var(--radius-md)', padding: '3px', display: 'flex', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setViewMode('table')}
              className="btn btn-sm"
              style={{
                background: viewMode === 'table' ? 'var(--surface)' : 'transparent',
                color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-secondary)',
                padding: '0.375rem 0.625rem',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <List size={14} style={{ marginRight: '4px' }} />
              Table View
            </button>
            <button
              onClick={() => setViewMode('board')}
              className="btn btn-sm"
              style={{
                background: viewMode === 'board' ? 'var(--surface)' : 'transparent',
                color: viewMode === 'board' ? 'var(--text-primary)' : 'var(--text-secondary)',
                padding: '0.375rem 0.625rem',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <LayoutGrid size={14} style={{ marginRight: '4px' }} />
              Board View
            </button>
          </div>

          <button
            onClick={() => setShowDrawer(true)}
            className="btn btn-primary"
          >
            <Plus size={16} /> New Project
          </button>
        </div>
      </div>

      {/* ── Filters Panel ── */}
      <div className="card-elevated" style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search projects, client, manager..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.25rem', height: '38px', fontSize: '0.875rem' }}
            />
          </div>

          <Filter size={15} style={{ color: 'var(--text-muted)' }} />

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input"
            style={{ width: '140px', height: '38px', padding: '0 0.5rem', fontSize: '0.8125rem' }}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          {/* Manager Filter */}
          <select
            value={managerFilter}
            onChange={(e) => setManagerFilter(e.target.value)}
            className="form-input"
            style={{ width: '160px', height: '38px', padding: '0 0.5rem', fontSize: '0.8125rem' }}
          >
            <option value="">All Managers</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          {/* Clear button */}
          {(searchQuery || statusFilter || managerFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setManagerFilter('');
              }}
              style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', padding: '0.5rem' }}
            >
              <X size={12} /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Table View ── */}
      {viewMode === 'table' ? (
        <div className="data-table-wrap">
          {filteredProjects.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>No projects found</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>Try adjusting your filters.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project#</th>
                  <th>Name</th>
                  <th>Client</th>
                  <th>Manager</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Timeline</th>
                  <th>Budget</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => {
                  const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
                  return (
                    <tr key={project.id}>
                      <td style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {project.project_number || `PRJ-${project.id.toString().padStart(3, '0')}`}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <Link href={`/projects/${project.id}`} style={{ color: 'var(--text-primary)' }} className="hover:text-accent flex items-center gap-1">
                          {project.name}
                          <ExternalLink size={12} style={{ opacity: 0.5 }} />
                        </Link>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {project.client_name || 'Walk-in Client'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="avatar avatar-sm">
                            {getInitials(project.manager?.name || 'Unassigned')}
                          </div>
                          <span style={{ fontSize: '0.875rem' }}>{project.manager?.name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ backgroundColor: status.bg, color: status.color }}>
                          {status.label}
                        </span>
                      </td>
                      <td style={{ width: '130px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                            <span>{project.completion_percentage}%</span>
                          </div>
                          <div style={{ height: '6px', background: 'var(--surface-elevated)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${project.completion_percentage}%`,
                              background: 'linear-gradient(90deg, var(--accent) 0%, #a855f7 100%)',
                              borderRadius: '999px'
                            }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <div>S: {formatDate(project.start_date)}</div>
                        <div style={{ marginTop: '2px' }}>E: {formatDate(project.end_date)}</div>
                      </td>
                      <td style={{ fontWeight: 500, fontFamily: 'monospace' }}>
                        {formatCurrency(project.budget || 0)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <Link href={`/projects/${project.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.375rem' }}>
                            View Detail
                          </Link>
                          <button
                            onClick={() => { if (confirm('Are you sure you want to delete this project?')) deleteProjectMutation.mutate(project.id); }}
                            className="btn btn-danger btn-sm"
                            style={{ padding: '0.375rem', background: 'none' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        
        // ── Board View (by Status) ──
        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1rem', minHeight: 'calc(100vh - 360px)', alignItems: 'flex-start' }}>
          {(['planning', 'active', 'on_hold', 'completed', 'cancelled'] as Array<Project['status']>).map((statusKey) => {
            const statusCol = STATUS_CONFIG[statusKey];
            const colProjects = filteredProjects.filter(p => p.status === statusKey);
            const isOver = dragOverStatus === statusKey;

            return (
              <div
                key={statusKey}
                onDragOver={(e) => handleDragOver(e, statusKey)}
                onDrop={() => handleDrop(statusKey)}
                onDragLeave={() => setDragOverStatus(null)}
                style={{
                  width: '280px',
                  minWidth: '280px',
                  background: isOver ? 'var(--surface-hover)' : 'var(--surface)',
                  border: isOver ? '2px dashed var(--accent)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: 'calc(100vh - 320px)',
                  transition: 'background var(--transition-fast), border var(--transition-fast)'
                }}
              >
                {/* Header */}
                <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: statusCol.color }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{statusCol.label}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: '9999px', padding: '1px 6px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {colProjects.length}
                  </span>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.625rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {colProjects.length === 0 ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      No projects here
                    </div>
                  ) : (
                    colProjects.map((project) => (
                      <div
                        key={project.id}
                        draggable
                        onDragStart={() => handleDragStart(project.id)}
                        style={{
                          background: 'var(--surface-elevated)',
                          border: '1px solid var(--border)',
                          borderLeft: `4px solid ${statusCol.color}`,
                          borderRadius: 'var(--radius-md)',
                          padding: '0.875rem',
                          cursor: 'grab',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                        }}
                        className="hover:shadow-md hover:border-gray-500"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.375rem' }}>
                          <Link href={`/projects/${project.id}`} style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none' }} className="hover:text-accent flex items-center gap-1">
                            {project.name}
                            <ExternalLink size={10} style={{ opacity: 0.5 }} />
                          </Link>
                        </div>

                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          Client: {project.client_name || 'Walk-in'}
                        </div>

                        {/* Progress */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                            <span>Progress</span>
                            <span>{project.completion_percentage}%</span>
                          </div>
                          <div style={{ height: '4px', background: 'var(--surface)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${project.completion_percentage}%`, background: 'var(--accent)' }} />
                          </div>
                        </div>

                        {/* Footer info */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', marginTop: '0.25rem', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Calendar size={11} /> {formatDate(project.start_date)}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div className="avatar avatar-sm" style={{ width: 18, height: 18, fontSize: '0.55rem' }}>
                              {getInitials(project.manager?.name || 'U')}
                            </div>
                            {project.manager?.name.split(' ')[0]}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Project Slide-over Drawer ── */}
      {showDrawer && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 60 }}
            onClick={() => setShowDrawer(false)}
          />

          {/* Drawer Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="New Project"
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: 520, maxWidth: '90vw',
              background: 'var(--surface)',
              borderLeft: '1px solid var(--border)',
              zIndex: 61,
              display: 'flex', flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)',
              animation: 'slideInRight 0.25s ease',
            }}
          >
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>Create New Project</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Fill in the fields below to schedule a new contract pipeline.</p>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)' }}
                className="hover:text-primary hover:bg-surface-elevated"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Scroll Body */}
            <form onSubmit={handleCreateSubmit} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Stark Website Redesign"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Client (Lead)</label>
                  <select
                    value={newClientId}
                    onChange={(e) => setNewClientId(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select a Lead / Client</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>{l.company_name} (₹{l.budget.toLocaleString()})</option>
                    ))}
                    <option value="walk_in">Walk-in Client / Direct</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Invoice (Select/Search)</label>
                  <select
                    value={newInvoiceId}
                    onChange={(e) => setNewInvoiceId(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select Invoice</option>
                    {invoices.map(inv => (
                      <option key={inv.id} value={inv.id}>{inv.invoice_number} - {inv.title} (₹{inv.total_amount.toLocaleString()})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Manager *</label>
                <select
                  required
                  value={newManagerId}
                  onChange={(e) => setNewManagerId(e.target.value)}
                  className="form-input"
                >
                  <option value="">Select Project Manager</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.employee_id || 'Employee'})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Departments (Select Multiple)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.25rem' }}>
                  {departments.map(dept => {
                    const selected = newDepartmentIds.includes(dept.id);
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => toggleDeptId(dept.id)}
                        className={`badge ${selected ? 'badge-accent' : 'badge-muted'}`}
                        style={{ padding: '0.25rem 0.625rem', border: '1px solid var(--border)', cursor: 'pointer' }}
                      >
                        {dept.name}
                      </button>
                    );
                  })}
                  {departments.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No departments available. Create some first!</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Date *</label>
                  <input
                    type="date"
                    required
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Budget Hours</label>
                  <input
                    type="number"
                    value={newBudgetHours}
                    onChange={(e) => setNewBudgetHours(e.target.value)}
                    className="form-input"
                    placeholder="e.g. 150"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Budget Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newBudgetAmount}
                    onChange={(e) => setNewBudgetAmount(e.target.value)}
                    className="form-input"
                    placeholder="e.g. 500000"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="form-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  placeholder="Details about deliverables, design language, core goals..."
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowDrawer(false); resetForm(); }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProjectMutation.isPending}
                  className="btn btn-primary"
                >
                  {createProjectMutation.isPending ? 'Saving...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
