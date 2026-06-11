'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoices as invoicesApi, payments as paymentsApi } from '@/lib/api';
import type { Invoice, Payment, InvoiceApproval } from '@/lib/api';
import { 
  ArrowLeft, Printer, FileText, Calendar, Building, CreditCard, 
  User as UserIcon, AlertCircle, X, Banknote, HelpCircle, CheckCircle, 
  Trash2, Plus, Clock 
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

interface Params {
  id: string;
}

export default function InvoiceDetailPage({ params }: { params: Promise<Params> }) {
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

  const handleDeleteInvoice = () => {
    if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
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
      await paymentsApi.create({
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
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
      
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5 print:hidden">
        <div className="flex items-center gap-2">
          <Link href="/invoices" className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              Invoice Details: <span className="font-mono text-violet-400">{invoice.invoice_number}</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">{invoice.title}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handlePrint}
            className="btn btn-secondary flex items-center gap-1.5 text-xs font-semibold hover:bg-zinc-800 px-3.5 py-2"
          >
            <Printer size={14} /> Print Paper Invoice
          </button>
          
          {invoice.balance_amount > 0 && invoice.status !== 'cancelled' && (
            <button
              onClick={() => setPaymentDrawerOpen(true)}
              className="btn btn-primary flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2"
            >
              <Banknote size={14} /> Record Payment
            </button>
          )}

          <button
            onClick={handleDeleteInvoice}
            className="btn btn-secondary text-red-400 border-red-900/30 hover:bg-red-950/20 px-3.5 py-2 flex items-center gap-1.5 text-xs font-semibold"
          >
            <Trash2 size={13} /> Delete Invoice
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Printable Paper Invoice (Preview) */}
        <div className="lg:col-span-2 space-y-6">
          <div
            id="printable-invoice-paper"
            className="bg-zinc-900 border border-zinc-800 shadow-2xl rounded-2xl p-6 md:p-10 text-zinc-300 space-y-8"
          >
            
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-6 border-b border-zinc-800 pb-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-gradient-to-tr from-violet-650 to-indigo-650 rounded-xl flex items-center justify-center shadow-lg">
                    <FileText className="text-white w-4.5 h-4.5" />
                  </div>
                  <span className="text-base font-extrabold text-zinc-100 tracking-tight">Creativals Agency</span>
                </div>
                <div className="text-xs text-zinc-400 space-y-0.5 leading-relaxed">
                  <p>7th Floor, DLF Cyber City, Phase 3</p>
                  <p>Gurugram, Haryana - 122002</p>
                  <p>GSTIN: 06AAFCC1483L1ZS</p>
                  <p>Email: billing@creativals.in</p>
                </div>
              </div>

              <div className="text-left sm:text-right space-y-1">
                <span className="text-xs font-bold text-violet-400 tracking-widest uppercase block">TAX INVOICE</span>
                <span className="text-lg font-mono font-bold text-zinc-100 block">{invoice.invoice_number}</span>
                <div className="text-xs text-zinc-400 space-y-0.5">
                  <p><strong>Issue Date:</strong> {formatDate(invoice.issue_date)}</p>
                  <p><strong>Due Date:</strong> {formatDate(invoice.due_date)}</p>
                  <p><strong>Status:</strong> <span className="font-semibold uppercase">{invoice.status.replace('_', ' ')}</span></p>
                </div>
              </div>
            </div>

            {/* Billing addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1.5">
                  <Building size={11} /> Billed To (Client):
                </span>
                <div className="text-xs space-y-1">
                  <h4 className="text-sm font-bold text-zinc-200">{invoice.client_name}</h4>
                  {invoice.client_email && <p className="text-zinc-400">Email: {invoice.client_email}</p>}
                  {invoice.lead_id && <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Linked CRM Account #{invoice.lead_id}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1.5">
                  <UserIcon size={11} /> Payment Instructions:
                </span>
                <div className="text-xs space-y-1 text-zinc-400 leading-relaxed font-mono">
                  <p>Beneficiary: Creativals Agency Pvt Ltd</p>
                  <p>Bank: HDFC Bank Limited</p>
                  <p>A/C No: 50200049281203</p>
                  <p>IFSC Code: HDFC0000021</p>
                </div>
              </div>
            </div>

            {/* Scope Title */}
            <div className="bg-zinc-950/30 border border-zinc-850 rounded-xl p-4">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block font-bold">Invoiced Scope Subject</span>
              <p className="text-sm font-bold text-zinc-150 mt-1">{invoice.title}</p>
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">Billing Scope & Deliverables Breakup</span>
              <div className="bg-zinc-950/40 border border-zinc-850 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-950/80 border-b border-zinc-850 text-zinc-400 font-bold uppercase tracking-wider">
                      <th className="p-3.5 w-[5%] text-center">#</th>
                      <th className="p-3.5 w-[45%]">Item & Work Scope Description</th>
                      <th className="p-3.5 w-[10%] text-center">Qty</th>
                      <th className="p-3.5 w-[15%] text-right">Unit Rate</th>
                      <th className="p-3.5 w-[10%] text-center">Discount</th>
                      <th className="p-3.5 w-[15%] text-right">Taxable Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850 text-zinc-350">
                    {invoice.items.map((item, index) => {
                      const itemSub = item.quantity * item.unit_price;
                      const itemDisc = itemSub * (item.discount_percentage / 100);
                      const itemTotal = itemSub - itemDisc;
                      
                      return (
                        <tr key={index} className="hover:bg-zinc-950/15">
                          <td className="p-3.5 text-center text-zinc-500 font-mono">{index + 1}</td>
                          <td className="p-3.5">
                            <span className="font-bold text-zinc-200 block">{item.service?.name || 'Milestone Delivery'}</span>
                            <span className="text-[10px] text-zinc-400 block mt-1 leading-relaxed whitespace-pre-wrap">{item.description}</span>
                          </td>
                          <td className="p-3.5 text-center font-mono">{item.quantity}</td>
                          <td className="p-3.5 text-right font-mono">{formatCurrency(item.unit_price, invoice.currency)}</td>
                          <td className="p-3.5 text-center text-red-400 font-semibold font-mono">{item.discount_percentage > 0 ? `${item.discount_percentage}%` : '-'}</td>
                          <td className="p-3.5 text-right font-bold font-mono text-zinc-200">{formatCurrency(itemTotal, invoice.currency)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes and financial summaries */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 items-start">
              <div className="md:col-span-2 space-y-4">
                {/* Terms */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">Terms & Overdue Policy</span>
                  <p className="text-[10px] text-zinc-450 leading-relaxed whitespace-pre-line bg-zinc-950/20 p-3 rounded-lg border border-zinc-850 font-mono">
                    {invoice.terms_conditions || 'Overdue interest applicable.'}
                  </p>
                </div>
                
                {/* Remarks notes */}
                {invoice.notes && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">Memo Notes</span>
                    <p className="text-xs text-zinc-400 italic">{invoice.notes}</p>
                  </div>
                )}
              </div>

              {/* Summary totals */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block text-right font-bold">Invoice Summary</span>
                <div className="bg-zinc-950/50 rounded-xl border border-zinc-850 p-4 space-y-2 text-[11px] font-medium text-zinc-400">
                  <div className="flex justify-between items-center">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-zinc-200">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center text-red-400">
                    <span>Discounts:</span>
                    <span>-{formatCurrency(invoice.discount_amount, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>GST (Taxes):</span>
                    <span className="font-semibold text-zinc-200">{formatCurrency(invoice.tax_amount, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-zinc-800 pt-2 mt-1.5 text-xs text-zinc-200 font-bold">
                    <span>Net Total:</span>
                    <span className="font-extrabold text-violet-400">{formatCurrency(invoice.total_amount, invoice.currency)}</span>
                  </div>

                  <div className="flex justify-between items-center text-emerald-400 border-t border-dashed border-zinc-850 pt-2">
                    <span>Amount Paid:</span>
                    <span className="font-semibold">{formatCurrency(invoice.paid_amount, invoice.currency)}</span>
                  </div>

                  <div className="flex justify-between items-center border-t border-zinc-800 pt-2 mt-1 text-xs font-bold">
                    <span className="text-amber-500">Balance Due:</span>
                    <span className="text-amber-400 font-extrabold">{formatCurrency(invoice.balance_amount, invoice.currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Signature seals */}
            <div className="grid grid-cols-2 gap-8 border-t border-zinc-800 pt-8 text-center text-[10px] text-zinc-500">
              <div className="space-y-12">
                <p>Authorized Signatory</p>
                <div className="border-b border-zinc-850 w-1/2 mx-auto"></div>
                <p className="font-semibold">Creativals Agency Pvt Ltd</p>
              </div>
              <div className="space-y-12">
                <p>Received By / Client Acknowledgment</p>
                <div className="border-b border-zinc-850 w-1/2 mx-auto"></div>
                <p className="font-semibold">{invoice.client_name}</p>
              </div>
            </div>

          </div>
        </div>
        {/* Right Column: In-app billing status, payment timelines, transaction history */}
        <div className="space-y-6 print:hidden">

          {/* Approvals Action Panel */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-md space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-400" />
              Invoice Approval Workflow
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-medium">Approval Status:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                  invoice.approval_status === 'approved' 
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' 
                    : invoice.approval_status === 'rejected'
                    ? 'bg-red-950/40 text-red-400 border-red-900/50'
                    : invoice.approval_status === 'pending'
                    ? 'bg-amber-950/40 text-amber-400 border-amber-900/50 animate-pulse'
                    : 'bg-zinc-850 text-zinc-400 border-zinc-700'
                }`}>
                  {invoice.approval_status || 'DRAFT'}
                </span>
              </div>

              {/* Actions based on approval_status */}
              {(!invoice.approval_status || invoice.approval_status === 'draft') && (
                <div className="space-y-3 pt-2">
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    This invoice is currently in draft mode. Submit it for review and manager sign-off before dispatch.
                  </p>
                  <button
                    onClick={() => handleUpdateApprovalStatus('pending')}
                    className="w-full py-2 bg-violet-650 hover:bg-violet-600 text-zinc-100 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    Submit for Approval
                  </button>
                </div>
              )}

              {invoice.approval_status === 'pending' && (
                <div className="space-y-3 pt-2">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase block">Review Comments</label>
                  <textarea
                    rows={2}
                    value={approvalComments}
                    onChange={(e) => setApprovalComments(e.target.value)}
                    placeholder="Enter approval details or rejection reason..."
                    className="w-full bg-zinc-950 border border-zinc-850 text-zinc-150 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-violet-500 resize-none font-sans"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleUpdateApprovalStatus('rejected')}
                      className="py-1.5 bg-red-950/20 border border-red-900/40 hover:bg-red-950/30 text-red-400 rounded-lg text-xs font-bold transition"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleUpdateApprovalStatus('approved')}
                      className="py-1.5 bg-emerald-600 hover:bg-emerald-550 text-zinc-100 rounded-lg text-xs font-bold transition"
                    >
                      Approve & Send
                    </button>
                  </div>
                </div>
              )}

              {invoice.approval_status === 'rejected' && (
                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-[11px] text-red-400">
                    <p className="font-bold">Rejection Feedback:</p>
                    <p className="mt-1 italic leading-relaxed">
                      "{invoice.approvals?.filter(a => a.status === 'rejected').slice(-1)[0]?.comments || 'No comments left.'}"
                    </p>
                  </div>
                  <p className="text-[11px] text-zinc-450 leading-relaxed">
                    Make necessary changes to the scope parameters and resubmit for evaluation.
                  </p>
                  <button
                    onClick={() => handleUpdateApprovalStatus('pending')}
                    className="w-full py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-bold transition"
                  >
                    Resubmit for Review
                  </button>
                </div>
              )}

              {invoice.approval_status === 'approved' && (
                <div className="pt-2">
                  <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-lg text-[11px] text-emerald-400 flex items-center justify-center gap-1.5 font-semibold">
                    <CheckCircle size={14} className="flex-shrink-0" />
                    <span>Approved by {invoice.approvals?.filter(a => a.status === 'approved').slice(-1)[0]?.user_name || 'Manager'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Approvals Timeline */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-md space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">
              Approvals Timeline
            </h3>
            
            <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-zinc-850">
              {/* Draft created item */}
              <div className="flex gap-3 relative text-xs">
                <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-450 border border-zinc-750 flex items-center justify-center text-[10px] font-bold z-10">
                  +
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-zinc-200">Invoice Draft Initialized</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{formatDate(invoice.created_at)}</p>
                </div>
              </div>

              {invoice.approvals && invoice.approvals.length > 0 ? (
                invoice.approvals.map((app) => (
                  <div key={app.id} className="flex gap-3 relative text-xs">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-extrabold z-10 border ${
                      app.status === 'approved'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-900'
                        : app.status === 'rejected'
                        ? 'bg-red-950 text-red-400 border-red-900'
                        : 'bg-amber-950 text-amber-400 border-amber-900'
                    }`}>
                      {app.status === 'approved' ? '✓' : app.status === 'rejected' ? '✗' : '?'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-zinc-250">
                        {app.status === 'approved' 
                          ? 'Approved for Billing' 
                          : app.status === 'rejected' 
                          ? 'Revision Requested' 
                          : 'Review Request Logged'}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        By <span className="font-medium text-zinc-350">{app.user_name}</span> ({app.role})
                      </p>
                      {app.comments && (
                        <p className="text-[10px] text-zinc-500 italic mt-1 bg-zinc-950/20 p-2 border border-zinc-850 rounded leading-relaxed whitespace-pre-wrap">
                          "{app.comments}"
                        </p>
                      )}
                      <p className="text-[9px] text-zinc-500 mt-0.5 font-mono">
                        {formatDate(app.actioned_at || app.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex gap-3 relative text-xs">
                  <div className="w-6 h-6 rounded-full bg-zinc-950 text-zinc-700 border border-zinc-850 flex items-center justify-center text-[10px] font-bold z-10">
                    •
                  </div>
                  <div className="flex-1 text-zinc-500 italic">
                    No timeline actions logged yet.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Collection summary */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-md space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">Receivables Tracking</h3>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Invoice Status</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(invoice.status)}`}>
                {invoice.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            {/* progress */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-medium text-zinc-400">
                <span>Collection Progress</span>
                <span className="text-emerald-400 font-bold">
                  {invoice.total_amount > 0 ? Math.round((invoice.paid_amount / invoice.total_amount) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-850">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-350"
                  style={{ width: `${invoice.total_amount > 0 ? Math.min(100, (invoice.paid_amount / invoice.total_amount) * 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Quick stats list */}
            <div className="divide-y divide-zinc-800/60 text-xs font-semibold text-zinc-300">
              <div className="flex justify-between py-2">
                <span className="text-zinc-500 font-medium">Billed Amount</span>
                <span>{formatCurrency(invoice.total_amount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-zinc-500 font-medium">Total Paid</span>
                <span className="text-emerald-400">{formatCurrency(invoice.paid_amount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-zinc-500 font-medium">Outstanding</span>
                <span className="text-amber-400">{formatCurrency(invoice.balance_amount, invoice.currency)}</span>
              </div>
            </div>

            {invoice.balance_amount > 0 && invoice.status !== 'cancelled' && (
              <button
                onClick={() => setPaymentDrawerOpen(true)}
                className="w-full btn btn-primary py-2.5 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Plus size={14} /> Record Client Payment
              </button>
            )}
          </div>

          {/* Payment Transactions Log */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-md space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">Receipts & Payment History</h3>
            
            {invoice.payments && invoice.payments.length > 0 ? (
              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-zinc-800">
                {invoice.payments.map((p) => (
                  <div key={p.id} className="flex gap-3 relative text-xs">
                    <div className="w-6 h-6 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900 flex items-center justify-center text-[9px] font-bold z-10">
                      $
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <span className="font-mono text-emerald-400 font-bold">{p.payment_number}</span>
                        <span className="text-[10px] text-zinc-500 font-medium">{formatDate(p.payment_date)}</span>
                      </div>
                      <p className="font-bold text-zinc-200 mt-0.5">{formatCurrency(p.amount, invoice.currency)}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mt-0.5">{p.payment_method.replace('_', ' ')}</p>
                      {p.transaction_reference && (
                        <p className="font-mono text-[9px] text-zinc-500 mt-1">Ref: {p.transaction_reference}</p>
                      )}
                      {p.notes && (
                        <p className="text-[10px] text-zinc-450 italic mt-1 bg-zinc-950/20 p-1.5 rounded border border-zinc-850">{p.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 text-xs text-zinc-500 italic">
                No payments recorded. Use the "Record Payment" drawer to log collections.
              </div>
            )}
          </div>

          {/* Quote info panel if converted */}
          {invoice.quote_id && (
            <div className="bg-zinc-900/30 border border-zinc-800 p-5 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Quotation Source</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                This invoice was converted directly from approved Quotation proposal <span className="font-mono text-violet-400 font-semibold">QT-{invoice.invoice_number.slice(4)}</span>.
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 print:hidden"
            onClick={() => setPaymentDrawerOpen(false)}
          />
          {/* Drawer Panel */}
          <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-zinc-900 border-l border-zinc-800 z-50 flex flex-col shadow-2xl print:hidden animate-in slide-in-from-right duration-250">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/40">
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Record Client Payment</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Log collection transaction for <span className="font-mono text-violet-400 font-bold">{invoice.invoice_number}</span>
                </p>
              </div>
              <button 
                onClick={() => setPaymentDrawerOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRecordPayment} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              
              {paymentError && (
                <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400 flex gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-950/40 rounded-lg border border-zinc-850">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium">Billed Total</span>
                  <p className="text-sm font-bold text-zinc-250">{formatCurrency(invoice.total_amount, invoice.currency)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium font-bold text-amber-500">Outstanding</span>
                  <p className="text-sm font-bold text-amber-400">{formatCurrency(invoice.balance_amount, invoice.currency)}</p>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Amount to Record ({invoice.currency})</label>
                <div className="relative">
                  <div className="absolute left-3 top-2.5 text-zinc-500 text-sm font-semibold">
                    {invoice.currency}
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    max={invoice.balance_amount}
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-850 text-zinc-150 text-sm rounded-lg pl-12 pr-4 py-2 outline-none focus:border-violet-500"
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => setPaymentAmount(invoice.balance_amount)}
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
                  placeholder="e.g. UTR / URN, Cheque #, Card Txn ID"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 text-zinc-150 text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Transaction Notes (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Clearance date details, bank accounts, or collection agents remarks"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 text-zinc-150 text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentDrawerOpen(false)}
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
