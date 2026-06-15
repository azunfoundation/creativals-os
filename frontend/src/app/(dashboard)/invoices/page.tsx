'use client';

import { useState, useEffect } from 'react'; 
import { SkeletonTable } from '@/components/ui/Skeleton'; 
import { EmptyState } from '@/components/ui/EmptyState'; 
import { useModal } from '@/providers/ModalProvider';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { invoices as invoicesApi, payments as paymentsApi } from '@/lib/api';
import type { Invoice, Payment } from '@/lib/api';
import { 
  Plus, Search, Receipt, ChevronLeft, ChevronRight, Eye, 
  Calendar, DollarSign, Check, X, Banknote, LayoutGrid, 
  List, Trash2, ArrowUpRight, ArrowDownLeft, CreditCard, Clock, AlertTriangle 
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

const INITIAL_INVOICES: Invoice[] = [
  {
    id: 1,
    invoice_number: 'INV-2026-0001',
    quote_id: 2,
    title: 'Mobile App Custom Development - Milestone 1',
    client_name: 'NovaTech Corp',
    client_email: 'billing@novatech.com',
    currency: 'INR',
    issue_date: '2026-06-01',
    due_date: '2026-06-15',
    status: 'partially_paid',
    approval_status: 'approved',
    subtotal: 150000,
    discount_amount: 0,
    tax_amount: 27000,
    total_amount: 177000,
    paid_amount: 100000,
    balance_amount: 77000,
    terms_conditions: 'Payment is due within 14 days of issue date.',
    notes: 'Thank you for your business.',
    items: [
      {
        description: 'React Native Mobile App Development - Phase 1 UI/UX & Authentication setup',
        quantity: 1,
        unit_price: 150000,
        tax_rate: 18,
        discount_percentage: 0,
        subtotal: 150000,
        discount_amount: 0,
        tax_amount: 27000,
        total_amount: 177000,
      }
    ],
    payments: [
      {
        id: 101,
        invoice_id: 1,
        payment_number: 'PAY-2026-0001',
        amount: 100000,
        payment_method: 'bank_transfer',
        transaction_reference: 'TXN-9823120938',
        payment_date: '2026-06-05',
        notes: 'First installment payment.',
        created_at: '2026-06-05',
        updated_at: '2026-06-05'
      }
    ],
    approvals: [
      {
        id: 201,
        invoice_id: 1,
        user_name: 'Sarah Connor',
        role: 'Billing Lead',
        status: 'approved',
        comments: 'Verified milestone delivery deliverables. Approved.',
        actioned_at: '2026-06-02',
        created_at: '2026-06-01'
      }
    ],
    created_at: '2026-06-01',
    updated_at: '2026-06-05'
  },
  {
    id: 2,
    invoice_number: 'INV-2026-0002',
    quote_id: 1,
    title: 'Website Redesign Project',
    client_name: 'Apex Designs',
    client_email: 'accounts@apexdesigns.io',
    currency: 'INR',
    issue_date: '2026-06-10',
    due_date: '2026-06-24',
    status: 'sent',
    approval_status: 'approved',
    subtotal: 180000,
    discount_amount: 15000,
    tax_amount: 29700,
    total_amount: 194700,
    paid_amount: 0,
    balance_amount: 194700,
    terms_conditions: 'Payment is due within 14 days of invoice date.',
    items: [
      {
        description: 'UI/UX Redesign & Development of Corporate Website',
        quantity: 1,
        unit_price: 180000,
        tax_rate: 18,
        discount_percentage: 8.33,
        subtotal: 180000,
        discount_amount: 15000,
        tax_amount: 29700,
        total_amount: 194700,
      }
    ],
    payments: [],
    approvals: [
      {
        id: 202,
        invoice_id: 2,
        user_name: 'Sarah Connor',
        role: 'Billing Lead',
        status: 'approved',
        comments: 'Design phase completed, invoice approved for client dispatch.',
        actioned_at: '2026-06-10',
        created_at: '2026-06-10'
      }
    ],
    created_at: '2026-06-10',
    updated_at: '2026-06-10'
  },
  {
    id: 3,
    invoice_number: 'INV-2026-0003',
    title: 'Brand Collaterals Design',
    client_name: 'GreenLife Retail',
    client_email: 'hello@greenlife.com',
    currency: 'INR',
    issue_date: '2026-05-15',
    due_date: '2026-05-29',
    status: 'paid',
    approval_status: 'approved',
    subtotal: 90000,
    discount_amount: 10000,
    tax_amount: 14400,
    total_amount: 94400,
    paid_amount: 94400,
    balance_amount: 0,
    terms_conditions: 'Paid in full.',
    items: [
      {
        description: 'Design of Brochure, Business Cards & Social Banners Pack',
        quantity: 1,
        unit_price: 90000,
        tax_rate: 18,
        discount_percentage: 11.11,
        subtotal: 90000,
        discount_amount: 10000,
        tax_amount: 14400,
        total_amount: 94400,
      }
    ],
    payments: [
      {
        id: 102,
        invoice_id: 3,
        payment_number: 'PAY-2026-0002',
        amount: 94400,
        payment_method: 'upi',
        transaction_reference: 'UPI-7740293849',
        payment_date: '2026-05-18',
        notes: 'Full payment.',
        created_at: '2026-05-18',
        updated_at: '2026-05-18'
      }
    ],
    approvals: [
      {
        id: 203,
        invoice_id: 3,
        user_name: 'Sarah Connor',
        role: 'Billing Lead',
        status: 'approved',
        comments: 'Approved.',
        actioned_at: '2026-05-15',
        created_at: '2026-05-15'
      }
    ],
    created_at: '2026-05-15',
    updated_at: '2026-05-18'
  },
  {
    id: 4,
    invoice_number: 'INV-2026-0004',
    title: 'Marketing Consultations - May 2026',
    client_name: 'EduPath Learning',
    client_email: 'contact@edupath.edu.in',
    currency: 'INR',
    issue_date: '2026-05-01',
    due_date: '2026-05-15',
    status: 'overdue',
    approval_status: 'approved',
    subtotal: 50000,
    discount_amount: 0,
    tax_amount: 9000,
    total_amount: 59000,
    paid_amount: 0,
    balance_amount: 59000,
    terms_conditions: 'Payment is due within 14 days.',
    items: [
      {
        description: 'AdWords & Social Media Campaign Advisory Hours',
        quantity: 10,
        unit_price: 5000,
        tax_rate: 18,
        discount_percentage: 0,
        subtotal: 50000,
        discount_amount: 0,
        tax_amount: 9000,
        total_amount: 59000,
      }
    ],
    payments: [],
    approvals: [
      {
        id: 204,
        invoice_id: 4,
        user_name: 'Sarah Connor',
        role: 'Billing Lead',
        status: 'approved',
        comments: 'Consulting timesheet verified. Approved for billing.',
        actioned_at: '2026-05-01',
        created_at: '2026-05-01'
      }
    ],
    created_at: '2026-05-01',
    updated_at: '2026-05-01'
  },
  {
    id: 5,
    invoice_number: 'INV-2026-0005',
    title: 'Branding & Social Media Kit',
    client_name: 'TechSolutions Inc',
    client_email: 'finance@techsolutions.com',
    currency: 'INR',
    issue_date: '2026-06-11',
    due_date: '2026-06-25',
    status: 'draft',
    approval_status: 'draft',
    subtotal: 75000,
    discount_amount: 5000,
    tax_amount: 12600,
    total_amount: 82600,
    paid_amount: 0,
    balance_amount: 82600,
    terms_conditions: 'Payment is due within 14 days of issue date.',
    notes: 'Please review before final signature.',
    items: [
      {
        description: 'Brand Identity Guidelines & Social Assets Creator Pack',
        quantity: 1,
        unit_price: 75000,
        tax_rate: 18,
        discount_percentage: 6.67,
        subtotal: 75000,
        discount_amount: 5000,
        tax_amount: 12600,
        total_amount: 82600,
      }
    ],
    payments: [],
    approvals: [],
    created_at: '2026-06-11',
    updated_at: '2026-06-11'
  }
];
const getStoredData = (): { invoices: Invoice[]; payments: Payment[] } => {
  if (typeof window === 'undefined') return { invoices: INITIAL_INVOICES, payments: [] };
  const storedInvoices = localStorage.getItem('creativals_invoices');
  let invoices = INITIAL_INVOICES;
  if (storedInvoices) {
    try {
      invoices = JSON.parse(storedInvoices);
      invoices = invoices.map(inv => ({
        ...inv,
        approval_status: inv.approval_status || (inv.status === 'draft' ? 'draft' : 'approved'),
        approvals: inv.approvals || []
      }));
    } catch {
      invoices = INITIAL_INVOICES;
    }
  } else {
    localStorage.setItem('creativals_invoices', JSON.stringify(INITIAL_INVOICES));
  }

  // extract payments
  const paymentsList: Payment[] = [];
  invoices.forEach(inv => {
    if (inv.payments) {
      inv.payments.forEach(p => {
        paymentsList.push({ ...p, invoice: inv });
      });
    }
  });
  
  paymentsList.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  
  return { invoices, payments: paymentsList };
};

const saveStoredInvoices = (invoices: Invoice[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('creativals_invoices', JSON.stringify(invoices));
  }
};

const INVOICE_STATUSES: Array<{ value: Invoice['status']; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function InvoicesDashboard() {
  const { confirm, prompt } = useModal();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');
  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Record Payment drawer states
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'card' | 'upi' | 'cash' | 'cheque'>('bank_transfer');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState('');

  // Fetch Invoices and Payments using React Query
  const { data, refetch, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['invoices_dashboard'],
    queryFn: async () => {
      try {
        // Attempt backend endpoint
        const res = await invoicesApi.list();
        const apiInvoices = res.data?.data || res.data || [];
        const localData = getStoredData();
        
        // Merge API invoices with local storage details (approvals, status, payments, etc.)
        const mergedInvoices = [...apiInvoices];
        localData.invoices.forEach((localInv) => {
          const index = mergedInvoices.findIndex(
            (apiInv) => apiInv.id === localInv.id || apiInv.invoice_number === localInv.invoice_number
          );
          if (index === -1) {
            mergedInvoices.push(localInv);
          } else {
            // Keep the local storage approvals/approval_status and payments if they exist
            mergedInvoices[index] = {
              ...mergedInvoices[index],
              approval_status: localInv.approval_status || mergedInvoices[index].approval_status,
              approvals: localInv.approvals || mergedInvoices[index].approvals || [],
              payments: localInv.payments || mergedInvoices[index].payments || [],
              paid_amount: localInv.paid_amount || mergedInvoices[index].paid_amount,
              balance_amount: localInv.balance_amount || mergedInvoices[index].balance_amount,
              status: localInv.status || mergedInvoices[index].status,
            };
          }
        });

        // Re-gather payments from all merged invoices
        const paymentsList: Payment[] = [];
        mergedInvoices.forEach(inv => {
          if (inv.payments) {
            inv.payments.forEach(p => {
              paymentsList.push({ ...p, invoice: inv });
            });
          }
        });
        paymentsList.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

        return { invoices: mergedInvoices, payments: paymentsList };
      } catch {
        // Failover to localStorage
        return getStoredData();
      }
    },
  });

  const allInvoices = data?.invoices || [];
  const allPayments = data?.payments || [];

  // Filtered invoices
  const filteredInvoices = allInvoices.filter((inv) => {
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const totalInvoiced = allInvoices
    .filter(inv => inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + inv.total_amount, 0);
  
  const totalCollected = allInvoices
    .filter(inv => inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + inv.paid_amount, 0);

  const totalOutstanding = allInvoices
    .filter(inv => inv.status !== 'cancelled' && inv.status !== 'paid')
    .reduce((sum, inv) => sum + inv.balance_amount, 0);

  const totalOverdue = allInvoices
    .filter(inv => inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.balance_amount, 0);

  // Trigger Record Payment
  const openPaymentDrawer = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.balance_amount);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('bank_transfer');
    setPaymentRef('');
    setPaymentNotes('');
    setPaymentError('');
    setPaymentDrawerOpen(true);
  };

  const closePaymentDrawer = () => {
    setPaymentDrawerOpen(false);
    setSelectedInvoice(null);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    if (paymentAmount <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      return;
    }

    if (paymentAmount > selectedInvoice.balance_amount) {
      setPaymentError(`Payment amount cannot exceed outstanding balance of ${formatCurrency(selectedInvoice.balance_amount, selectedInvoice.currency)}`);
      return;
    }

    const newPayment: Payment = {
      id: Math.floor(Math.random() * 100000),
      invoice_id: selectedInvoice.id,
      payment_number: `PAY-2026-${String(allPayments.length + 1).padStart(4, '0')}`,
      amount: Number(paymentAmount),
      payment_method: paymentMethod,
      transaction_reference: paymentRef || undefined,
      payment_date: paymentDate,
      notes: paymentNotes || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      // Attempt to hit payments API
      await paymentsApi.create({
        invoice_id: newPayment.invoice_id,
        amount: newPayment.amount,
        payment_method: newPayment.payment_method,
        transaction_reference: newPayment.transaction_reference,
        payment_date: newPayment.payment_date,
        notes: newPayment.notes
      });
    } catch {
      // Handled locally
    }

    // Update locally in localStorage
    const updatedInvoices = allInvoices.map((inv) => {
      if (inv.id === selectedInvoice.id) {
        const paid_amount = Number(inv.paid_amount) + Number(paymentAmount);
        const balance_amount = Number(inv.total_amount) - paid_amount;
        let status: Invoice['status'] = inv.status;

        if (balance_amount <= 0) {
          status = 'paid';
        } else {
          status = 'partially_paid';
        }

        const invoicePayments = inv.payments ? [...inv.payments, newPayment] : [newPayment];
        
        return {
          ...inv,
          paid_amount,
          balance_amount,
          status,
          payments: invoicePayments,
          updated_at: new Date().toISOString().split('T')[0]
        };
      }
      return inv;
    });

    saveStoredInvoices(updatedInvoices);
    refetch();
    queryClient.invalidateQueries({ queryKey: ['invoices_dashboard'] });
    closePaymentDrawer();
  };

  const handleDeleteInvoice = async (id: number) => {
    if (await confirm({ message: 'Are you sure you want to delete this invoice?', variant: 'danger' })) {
      const updated = allInvoices.filter(inv => inv.id !== id);
      saveStoredInvoices(updated);
      refetch();
    }
  };

  // Helper: Status badge colors
  const getStatusBadge = (status: Invoice['status']) => {
    const badges: Record<Invoice['status'], { label: string; className: string }> = {
      draft: { label: 'Draft', className: 'badge-muted' },
      sent: { label: 'Sent', className: 'badge-info' },
      partially_paid: { label: 'Partially Paid', className: 'badge-warning' },
      paid: { label: 'Paid', className: 'badge-success' },
      overdue: { label: 'Overdue', className: 'badge-danger' },
      cancelled: { label: 'Cancelled', className: 'badge-muted' },
    };

    const config = badges[status] || { label: status, className: 'badge-muted' };

    return (
      <span className={`badge ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* ── Top Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Receipt className="text-accent" size={24} />
            Invoices & Billings
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Issue client invoices, track collection schedules, record transactions, and analyze aging receivables.
          </p>
        </div>
        <Link href="/invoices/create" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} /> Create Invoice
        </Link>
      </div>

      {/* ── Stats Summary Cards ── */}
      <div className="kpi-grid kpi-grid-4">
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="kpi-label">Total Invoiced</span>
              <span className="kpi-value">{formatCurrency(totalInvoiced)}</span>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--surface-elevated)', color: 'var(--text-secondary)', display: 'flex' }}>
              <Banknote size={16} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <Clock size={12} /> Active invoice schedules
          </div>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="kpi-label">Payments Collected</span>
              <span className="kpi-value text-success">{formatCurrency(totalCollected)}</span>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--success-subtle)', color: 'var(--success)', display: 'flex' }}>
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Collection Rate: <span className="text-success font-bold">{totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0}%</span>
          </div>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="kpi-label">Outstanding Balance</span>
              <span className="kpi-value text-warning">{formatCurrency(totalOutstanding)}</span>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--warning-subtle)', color: 'var(--warning)', display: 'flex' }}>
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Pending user logs & collections
          </div>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="kpi-label">Overdue Receivables</span>
              <span className="kpi-value text-danger">{formatCurrency(totalOverdue)}</span>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--danger-subtle)', color: 'var(--danger)', display: 'flex' }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Needs follow-up action
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <button
            onClick={() => setActiveTab('invoices')}
            style={{
              paddingBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              borderBottom: '2px solid',
              borderColor: activeTab === 'invoices' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'invoices' ? 'var(--accent)' : 'var(--text-secondary)',
              transition: 'all var(--transition-fast)'
            }}
          >
            Invoices List
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            style={{
              paddingBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              borderBottom: '2px solid',
              borderColor: activeTab === 'payments' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'payments' ? 'var(--accent)' : 'var(--text-secondary)',
              transition: 'all var(--transition-fast)'
            }}
          >
            Collection Log History
          </button>
        </div>

        {/* View Mode Toggle (only for invoices tab) */}
        {activeTab === 'invoices' && (
          <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', padding: '2px', borderRadius: 'var(--radius-md)' }}>
            <button
              onClick={() => setViewMode('table')}
              className={`btn btn-icon ${viewMode === 'table' ? 'btn-secondary' : ''}`}
              style={{ padding: '0.375rem', borderRadius: 'var(--radius-sm)', color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-muted)' }}
              title="Table View"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`btn btn-icon ${viewMode === 'board' ? 'btn-secondary' : ''}`}
              style={{ padding: '0.375rem', borderRadius: 'var(--radius-sm)', color: viewMode === 'board' ? 'var(--text-primary)' : 'var(--text-muted)' }}
              title="Board View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ── Tab: Invoices ── */}
      {activeTab === 'invoices' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by invoice #, client, or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.5rem', width: '100%' }}
              />
            </div>

            {/* Filter Dropdown */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-input"
                style={{ width: '180px' }}
              >
                <option value="all">All Invoices</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Table View */}
          {viewMode === 'table' && (
            isLoadingInvoices ? (
              <div className="data-table-wrap">
                <SkeletonTable rows={5} cols={6} />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <EmptyState
                title="No invoices found"
                description="Try adjusting filters or search query, or create a brand new billing layout."
                action={
                  <Link href="/invoices/create" className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }}>
                    Create First Invoice
                  </Link>
                }
              />
            ) : (
              <div className="data-table-wrap">
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Client Name</th>
                        <th>Invoice Title</th>
                        <th>Total Amount</th>
                        <th>Balance Due</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((inv) => (
                        <tr key={inv.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>
                            {inv.invoice_number}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inv.client_name}</div>
                            {inv.client_email && <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '2px' }}>{inv.client_email}</div>}
                          </td>
                          <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, color: 'var(--text-primary)' }}>
                            {inv.title}
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {formatCurrency(inv.total_amount, inv.currency)}
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {inv.balance_amount > 0 ? (
                              <span style={{ color: 'var(--warning)' }}>{formatCurrency(inv.balance_amount, inv.currency)}</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>— Paid</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            {formatDate(inv.due_date)}
                          </td>
                          <td>
                            {getStatusBadge(inv.status)}
                          </td>
                          <td>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.375rem' }}>
                              <Link
                                href={`/invoices/${inv.id}`}
                                className="btn btn-ghost btn-sm btn-icon"
                                title="View Details"
                              >
                                <Eye size={14} />
                              </Link>
                              {inv.balance_amount > 0 && inv.status !== 'cancelled' && (
                                <button
                                  onClick={() => openPaymentDrawer(inv)}
                                  className="btn btn-primary btn-sm"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                >
                                  Record
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteInvoice(inv.id)}
                                className="btn btn-danger btn-sm btn-icon"
                                title="Delete Invoice"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* Board View */}
          {viewMode === 'board' && (
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
              {INVOICE_STATUSES.map((col) => {
                const columnInvoices = filteredInvoices.filter(inv => inv.status === col.value);
                return (
                  <div key={col.value} className="card" style={{ display: 'flex', flexDirection: 'column', minWidth: '220px', maxHeight: '70vh', padding: '1rem', gap: '0.75rem' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>{col.label}</span>
                      <span style={{ fontSize: '0.6875rem', background: 'var(--surface-elevated)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '9999px', fontWeight: 700 }}>
                        {columnInvoices.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', minHeight: '150px' }}>
                      {columnInvoices.length === 0 ? (
                        <div style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Empty Column
                        </div>
                      ) : (
                        columnInvoices.map((inv) => {
                          const completionRate = inv.total_amount > 0 ? (inv.paid_amount / inv.total_amount) * 100 : 0;
                          return (
                            <div 
                              key={inv.id}
                              className="card"
                              style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', cursor: 'pointer', position: 'relative' }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.6875rem', color: 'var(--accent)', fontWeight: 700 }}>{inv.invoice_number}</span>
                                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{formatDate(inv.due_date)}</span>
                              </div>
                              
                              <div>
                                <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.client_name}</h4>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{inv.title}</p>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', paddingTop: '4px' }}>
                                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(inv.total_amount, inv.currency)}</span>
                                {inv.balance_amount > 0 ? (
                                  <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{formatCurrency(inv.balance_amount, inv.currency)} due</span>
                                ) : (
                                  <span style={{ color: 'var(--success)', fontWeight: 700 }}>Paid</span>
                                )}
                              </div>

                              {/* Progress bar */}
                              <div style={{ width: '100%', backgroundColor: 'var(--border-subtle)', height: '4px', borderRadius: '9999px', overflow: 'hidden' }}>
                                <div 
                                  style={{ backgroundColor: 'var(--success)', height: '100%', width: `${Math.min(100, completionRate)}%`, transition: 'width var(--transition-base)' }}
                                />
                              </div>

                              {/* Hover actions */}
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                                <Link 
                                  href={`/invoices/${inv.id}`}
                                  className="btn btn-ghost btn-sm btn-icon"
                                  title="View Details"
                                >
                                  <Eye size={12} />
                                </Link>
                                {inv.balance_amount > 0 && inv.status !== 'cancelled' && (
                                  <button
                                    onClick={() => openPaymentDrawer(inv)}
                                    className="btn btn-primary btn-sm"
                                    style={{ padding: '0.125rem 0.5rem', fontSize: '0.6875rem' }}
                                  >
                                    Pay
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Payments Log ── */}
      {activeTab === 'payments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard className="text-accent" size={18} />
              Recent Collection Log Transactions
            </h2>
          </div>

          {allPayments.length === 0 ? (
            <div className="empty-state">
              <CreditCard size={48} className="empty-state-icon" />
              <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>No recorded payments</p>
              <p style={{ fontSize: '0.875rem' }}>
                Any transactions logged through the "Record Payment" drawer will appear here in chronological order.
              </p>
            </div>
          ) : (
            <div className="data-table-wrap">
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Payment Receipt</th>
                      <th>Invoice #</th>
                      <th>Client</th>
                      <th>Payment Method</th>
                      <th>Txn Reference</th>
                      <th>Paid Date</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPayments.map((pay) => (
                      <tr key={pay.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
                          {pay.payment_number}
                        </td>
                        <td>
                          {pay.invoice ? (
                            <Link href={`/invoices/${pay.invoice_id}`} style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>
                              {pay.invoice.invoice_number}
                            </Link>
                          ) : (
                            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Invoice #{pay.invoice_id}</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pay.invoice?.client_name || 'N/A'}</span>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                          {pay.payment_method.replace('_', ' ')}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {pay.transaction_reference || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>— None</span>}
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {formatDate(pay.payment_date)}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                          {formatCurrency(pay.amount, pay.invoice?.currency || 'INR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Record Payment Drawer (Sliding Overlay) ── */}
      {paymentDrawerOpen && selectedInvoice && (
        <>
          {/* Backdrop */}
          <div 
            style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', zIndex: 50, transition: 'opacity var(--transition-base)' }}
            onClick={closePaymentDrawer}
          />
          {/* Drawer content */}
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '420px', background: 'var(--surface)', borderLeft: '1px solid var(--border)', zIndex: 100, display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', animation: 'slideInRight var(--transition-slow)' }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-elevated)' }}>
              <div>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 600 }}>Record Client Payment</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Log collection transaction for <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700 }}>{selectedInvoice.invoice_number}</span>
                </p>
              </div>
              <button 
                onClick={closePaymentDrawer}
                className="btn btn-icon btn-secondary"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRecordPayment} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {paymentError && (
                <div style={{ padding: '0.75rem 1rem', background: 'var(--danger-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--danger)', display: 'flex', gap: '0.5rem' }}>
                  <AlertTriangle style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Summary stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '0.75rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Billing</span>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(selectedInvoice.total_amount, selectedInvoice.currency)}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Outstanding</span>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--warning)' }}>{formatCurrency(selectedInvoice.balance_amount, selectedInvoice.currency)}</p>
                </div>
              </div>

              {/* Amount Input */}
              <div className="form-group">
                <label className="form-label">Amount to Record ({selectedInvoice.currency})</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>
                    {selectedInvoice.currency}
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    max={selectedInvoice.balance_amount}
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="form-input"
                    style={{ paddingLeft: '3.5rem' }}
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => setPaymentAmount(selectedInvoice.balance_amount)}
                  style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 600, alignSelf: 'flex-start', marginTop: '2px', cursor: 'pointer' }}
                >
                  Pay outstanding balance
                </button>
              </div>

              {/* Payment Date */}
              <div className="form-group">
                <label className="form-label">Payment Date</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Payment Method */}
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="form-input"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI / Net Banking</option>
                  <option value="card">Credit/Debit Card</option>
                  <option value="cash">Cash Payment</option>
                  <option value="cheque">Cheque Payment</option>
                </select>
              </div>

              {/* Reference */}
              <div className="form-group">
                <label className="form-label">Transaction Reference # (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UTR / URN number, Cheque #, Txn ID"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Internal Notes / Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Memo of transaction, received-by information, bank clearance detail"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="form-input"
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: 'auto' }}>
                <button
                  type="button"
                  onClick={closePaymentDrawer}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Submit Payment
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
