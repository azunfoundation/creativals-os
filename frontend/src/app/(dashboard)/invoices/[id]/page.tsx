'use client';

import { use, useState, useEffect } from 'react'; 
import { SkeletonTable } from '@/components/ui/Skeleton'; 
import { EmptyState } from '@/components/ui/EmptyState'; 
import { useModal } from '@/providers/ModalProvider'; 
import { useToast } from '@/hooks/useToast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoices as invoicesApi, payments as paymentsApi, creditNotes as creditNotesApi } from '@/lib/api';
import type { Invoice, Payment, InvoiceApproval } from '@/lib/api';
import { 
  ArrowLeft, Printer, FileText, Calendar, Building, CreditCard, 
  User as UserIcon, AlertCircle, X, Banknote, HelpCircle, CheckCircle, 
  Trash2, Plus, Clock, Mail, Loader2
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

interface Params {
  id: string;
}

// ── Safe currency code resolver ──────────────────────────────────
function resolveCurrencyCode(currency: any): string {
  if (!currency) return 'INR';
  if (typeof currency === 'string') return currency;
  if (typeof currency === 'object') {
    return currency.code ?? currency.currency_code ?? currency.symbol ?? 'INR';
  }
  return 'INR';
}

export default function InvoiceDetailPage({ params }: { params: Promise<Params> }) {
  const { confirm, prompt } = useModal();
  const { showToast } = useToast();
  const resolvedParams = use(params);
  const invoiceId = Number(resolvedParams.id);

  const queryClient = useQueryClient();
  const router = useRouter();

  // Drawer modal states
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'card' | 'upi' | 'cash' | 'cheque'>('bank_transfer');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [creditNoteDrawerOpen, setCreditNoteDrawerOpen] = useState(false);
  const [creditNoteAmount, setCreditNoteAmount] = useState<number>(0);
  const [creditNoteReason, setCreditNoteReason] = useState('');

  // Fetch Invoice Details
  const { data: rawInvoice, isLoading, refetch } = useQuery<Invoice>({
    queryKey: ['invoice-detail', invoiceId],
    queryFn: async () => {
      try {
        // Try backend API first
        const res = await invoicesApi.get(invoiceId);
        const apiInv = res.data;
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('creativals_invoices');
          if (stored) {
            const list: Invoice[] = JSON.parse(stored);
            const localInv = list.find(inv => inv.id === invoiceId);
            if (localInv) {
              return {
                ...apiInv,
                approval_status: localInv.approval_status || apiInv.approval_status,
                approvals: localInv.approvals || apiInv.approvals || [],
                payments: localInv.payments || apiInv.payments || [],
                paid_amount: localInv.paid_amount || apiInv.paid_amount,
                balance_amount: localInv.balance_amount || apiInv.balance_amount,
                status: localInv.status || apiInv.status
              };
            }
          }
        }
        return apiInv;
      } catch {
        // Fallback to localStorage
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('creativals_invoices');
          if (stored) {
            const list: Invoice[] = JSON.parse(stored);
            const found = list.find(inv => inv.id === invoiceId);
            if (found) return found;
          }
        }
        throw new Error('Invoice not found');
      }
    }
  });

  const invoice = rawInvoice ? {
    ...rawInvoice,
    approval_status: rawInvoice.approval_status || (rawInvoice.status === 'draft' ? 'draft' : 'approved'),
    approvals: rawInvoice.approvals || []
  } : null;

  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleEmailClient = async () => {
    if (!invoice) return;
    setSendingEmail(true);
    setEmailStatus(null);
    try {
      await invoicesApi.send(invoice.id);
      setEmailStatus({ type: 'success', message: 'Invoice notice emailed to client successfully.' });
      setTimeout(() => setEmailStatus(null), 5000);
    } catch (err: any) {
      setEmailStatus({ 
        type: 'error', 
        message: err.response?.data?.message || 'Failed to email invoice. Please check SMTP settings.' 
      });
      setTimeout(() => setEmailStatus(null), 7000);
    } finally {
      setSendingEmail(false);
    }
  };

  const { user } = useAuthStore();
  const [approvalComments, setApprovalComments] = useState('');

  const handleUpdateApprovalStatus = async (newApprovalStatus: 'pending' | 'approved' | 'rejected') => {
    if (!invoice) return;

    const currentUserName = user?.name || 'Jane Doe';
    const currentUserRole = user?.roles?.[0]?.display_name || 'Manager';

    const newApproval: InvoiceApproval = {
      id: Math.floor(Math.random() * 100000),
      invoice_id: invoice.id,
      user_name: currentUserName,
      role: currentUserRole,
      status: newApprovalStatus,
      comments: approvalComments || (newApprovalStatus === 'pending' ? 'Submitted invoice for review.' : newApprovalStatus === 'approved' ? 'Approved' : 'Rejected'),
      actioned_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('creativals_invoices');
      if (stored) {
        const list: Invoice[] = JSON.parse(stored);
        const updatedList = list.map(inv => {
          if (inv.id === invoice.id) {
            const approvals = inv.approvals ? [...inv.approvals, newApproval] : [newApproval];
            let status = inv.status;
            if (newApprovalStatus === 'approved') {
              status = 'sent';
            } else if (newApprovalStatus === 'rejected') {
              status = 'draft';
            }
            return {
              ...inv,
              approval_status: newApprovalStatus,
              status,
              approvals,
              updated_at: new Date().toISOString().split('T')[0]
            };
          }
          return inv;
        });
        localStorage.setItem('creativals_invoices', JSON.stringify(updatedList));
      }
    }

    try {
      if (newApprovalStatus === 'approved') {
        await invoicesApi.update(invoice.id, { status: 'sent' });
      } else if (newApprovalStatus === 'rejected') {
        await invoicesApi.update(invoice.id, { status: 'draft' });
      }
    } catch {
      // ignore API errors and keep localStorage
    }

    setApprovalComments('');
    queryClient.invalidateQueries({ queryKey: ['invoices_dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['invoice-detail', invoiceId] });
    refetch();
  };

  useEffect(() => {
    if (invoice) {
      setPaymentAmount(invoice.balance_amount);
    }
  }, [rawInvoice]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-[1400px] mx-auto p-6 text-center space-y-4">
        <AlertCircle size={48} className="text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-zinc-200">Invoice Not Found</h2>
        <p className="text-sm text-zinc-400">The invoice you are looking for does not exist or has been deleted.</p>
        <Link href="/invoices" className="btn btn-secondary inline-block">Back to Invoices</Link>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setDownloadingPdf(true);
    try {
      const res = await invoicesApi.downloadPdf(invoice.id);
      const url = window.URL.createObjectURL(new Blob([res.data as any]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoice.invoice_number || 'invoice'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      showToast('Failed to download PDF', 'info');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleCreateCreditNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || creditNoteAmount <= 0) return;
    try {
      await creditNotesApi.create({
        invoice_id: invoice.id,
        amount: Number(creditNoteAmount),
        reason: creditNoteReason,
        issue_date: new Date().toISOString().split('T')[0]
      });
      setCreditNoteDrawerOpen(false);
      setCreditNoteAmount(0);
      setCreditNoteReason('');
      queryClient.invalidateQueries({ queryKey: ['invoice-detail', invoiceId] });
      refetch();
    } catch (err) {
      showToast('Failed to create credit note', 'info');
    }
  };

  const handleDeleteInvoice = async () => {
    if (await confirm({ message: 'Are you sure you want to delete this invoice? This action cannot be undone.', variant: 'danger' })) {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('creativals_invoices');
        if (stored) {
          const list: Invoice[] = JSON.parse(stored);
          const filtered = list.filter(inv => inv.id !== invoiceId);
          localStorage.setItem('creativals_invoices', JSON.stringify(filtered));
        }
      }
      // Trigger API delete if applicable
      invoicesApi.delete(invoiceId).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['invoices_dashboard'] });
      router.push('/invoices');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      return;
    }
    if (paymentAmount > invoice.balance_amount) {
      setPaymentError(`Payment amount cannot exceed outstanding balance.`);
      return;
    }

    const newPayment: Payment = {
      id: Math.floor(Math.random() * 100000),
      invoice_id: invoice.id,
      payment_number: `PAY-2026-${String((invoice.payments?.length || 0) + 1).padStart(4, '0')}`,
      amount: Number(paymentAmount),
      payment_method: paymentMethod,
      transaction_reference: paymentRef || undefined,
      payment_date: paymentDate,
      notes: paymentNotes || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save locally
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('creativals_invoices');
      if (stored) {
        const list: Invoice[] = JSON.parse(stored);
        const updatedList = list.map(inv => {
          if (inv.id === invoice.id) {
            const paid_amount = Number(inv.paid_amount) + Number(paymentAmount);
            const balance_amount = Number(inv.total_amount) - paid_amount;
            const status: Invoice['status'] = balance_amount <= 0 ? 'paid' : 'partially_paid';
            const payments = inv.payments ? [...inv.payments, newPayment] : [newPayment];
            
            return {
              ...inv,
              paid_amount,
              balance_amount,
              status,
              payments,
              updated_at: new Date().toISOString().split('T')[0]
            };
          }
          return inv;
        });
        localStorage.setItem('creativals_invoices', JSON.stringify(updatedList));
      }
    }

    // Try posting to API
    try {
      await invoicesApi.recordPayment(invoice.id, {
        invoice_id: invoice.id,
        amount: newPayment.amount,
        payment_method: newPayment.payment_method,
        transaction_reference: newPayment.transaction_reference,
        payment_date: newPayment.payment_date,
        notes: newPayment.notes
      });
    } catch {
      // Handled locally
    }

    queryClient.invalidateQueries({ queryKey: ['invoices_dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['invoice-detail', invoiceId] });
    refetch();
    setPaymentDrawerOpen(false);
  };

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return 'border-zinc-700 bg-zinc-800 text-zinc-400';
      case 'sent': return 'border-blue-900/50 bg-blue-950/40 text-blue-400';
      case 'partially_paid': return 'border-amber-900/50 bg-amber-950/40 text-amber-400';
      case 'paid': return 'border-emerald-900/50 bg-emerald-950/40 text-emerald-400';
      case 'overdue': return 'border-red-900/50 bg-red-950/40 text-red-400';
      default: return 'border-zinc-800 bg-zinc-900/60 text-zinc-500';
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Dynamic styles injected specifically for printable PDF dialog wrapper */}
      <style jsx global>{`
        @media print {
          /* Hide everything first */
          body * {
            visibility: hidden;
            background: transparent !important;
          }
          
          /* Only show the A4 preview box */
          #printable-invoice-paper, #printable-invoice-paper * {
            visibility: visible;
          }
          
          #printable-invoice-paper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #ffffff !important;
            color: #111827 !important;
            box-shadow: none !important;
            border: none !important;
            padding: 24px !important;
            margin: 0 !important;
          }

          /* Force colors and contrasts for printing */
          #printable-invoice-paper .text-zinc-100,
          #printable-invoice-paper .text-zinc-200,
          #printable-invoice-paper .text-zinc-300,
          #printable-invoice-paper h4 {
            color: #000000 !important;
          }
          #printable-invoice-paper .text-zinc-400,
          #printable-invoice-paper .text-zinc-500 {
            color: #374151 !important;
          }
          #printable-invoice-paper .border-zinc-800,
          #printable-invoice-paper .border-zinc-850 {
            border-color: #d1d5db !important;
          }
          #printable-invoice-paper .bg-zinc-950,
          #printable-invoice-paper .bg-zinc-900 {
            background-color: #f3f4f6 !important;
          }
          #printable-invoice-paper .bg-zinc-950\\/40 {
            background-color: #f9fafb !important;
          }
          #printable-invoice-paper .font-bold {
            font-weight: 700 !important;
          }
          #printable-invoice-paper .font-mono {
            font-family: monospace !important;
          }
        }
      `}</style>

      {/* Header controls (Hidden on print) */}
      <div className="print:hidden" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link href="/invoices" className="btn btn-secondary btn-icon" style={{ padding: '0.5rem' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Invoice Details: <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{invoice.invoice_number}</span>
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{invoice.title}</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            onClick={handleEmailClient}
            disabled={sendingEmail}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            <span>Email to Client</span>
          </button>
          
          <button
            onClick={handlePrint}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Printer size={14} /> Print Paper Invoice
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            Download PDF
          </button>
          
          {invoice.balance_amount > 0 && invoice.status !== 'cancelled' && (
            <>
              <button
                onClick={() => setPaymentDrawerOpen(true)}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <Banknote size={14} /> Record Payment
              </button>
              <button
                onClick={() => setCreditNoteDrawerOpen(true)}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <Plus size={14} /> Credit Note
              </button>
            </>
          )}

          <button
            onClick={handleDeleteInvoice}
            className="btn btn-danger"
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Trash2 size={13} /> Delete Invoice
          </button>
        </div>
      </div>

      {emailStatus && (
        <div style={{
          padding: '0.875rem 1.25rem',
          background: emailStatus.type === 'success' ? 'var(--success-subtle)' : 'var(--danger-subtle)',
          color: emailStatus.type === 'success' ? 'var(--success)' : 'var(--danger)',
          border: emailStatus.type === 'success' ? '1px solid var(--success)' : '1px solid var(--danger)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.875rem',
          fontWeight: 500,
          marginBottom: '1.5rem',
        }}>
          {emailStatus.message}
        </div>
      )}

      {/* Main Grid Content */}
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
        
        {/* Left Column: Printable Paper Invoice (Preview) */}
        <div style={{ flex: '2 1 600px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            id="printable-invoice-paper"
            className="card"
            style={{
              padding: '2.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '2rem',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, var(--accent), #4f46e5)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                    <FileText style={{ color: '#ffffff', width: '18px', height: '18px' }} />
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Creativals Agency</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.125rem', lineHeight: 1.5 }}>
                  <p>7th Floor, DLF Cyber City, Phase 3</p>
                  <p>Gurugram, Haryana - 122002</p>
                  <p>GSTIN: 06AAFCC1483L1ZS</p>
                  <p>Email: billing@creativals.in</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>TAX INVOICE</span>
                <span style={{ fontSize: '1.125rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>{invoice.invoice_number}</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.125rem', marginTop: '0.25rem' }}>
                  <p><strong>Issue Date:</strong> {formatDate(invoice.issue_date)}</p>
                  <p><strong>Due Date:</strong> {formatDate(invoice.due_date)}</p>
                  <p><strong>Status:</strong> <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>{invoice.status.replace('_', ' ')}</span></p>
                </div>
              </div>
            </div>

            {/* Billing addresses */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Building size={12} /> Billed To (Client):
                </span>
                <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{invoice.client_name}</h4>
                  {invoice.client_email && <p style={{ color: 'var(--text-secondary)' }}>Email: {invoice.client_email}</p>}
                  {invoice.lead_id && <p style={{ color: 'var(--text-muted)', fontSize: '0.625rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Linked CRM Account #{invoice.lead_id}</p>}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <UserIcon size={12} /> Payment Instructions:
                </span>
                <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--text-secondary)', fontFamily: 'monospace', lineHeight: 1.5 }}>
                  <p>Beneficiary: Creativals Agency Pvt Ltd</p>
                  <p>Bank: HDFC Bank Limited</p>
                  <p>A/C No: 50200049281203</p>
                  <p>IFSC Code: HDFC0000021</p>
                </div>
              </div>
            </div>

            {/* Scope Title */}
            <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
              <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Invoiced Scope Subject</span>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{invoice.title}</p>
            </div>

            {/* Items Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'block' }}>Billing Scope & Deliverables Breakup</span>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '5%', textAlign: 'center' }}>#</th>
                      <th style={{ width: '45%' }}>Item & Work Scope Description</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>Qty</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Unit Rate</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>Discount</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Taxable Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, index) => {
                      const itemSub = item.quantity * item.unit_price;
                      const itemDisc = itemSub * (item.discount_percentage / 100);
                      const itemTotal = itemSub - itemDisc;
                      
                      return (
                        <tr key={index}>
                          <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{index + 1}</td>
                          <td>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>{item.service?.name || 'Milestone Delivery'}</span>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{item.description}</span>
                          </td>
                          <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(item.unit_price, invoice.currency)}</td>
                          <td style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 600, fontFamily: 'monospace' }}>{item.discount_percentage > 0 ? `${item.discount_percentage}%` : '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{formatCurrency(itemTotal, invoice.currency)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes and financial summaries */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', paddingTop: '0.5rem', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Terms */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <span style={{ fontSize: '0.625rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Terms & Overdue Policy</span>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-line', background: 'var(--surface-elevated)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontFamily: 'monospace' }}>
                    {invoice.terms_conditions || 'Overdue interest applicable.'}
                  </p>
                </div>
                
                {/* Remarks notes */}
                {invoice.notes && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.625rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Memo Notes</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{invoice.notes}</p>
                  </div>
                )}
              </div>

              {/* Summary totals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.625rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textAlign: 'right' }}>Invoice Summary</span>
                <div style={{ background: 'var(--surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.6875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Subtotal:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--danger)' }}>
                    <span>Discounts:</span>
                    <span>-{formatCurrency(invoice.discount_amount, invoice.currency)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>GST (Taxes):</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(invoice.tax_amount, invoice.currency)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    <span>Net Total:</span>
                    <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{formatCurrency(invoice.total_amount, invoice.currency)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--success)', borderTop: '1px dashed var(--border)', paddingTop: '0.5rem' }}>
                    <span>Amount Paid:</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(invoice.paid_amount, invoice.currency)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.125rem', fontSize: '0.75rem', fontWeight: 700 }}>
                    <span style={{ color: 'var(--warning)' }}>Balance Due:</span>
                    <span style={{ color: 'var(--warning)', fontWeight: 800 }}>{formatCurrency(invoice.balance_amount, invoice.currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Signature seals */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', borderTop: '1px solid var(--border)', paddingTop: '2rem', textAlign: 'center', fontSize: '0.625rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                <p>Authorized Signatory</p>
                <div style={{ borderBottom: '1px solid var(--border)', width: '50%', margin: '0 auto' }}></div>
                <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Creativals Agency Pvt Ltd</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                <p>Received By / Client Acknowledgment</p>
                <div style={{ borderBottom: '1px solid var(--border)', width: '50%', margin: '0 auto' }}></div>
                <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{invoice.client_name}</p>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: In-app billing status, payment timelines, transaction history */}
        <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="print:hidden">

          {/* Approvals Action Panel */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Clock className="text-accent" size={14} />
              Invoice Approval Workflow
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Approval Status:</span>
                <span className={`badge ${
                  invoice.approval_status === 'approved' 
                    ? 'badge-success' 
                    : invoice.approval_status === 'rejected'
                    ? 'badge-danger'
                    : invoice.approval_status === 'pending'
                    ? 'badge-warning animate-pulse'
                    : 'badge-muted'
                }`}>
                  {invoice.approval_status || 'DRAFT'}
                </span>
              </div>

              {/* Actions based on approval_status */}
              {(!invoice.approval_status || invoice.approval_status === 'draft') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.5rem' }}>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    This invoice is currently in draft mode. Submit it for review and manager sign-off before dispatch.
                  </p>
                  <button
                    onClick={() => handleUpdateApprovalStatus('pending')}
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '0.75rem' }}
                  >
                    Submit for Approval
                  </button>
                </div>
              )}

              {invoice.approval_status === 'pending' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.5rem' }}>
                  <label className="form-label">Review Comments</label>
                  <textarea
                    rows={2}
                    value={approvalComments}
                    onChange={(e) => setApprovalComments(e.target.value)}
                    placeholder="Enter approval details or rejection reason..."
                    className="form-input"
                    style={{ fontSize: '0.75rem', resize: 'none' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleUpdateApprovalStatus('rejected')}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger-subtle)' }}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleUpdateApprovalStatus('approved')}
                      className="btn btn-primary"
                      style={{ fontSize: '0.75rem' }}
                    >
                      Approve & Send
                    </button>
                  </div>
                </div>
              )}

              {invoice.approval_status === 'rejected' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.5rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--danger-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.6875rem', color: 'var(--danger)' }}>
                    <p style={{ fontWeight: 700 }}>Rejection Feedback:</p>
                    <p style={{ marginTop: '0.25rem', fontStyle: 'italic', lineHeight: 1.5 }}>
                      "{invoice.approvals?.filter(a => a.status === 'rejected').slice(-1)[0]?.comments || 'No comments left.'}"
                    </p>
                  </div>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Make necessary changes to the scope parameters and resubmit for evaluation.
                  </p>
                  <button
                    onClick={() => handleUpdateApprovalStatus('pending')}
                    className="btn btn-secondary"
                    style={{ width: '100%', fontSize: '0.75rem' }}
                  >
                    Resubmit for Review
                  </button>
                </div>
              )}

              {invoice.approval_status === 'approved' && (
                <div style={{ paddingTop: '0.5rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--success-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.6875rem', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', fontWeight: 600 }}>
                    <CheckCircle size={14} className="flex-shrink-0" />
                    <span>Approved by {invoice.approvals?.filter(a => a.status === 'approved').slice(-1)[0]?.user_name || 'Manager'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Approvals Timeline */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              Approvals Timeline
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', paddingLeft: '1.25rem' }}>
              {/* Timeline vertical bar */}
              <div style={{ position: 'absolute', left: '4px', top: '8px', bottom: '8px', width: '1px', background: 'var(--border)' }} />

              {/* Draft created item */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', position: 'relative', fontSize: '0.75rem' }}>
                <div style={{ position: 'absolute', left: '-1.5rem', top: '2px', width: '9px', height: '9px', borderRadius: '50%', background: 'var(--text-muted)', border: '2px solid var(--surface)' }} />
                <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Invoice Draft Initialized</p>
                <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>{formatDate(invoice.created_at)}</p>
              </div>

              {invoice.approvals && invoice.approvals.length > 0 ? (
                invoice.approvals.map((app) => (
                  <div key={app.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', position: 'relative', fontSize: '0.75rem' }}>
                    <div style={{
                      position: 'absolute',
                      left: '-1.5rem',
                      top: '2px',
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: app.status === 'approved' ? 'var(--success)' : app.status === 'rejected' ? 'var(--danger)' : 'var(--warning)',
                      border: '2px solid var(--surface)'
                    }} />
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {app.status === 'approved' 
                        ? 'Approved for Billing' 
                        : app.status === 'rejected' 
                        ? 'Revision Requested' 
                        : 'Review Request Logged'}
                    </p>
                    <p style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                      By <span style={{ fontWeight: 600 }}>{app.user_name}</span> ({app.role})
                    </p>
                    {app.comments && (
                      <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.25rem', background: 'var(--surface-elevated)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                        "{app.comments}"
                      </p>
                    )}
                    <p style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', marginTop: '0.125rem', fontFamily: 'monospace' }}>
                      {formatDate(app.actioned_at || app.created_at)}
                    </p>
                  </div>
                ))
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', position: 'relative', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  <div style={{ position: 'absolute', left: '-1.5rem', top: '2px', width: '9px', height: '9px', borderRadius: '50%', background: 'var(--border)', border: '2px solid var(--surface)' }} />
                  No timeline actions logged yet.
                </div>
              )}
            </div>
          </div>

          {/* Collection summary */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              Receivables Tracking
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Invoice Status</span>
              <span className={`badge ${
                invoice.status === 'paid' 
                  ? 'badge-success' 
                  : invoice.status === 'partially_paid' 
                  ? 'badge-warning' 
                  : invoice.status === 'overdue' 
                  ? 'badge-danger' 
                  : invoice.status === 'sent' 
                  ? 'badge-info' 
                  : 'badge-muted'
              }`}>
                {invoice.status.replace('_', ' ')}
              </span>
            </div>

            {/* progress */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', paddingTop: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                <span>Collection Progress</span>
                <span style={{ color: 'var(--success)' }}>
                  {invoice.total_amount > 0 ? Math.round((invoice.paid_amount / invoice.total_amount) * 100) : 0}%
                </span>
              </div>
              <div style={{ width: '100%', backgroundColor: 'var(--border-subtle)', height: '8px', borderRadius: '9999px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div 
                  style={{ backgroundColor: 'var(--success)', height: '100%', width: `${invoice.total_amount > 0 ? Math.min(100, (invoice.paid_amount / invoice.total_amount) * 100) : 0}%`, transition: 'width var(--transition-base)' }}
                />
              </div>
            </div>

            {/* Quick stats list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Billed Amount</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(invoice.total_amount, invoice.currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Total Paid</span>
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(invoice.paid_amount, invoice.currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Outstanding</span>
                <span style={{ fontWeight: 600, color: 'var(--warning)' }}>{formatCurrency(invoice.balance_amount, invoice.currency)}</span>
              </div>
            </div>

            {invoice.balance_amount > 0 && invoice.status !== 'cancelled' && (
              <button
                onClick={() => setPaymentDrawerOpen(true)}
                className="btn btn-primary"
                style={{ width: '100%', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
              >
                <Plus size={14} /> Record Client Payment
              </button>
            )}
          </div>

          {/* Payment Transactions Log */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              Receipts & Payment History
            </h3>
            
            {invoice.payments && invoice.payments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', paddingLeft: '1.25rem' }}>
                <div style={{ position: 'absolute', left: '4px', top: '8px', bottom: '8px', width: '1px', background: 'var(--border)' }} />

                {invoice.payments.map((p) => (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', position: 'relative', fontSize: '0.75rem' }}>
                    <div style={{ position: 'absolute', left: '-1.5rem', top: '2px', width: '9px', height: '9px', borderRadius: '50%', background: 'var(--success)', border: '2px solid var(--surface)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'monospace', color: 'var(--success)', fontWeight: 700 }}>{p.payment_number}</span>
                      <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>{formatDate(p.payment_date)}</span>
                    </div>
                    <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.125rem' }}>{formatCurrency(p.amount, invoice.currency)}</p>
                    <p style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginTop: '0.125rem' }}>{p.payment_method.replace('_', ' ')}</p>
                    {p.transaction_reference && (
                      <p style={{ fontFamily: 'monospace', fontSize: '0.5625rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>Ref: {p.transaction_reference}</p>
                    )}
                    {p.notes && (
                      <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.25rem', background: 'var(--surface-elevated)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>{p.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No payments recorded. Use the "Record Payment" drawer to log collections.
              </div>
            )}
          </div>

          {/* Quote info panel if converted */}
          {invoice.quote_id && (
            <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 650, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quotation Source</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                This invoice was converted directly from approved Quotation proposal <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 600 }}>QT-{invoice.invoice_number.slice(4)}</span>.
              </p>
            </div>
          )}

        </div>
      </div>

      {/* ── Record Payment Drawer Overlay (Sliding Sidebar) ── */}
      {paymentDrawerOpen && (
        <>
          {/* Backdrop */}
          <div 
            style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', zIndex: 50 }}
            className="print:hidden"
            onClick={() => setPaymentDrawerOpen(false)}
          />
          {/* Drawer Panel */}
          <div 
            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '420px', background: 'var(--surface)', borderLeft: '1px solid var(--border)', zIndex: 100, display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', animation: 'slideInRight var(--transition-slow)' }}
            className="print:hidden"
          >
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-elevated)' }}>
              <div>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 600 }}>Record Client Payment</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Log collection transaction for <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700 }}>{invoice.invoice_number}</span>
                </p>
              </div>
              <button 
                onClick={() => setPaymentDrawerOpen(false)}
                className="btn btn-icon btn-secondary"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRecordPayment} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {paymentError && (
                <div style={{ padding: '0.75rem 1rem', background: 'var(--danger-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--danger)', display: 'flex', gap: '0.5rem' }}>
                  <AlertCircle style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Summary stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '0.75rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Billed Total</span>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(invoice.total_amount, invoice.currency)}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 705 }}>Outstanding</span>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--warning)' }}>{formatCurrency(invoice.balance_amount, invoice.currency)}</p>
                </div>
              </div>

              {/* Amount Input */}
              <div className="form-group">
                <label className="form-label">Amount to Record ({resolveCurrencyCode(invoice.currency)})</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>
                    {resolveCurrencyCode(invoice.currency)}
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    max={invoice.balance_amount}
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="form-input"
                    style={{ paddingLeft: '3.5rem' }}
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => setPaymentAmount(invoice.balance_amount)}
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
                  placeholder="e.g. UTR / URN, Cheque #, Card Txn ID"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Transaction Notes (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Clearance date details, bank accounts, or collection agents remarks"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="form-input"
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: 'auto' }}>
                <button
                  type="button"
                  onClick={() => setPaymentDrawerOpen(false)}
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

      {/* Credit Note Drawer Modal */}
      {creditNoteDrawerOpen && (
        <>
          <div 
            style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', zIndex: 50 }}
            className="print:hidden"
            onClick={() => setCreditNoteDrawerOpen(false)}
          />
          <div 
            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '420px', background: 'var(--surface)', borderLeft: '1px solid var(--border)', zIndex: 100, display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', animation: 'slideInRight var(--transition-slow)' }}
            className="print:hidden"
          >
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-elevated)' }}>
              <div>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 600 }}>Create Credit Note</h3>
              </div>
              <button onClick={() => setCreditNoteDrawerOpen(false)} className="btn btn-icon btn-secondary">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateCreditNote} style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Amount</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)' }}>{resolveCurrencyCode(invoice.currency)}</span>
                  <input 
                    type="number" 
                    min="0.01" 
                    step="0.01" 
                    max={invoice.balance_amount} 
                    required 
                    value={creditNoteAmount || ''} 
                    onChange={e => setCreditNoteAmount(Number(e.target.value))} 
                    className="form-input" 
                    style={{ paddingLeft: '3rem', fontSize: '1.125rem', fontWeight: 600 }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea 
                  rows={3} 
                  value={creditNoteReason} 
                  onChange={e => setCreditNoteReason(e.target.value)} 
                  className="form-input" 
                  placeholder="Reason for credit note..."
                />
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <button type="button" onClick={() => setCreditNoteDrawerOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Submit</button>
              </div>
            </form>
          </div>
        </>
      )}

    </div>
  );
}
