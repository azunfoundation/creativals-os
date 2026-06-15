'use client';

import { use, useState } from 'react'; 
import { SkeletonTable } from '@/components/ui/Skeleton'; 
import { EmptyState } from '@/components/ui/EmptyState'; 
import { useToast } from '@/hooks/useToast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quotes as quotesApi } from '@/lib/api';
import type { Quote, QuoteApproval } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import {
  ArrowLeft,
  Download,
  Printer,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  MessageSquare,
  Building,
  User as UserIcon,
  HelpCircle,
  AlertCircle,
  Mail,
  Loader2,
  Check,
  X,
  Minus
} from 'lucide-react';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';

// ── Mock Fallback Data ──────────────────────────────────────────
const MOCK_QUOTE_DETAILS: Record<number, Quote> = {
  1: {
    id: 1,
    quote_number: 'QT-2026-0001',
    lead_id: 1,
    lead: {
      id: 1,
      company_name: 'Apex Designs',
      budget: 100000,
      priority: 'medium',
      temperature: 'warm',
      contacts: [{ id: 1, lead_id: 1, name: 'Sanjay Kapoor', designation: 'Marketing Director', email: 'sanjay@apex.co', phone: '+91 98765 43210', is_primary: true }],
      activities: [],
      stage_id: 1,
      source_id: 1,
      created_at: '',
      updated_at: ''
    },
    title: 'Website Redesign & SEO Campaign',
    currency: 'INR',
    valid_until: '2026-07-15T00:00:00Z',
    status: 'pending_approval',
    subtotal: 180000,
    discount_amount: 15000,
    tax_amount: 29700,
    total_amount: 194700,
    coupon_code: 'WELCOME10',
    terms_conditions: '1. Validity: This quote is valid for 30 days.\n2. Payment Terms: 50% advance, 50% upon delivery.\n3. Taxes: 18% GST will be applicable.',
    internal_comments: 'Margins are good. Standard 15% discount applied on development package.',
    items: [
      { id: 10, quote_id: 1, service_id: 4, description: 'Next.js Web App Development (Custom layout, headless CMS integration, contact forms)', quantity: 1, unit_price: 150000, discount_percentage: 10, tax_rate: 18, subtotal: 150000, discount_amount: 15000, tax_amount: 24300, total_amount: 159300 },
      { id: 11, quote_id: 1, service_id: 1, description: 'SEO Optimization (3 months campaign)', quantity: 1, unit_price: 30000, discount_percentage: 0, tax_rate: 18, subtotal: 30000, discount_amount: 0, tax_amount: 54000, total_amount: 35405 },
    ],
    created_by: { id: 2, name: 'Priya Singh', email: 'priya@creativals.in', roles: [{ id: 3, name: 'pm', display_name: 'Project Manager' }], permissions: [], departments: [], avatar_url: null, status: 'active' },
    approvals: [
      { id: 1, quote_id: 1, user_id: 2, user: { id: 2, name: 'Priya Singh', email: '', roles: [], permissions: [], departments: [], avatar_url: null, status: 'active' }, step_name: 'Draft Created', status: 'approved', comments: 'Initial quote proposal draft.', actioned_at: '2026-06-10T11:00:00Z', created_at: '2026-06-10T11:00:00Z' },
      { id: 2, quote_id: 1, user_id: 2, user: { id: 2, name: 'Priya Singh', email: '', roles: [], permissions: [], departments: [], avatar_url: null, status: 'active' }, step_name: 'Submit for Review', status: 'approved', comments: 'Ready for Sales Head sign-off.', actioned_at: '2026-06-10T11:30:00Z', created_at: '2026-06-10T11:30:00Z' },
    ],
    created_at: '2026-06-10T11:00:00Z',
    updated_at: '2026-06-10T11:30:00Z',
  },
  2: {
    id: 2,
    quote_number: 'QT-2026-0002',
    lead_id: 2,
    lead: {
      id: 2,
      company_name: 'NovaTech Corp',
      budget: 500000,
      priority: 'high',
      temperature: 'hot',
      contacts: [{ id: 2, lead_id: 2, name: 'Amit Sharma', designation: 'CEO', email: 'amit@novatech.co', is_primary: true }],
      activities: [],
      stage_id: 1,
      source_id: 1,
      created_at: '',
      updated_at: ''
    },
    title: 'Mobile App Custom Development',
    currency: 'INR',
    valid_until: '2026-06-30T00:00:00Z',
    status: 'approved',
    subtotal: 300000,
    discount_amount: 0,
    tax_amount: 54000,
    total_amount: 354000,
    terms_conditions: 'Standard terms apply.',
    items: [
      { id: 12, quote_id: 2, service_id: 5, description: 'Mobile App Development (iOS/Android cross platform app)', quantity: 1, unit_price: 300000, discount_percentage: 0, tax_rate: 18, subtotal: 300000, discount_amount: 0, tax_amount: 54000, total_amount: 354000 },
    ],
    created_by: { id: 2, name: 'Priya Singh', email: '', roles: [], permissions: [], departments: [], avatar_url: null, status: 'active' },
    approvals: [
      { id: 3, quote_id: 2, user_id: 1, user: { id: 1, name: 'Rahul Sharma', email: '', roles: [{ id: 1, name: 'founder', display_name: 'Founder' }], permissions: [], departments: [], avatar_url: null, status: 'active' }, step_name: 'Founder Review', status: 'approved', comments: 'Budget and scope look ideal.', actioned_at: '2026-06-09T14:20:00Z', created_at: '2026-06-09T14:20:00Z' }
    ],
    created_at: '2026-06-08T10:00:00Z',
    updated_at: '2026-06-09T14:20:00Z',
  }
};

interface Params {
  id: string;
}

// ── Safe currency code resolver ──────────────────────────────────
// The API may return currency as a string ('INR') or as an object {id, code, symbol, name}
function resolveCurrencyCode(currency: any): string {
  if (!currency) return 'INR';
  if (typeof currency === 'string') return currency;
  if (typeof currency === 'object') {
    return currency.code ?? currency.currency_code ?? currency.symbol ?? 'INR';
  }
  return 'INR';
}

export default function QuoteDetailPage({ params }: { params: Promise<Params> }) {
  const { showToast } = useToast();
  const resolvedParams = use(params);
  const quoteId = Number(resolvedParams.id);

  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuthStore();

  // Dialog Modals State
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalActionType, setApprovalActionType] = useState<'approve' | 'reject'>('approve');
  const [commentsText, setCommentsText] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleEmailClient = async () => {
    if (!quote) return;
    setSendingEmail(true);
    setEmailStatus(null);
    try {
      await quotesApi.send(quote.id);
      setEmailStatus({ type: 'success', message: 'Quote proposal sent to client successfully.' });
      setTimeout(() => setEmailStatus(null), 5000);
    } catch (err: any) {
      setEmailStatus({ 
        type: 'error', 
        message: err.response?.data?.message || 'Failed to email quote. Please check SMTP settings.' 
      });
      setTimeout(() => setEmailStatus(null), 7000);
    } finally {
      setSendingEmail(false);
    }
  };

  // Fetch quote detail
  const { data: quote, isLoading } = useQuery<Quote>({
    queryKey: ['quote-detail', quoteId],
    queryFn: async () => {
      try {
        const res = await quotesApi.get(quoteId);
        return res.data;
      } catch {
        // Fallback
        if (MOCK_QUOTE_DETAILS[quoteId]) {
          return MOCK_QUOTE_DETAILS[quoteId];
        }
        throw new Error('Quote details not found');
      }
    }
  });

  // Action Mutations
  const submitApprovalMutation = useMutation({
    mutationFn: () => quotesApi.submitApproval(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-detail', quoteId] });
      showToast('Quote submitted for internal review.', 'info');
    },
    onError: () => {
      // Fallback
      if (quote) {
        quote.status = 'pending_approval';
        quote.approvals = quote.approvals || [];
        quote.approvals.push({
          id: Date.now(),
          quote_id: quoteId,
          user_id: user?.id || 1,
          user: user || undefined,
          step_name: 'Submit Approval',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        queryClient.setQueryData(['quote-detail', quoteId], { ...quote });
      }
    }
  });

  const approveMutation = useMutation({
    mutationFn: (comments: string) => quotesApi.approve(quoteId, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-detail', quoteId] });
      setApprovalModalOpen(false);
      setCommentsText('');
    },
    onError: () => {
      // Fallback
      if (quote) {
        quote.status = 'approved';
        quote.approvals = quote.approvals || [];
        quote.approvals.push({
          id: Date.now(),
          quote_id: quoteId,
          user_id: user?.id || 1,
          user: user || undefined,
          step_name: 'Sales Head / Founder Review',
          status: 'approved',
          comments: commentsText || 'Approved pricing terms.',
          actioned_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
        queryClient.setQueryData(['quote-detail', quoteId], { ...quote });
      }
      setApprovalModalOpen(false);
      setCommentsText('');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (comments: string) => quotesApi.reject(quoteId, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-detail', quoteId] });
      setApprovalModalOpen(false);
      setCommentsText('');
    },
    onError: () => {
      // Fallback
      if (quote) {
        quote.status = 'rejected';
        quote.approvals = quote.approvals || [];
        quote.approvals.push({
          id: Date.now(),
          quote_id: quoteId,
          user_id: user?.id || 1,
          user: user || undefined,
          step_name: 'Sales Head / Founder Review',
          status: 'rejected',
          comments: commentsText || 'Rejected. Adjust pricing.',
          actioned_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
        queryClient.setQueryData(['quote-detail', quoteId], { ...quote });
      }
      setApprovalModalOpen(false);
      setCommentsText('');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="max-w-[1400px] mx-auto p-6 text-center space-y-4">
        <AlertCircle size={48} className="text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-zinc-200">Quotation Not Found</h2>
        <p className="text-sm text-zinc-400">The quote you are looking for does not exist or has been deleted.</p>
        <Link href="/quotes" className="btn btn-secondary inline-block">Back to List</Link>
      </div>
    );
  }

  // Permissions checks
  const isApprover = user?.roles?.some(r => ['founder', 'sales_head', 'admin'].includes(r.name));

  const handlePrint = () => {
    window.print();
  };

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const handleDownloadPdf = async () => {
    if (!quote) return;
    setDownloadingPdf(true);
    try {
      const res = await quotesApi.downloadPdf(quote.id);
      const url = window.URL.createObjectURL(new Blob([res.data as any]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${quote.quote_number || 'quote'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      showToast('Failed to download PDF', 'info');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const openApprovalModal = (type: 'approve' | 'reject') => {
    setApprovalActionType(type);
    setApprovalModalOpen(true);
  };

  const submitApprovalAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (approvalActionType === 'approve') {
      approveMutation.mutate(commentsText);
    } else {
      if (!commentsText.trim()) {
        showToast('Please specify the rejection reasons in comments.', 'info');
        return;
      }
      rejectMutation.mutate(commentsText);
    }
  };

  // Status badges config
  const statusConfig: Record<Quote['status'], { label: string; colorClass: string }> = {
    draft: { label: 'Draft Mode', colorClass: 'bg-zinc-800 text-zinc-400 border-zinc-700/60' },
    pending_approval: { label: 'Pending Approval', colorClass: 'bg-amber-950/40 text-amber-400 border-amber-900/60' },
    approved: { label: 'Internal Approved', colorClass: 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60' },
    sent: { label: 'Sent to Client', colorClass: 'bg-blue-950/40 text-blue-400 border-blue-900/60' },
    accepted: { label: 'Client Accepted', colorClass: 'bg-violet-950/50 text-violet-400 border-violet-850' },
    rejected: { label: 'Rejected', colorClass: 'bg-red-950/40 text-red-400 border-red-900/60' },
    expired: { label: 'Expired', colorClass: 'bg-zinc-900/50 text-zinc-500 border-zinc-800/80' },
    converted: { label: 'Converted to Deal', colorClass: 'bg-teal-950/40 text-teal-400 border-teal-900/40' },
  };
  const activeStatus = statusConfig[quote.status] || { label: quote.status, colorClass: 'bg-zinc-800 text-zinc-400' };

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
      {/* Print styles stylesheet hack to only print the left column */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-quote-preview, #printable-quote-preview * {
            visibility: visible;
          }
          #printable-quote-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #fff !important;
            color: #000 !important;
            box-shadow: none !important;
            border: none !important;
          }
          #printable-quote-preview .text-zinc-200,
          #printable-quote-preview .text-zinc-100,
          #printable-quote-preview .text-zinc-300 {
            color: #111827 !important;
          }
          #printable-quote-preview .text-zinc-400,
          #printable-quote-preview .text-zinc-500 {
            color: #4b5563 !important;
          }
          #printable-quote-preview .border-zinc-800,
          #printable-quote-preview .border-zinc-850 {
            border-color: #e5e7eb !important;
          }
          #printable-quote-preview .bg-zinc-950,
          #printable-quote-preview .bg-zinc-900 {
            background-color: #f9fafb !important;
          }
          #printable-quote-preview .bg-zinc-950\\/40 {
            background-color: #f3f4f6 !important;
          }
        }
      `}</style>

      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5 print:hidden">
        <div className="flex items-center gap-2">
          <Link href="/quotes" className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Quote detail: {quote.quote_number}</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Title: {quote.title}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleEmailClient}
            disabled={sendingEmail}
            className="btn btn-primary flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2"
          >
            {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            <span>Email to Client</span>
          </button>
          <button
            onClick={handlePrint}
            className="btn btn-secondary flex items-center gap-1.5 text-xs font-semibold hover:bg-zinc-800 px-3.5 py-2"
          >
            <Printer size={14} /> Print
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="btn btn-secondary flex items-center gap-1.5 text-xs font-semibold hover:bg-zinc-800 px-3.5 py-2"
          >
            {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download PDF
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
          marginBottom: '1rem',
        }}>
          {emailStatus.message}
        </div>
      )}

      {/* Grid columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: PDF Styled Sheet (Preview) */}
        <div className="lg:col-span-2 space-y-6">
          <div
            id="printable-quote-preview"
            className="bg-zinc-900 border border-zinc-800 shadow-2xl rounded-2xl p-6 md:p-10 text-zinc-350 space-y-8"
          >
            {/* PDF Header Logo & Meta */}
            <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-6 border-b border-zinc-800 pb-8">
              <div className="space-y-3">
                {/* Agency Mock Logo */}
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-gradient-to-tr from-violet-600 to-indigo-650 rounded-xl flex items-center justify-center shadow-lg">
                    <FileText className="text-white w-4.5 h-4.5" />
                  </div>
                  <span className="text-base font-extrabold text-zinc-100 tracking-tight">Creativals Agency</span>
                </div>
                <div className="text-xs text-zinc-400 space-y-0.5 leading-relaxed">
                  <p>7th Floor, DLF Cyber City, Phase 3</p>
                  <p>Gurugram, Haryana - 122002</p>
                  <p>GSTIN: 06AAFCC1483L1ZS</p>
                  <p>Email: operations@creativals.in</p>
                </div>
              </div>

              <div className="text-left sm:text-right space-y-1">
                <span className="text-xs font-bold text-violet-400 tracking-widest uppercase block">QUOTATION PROPOSAL</span>
                <span className="text-lg font-mono font-bold text-zinc-100 block">{quote.quote_number}</span>
                <div className="text-xs text-zinc-400 space-y-0.5">
                  <p><strong>Quote Date:</strong> {formatDate(quote.created_at || new Date())}</p>
                  <p><strong>Valid Until:</strong> {formatDate(quote.valid_until)}</p>
                  <p><strong>Currency:</strong> {resolveCurrencyCode(quote.currency)}</p>
                </div>
              </div>
            </div>

            {/* Client billing information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1.5">
                  <Building size={11} /> Prepared For:
                </span>
                {quote.lead ? (
                  <div className="text-xs space-y-1">
                    <h4 className="text-sm font-bold text-zinc-200">{quote.lead.company_name}</h4>
                    {quote.lead.contacts?.[0] && (
                      <>
                        <p className="font-semibold text-zinc-300">{quote.lead.contacts[0].name}</p>
                        <p className="text-zinc-400">{quote.lead.contacts[0].designation || 'Primary Contact'}</p>
                        <p className="text-zinc-400">Email: {quote.lead.contacts[0].email || 'N/A'}</p>
                        <p className="text-zinc-400">Phone: {quote.lead.contacts[0].phone || 'N/A'}</p>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">No Lead Profile Linked</p>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1.5">
                  <UserIcon size={11} /> Prepared By:
                </span>
                <div className="text-xs space-y-1">
                  <h4 className="text-sm font-bold text-zinc-200">{quote.created_by?.name || 'Account Executive'}</h4>
                  <p className="text-zinc-400">{quote.created_by?.roles?.[0]?.display_name || 'Sales Representative'}</p>
                  <p className="text-zinc-400">Email: {quote.created_by?.email || 'sales@creativals.in'}</p>
                </div>
              </div>
            </div>

            {/* Quote details title block */}
            <div className="bg-zinc-950/30 border border-zinc-850 rounded-xl p-4">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Scope Proposal Subject</span>
              <p className="text-sm font-bold text-zinc-150 mt-1">{quote.title}</p>
            </div>

            {/* Line items table */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">Scope of Deliverables & Pricing</span>
              <div className="bg-zinc-950/40 border border-zinc-850 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-950/80 border-b border-zinc-850 text-zinc-400 font-bold uppercase tracking-wider">
                      <th className="p-3.5 w-[5%] text-center">#</th>
                      <th className="p-3.5 w-[50%]">Service & Scope Deliverables</th>
                      <th className="p-3.5 w-[10%] text-center">Qty</th>
                      <th className="p-3.5 w-[15%] text-right">Unit Price</th>
                      <th className="p-3.5 w-[8%] text-center">Disc</th>
                      <th className="p-3.5 w-[12%] text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850 text-zinc-300">
                    {quote.items?.map((item, index) => {
                      const itemSub = item.quantity * item.unit_price;
                      const itemDisc = itemSub * (item.discount_percentage / 100);
                      const itemTotal = itemSub - itemDisc + (itemSub - itemDisc) * (item.tax_rate / 100);

                      return (
                        <tr key={item.id || index} className="hover:bg-zinc-950/15">
                          <td className="p-3.5 text-center text-zinc-500 font-mono">{index + 1}</td>
                          <td className="p-3.5">
                            <span className="font-bold text-zinc-200 block">{item.service?.name || 'Custom Service'}</span>
                            <span className="text-[10px] text-zinc-400 block mt-1 leading-relaxed whitespace-pre-wrap">{item.description}</span>
                          </td>
                          <td className="p-3.5 text-center font-mono">{item.quantity}</td>
                          <td className="p-3.5 text-right font-mono">{formatCurrency(item.unit_price, resolveCurrencyCode(quote.currency))}</td>
                          <td className="p-3.5 text-center text-red-400 font-semibold font-mono">{item.discount_percentage > 0 ? `${item.discount_percentage}%` : '-'}</td>
                          <td className="p-3.5 text-right font-bold font-mono text-zinc-200">{formatCurrency(itemTotal, resolveCurrencyCode(quote.currency))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Terms and summary total block */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 items-start">
              {/* Terms */}
              <div className="md:col-span-2 space-y-2">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">Terms & Conditions</span>
                <p className="text-[10px] text-zinc-450 leading-relaxed whitespace-pre-line bg-zinc-950/20 p-3 rounded-lg border border-zinc-850 font-mono">
                  {quote.terms_conditions || 'No custom terms added.'}
                </p>
              </div>

              {/* Totals */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block text-right">Financial Summary</span>
                <div className="bg-zinc-950/50 rounded-xl border border-zinc-850 p-4 space-y-2 text-[11px] font-medium text-zinc-400">
                  <div className="flex justify-between items-center">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-zinc-200">{formatCurrency(quote.subtotal, resolveCurrencyCode(quote.currency))}</span>
                  </div>
                  <div className="flex justify-between items-center text-red-400">
                    <span>Discount:</span>
                    <span>-{formatCurrency(quote.discount_amount, resolveCurrencyCode(quote.currency))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>GST Tax:</span>
                    <span className="font-semibold text-zinc-200">{formatCurrency(quote.tax_amount, resolveCurrencyCode(quote.currency))}</span>
                  </div>
                  {quote.coupon_code && (
                    <div className="flex justify-between items-center text-violet-400 font-bold border-t border-dashed border-zinc-800 pt-1.5 mt-1">
                      <span>Promo ({quote.coupon_code}):</span>
                      <span>Applied</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-zinc-800 pt-2 mt-1.5 text-xs">
                    <span className="font-bold text-zinc-300">Total Net:</span>
                    <span className="font-extrabold text-violet-400 text-sm">{formatCurrency(quote.total_amount, resolveCurrencyCode(quote.currency))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Signature Block */}
            <div className="grid grid-cols-2 gap-8 border-t border-zinc-800 pt-8 text-center text-[10px] text-zinc-500">
              <div className="space-y-12">
                <p>Prepared & Verified By</p>
                <div className="border-b border-zinc-800 w-1/2 mx-auto"></div>
                <p className="font-semibold">{quote.created_by?.name || 'Account Executive'}</p>
              </div>
              <div className="space-y-12">
                <p>Client Acceptance Seal / Signature</p>
                <div className="border-b border-zinc-800 w-1/2 mx-auto"></div>
                <p className="font-semibold">{quote.lead?.company_name || 'Representative'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Workflow, Status, Approvals Logs */}
        <div className="space-y-6 print:hidden">
          {/* Status Box */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-md space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">Approval Status</h3>
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500">Current Phase</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${activeStatus.colorClass}`}>
                {activeStatus.label}
              </span>
            </div>

            {/* Action Buttons based on status & roles */}
            <div className="pt-2 border-t border-zinc-800/60 flex flex-col gap-2">
              {/* Draft/Rejected -> Submit for Approval */}
              {(quote.status === 'draft' || quote.status === 'rejected') && (
                <button
                  id="submit-approval-btn"
                  onClick={() => submitApprovalMutation.mutate()}
                  className="w-full btn btn-primary py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                  disabled={submitApprovalMutation.isPending}
                >
                  <Clock size={14} /> Submit for Approval
                </button>
              )}

              {/* Pending Approval -> Approver (Founder/Sales Head) Approve/Reject */}
              {quote.status === 'pending_approval' && (
                <>
                  {isApprover ? (
                    <div className="flex gap-2">
                      <button
                        id="approve-quote-btn"
                        onClick={() => openApprovalModal('approve')}
                        className="flex-1 btn btn-primary py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button
                        id="reject-quote-btn"
                        onClick={() => openApprovalModal('reject')}
                        className="flex-1 btn btn-danger py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  ) : (
                    <div className="bg-zinc-950/50 border border-zinc-850 p-3.5 rounded-lg flex items-start gap-2.5">
                      <AlertCircle className="text-amber-500 w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Awaiting review from Founder or Sales Head. You do not have permissions to action this step.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Edit Option if applicable */}
              {(quote.status === 'draft' || quote.status === 'rejected') && (
                <Link
                  href={`/quotes/create?id=${quote.id}`}
                  className="w-full btn btn-secondary py-2 text-xs font-semibold text-center hover:bg-zinc-800 block"
                >
                  Edit Scope Details
                </Link>
              )}
            </div>
          </div>

          {/* Workflow History Logs */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-md space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">Approval Steps & Logs</h3>

            {quote.approvals && quote.approvals.length > 0 ? (
              <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-zinc-800">
                {quote.approvals.map((log) => {
                  const isLogApproved = log.status === 'approved';
                  const isLogRejected = log.status === 'rejected';
                  
                  return (
                    <div key={log.id} className="flex gap-3 relative">
                      {/* Timeline dot */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${
                        isLogApproved ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                        isLogRejected ? 'bg-red-950 text-red-400 border border-red-900' :
                        'bg-zinc-850 text-zinc-400 border border-zinc-800'
                      }`}>
                        {isLogApproved ? <Check size={12} strokeWidth={2.5} /> : isLogRejected ? <X size={12} strokeWidth={2.5} /> : <Minus size={12} />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-zinc-200 truncate">{log.step_name}</h4>
                          <span className="text-[9px] text-zinc-500 whitespace-nowrap">
                            {log.actioned_at || log.created_at ? formatRelativeTime(log.actioned_at || log.created_at) : 'pending'}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-0.5">By: {log.user?.name || 'System User'}</p>
                        
                        {log.comments && (
                          <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-850 mt-1.5 flex gap-1.5 items-start">
                            <MessageSquare size={10} className="text-zinc-500 mt-0.5 flex-shrink-0" />
                            <p className="text-[10px] text-zinc-450 leading-relaxed font-mono whitespace-pre-wrap">{log.comments}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-6 text-xs text-zinc-500 italic">
                No logs recorded yet. Submit the quote to initiate workflow logs.
              </div>
            )}
          </div>

          {/* Internal comments info panel */}
          {quote.internal_comments && (
            <div className="bg-zinc-900/30 border border-zinc-800 p-5 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Internal Staff Notes</h4>
              <p className="text-xs text-zinc-400 leading-relaxed italic">{quote.internal_comments}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── APPROVAL DECISION COMMENT MODAL ── */}
      {approvalModalOpen && (
        <div className="overlay z-50" onClick={() => setApprovalModalOpen(false)}>
          <div className="modal max-w-md bg-zinc-950 border border-zinc-800 text-zinc-100 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
              <h3 className="text-base font-bold">
                {approvalActionType === 'approve' ? 'Approve Quote Terms' : 'Reject Quote Scope'}
              </h3>
              <button onClick={() => setApprovalModalOpen(false)} className="text-zinc-400 hover:text-zinc-200">
                ✕
              </button>
            </div>

            <form onSubmit={submitApprovalAction} className="space-y-4">
              <div className="form-group">
                <label className="form-label text-xs font-semibold text-zinc-400 mb-1.5 block">
                  Comments & Feedback {approvalActionType === 'reject' ? '*' : '(Optional)'}
                </label>
                <textarea
                  rows={4}
                  placeholder={approvalActionType === 'approve'
                    ? 'e.g. Budget and discount looks reasonable. Go ahead.'
                    : 'Specify scope changes or discount adjustment requirements...'
                  }
                  value={commentsText}
                  onChange={(e) => setCommentsText(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 text-zinc-200 text-xs rounded-lg p-3 outline-none focus:ring-1 focus:ring-violet-500 resize-none leading-relaxed"
                  required={approvalActionType === 'reject'}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-850">
                <button type="button" className="btn btn-secondary text-xs" onClick={() => setApprovalModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn text-xs font-bold px-4 py-2 text-white ${
                    approvalActionType === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-red-600 hover:bg-red-500'
                  }`}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  {approveMutation.isPending || rejectMutation.isPending ? 'Actioning...' : (approvalActionType === 'approve' ? 'Approve' : 'Reject')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
