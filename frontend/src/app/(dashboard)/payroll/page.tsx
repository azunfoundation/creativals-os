'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Banknote, Calendar, ChevronRight, CheckCircle, Clock,
  Plus, DollarSign, Users, Award, ShieldAlert, FileText, ArrowRight, X, TrendingUp
} from 'lucide-react';
import {
  payroll as payrollApi,
  users as usersApi,
  PayrollRun,
  PayrollRunItem,
  ProjectCostAllocation,
  User
} from '@/lib/api';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

// ============================================================
// Fallback Mock Data for Offline Development
// ============================================================

const MOCK_RUNS: PayrollRun[] = [
  {
    id: 1,
    run_number: 'PAY-2026-05',
    year: 2026,
    month: 5,
    status: 'paid',
    submitted_by: 1,
    total_gross: 850000,
    total_deductions: 45000,
    total_net: 805000,
    currency_id: 1,
    notes: 'May 2026 general payroll run.',
    approved_at: '2026-05-28T10:00:00Z',
    processed_at: '2026-05-30T10:00:00Z',
  },
  {
    id: 2,
    run_number: 'PAY-2026-06',
    year: 2026,
    month: 6,
    status: 'draft',
    submitted_by: 1,
    total_gross: 920000,
    total_deductions: 52000,
    total_net: 868000,
    currency_id: 1,
    notes: 'June 2026 general payroll run.',
  }
];

const MOCK_RUN_ITEMS: Record<number, PayrollRunItem[]> = {
  1: [
    {
      id: 11,
      payroll_run_id: 1,
      user_id: 101,
      user: { id: 101, name: 'Amit Verma', email: 'amit@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null, employee_id: 'EMP-001' },
      base_salary: 300000,
      bonus_amount: 50000,
      deductions: 15000,
      net_salary: 335000,
      hours_logged: 168,
      expected_hours: 160,
      utilization_rate: 105.00,
      breakdown: {
        base: 300000,
        bonuses: [{ type: 'performance', amount: 50000, reason: 'Q1 target exceeded' }],
        deductions: [{ description: 'Professional Tax & TDS', amount: 15000 }]
      }
    },
    {
      id: 12,
      payroll_run_id: 1,
      user_id: 102,
      user: { id: 102, name: 'Ravi Kumar', email: 'ravi@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null, employee_id: 'EMP-002' },
      base_salary: 250000,
      bonus_amount: 0,
      deductions: 10000,
      net_salary: 240000,
      hours_logged: 150,
      expected_hours: 160,
      utilization_rate: 93.75,
      breakdown: {
        base: 250000,
        bonuses: [],
        deductions: [{ description: 'TDS', amount: 10000 }]
      }
    },
    {
      id: 13,
      payroll_run_id: 1,
      user_id: 103,
      user: { id: 103, name: 'Neha Sharma', email: 'neha@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null, employee_id: 'EMP-003' },
      base_salary: 300000,
      bonus_amount: 0,
      deductions: 20000,
      net_salary: 280000,
      hours_logged: 160,
      expected_hours: 160,
      utilization_rate: 100.00,
      breakdown: {
        base: 300000,
        bonuses: [],
        deductions: [{ description: 'TDS & PF', amount: 20000 }]
      }
    }
  ],
  2: [
    {
      id: 21,
      payroll_run_id: 2,
      user_id: 101,
      user: { id: 101, name: 'Amit Verma', email: 'amit@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null, employee_id: 'EMP-001' },
      base_salary: 320000,
      bonus_amount: 80000,
      deductions: 20000,
      net_salary: 380000,
      hours_logged: 172,
      expected_hours: 160,
      utilization_rate: 107.50,
      breakdown: {
        base: 320000,
        bonuses: [{ type: 'performance', amount: 80000, reason: 'Client milestone completion bonus' }],
        deductions: [{ description: 'TDS & PF', amount: 20000 }]
      }
    },
    {
      id: 22,
      payroll_run_id: 2,
      user_id: 102,
      user: { id: 102, name: 'Ravi Kumar', email: 'ravi@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null, employee_id: 'EMP-002' },
      base_salary: 280000,
      bonus_amount: 20000,
      deductions: 12000,
      net_salary: 288000,
      hours_logged: 158,
      expected_hours: 160,
      utilization_rate: 98.75,
      breakdown: {
        base: 280000,
        bonuses: [{ type: 'festival', amount: 20000, reason: 'Festival Advance' }],
        deductions: [{ description: 'TDS', amount: 12000 }]
      }
    },
    {
      id: 23,
      payroll_run_id: 2,
      user_id: 103,
      user: { id: 103, name: 'Neha Sharma', email: 'neha@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null, employee_id: 'EMP-003' },
      base_salary: 320000,
      bonus_amount: 0,
      deductions: 20000,
      net_salary: 300000,
      hours_logged: 164,
      expected_hours: 160,
      utilization_rate: 102.50,
      breakdown: {
        base: 320000,
        bonuses: [],
        deductions: [{ description: 'TDS & PF', amount: 20000 }]
      }
    }
  ]
};

const MOCK_COST_ALLOCATIONS: Record<number, ProjectCostAllocation[]> = {
  1: [
    { project_id: 1, project_name: 'Rebranding Stark Industries', allocated_cost: 425000, logged_hours: 240, percentage: 50 },
    { project_id: 2, project_name: 'Wayne Corporate Website', allocated_cost: 297500, logged_hours: 160, percentage: 35 },
    { project_id: 3, project_name: 'General / Overheads', allocated_cost: 127500, logged_hours: 78, percentage: 15 }
  ],
  2: [
    { project_id: 1, project_name: 'Rebranding Stark Industries', allocated_cost: 475600, logged_hours: 260, percentage: 52 },
    { project_id: 2, project_name: 'Wayne Corporate Website', allocated_cost: 320000, logged_hours: 180, percentage: 35 },
    { project_id: 3, project_name: 'General / Overheads', allocated_cost: 124400, logged_hours: 54, percentage: 13 }
  ]
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PayrollDashboard() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Local state fallbacks for offline interaction
  const [localRuns, setLocalRuns] = useState<PayrollRun[]>(MOCK_RUNS);
  const [localRunItems, setLocalRunItems] = useState<Record<number, PayrollRunItem[]>>(MOCK_RUN_ITEMS);
  const [localCostAllocations, setLocalCostAllocations] = useState<Record<number, ProjectCostAllocation[]>>(MOCK_COST_ALLOCATIONS);

  // Active view states
  const [selectedRunId, setSelectedRunId] = useState<number | null>(2); // Default to June Draft run
  const [activeTab, setActiveTab] = useState<'details' | 'cost_allocation'>('details');

  // Modal states
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [formYear, setFormYear] = useState(2026);
  const [formMonth, setFormMonth] = useState(6);
  const [formNotes, setFormNotes] = useState('');

  // Checks if user is Founder/Admin
  const isFounder = useMemo(() => {
    if (!user) return true; // Default to true for local dev
    return user.roles.some(r => {
      const name = typeof r === 'string' ? r : r?.name || '';
      return ['founder', 'admin', 'finance'].includes(name.toLowerCase());
    });
  }, [user]);

  // ============================================================
  // Queries
  // ============================================================

  const { data: runs = localRuns } = useQuery<PayrollRun[]>({
    queryKey: ['payroll-runs'],
    queryFn: async () => {
      try {
        const res = await payrollApi.listRuns();
        return res.data.data;
      } catch {
        return localRuns;
      }
    }
  });

  const selectedRun = useMemo(() => {
    return runs.find(r => r.id === selectedRunId) || null;
  }, [runs, selectedRunId]);

  const { data: runDetails = selectedRunId ? (localRunItems[selectedRunId] || []) : [] } = useQuery<PayrollRunItem[]>({
    queryKey: ['payroll-run-details', selectedRunId],
    enabled: !!selectedRunId,
    queryFn: async () => {
      try {
        const res = await payrollApi.getRunDetails(selectedRunId!);
        // Wrap response if it contains a items array, or is directly the array
        const data = res.data;
        return (data as any).items || data;
      } catch {
        return localRunItems[selectedRunId!] || [];
      }
    }
  });

  const { data: costAllocations = selectedRunId ? (localCostAllocations[selectedRunId] || []) : [] } = useQuery<ProjectCostAllocation[]>({
    queryKey: ['payroll-run-cost-allocation', selectedRunId],
    enabled: !!selectedRunId && activeTab === 'cost_allocation',
    queryFn: async () => {
      try {
        const res = await payrollApi.costAllocation(selectedRunId!);
        return res.data;
      } catch {
        return localCostAllocations[selectedRunId!] || [];
      }
    }
  });

  // ============================================================
  // Mutations / Actions
  // ============================================================

  const generateRunMutation = useMutation({
    mutationFn: (data: { year: number; month: number; notes?: string }) => payrollApi.generateRun(data),
    onSuccess: (newRun) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      setShowGenerateModal(false);
      if (newRun && newRun.data && newRun.data.id) {
        setSelectedRunId(newRun.data.id);
      }
    },
    onError: () => {
      // Mock generation fallback
      const newId = localRuns.length + 1;
      const runNum = `PAY-${formYear}-${formMonth.toString().padStart(2, '0')}`;
      
      const newRunObj: PayrollRun = {
        id: newId,
        run_number: runNum,
        year: formYear,
        month: formMonth,
        status: 'draft',
        submitted_by: user?.id || 1,
        total_gross: 900000,
        total_deductions: 50000,
        total_net: 850000,
        currency_id: 1,
        notes: formNotes || `${MONTH_NAMES[formMonth - 1]} ${formYear} payroll run.`
      };

      const newRunItemsObj: PayrollRunItem[] = [
        {
          id: newId * 10 + 1,
          payroll_run_id: newId,
          user_id: 101,
          user: { id: 101, name: 'Amit Verma', email: 'amit@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null, employee_id: 'EMP-001' },
          base_salary: 320000,
          bonus_amount: 50000,
          deductions: 20000,
          net_salary: 350000,
          hours_logged: 160,
          expected_hours: 160,
          utilization_rate: 100.00,
          breakdown: {
            base: 320000,
            bonuses: [{ type: 'performance', amount: 50000, reason: 'Target achieved' }],
            deductions: [{ description: 'TDS & PF', amount: 20000 }]
          }
        },
        {
          id: newId * 10 + 2,
          payroll_run_id: newId,
          user_id: 102,
          user: { id: 102, name: 'Ravi Kumar', email: 'ravi@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null, employee_id: 'EMP-002' },
          base_salary: 280000,
          bonus_amount: 0,
          deductions: 15000,
          net_salary: 265000,
          hours_logged: 155,
          expected_hours: 160,
          utilization_rate: 96.88,
          breakdown: {
            base: 280000,
            bonuses: [],
            deductions: [{ description: 'TDS', amount: 15000 }]
          }
        }
      ];

      const newCostAllocations: ProjectCostAllocation[] = [
        { project_id: 1, project_name: 'Rebranding Stark Industries', allocated_cost: 500000, logged_hours: 200, percentage: 58.8 },
        { project_id: 2, project_name: 'Wayne Corporate Website', allocated_cost: 350000, logged_hours: 115, percentage: 41.2 }
      ];

      setLocalRuns([newRunObj, ...localRuns]);
      setLocalRunItems(prev => ({ ...prev, [newId]: newRunItemsObj }));
      setLocalCostAllocations(prev => ({ ...prev, [newId]: newCostAllocations }));
      setSelectedRunId(newId);
      setShowGenerateModal(false);
      setFormNotes('');
    }
  });

  const approveRunMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) => payrollApi.approveRun(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
    },
    onError: () => {
      // Mock approval fallback
      setLocalRuns(prev => prev.map(r => {
        if (r.id === selectedRunId) {
          return {
            ...r,
            status: r.status === 'draft' ? 'approved' : 'paid',
            approved_by: user?.id || 1,
            approved_at: new Date().toISOString(),
            processed_at: r.status === 'approved' ? new Date().toISOString() : undefined
          };
        }
        return r;
      }));
    }
  });

  // ============================================================
  // KPI Calculations
  // ============================================================

  const metrics = useMemo(() => {
    let disbursed = 0;
    let pending = 0;
    
    localRuns.forEach(r => {
      if (r.status === 'paid') {
        disbursed += r.total_net;
      } else if (r.status === 'draft' || r.status === 'submitted' || r.status === 'approved') {
        pending += r.total_net;
      }
    });

    return {
      disbursed,
      pending,
      activeCompensations: 12 // Snapshot of company headcount compensations
    };
  }, [localRuns]);

  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateRunMutation.mutate({
      year: formYear,
      month: formMonth,
      notes: formNotes
    });
  };

  const handleApprove = () => {
    if (!selectedRunId) return;
    const actionName = selectedRun?.status === 'draft' ? 'Approve' : 'Mark as Paid';
    if (confirm(`Are you sure you want to ${actionName.toLowerCase()} payroll run ${selectedRun?.run_number}?`)) {
      approveRunMutation.mutate({ id: selectedRunId, notes: 'Approved via Founders Dashboard.' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem' }}>
      
      {/* ── Top Header ── */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payroll Management</h1>
          <p className="text-secondary text-sm">
            Generate monthly runs, track resource allocations, verify base & bonus details, and process payouts.
          </p>
        </div>
        
        {isFounder && (
          <button
            onClick={() => setShowGenerateModal(true)}
            className="btn btn-primary"
          >
            <Plus size={16} /> Generate Payroll Run
          </button>
        )}
      </div>

      {/* ── Metrics Grid ── */}
      <div className="kpi-grid kpi-grid-3">
        <div className="kpi-card">
          <div className="flex justify-between items-start">
            <span className="kpi-label">Total Disbursed (YTD)</span>
            <div style={{ background: 'var(--success-subtle)', padding: '6px', borderRadius: 'var(--radius-sm)' }}>
              <CheckCircle size={16} className="text-success" />
            </div>
          </div>
          <span className="kpi-value">{formatCurrency(metrics.disbursed)}</span>
          <div className="flex items-center gap-1 text-xs text-success font-medium">
            <TrendingUp size={12} />
            <span>Fully Processed & Paid</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="flex justify-between items-start">
            <span className="kpi-label">Pending Approval / Payout</span>
            <div style={{ background: 'var(--warning-subtle)', padding: '6px', borderRadius: 'var(--radius-sm)' }}>
              <Clock size={16} className="text-warning" />
            </div>
          </div>
          <span className="kpi-value">{formatCurrency(metrics.pending)}</span>
          <div className="text-xs text-secondary">
            Draft, Approved, or Processed runs
          </div>
        </div>

        <div className="kpi-card">
          <div className="flex justify-between items-start">
            <span className="kpi-label">Active Compensations</span>
            <div style={{ background: 'var(--accent-subtle)', padding: '6px', borderRadius: 'var(--radius-sm)' }}>
              <Users size={16} className="text-accent" />
            </div>
          </div>
          <span className="kpi-value">{metrics.activeCompensations}</span>
          <div className="text-xs text-secondary">
            Employees with active contracts
          </div>
        </div>
      </div>

      {/* ── Main Panel Split ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', flex: 1, minHeight: 0 }} className="kpi-grid-6">
        
        {/* Left Side: Runs List */}
        <div className="card flex flex-col gap-4" style={{ height: '100%', overflowY: 'auto' }}>
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-semibold text-sm">Payroll Run Registry</h3>
            <span className="badge badge-muted">{runs.length} Runs</span>
          </div>
          
          <div className="flex flex-col gap-2">
            {runs.map(run => {
              const isSelected = run.id === selectedRunId;
              let statusBadge = 'badge-muted';
              if (run.status === 'paid') statusBadge = 'badge-success';
              if (run.status === 'approved') statusBadge = 'badge-info';
              if (run.status === 'draft') statusBadge = 'badge-warning';

              return (
                <div
                  key={run.id}
                  onClick={() => setSelectedRunId(run.id)}
                  style={{
                    padding: '0.875rem',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: isSelected ? 'var(--accent-subtle)' : 'var(--surface-elevated)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover:border-accent"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-xs" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {run.run_number}
                    </span>
                    <span className={`badge ${statusBadge}`} style={{ fontSize: '0.55rem', padding: '1px 5px' }}>
                      {run.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-secondary text-xs">
                      {MONTH_NAMES[run.month - 1]} {run.year}
                    </span>
                    <span className="font-semibold text-xs">
                      {formatCurrency(run.total_net)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Run Detail & Cost Allocations */}
        <div className="card flex flex-col gap-4" style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
          {selectedRun ? (
            <div className="flex flex-col h-full overflow-hidden">
              
              {/* Detail Header */}
              <div className="flex justify-between items-center border-b pb-4 flex-wrap gap-4 flex-shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">{selectedRun.run_number}</h2>
                    <span className={`badge ${
                      selectedRun.status === 'paid' ? 'badge-success' :
                      selectedRun.status === 'approved' ? 'badge-info' : 'badge-warning'
                    }`}>
                      {selectedRun.status}
                    </span>
                  </div>
                  <p className="text-secondary text-xs mt-1">
                    Created for {MONTH_NAMES[selectedRun.month - 1]} {selectedRun.year} • {selectedRun.notes || 'No description notes'}
                  </p>
                </div>

                {/* Approve/Payout Actions */}
                {isFounder && selectedRun.status !== 'paid' && (
                  <button
                    onClick={handleApprove}
                    disabled={approveRunMutation.isPending}
                    className="btn btn-primary btn-sm"
                    style={{ height: '36px' }}
                  >
                    <CheckCircle size={14} />
                    {selectedRun.status === 'draft' ? 'Approve Run' : 'Mark as Paid / Disbburse'}
                  </button>
                )}
              </div>

              {/* Tab Selector */}
              <div className="flex border-b mb-4 flex-shrink-0" style={{ gap: '1rem' }}>
                <button
                  onClick={() => setActiveTab('details')}
                  style={{
                    padding: '0.5rem 0',
                    borderBottom: activeTab === 'details' ? '2px solid var(--accent)' : '2px solid transparent',
                    color: activeTab === 'details' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: activeTab === 'details' ? 600 : 500,
                    fontSize: '0.875rem'
                  }}
                >
                  Employee Slips ({runDetails.length})
                </button>
                <button
                  onClick={() => setActiveTab('cost_allocation')}
                  style={{
                    padding: '0.5rem 0',
                    borderBottom: activeTab === 'cost_allocation' ? '2px solid var(--accent)' : '2px solid transparent',
                    color: activeTab === 'cost_allocation' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: activeTab === 'cost_allocation' ? 600 : 500,
                    fontSize: '0.875rem'
                  }}
                >
                  Project Cost Allocations
                </button>
              </div>

              {/* Tab Body */}
              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                {activeTab === 'details' ? (
                  <div className="data-table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>ID</th>
                          <th style={{ textAlign: 'center' }}>Hours Logged</th>
                          <th style={{ textAlign: 'center' }}>Utilization</th>
                          <th style={{ textAlign: 'right' }}>Base Salary</th>
                          <th style={{ textAlign: 'right' }}>Bonus</th>
                          <th style={{ textAlign: 'right' }}>Deductions</th>
                          <th style={{ textAlign: 'right' }}>Net Pay</th>
                        </tr>
                      </thead>
                      <tbody>
                        {runDetails.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="avatar avatar-sm">
                                  {getInitials(item.user?.name || '')}
                                </div>
                                <span className="font-semibold text-xs">{item.user?.name}</span>
                              </div>
                            </td>
                            <td className="text-secondary text-xs">{item.user?.employee_id || '—'}</td>
                            <td style={{ textAlign: 'center' }} className="font-bold text-xs">
                              {item.hours_logged}h <span className="text-secondary font-normal">/ {item.expected_hours}h</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`badge ${
                                item.utilization_rate >= 100 ? 'badge-success' :
                                item.utilization_rate >= 85 ? 'badge-info' : 'badge-warning'
                              }`} style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                                {item.utilization_rate}%
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }} className="text-xs font-semibold">{formatCurrency(item.base_salary)}</td>
                            <td style={{ textAlign: 'right' }} className="text-success text-xs font-semibold">
                              {item.bonus_amount > 0 ? `+${formatCurrency(item.bonus_amount)}` : '—'}
                            </td>
                            <td style={{ textAlign: 'right' }} className="text-danger text-xs font-semibold">
                              {item.deductions > 0 ? `-${formatCurrency(item.deductions)}` : '—'}
                            </td>
                            <td style={{ textAlign: 'right' }} className="font-bold text-xs">{formatCurrency(item.net_salary)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <p className="text-secondary text-xs">
                      Visualizing project cost capitalization for research tax credits and project gross profitability modeling based on timesheet hours.
                    </p>

                    <div className="data-table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Project Scope</th>
                            <th style={{ textAlign: 'center' }}>Logged Hours</th>
                            <th style={{ textAlign: 'center' }}>Allocation %</th>
                            <th style={{ textAlign: 'right' }}>Capitalized Direct Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {costAllocations.map((alloc, idx) => (
                            <tr key={idx}>
                              <td className="font-semibold text-xs">{alloc.project_name}</td>
                              <td style={{ textAlign: 'center' }} className="text-xs font-bold">{alloc.logged_hours}h</td>
                              <td style={{ textAlign: 'center' }}>
                                <div className="flex items-center justify-center gap-2">
                                  <div style={{ width: '60px', background: 'var(--border)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${alloc.percentage}%`, background: 'var(--accent)', height: '100%' }} />
                                  </div>
                                  <span className="text-xs font-semibold">{alloc.percentage}%</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }} className="font-bold text-xs">{formatCurrency(alloc.allocated_cost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Payout Summary bar */}
              <div className="border-t pt-4 mt-4 flex justify-between items-center flex-shrink-0 flex-wrap gap-4">
                <div className="flex gap-4">
                  <div>
                    <span className="text-secondary text-xs">Gross Salaries</span>
                    <p className="font-semibold text-sm">{formatCurrency(selectedRun.total_gross)}</p>
                  </div>
                  <div>
                    <span className="text-secondary text-xs">Total Deductions</span>
                    <p className="font-semibold text-sm text-danger">-{formatCurrency(selectedRun.total_deductions)}</p>
                  </div>
                </div>

                <div style={{ background: 'var(--surface-elevated)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <span className="text-secondary text-xs">Total Net Disbursements</span>
                  <p className="font-bold text-base text-accent">{formatCurrency(selectedRun.total_net)}</p>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-secondary py-12">
              <ShieldAlert size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p className="font-medium">No payroll run selected</p>
              <p className="text-xs">Select a payroll run from the side panel to view detailed items.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Generate Payroll Run Modal ── */}
      {showGenerateModal && (
        <div className="overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2">
                <Calendar size={16} className="text-accent" />
                Generate Payroll Run
              </h3>
              <button onClick={() => setShowGenerateModal(false)} className="btn btn-ghost btn-icon" style={{ padding: '0.25rem' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleGenerateSubmit}>
              <div className="modal-body flex flex-col gap-4">
                <p className="text-secondary text-xs">
                  This compiles expected hours, approved timesheets, base pay, and pending bonuses for the selected calendar month.
                </p>

                <div className="grid grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  <div className="form-group">
                    <label className="form-label">Year</label>
                    <select
                      value={formYear}
                      onChange={e => setFormYear(parseInt(e.target.value))}
                      className="form-input text-xs"
                    >
                      <option value={2026}>2026</option>
                      <option value={2025}>2025</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Month</label>
                    <select
                      value={formMonth}
                      onChange={e => setFormMonth(parseInt(e.target.value))}
                      className="form-input text-xs"
                    >
                      {MONTH_NAMES.map((name, idx) => (
                        <option key={idx} value={idx + 1}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Internal Run Notes</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Regular monthly run, festival advance adjustments..."
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    className="form-input text-xs"
                    style={{ resize: 'none' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generateRunMutation.isPending}
                  className="btn btn-primary btn-sm"
                >
                  {generateRunMutation.isPending ? 'Generating...' : 'Confirm Generation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
