'use client';

import { useState, useEffect } from 'react';
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

const INVOICE_STATUSES: Array<{ value: Invoice['status']; label: string; color: string }> = [
  { value: 'draft', label: 'Draft', color: 'border-zinc-700 bg-zinc-800 text-zinc-400' },
  { value: 'sent', label: 'Sent', color: 'border-blue-900/50 bg-blue-950/40 text-blue-400' },
  { value: 'partially_paid', label: 'Partially Paid', color: 'border-amber-900/50 bg-amber-950/40 text-amber-400' },
  { value: 'paid', label: 'Paid', color: 'border-emerald-900/50 bg-emerald-950/40 text-emerald-400' },
  { value: 'overdue', label: 'Overdue', color: 'border-red-900/50 bg-red-950/40 text-red-400' },
  { value: 'cancelled', label: 'Cancelled', color: 'border-zinc-800 bg-zinc-900/60 text-zinc-500' },
];

export default function InvoicesDashboard() {
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
  const { data, refetch } = useQuery({
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

  const handleDeleteInvoice = (id: number) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      const updated = allInvoices.filter(inv => inv.id !== id);
      saveStoredInvoices(updated);
      refetch();
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
      
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Receipt className="text-violet-500 w-6 h-6" />
            Invoices & Billings
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Issue client invoices, track collection schedules, record transactions, and analyze aging receivables.
          </p>
        </div>
        <Link href="/invoices/create" className="btn btn-primary flex items-center gap-1.5 self-start sm:self-auto">
          <Plus size={16} /> Create Invoice
        </Link>
      </div>

      {/* ── Stats Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Total Invoiced</p>
              <h3 className="text-xl font-bold text-zinc-100 mt-1">{formatCurrency(totalInvoiced)}</h3>
            </div>
            <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300">
              <Banknote size={16} />
            </div>
          </div>
          <div className="text-[10px] text-zinc-500 mt-3 flex items-center gap-1">
            <Clock size={10} /> Active invoice schedules
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Payments Collected</p>
              <h3 className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(totalCollected)}</h3>
            </div>
            <div className="p-2 rounded-lg bg-emerald-950/30 text-emerald-400">
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <div className="text-[10px] text-zinc-500 mt-3">
            Collection Rate: <span className="text-emerald-500 font-bold">{totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0}%</span>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Outstanding Balance</p>
              <h3 className="text-xl font-bold text-amber-400 mt-1">{formatCurrency(totalOutstanding)}</h3>
            </div>
            <div className="p-2 rounded-lg bg-amber-950/30 text-amber-400">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div className="text-[10px] text-zinc-500 mt-3">
            Pending user logs & collections
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Overdue Receivables</p>
              <h3 className="text-xl font-bold text-red-400 mt-1">{formatCurrency(totalOverdue)}</h3>
            </div>
            <div className="p-2 rounded-lg bg-red-950/30 text-red-400">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="text-[10px] text-zinc-500 mt-3">
            Needs follow-up action
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`pb-2 text-sm font-semibold border-b-2 transition ${
              activeTab === 'invoices' 
                ? 'border-violet-500 text-violet-400' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Invoices List
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-2 text-sm font-semibold border-b-2 transition ${
              activeTab === 'payments' 
                ? 'border-violet-500 text-violet-400' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Collection Log History
          </button>
        </div>

        {/* View Mode Toggle (only for invoices tab) */}
        {activeTab === 'invoices' && (
          <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition ${viewMode === 'table' ? 'bg-zinc-800 text-zinc-150' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Table View"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-md transition ${viewMode === 'board' ? 'bg-zinc-800 text-zinc-150' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Board View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ── Tab: Invoices ── */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-zinc-500 w-4.5 h-4.5" />
              <input
                type="text"
                placeholder="Search by invoice #, client, or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-150 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
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
            filteredInvoices.length === 0 ? (
              <div className="p-12 bg-zinc-900/30 border border-zinc-800 rounded-xl text-center flex flex-col items-center justify-center space-y-3">
                <Receipt size={44} className="text-zinc-600" />
                <h3 className="text-zinc-350 font-medium">No invoices found</h3>
                <p className="text-xs text-zinc-500 max-w-sm">
                  Try adjusting filters or search query, or create a brand new billing layout.
                </p>
                <Link href="/invoices/create" className="btn btn-secondary text-xs">
                  Create First Invoice
                </Link>
              </div>
            ) : (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                        <th className="p-4">Invoice #</th>
                        <th className="p-4">Client Name</th>
                        <th className="p-4">Invoice Title</th>
                        <th className="p-4">Total Amount</th>
                        <th className="p-4">Balance Due</th>
                        <th className="p-4">Due Date</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                      {filteredInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-zinc-900/40 transition">
                          <td className="p-4 font-mono text-xs text-violet-400 font-semibold">
                            {inv.invoice_number}
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-zinc-200">{inv.client_name}</div>
                            {inv.client_email && <div className="text-[10px] text-zinc-500 font-medium">{inv.client_email}</div>}
                          </td>
                          <td className="p-4 truncate max-w-xs font-medium text-zinc-200">
                            {inv.title}
                          </td>
                          <td className="p-4 font-bold text-zinc-150">
                            {formatCurrency(inv.total_amount, inv.currency)}
                          </td>
                          <td className="p-4 font-semibold">
                            {inv.balance_amount > 0 ? (
                              <span className="text-amber-400">{formatCurrency(inv.balance_amount, inv.currency)}</span>
                            ) : (
                              <span className="text-zinc-500">— Paid</span>
                            )}
                          </td>
                          <td className="p-4 text-xs font-medium">
                            {formatDate(inv.due_date)}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              INVOICE_STATUSES.find(s => s.value === inv.status)?.color || 'border-zinc-700 text-zinc-400'
                            }`}>
                              {inv.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <Link
                                href={`/invoices/${inv.id}`}
                                className="p-1.5 rounded bg-zinc-800/80 text-zinc-300 hover:text-violet-400 hover:bg-zinc-755 transition"
                                title="View Details"
                              >
                                <Eye size={14} />
                              </Link>
                              {inv.balance_amount > 0 && inv.status !== 'cancelled' && (
                                <button
                                  onClick={() => openPaymentDrawer(inv)}
                                  className="px-2 py-1 text-xs rounded bg-violet-600/90 text-zinc-100 hover:bg-violet-650 transition font-semibold"
                                >
                                  Record
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteInvoice(inv.id)}
                                className="p-1.5 rounded bg-zinc-800/80 text-red-400 hover:text-red-300 hover:bg-red-950/20 transition"
                                title="Delete Invoice"
                              >
                                <Trash2 size={13} />
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
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
              {INVOICE_STATUSES.map((col) => {
                const columnInvoices = filteredInvoices.filter(inv => inv.status === col.value);
                return (
                  <div key={col.value} className="bg-zinc-900/30 border border-zinc-850 p-3 rounded-xl flex flex-col min-w-[210px] max-h-[70vh]">
                    {/* Header */}
                    <div className="flex justify-between items-center pb-3 border-b border-zinc-800/60 mb-3">
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">{col.label}</span>
                      <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full font-bold">
                        {columnInvoices.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="space-y-3 flex-1 overflow-y-auto min-h-[150px] scrollbar-none">
                      {columnInvoices.length === 0 ? (
                        <div className="border border-dashed border-zinc-800 rounded-lg p-4 text-center text-[10px] text-zinc-600">
                          Empty Column
                        </div>
                      ) : (
                        columnInvoices.map((inv) => {
                          const completionRate = inv.total_amount > 0 ? (inv.paid_amount / inv.total_amount) * 100 : 0;
                          return (
                            <div 
                              key={inv.id}
                              className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg hover:border-violet-500/50 transition cursor-pointer space-y-2.5 relative"
                            >
                              <div className="flex justify-between items-start">
                                <span className="font-mono text-[10px] text-violet-400 font-bold">{inv.invoice_number}</span>
                                <span className="text-[9px] text-zinc-500">{formatDate(inv.due_date)}</span>
                              </div>
                              
                              <div>
                                <h4 className="text-xs font-semibold text-zinc-200 line-clamp-1">{inv.client_name}</h4>
                                <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">{inv.title}</p>
                              </div>

                              <div className="flex justify-between items-center text-[11px] pt-1">
                                <span className="font-bold text-zinc-300">{formatCurrency(inv.total_amount, inv.currency)}</span>
                                {inv.balance_amount > 0 ? (
                                  <span className="text-amber-500 font-semibold">{formatCurrency(inv.balance_amount, inv.currency)} due</span>
                                ) : (
                                  <span className="text-emerald-500 font-bold">Paid</span>
                                )}
                              </div>

                              {/* Progress bar */}
                              <div className="w-full bg-zinc-850 h-1 rounded-full overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-full transition-all duration-350"
                                  style={{ width: `${Math.min(100, completionRate)}%` }}
                                />
                              </div>

                              {/* Hover actions */}
                              <div className="flex justify-end gap-1.5 pt-1.5 border-t border-zinc-800/40">
                                <Link 
                                  href={`/invoices/${inv.id}`}
                                  className="p-1 rounded bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                                  title="View Details"
                                >
                                  <Eye size={11} />
                                </Link>
                                {inv.balance_amount > 0 && inv.status !== 'cancelled' && (
                                  <button
                                    onClick={() => openPaymentDrawer(inv)}
                                    className="px-1.5 py-0.5 rounded bg-violet-650/80 hover:bg-violet-600 text-zinc-100 text-[9px] font-bold"
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
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold text-zinc-200 flex items-center gap-1.5">
              <CreditCard className="text-violet-400 w-4 h-4" />
              Recent Collection Log Transactions
            </h2>
          </div>

          {allPayments.length === 0 ? (
            <div className="p-12 bg-zinc-900/30 border border-zinc-800 rounded-xl text-center flex flex-col items-center justify-center space-y-3">
              <CreditCard size={44} className="text-zinc-600" />
              <h3 className="text-zinc-350 font-medium">No recorded payments</h3>
              <p className="text-xs text-zinc-500">
                Any transactions logged through the "Record Payment" drawer will appear here in chronological order.
              </p>
            </div>
          ) : (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                      <th className="p-4">Payment Receipt</th>
                      <th className="p-4">Invoice #</th>
                      <th className="p-4">Client</th>
                      <th className="p-4">Payment Method</th>
                      <th className="p-4">Txn Reference</th>
                      <th className="p-4">Paid Date</th>
                      <th className="p-4">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {allPayments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-zinc-900/40 transition">
                        <td className="p-4 font-mono text-xs text-emerald-400 font-bold">
                          {pay.payment_number}
                        </td>
                        <td className="p-4">
                          {pay.invoice ? (
                            <Link href={`/invoices/${pay.invoice_id}`} className="font-mono text-xs text-violet-400 font-semibold hover:underline">
                              {pay.invoice.invoice_number}
                            </Link>
                          ) : (
                            <span className="font-mono text-xs text-zinc-500">Invoice #{pay.invoice_id}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-zinc-200">{pay.invoice?.client_name || 'N/A'}</span>
                        </td>
                        <td className="p-4 text-xs font-medium uppercase text-zinc-400">
                          {pay.payment_method.replace('_', ' ')}
                        </td>
                        <td className="p-4 font-mono text-xs text-zinc-400">
                          {pay.transaction_reference || <span className="text-zinc-650 italic">— None</span>}
                        </td>
                        <td className="p-4 text-xs">
                          {formatDate(pay.payment_date)}
                        </td>
                        <td className="p-4 font-bold text-emerald-400">
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
            onClick={closePaymentDrawer}
          />
          {/* Drawer content */}
          <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-zinc-900 border-l border-zinc-800 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-250">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/40">
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Record Client Payment</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Log collection transaction for <span className="font-mono text-violet-400 font-bold">{selectedInvoice.invoice_number}</span>
                </p>
              </div>
              <button 
                onClick={closePaymentDrawer}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRecordPayment} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              
              {paymentError && (
                <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400 flex gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-950/40 rounded-lg border border-zinc-850">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium">Total Billing</span>
                  <p className="text-sm font-bold text-zinc-200">{formatCurrency(selectedInvoice.total_amount, selectedInvoice.currency)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium font-bold text-amber-500">Outstanding</span>
                  <p className="text-sm font-bold text-amber-400">{formatCurrency(selectedInvoice.balance_amount, selectedInvoice.currency)}</p>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Amount to Record ({selectedInvoice.currency})</label>
                <div className="relative">
                  <div className="absolute left-3 top-2.5 text-zinc-500 text-sm font-semibold">
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
                    className="w-full bg-zinc-950 border border-zinc-850 text-zinc-150 text-sm rounded-lg pl-12 pr-4 py-2 outline-none focus:border-violet-500"
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => setPaymentAmount(selectedInvoice.balance_amount)}
                  className="text-[10px] text-violet-400 font-semibold hover:underline"
                >
                  Pay outstanding balance
                </button>
              </div>

              {/* Payment Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Payment Date</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 text-zinc-150 text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-850 text-zinc-150 text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI / Net Banking</option>
                  <option value="card">Credit/Debit Card</option>
                  <option value="cash">Cash Payment</option>
                  <option value="cheque">Cheque Payment</option>
                </select>
              </div>

              {/* Reference */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Transaction Reference # (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UTR / URN number, Cheque #, Txn ID"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 text-zinc-150 text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Internal Notes / Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Memo of transaction, received-by information, bank clearance detail"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 text-zinc-150 text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closePaymentDrawer}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 bg-zinc-850 hover:bg-zinc-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-zinc-100 bg-violet-650 hover:bg-violet-600 rounded-lg transition"
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
