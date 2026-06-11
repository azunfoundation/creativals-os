'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Plus, Building2, Search, Filter, X,
  ExternalLink, Edit2, Trash2, Check, AlertCircle, Calendar,
  DollarSign, FileText, CheckCircle2, RefreshCw, Layers, SlidersHorizontal
} from 'lucide-react';
import {
  expenses as expensesApi,
  vendors as vendorsApi,
  projects as projectsApi,
  users as usersApi,
  Expense,
  Vendor,
  ExpenseCategory,
  Project,
  User
} from '@/lib/api';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

// ============================================================
// Fallback Mock Data for Offline Development
// ============================================================

const MOCK_CATEGORIES: ExpenseCategory[] = [
  { id: 1, name: 'Software & SaaS', slug: 'software-saas', is_active: true },
  { id: 2, name: 'Travel & Lodging', slug: 'travel-lodging', is_active: true },
  { id: 3, name: 'Office Supplies', slug: 'office-supplies', is_active: true },
  { id: 4, name: 'Client Entertainment', slug: 'client-entertainment', is_active: true },
  { id: 5, name: 'Marketing & Ads', slug: 'marketing-ads', is_active: true },
];

const MOCK_VENDORS: Vendor[] = [
  { id: 1, name: 'Amazon Web Services', contact_name: 'Billing Ops', email: 'aws-billing@amazon.com', phone: '', website: 'aws.amazon.com', currency_id: 1, is_active: true, notes: 'SaaS cloud hosting infrastructure' },
  { id: 2, name: 'Figma Inc.', contact_name: 'Sales Team', email: 'support@figma.com', phone: '', website: 'figma.com', currency_id: 1, is_active: true, notes: 'Design tool seats licensing' },
  { id: 3, name: 'Uber India', contact_name: 'Support', email: 'support@uber.com', phone: '', website: 'uber.com', currency_id: 1, is_active: true, notes: 'Travel rides for client meetings' },
  { id: 4, name: 'WeWork India', contact_name: 'Community Lead', email: 'community@wework.co.in', phone: '1800-123-456', website: 'wework.co.in', currency_id: 1, is_active: true, notes: 'Office space rent and utilities' }
];

const MOCK_EXPENSES: Expense[] = [
  {
    id: 1,
    expense_number: 'EXP-2026-0001',
    category_id: 1,
    category: MOCK_CATEGORIES[0],
    project_id: 1,
    project: { id: 1, name: 'Rebranding Stark Industries' } as Project,
    vendor_id: 1,
    vendor: MOCK_VENDORS[0],
    submitted_by: 101,
    submitter: { id: 101, name: 'Amit Verma', email: 'amit@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null },
    title: 'AWS Cloud Hosting - Stark Identity Staging',
    amount: 18500,
    currency_id: 1,
    expense_date: '2026-06-01',
    status: 'approved',
    is_billable: true,
    receipt_url: 'https://drive.google.com/drive/folders/mock-aws-receipt',
    notes: 'Hosting setup for prototyping Stark Industries design language'
  },
  {
    id: 2,
    expense_number: 'EXP-2026-0002',
    category_id: 2,
    category: MOCK_CATEGORIES[1],
    project_id: 1,
    project: { id: 1, name: 'Rebranding Stark Industries' } as Project,
    vendor_id: 3,
    vendor: MOCK_VENDORS[2],
    submitted_by: 102,
    submitter: { id: 102, name: 'Ravi Kumar', email: 'ravi@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null },
    title: 'Travel to Mumbai client headquarters',
    amount: 6800,
    currency_id: 1,
    expense_date: '2026-06-04',
    status: 'submitted',
    is_billable: true,
    receipt_url: 'https://drive.google.com/drive/folders/mock-uber-receipt',
    notes: 'Uber & local transport to Mumbai office for logo presentation'
  },
  {
    id: 3,
    expense_number: 'EXP-2026-0003',
    category_id: 3,
    category: MOCK_CATEGORIES[2],
    vendor_id: 4,
    vendor: MOCK_VENDORS[3],
    submitted_by: 103,
    submitter: { id: 103, name: 'Neha Sharma', email: 'neha@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null },
    title: 'Stationery & Whiteboards',
    amount: 4200,
    currency_id: 1,
    expense_date: '2026-06-08',
    status: 'draft',
    is_billable: false,
    notes: 'Whiteboard markers and sticky notes for brainstorming rooms'
  },
  {
    id: 4,
    expense_number: 'EXP-2026-0004',
    category_id: 1,
    category: MOCK_CATEGORIES[0],
    vendor_id: 2,
    vendor: MOCK_VENDORS[1],
    submitted_by: 101,
    submitter: { id: 101, name: 'Amit Verma', email: 'amit@creativals.in', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null },
    title: 'Figma Professional Team Renewal',
    amount: 14500,
    currency_id: 1,
    expense_date: '2026-06-10',
    status: 'reimbursed',
    is_billable: false,
    receipt_url: 'https://drive.google.com/drive/folders/mock-figma-receipt',
    notes: 'Annual license seats renewal for creative department design tools'
  }
];

const MOCK_PROJECTS = [
  { id: 1, name: 'Rebranding Stark Industries' },
  { id: 2, name: 'Wayne Corporate Website' },
  { id: 3, name: 'Acme Mobile App' }
];

export default function ExpensesDashboard() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Local state fallbacks for offline interaction
  const [localExpenses, setLocalExpenses] = useState<Expense[]>(MOCK_EXPENSES);
  const [localVendors, setLocalVendors] = useState<Vendor[]>(MOCK_VENDORS);

  // Active view states
  const [activeTab, setActiveTab] = useState<'list' | 'approvals'>('list');

  // Filter states
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer / Modals controllers
  const [showDrawer, setShowDrawer] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);

  // Drawer form state
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formVendor, setFormVendor] = useState('');
  const [formProject, setFormProject] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState('1'); // Default Currency ID
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formBillable, setFormBillable] = useState(false);
  const [formReceiptUrl, setFormReceiptUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [validationError, setValidationError] = useState('');

  // Vendor Management state
  const [editingVendorId, setEditingVendorId] = useState<number | null>(null);
  const [vFormName, setVFormName] = useState('');
  const [vFormContact, setVFormContact] = useState('');
  const [vFormEmail, setVFormEmail] = useState('');
  const [vFormPhone, setVFormPhone] = useState('');
  const [vFormWebsite, setVFormWebsite] = useState('');
  const [vFormNotes, setVFormNotes] = useState('');
  const [vValidationError, setVValidationError] = useState('');

  // ============================================================
  // React Query Calls
  // ============================================================

  const { data: expenses = localExpenses } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: async () => {
      try {
        const res = await expensesApi.listExpenses();
        const payload = res.data as any;
        if (payload && Array.isArray(payload.data)) {
          return payload.data;
        }
        return Array.isArray(payload) ? payload : localExpenses;
      } catch {
        return localExpenses;
      }
    }
  });

  const { data: vendors = localVendors } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: async () => {
      try {
        const res = await vendorsApi.listVendors();
        const payload = res.data as any;
        if (payload && Array.isArray(payload.data)) {
          return payload.data;
        }
        return Array.isArray(payload) ? payload : localVendors;
      } catch {
        return localVendors;
      }
    }
  });

  const { data: projects = MOCK_PROJECTS } = useQuery<any[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      try {
        const res = await projectsApi.list();
        const payload = res.data as any;
        if (payload && Array.isArray(payload.data)) {
          return payload.data;
        }
        return Array.isArray(payload) ? payload : MOCK_PROJECTS;
      } catch {
        return MOCK_PROJECTS;
      }
    }
  });

  // ============================================================
  // Mutation Operations
  // ============================================================

  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => expensesApi.createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      resetExpenseForm();
      setShowDrawer(false);
    },
    onError: () => {
      // Mock insert fallback
      const cat = MOCK_CATEGORIES.find(c => c.id === parseInt(formCategory)) || MOCK_CATEGORIES[0];
      const vend = localVendors.find(v => v.id === parseInt(formVendor));
      const proj = projects.find(p => p.id === parseInt(formProject));

      const newExpense: Expense = {
        id: localExpenses.length + 1,
        expense_number: `EXP-2026-${(localExpenses.length + 1).toString().padStart(4, '0')}`,
        category_id: parseInt(formCategory),
        category: cat,
        vendor_id: formVendor ? parseInt(formVendor) : undefined,
        vendor: vend,
        project_id: formProject ? parseInt(formProject) : undefined,
        project: proj,
        submitted_by: user?.id || 101,
        submitter: { id: user?.id || 101, name: user?.name || 'Current User', email: user?.email || '', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null },
        title: formTitle,
        amount: parseFloat(formAmount),
        currency_id: parseInt(formCurrency),
        expense_date: formDate,
        is_billable: formBillable,
        receipt_url: formReceiptUrl || undefined,
        notes: formNotes || undefined,
        status: 'draft'
      };

      setLocalExpenses([newExpense, ...localExpenses]);
      setShowDrawer(false);
      resetExpenseForm();
    }
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => expensesApi.updateExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      resetExpenseForm();
      setShowDrawer(false);
    },
    onError: () => {
      // Mock update fallback
      const cat = MOCK_CATEGORIES.find(c => c.id === parseInt(formCategory)) || MOCK_CATEGORIES[0];
      const vend = localVendors.find(v => v.id === parseInt(formVendor));
      const proj = projects.find(p => p.id === parseInt(formProject));

      setLocalExpenses(prev => prev.map(e => {
        if (e.id === editingExpenseId) {
          return {
            ...e,
            title: formTitle,
            category_id: parseInt(formCategory),
            category: cat,
            vendor_id: formVendor ? parseInt(formVendor) : undefined,
            vendor: vend,
            project_id: formProject ? parseInt(formProject) : undefined,
            project: proj,
            amount: parseFloat(formAmount),
            currency_id: parseInt(formCurrency),
            expense_date: formDate,
            is_billable: formBillable,
            receipt_url: formReceiptUrl || undefined,
            notes: formNotes || undefined
          };
        }
        return e;
      }));
      setShowDrawer(false);
      resetExpenseForm();
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: number) => expensesApi.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err, id) => {
      setLocalExpenses(prev => prev.filter(e => e.id !== id));
    }
  });

  const approveExpenseMutation = useMutation({
    mutationFn: ({ id, action, notes }: { id: number; action: 'approve' | 'reject'; notes?: string }) =>
      expensesApi.approveExpense(id, action, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err, { id, action }) => {
      // Mock approve fallback
      setLocalExpenses(prev => prev.map(e => {
        if (e.id === id) {
          return {
            ...e,
            status: action === 'approve' ? 'approved' : 'rejected',
            approved_by: user?.id || 101,
            approver: { id: user?.id || 101, name: user?.name || 'Approver Admin', email: '', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null }
          };
        }
        return e;
      }));
    }
  });

  // Vendor mutations
  const createVendorMutation = useMutation({
    mutationFn: (data: any) => vendorsApi.createVendor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      resetVendorForm();
    },
    onError: () => {
      const newV: Vendor = {
        id: localVendors.length + 1,
        name: vFormName,
        contact_name: vFormContact || undefined,
        email: vFormEmail || undefined,
        phone: vFormPhone || undefined,
        website: vFormWebsite || undefined,
        notes: vFormNotes || undefined,
        currency_id: 1,
        is_active: true
      };
      setLocalVendors([...localVendors, newV]);
      resetVendorForm();
    }
  });

  const updateVendorMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => vendorsApi.updateVendor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      resetVendorForm();
    },
    onError: () => {
      setLocalVendors(prev => prev.map(v => {
        if (v.id === editingVendorId) {
          return {
            ...v,
            name: vFormName,
            contact_name: vFormContact || undefined,
            email: vFormEmail || undefined,
            phone: vFormPhone || undefined,
            website: vFormWebsite || undefined,
            notes: vFormNotes || undefined
          };
        }
        return v;
      }));
      resetVendorForm();
    }
  });

  const deleteVendorMutation = useMutation({
    mutationFn: (id: number) => vendorsApi.deleteVendor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (err, id) => {
      setLocalVendors(prev => prev.filter(v => v.id !== id));
    }
  });

  // ============================================================
  // Calculations & Filtering
  // ============================================================

  const metrics = useMemo(() => {
    let total = 0;
    let billable = 0;
    let reimbursed = 0;
    let pending = 0;

    expenses.forEach(e => {
      total += e.amount;
      if (e.is_billable) billable += e.amount;
      if (e.status === 'reimbursed') reimbursed += e.amount;
      if (e.status === 'submitted') pending += e.amount;
    });

    return { total, billable, reimbursed, pending };
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (filterCategory && e.category_id !== parseInt(filterCategory)) return false;
      if (filterStatus && e.status !== filterStatus) return false;
      if (filterProject && e.project_id !== parseInt(filterProject)) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(query);
        const matchesNumber = e.expense_number.toLowerCase().includes(query);
        const matchesVendor = e.vendor?.name.toLowerCase().includes(query);
        const matchesUser = e.submitter?.name.toLowerCase().includes(query);
        if (!matchesTitle && !matchesNumber && !matchesVendor && !matchesUser) return false;
      }
      return true;
    });
  }, [expenses, filterCategory, filterStatus, filterProject, searchQuery]);

  const pendingApprovals = useMemo(() => {
    return expenses.filter(e => e.status === 'submitted');
  }, [expenses]);

  // ============================================================
  // Handlers
  // ============================================================

  const resetExpenseForm = () => {
    setFormTitle('');
    setFormCategory('');
    setFormVendor('');
    setFormProject('');
    setFormAmount('');
    setFormCurrency('1');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormBillable(false);
    setFormReceiptUrl('');
    setFormNotes('');
    setValidationError('');
    setEditingExpenseId(null);
  };

  const handleLogExpenseClick = () => {
    resetExpenseForm();
    setShowDrawer(true);
  };

  const handleEditExpense = (e: Expense) => {
    setEditingExpenseId(e.id);
    setFormTitle(e.title);
    setFormCategory(e.category_id.toString());
    setFormVendor(e.vendor_id?.toString() || '');
    setFormProject(e.project_id?.toString() || '');
    setFormAmount(e.amount.toString());
    setFormCurrency(e.currency_id.toString());
    setFormDate(e.expense_date);
    setFormBillable(e.is_billable);
    setFormReceiptUrl(e.receipt_url || '');
    setFormNotes(e.notes || '');
    setShowDrawer(true);
  };

  const handleSubmitExpenseForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formCategory || !formAmount || !formDate) {
      setValidationError('Please fill in all required fields (Title, Category, Amount, Date).');
      return;
    }
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      setValidationError('Amount must be a positive number.');
      return;
    }

    const payload = {
      title: formTitle,
      category_id: parseInt(formCategory),
      vendor_id: formVendor ? parseInt(formVendor) : null,
      project_id: formProject ? parseInt(formProject) : null,
      amount: amt,
      currency_id: parseInt(formCurrency),
      expense_date: formDate,
      is_billable: formBillable,
      receipt_url: formReceiptUrl || null,
      notes: formNotes || null
    };

    if (editingExpenseId) {
      updateExpenseMutation.mutate({ id: editingExpenseId, data: payload });
    } else {
      createExpenseMutation.mutate(payload);
    }
  };

  const handleSubmitForApproval = (id: number) => {
    // For local fallback updates, we simulate transition from draft to submitted
    setLocalExpenses(prev => prev.map(e => {
      if (e.id === id) {
        return { ...e, status: 'submitted' };
      }
      return e;
    }));
    // Proactively call update endpoint setting status to submitted
    expensesApi.updateExpense(id, { status: 'submitted' }).catch(() => {});
  };

  const handleApproveAction = (id: number, action: 'approve' | 'reject') => {
    const note = prompt(`Enter comments for this ${action === 'approve' ? 'approval' : 'rejection'}:`);
    approveExpenseMutation.mutate({ id, action, notes: note || undefined });
  };

  // Vendor handlers
  const resetVendorForm = () => {
    setVFormName('');
    setVFormContact('');
    setVFormEmail('');
    setVFormPhone('');
    setVFormWebsite('');
    setVFormNotes('');
    setVValidationError('');
    setEditingVendorId(null);
  };

  const handleEditVendorClick = (v: Vendor) => {
    setEditingVendorId(v.id);
    setVFormName(v.name);
    setVFormContact(v.contact_name || '');
    setVFormEmail(v.email || '');
    setVFormPhone(v.phone || '');
    setVFormWebsite(v.website || '');
    setVFormNotes(v.notes || '');
  };

  const handleVendorFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vFormName) {
      setVValidationError('Vendor Name is required.');
      return;
    }

    const payload = {
      name: vFormName,
      contact_name: vFormContact || null,
      email: vFormEmail || null,
      phone: vFormPhone || null,
      website: vFormWebsite || null,
      notes: vFormNotes || null
    };

    if (editingVendorId) {
      updateVendorMutation.mutate({ id: editingVendorId, data: payload });
    } else {
      createVendorMutation.mutate(payload);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem' }}>
      
      {/* ── Top Header ── */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Expense Management</h1>
          <p className="text-secondary text-sm">
            Track expenses, manage corporate vendors, process project capitalization, and approve team reimbursements.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowVendorModal(true)}
            className="btn btn-secondary"
          >
            <Building2 size={16} /> Manage Vendors
          </button>
          
          <button
            onClick={handleLogExpenseClick}
            className="btn btn-primary"
          >
            <Plus size={16} /> Log Expense
          </button>
        </div>
      </div>

      {/* ── Metrics Grid ── */}
      <div className="kpi-grid kpi-grid-4">
        <div className="kpi-card">
          <span className="kpi-label">Total Expenses</span>
          <span className="kpi-value">{formatCurrency(metrics.total)}</span>
          <div className="text-xs text-secondary mt-1">Snapshot value in INR</div>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Billable to Clients</span>
          <span className="kpi-value">{formatCurrency(metrics.billable)}</span>
          <div className="text-xs text-secondary mt-1">Capitalized/Billable logs</div>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Reimbursed</span>
          <span className="kpi-value text-success">{formatCurrency(metrics.reimbursed)}</span>
          <div className="text-xs text-secondary mt-1">Paid out to employees</div>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Awaiting Approval</span>
          <span className="kpi-value text-warning">{formatCurrency(metrics.pending)}</span>
          <div className="text-xs text-secondary mt-1">Submitted in inbox</div>
        </div>
      </div>

      {/* ── Main Desk Navigation Tabs ── */}
      <div className="flex border-b" style={{ gap: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('list')}
          style={{
            padding: '0.625rem 0',
            borderBottom: activeTab === 'list' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'list' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'list' ? 600 : 500,
            fontSize: '0.875rem'
          }}
          className="flex items-center gap-2"
        >
          <Layers size={15} />
          Expense Registry ({filteredExpenses.length})
        </button>
        
        <button
          onClick={() => setActiveTab('approvals')}
          style={{
            padding: '0.625rem 0',
            borderBottom: activeTab === 'approvals' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'approvals' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'approvals' ? 600 : 500,
            fontSize: '0.875rem'
          }}
          className="flex items-center gap-2"
        >
          <CheckCircle2 size={15} />
          Approvals Desk ({pendingApprovals.length})
        </button>
      </div>

      {/* ── Tab Layout Container ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        
        {/* ============================================================
            EXPENSE REGISTRY TAB
            ============================================================ */}
        {activeTab === 'list' && (
          <div className="flex flex-col gap-4">
            
            {/* Filters panel */}
            <div className="card-elevated" style={{ padding: '0.875rem 1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search expense title, number, vendor, submitter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2.25rem', height: '36px', fontSize: '0.8125rem' }}
                />
              </div>

              <Filter size={14} style={{ color: 'var(--text-muted)' }} />

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="form-input"
                style={{ width: '150px', height: '36px', padding: '0 0.5rem', fontSize: '0.75rem' }}
              >
                <option value="">All Categories</option>
                {MOCK_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="form-input"
                style={{ width: '130px', height: '36px', padding: '0 0.5rem', fontSize: '0.75rem' }}
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="reimbursed">Reimbursed</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="form-input"
                style={{ width: '160px', height: '36px', padding: '0 0.5rem', fontSize: '0.75rem' }}
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {(filterCategory || filterStatus || filterProject || searchQuery) && (
                <button
                  onClick={() => {
                    setFilterCategory('');
                    setFilterStatus('');
                    setFilterProject('');
                    setSearchQuery('');
                  }}
                  style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                  <X size={12} /> Clear Filters
                </button>
              )}
            </div>

            {/* Expense Registry Table */}
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Date</th>
                    <th>Submitter</th>
                    <th>Title & Category</th>
                    <th>Vendor</th>
                    <th>Project Link</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Billable</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Receipt</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((e) => {
                    let statusBadge = 'badge-muted';
                    if (e.status === 'reimbursed') statusBadge = 'badge-success';
                    if (e.status === 'approved') statusBadge = 'badge-info';
                    if (e.status === 'submitted') statusBadge = 'badge-warning';
                    if (e.status === 'rejected') statusBadge = 'badge-danger';

                    return (
                      <tr key={e.id}>
                        <td className="font-bold text-xs" style={{ color: 'var(--accent)' }}>{e.expense_number}</td>
                        <td className="text-xs">{formatDate(e.expense_date)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="avatar avatar-sm">
                              {getInitials(e.submitter?.name || '')}
                            </div>
                            <span className="text-xs">{e.submitter?.name || 'Member'}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }} className="text-xs">{e.title}</div>
                          <div style={{ fontSize: '0.6875rem' }} className="text-secondary">
                            {e.category?.name || 'Uncategorized'}
                          </div>
                        </td>
                        <td className="text-xs font-semibold">{e.vendor?.name || '—'}</td>
                        <td className="text-xs text-secondary truncate" style={{ maxWidth: '180px' }}>
                          {e.project?.name || '—'}
                        </td>
                        <td style={{ textAlign: 'right' }} className="font-bold text-xs">
                          {formatCurrency(e.amount)}
                        </td>
                        <td>
                          <span className={`badge ${e.is_billable ? 'badge-accent' : 'badge-muted'}`} style={{ fontSize: '0.55rem', padding: '1px 5px' }}>
                            {e.is_billable ? 'Billable' : 'Internal'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${statusBadge}`} style={{ fontSize: '0.55rem', padding: '1px 5px' }}>
                            {e.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {e.receipt_url ? (
                            <a
                              href={e.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: 'inline-flex', color: '#34A853' }}
                              title="Google Drive Receipt Link"
                            >
                              <FileText size={16} />
                            </a>
                          ) : (
                            <span className="text-secondary text-xs">—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                            {e.status === 'draft' && (
                              <>
                                <button
                                  onClick={() => handleSubmitForApproval(e.id)}
                                  className="btn btn-primary btn-sm"
                                  style={{ padding: '2px 6px', fontSize: '0.625rem' }}
                                  title="Submit to Approvals desk"
                                >
                                  Submit
                                </button>
                                <button
                                  onClick={() => handleEditExpense(e)}
                                  style={{ color: 'var(--text-secondary)' }}
                                  className="hover:text-primary p-1"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => { if (confirm('Delete expense?')) deleteExpenseMutation.mutate(e.id); }}
                                  style={{ color: 'var(--text-muted)' }}
                                  className="hover:text-danger p-1"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                            {e.status !== 'draft' && (
                              <span className="text-secondary text-xs italic">Locked</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={11} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        No logged expenses found matching selection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ============================================================
            APPROVALS DESK TAB
            ============================================================ */}
        {activeTab === 'approvals' && (
          <div className="flex flex-col gap-4">
            
            <p className="text-secondary text-xs">
              Review pending reimbursement claims. expenses linked to active clients/projects should be reviewed by Project Managers, while overhead categories route to Finance & Founders.
            </p>

            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Expense No.</th>
                    <th>Submitter</th>
                    <th>Details</th>
                    <th>Vendor</th>
                    <th>Project</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Approver Routing</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApprovals.map((e) => {
                    const routing = e.project_id ? 'Project Manager (PM)' : 'Finance / Founders';
                    return (
                      <tr key={e.id}>
                        <td className="font-bold text-xs" style={{ color: 'var(--accent)' }}>{e.expense_number}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="avatar avatar-sm">
                              {getInitials(e.submitter?.name || '')}
                            </div>
                            <div>
                              <div className="font-semibold text-xs">{e.submitter?.name}</div>
                              <div className="text-secondary" style={{ fontSize: '0.65rem' }}>{formatDate(e.expense_date)}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="font-semibold text-xs">{e.title}</div>
                          <div className="text-secondary" style={{ fontSize: '0.7rem' }}>Category: {e.category?.name}</div>
                          {e.receipt_url && (
                            <a
                              href={e.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent flex items-center gap-1 mt-1 hover:underline"
                              style={{ fontSize: '0.7rem', display: 'inline-flex' }}
                            >
                              <FileText size={10} style={{ color: '#34A853' }} /> View Attachment Receipt
                            </a>
                          )}
                        </td>
                        <td className="text-xs">{e.vendor?.name || '—'}</td>
                        <td className="text-xs text-secondary truncate" style={{ maxWidth: '180px' }}>
                          {e.project?.name || 'General Overheads'}
                        </td>
                        <td style={{ textAlign: 'right' }} className="font-bold text-xs">
                          {formatCurrency(e.amount)}
                        </td>
                        <td>
                          <span className={`badge ${e.project_id ? 'badge-accent' : 'badge-info'}`} style={{ fontSize: '0.55rem', padding: '1px 5px' }}>
                            {routing}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleApproveAction(e.id, 'reject')}
                              className="btn btn-danger btn-sm"
                              style={{ padding: '0.25rem 0.5rem', height: '28px', fontSize: '0.6875rem' }}
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApproveAction(e.id, 'approve')}
                              className="btn btn-primary btn-sm"
                              style={{ padding: '0.25rem 0.5rem', height: '28px', fontSize: '0.6875rem', background: 'var(--success)', borderColor: 'var(--success)' }}
                            >
                              Approve
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {pendingApprovals.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        No pending expenses awaiting approval.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>

      {/* ============================================================
          LOG EXPENSE SLIDING DRAWER
          ============================================================ */}
      {showDrawer && (
        <>
          <div className="overlay" style={{ zIndex: 60 }} onClick={() => setShowDrawer(false)} />
          
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '460px',
              maxWidth: '95%',
              background: 'var(--surface)',
              borderLeft: '1px solid var(--border)',
              zIndex: 61,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)',
              animation: 'slideInRight 0.2s ease',
            }}
          >
            <div className="modal-header border-b" style={{ padding: '1.25rem' }}>
              <h3 className="modal-title flex items-center gap-2">
                <CreditCard size={18} className="text-accent" />
                {editingExpenseId ? 'Edit Logged Expense' : 'Log Corporate Expense'}
              </h3>
              
              <button
                onClick={() => setShowDrawer(false)}
                className="btn btn-ghost btn-icon p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitExpenseForm} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }} className="flex flex-col gap-4">
                
                {validationError && (
                  <div style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                    <AlertCircle size={14} />
                    <span className="text-xs font-semibold">{validationError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Expense Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. AWS Staging Server, Uber meeting taxi..."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="form-input text-xs"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Expense Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="form-input text-xs"
                    required
                  >
                    <option value="">Select Category</option>
                    {MOCK_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Vendor / Merchant *</label>
                  <select
                    value={formVendor}
                    onChange={(e) => setFormVendor(e.target.value)}
                    className="form-input text-xs"
                    required
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                  <p className="text-secondary" style={{ fontSize: '0.65rem' }}>
                    Missing a vendor? Close this drawer and click &quot;Manage Vendors&quot;.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Project Association (Optional)</label>
                  <select
                    value={formProject}
                    onChange={(e) => setFormProject(e.target.value)}
                    className="form-input text-xs"
                  >
                    <option value="">No Project Link (Overhead)</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 5000"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="form-input text-xs"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select
                      value={formCurrency}
                      onChange={(e) => setFormCurrency(e.target.value)}
                      className="form-input text-xs"
                    >
                      <option value="1">INR (₹)</option>
                      <option value="2">USD ($)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Expense Date *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="form-input text-xs"
                    required
                  />
                </div>

                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' }}>
                  <input
                    type="checkbox"
                    id="is_billable"
                    checked={formBillable}
                    onChange={(e) => setFormBillable(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                  />
                  <label htmlFor="is_billable" className="form-label cursor-pointer" style={{ marginBottom: 0 }}>
                    Billable to Client (Capitalize cost)
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">Receipt URL (Google Drive)</label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={formReceiptUrl}
                    onChange={(e) => setFormReceiptUrl(e.target.value)}
                    className="form-input text-xs"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes & Description</label>
                  <textarea
                    rows={3}
                    placeholder="Add purpose description..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="form-input text-xs"
                    style={{ resize: 'none' }}
                  />
                </div>

              </div>

              <div className="modal-footer border-t" style={{ padding: '1rem 1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
                  className="btn btn-primary btn-sm"
                >
                  {editingExpenseId ? 'Save Edits' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ============================================================
          MANAGE VENDORS MODAL
          ============================================================ */}
      {showVendorModal && (
        <div className="overlay" style={{ zIndex: 60 }} onClick={() => setShowVendorModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px', width: '95%' }}>
            
            <div className="modal-header border-b">
              <h3 className="modal-title flex items-center gap-2">
                <Building2 size={18} className="text-accent" />
                Manage Corporate Vendors
              </h3>
              
              <button
                onClick={() => { setShowVendorModal(false); resetVendorForm(); }}
                className="btn btn-ghost btn-icon p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body flex flex-col gap-4" style={{ padding: '1.25rem' }}>
              
              {/* Form to Create/Edit Vendor */}
              <form onSubmit={handleVendorFormSubmit} className="card-elevated flex flex-col gap-3" style={{ padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
                  {editingVendorId ? 'Edit Vendor Details' : 'Add New Vendor'}
                </h4>
                
                {vValidationError && (
                  <p className="text-xs text-danger font-semibold">{vValidationError}</p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} className="kpi-grid-6">
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Vendor Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. AWS, Github Inc."
                      value={vFormName}
                      onChange={(e) => setVFormName(e.target.value)}
                      className="form-input text-xs"
                      style={{ padding: '0.375rem 0.5rem', height: '32px' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Contact Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Finance Ops"
                      value={vFormContact}
                      onChange={(e) => setVFormContact(e.target.value)}
                      className="form-input text-xs"
                      style={{ padding: '0.375rem 0.5rem', height: '32px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }} className="kpi-grid-3">
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Email</label>
                    <input
                      type="email"
                      placeholder="e.g. bills@aws.com"
                      value={vFormEmail}
                      onChange={(e) => setVFormEmail(e.target.value)}
                      className="form-input text-xs"
                      style={{ padding: '0.375rem 0.5rem', height: '32px' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 99..."
                      value={vFormPhone}
                      onChange={(e) => setVFormPhone(e.target.value)}
                      className="form-input text-xs"
                      style={{ padding: '0.375rem 0.5rem', height: '32px' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Website</label>
                    <input
                      type="text"
                      placeholder="e.g. aws.amazon.com"
                      value={vFormWebsite}
                      onChange={(e) => setVFormWebsite(e.target.value)}
                      className="form-input text-xs"
                      style={{ padding: '0.375rem 0.5rem', height: '32px' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Internal Notes</label>
                  <textarea
                    rows={1}
                    placeholder="AWS cloud staging server subscriptions..."
                    value={vFormNotes}
                    onChange={(e) => setVFormNotes(e.target.value)}
                    className="form-input text-xs"
                    style={{ resize: 'none', padding: '0.375rem 0.5rem' }}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  {editingVendorId && (
                    <button
                      type="button"
                      onClick={resetVendorForm}
                      className="btn btn-secondary btn-sm"
                      style={{ height: '28px', fontSize: '0.7rem' }}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    style={{ height: '28px', fontSize: '0.7rem' }}
                  >
                    {editingVendorId ? 'Save Changes' : 'Add Vendor'}
                  </button>
                </div>
              </form>

              {/* Vendors List Table */}
              <div className="data-table-wrap" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Vendor Name</th>
                      <th>Contact Person</th>
                      <th>Email / Website</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((v) => (
                      <tr key={v.id}>
                        <td>
                          <div className="font-semibold text-xs text-primary">{v.name}</div>
                          {v.notes && <div className="text-secondary" style={{ fontSize: '0.65rem' }}>{v.notes}</div>}
                        </td>
                        <td className="text-xs">{v.contact_name || '—'}</td>
                        <td>
                          {v.email && <div className="text-xs">{v.email}</div>}
                          {v.website && (
                            <a
                              href={`https://${v.website.replace(/^(https?:\/\/)?(www\.)?/, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent flex items-center gap-1 hover:underline text-xs"
                              style={{ display: 'inline-flex' }}
                            >
                              {v.website} <ExternalLink size={10} />
                            </a>
                          )}
                          {!v.email && !v.website && <span className="text-secondary text-xs">—</span>}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                            <button
                              onClick={() => handleEditVendorClick(v)}
                              style={{ color: 'var(--text-secondary)' }}
                              className="hover:text-primary p-1"
                              title="Edit Vendor"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => { if (confirm('Delete this vendor?')) deleteVendorMutation.mutate(v.id); }}
                              style={{ color: 'var(--text-muted)' }}
                              className="hover:text-danger p-1"
                              title="Delete Vendor"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>

            <div className="modal-footer border-t" style={{ padding: '0.75rem 1.25rem' }}>
              <button
                type="button"
                onClick={() => { setShowVendorModal(false); resetVendorForm(); }}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
