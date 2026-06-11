'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { quotes as quotesApi } from '@/lib/api';
import type { Quote } from '@/lib/api';
import { Plus, Search, FileText, ChevronLeft, ChevronRight, Eye, Calendar, DollarSign, Check, X, ShieldAlert } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

// ── Fallback Mock Data ──────────────────────────────────────────
const MOCK_QUOTES: Quote[] = [
  {
    id: 1,
    quote_number: 'QT-2026-0001',
    lead_id: 1,
    lead: { id: 1, company_name: 'Apex Designs', budget: 100000, priority: 'medium', temperature: 'warm', contacts: [], activities: [], stage_id: 1, source_id: 1, created_at: '', updated_at: '' },
    title: 'Website Redesign & SEO Campaign',
    currency: 'INR',
    valid_until: '2026-07-15',
    status: 'pending_approval',
    subtotal: 180000,
    discount_amount: 15000,
    tax_amount: 29700,
    total_amount: 194700,
    items: [],
    created_at: '2026-06-10',
    updated_at: '2026-06-10',
  },
  {
    id: 2,
    quote_number: 'QT-2026-0002',
    lead_id: 2,
    lead: { id: 2, company_name: 'NovaTech Corp', budget: 500000, priority: 'high', temperature: 'hot', contacts: [], activities: [], stage_id: 1, source_id: 1, created_at: '', updated_at: '' },
    title: 'Mobile App Custom Development',
    currency: 'INR',
    valid_until: '2026-06-30',
    status: 'approved',
    subtotal: 300000,
    discount_amount: 0,
    tax_amount: 54000,
    total_amount: 354000,
    items: [],
    created_at: '2026-06-08',
    updated_at: '2026-06-09',
  },
  {
    id: 3,
    quote_number: 'QT-2026-0003',
    lead_id: 3,
    lead: { id: 3, company_name: 'GreenLife Retail', budget: 80000, priority: 'low', temperature: 'cold', contacts: [], activities: [], stage_id: 1, source_id: 1, created_at: '', updated_at: '' },
    title: 'Brand Identity Collateral Pack',
    currency: 'INR',
    valid_until: '2026-05-20',
    status: 'expired',
    subtotal: 90000,
    discount_amount: 10000,
    tax_amount: 14400,
    total_amount: 94400,
    items: [],
    created_at: '2026-05-01',
    updated_at: '2026-05-01',
  },
  {
    id: 4,
    quote_number: 'QT-2026-0004',
    lead_id: 4,
    lead: { id: 4, company_name: 'EduPath Learning', budget: 120000, priority: 'medium', temperature: 'warm', contacts: [], activities: [], stage_id: 1, source_id: 1, created_at: '', updated_at: '' },
    title: 'Digital Marketing & Content Copywriting',
    currency: 'INR',
    valid_until: '2026-07-10',
    status: 'draft',
    subtotal: 110000,
    discount_amount: 5000,
    tax_amount: 18900,
    total_amount: 123900,
    items: [],
    created_at: '2026-06-11',
    updated_at: '2026-06-11',
  }
];

const STATUS_FILTERS = [
  { value: 'all', label: 'All Quotes' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
  { value: 'converted', label: 'Converted' },
];

export default function QuotesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Quotes
  const { data, isLoading } = useQuery({
    queryKey: ['quotes', page, statusFilter, searchQuery],
    queryFn: async () => {
      try {
        const res = await quotesApi.list({
          page,
          per_page: 10,
          status: statusFilter === 'all' ? undefined : statusFilter,
          search: searchQuery || undefined,
        });
        return res.data;
      } catch {
        // Fallback filter
        let filtered = [...MOCK_QUOTES];
        if (statusFilter !== 'all') {
          filtered = filtered.filter(q => q.status === statusFilter);
        }
        if (searchQuery) {
          filtered = filtered.filter(q =>
            q.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.lead?.company_name.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        return {
          data: filtered,
          meta: { current_page: 1, last_page: 1, per_page: 10, total: filtered.length }
        };
      }
    }
  });

  const quotesList = data?.data || [];
  const meta = data?.meta || { current_page: 1, last_page: 1, per_page: 10, total: 0 };

  // Helper: Status badge colors
  const getStatusBadge = (status: Quote['status']) => {
    const badges: Record<Quote['status'], { label: string; classes: string }> = {
      draft: { label: 'Draft', classes: 'bg-zinc-800 text-zinc-400 border-zinc-700/60' },
      pending_approval: { label: 'Pending Approval', classes: 'bg-amber-950/40 text-amber-400 border-amber-900/40' },
      approved: { label: 'Approved', classes: 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40' },
      sent: { label: 'Sent', classes: 'bg-blue-950/40 text-blue-400 border-blue-900/40' },
      accepted: { label: 'Accepted', classes: 'bg-violet-950/50 text-violet-400 border-violet-850' },
      rejected: { label: 'Rejected', classes: 'bg-red-950/40 text-red-400 border-red-900/40' },
      expired: { label: 'Expired', classes: 'bg-zinc-900/50 text-zinc-500 border-zinc-800/80' },
      converted: { label: 'Converted', classes: 'bg-teal-950/40 text-teal-400 border-teal-900/40' },
    };

    const config = badges[status] || { label: status, classes: 'bg-zinc-800 text-zinc-400 border-zinc-700' };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${config.classes}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <FileText className="text-violet-500 w-6 h-6" />
            Quotations
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Create, build, track approvals, and manage client-facing product and pricing estimates.
          </p>
        </div>
        <Link href="/quotes/create" className="btn btn-primary flex items-center gap-1.5 self-start sm:self-auto">
          <Plus size={16} /> Create Quote
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 text-zinc-500 w-4.5 h-4.5" />
          <input
            type="text"
            placeholder="Search by quote #, client, or title..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {/* Status selection mobile-friendly scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-zinc-900/20 border border-zinc-850 rounded-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        </div>
      ) : quotesList.length === 0 ? (
        <div className="p-12 bg-zinc-900/30 border border-zinc-800 rounded-xl text-center flex flex-col items-center justify-center space-y-3">
          <FileText size={44} className="text-zinc-600" />
          <h3 className="text-zinc-350 font-medium">No quotes found</h3>
          <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search criteria or filters to see results.'
              : 'Create your first proposal layout and draft it directly inside our quotation builder.'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <Link href="/quotes/create" className="btn btn-secondary text-xs">
              Draft Quote Now
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-450 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Quote Number</th>
                  <th className="p-4">Lead / Client Name</th>
                  <th className="p-4">Quote Title</th>
                  <th className="p-4">Total Amount (INR)</th>
                  <th className="p-4">Valid Until</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {quotesList.map((quote) => (
                  <tr key={quote.id} className="hover:bg-zinc-900/40 transition">
                    <td className="p-4 font-mono text-xs text-violet-400 font-semibold">
                      {quote.quote_number}
                    </td>
                    <td className="p-4">
                      {quote.lead ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{quote.lead.company_name}</span>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                            Lead #{quote.lead.id}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No Lead Assigned</span>
                      )}
                    </td>
                    <td className="p-4 max-w-xs truncate font-medium text-zinc-200">
                      {quote.title}
                    </td>
                    <td className="p-4 font-bold text-zinc-150">
                      {formatCurrency(quote.total_amount, quote.currency)}
                    </td>
                    <td className="p-4 text-xs">
                      {formatDate(quote.valid_until)}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(quote.status)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          id={`view-quote-${quote.id}`}
                          href={`/quotes/${quote.id}`}
                          className="p-1.5 rounded bg-zinc-800/80 text-zinc-300 hover:text-violet-400 hover:bg-zinc-750 transition"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </Link>
                        {(quote.status === 'draft' || quote.status === 'rejected') && (
                          <Link
                            id={`edit-quote-${quote.id}`}
                            href={`/quotes/create?id=${quote.id}`}
                            className="p-1.5 rounded bg-zinc-800/80 text-zinc-300 hover:text-violet-400 hover:bg-zinc-750 transition"
                            title="Edit Quote"
                          >
                            <Plus size={14} className="rotate-45" /> {/* fallback edit layout symbol */}
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.last_page > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3 bg-zinc-950/60">
              <span className="text-xs text-zinc-500">
                Showing page <strong className="text-zinc-400">{meta.current_page}</strong> of <strong className="text-zinc-400">{meta.last_page}</strong>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-750 disabled:opacity-40 disabled:hover:bg-zinc-800 transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                  disabled={page === meta.last_page}
                  className="p-1.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-750 disabled:opacity-40 disabled:hover:bg-zinc-800 transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
