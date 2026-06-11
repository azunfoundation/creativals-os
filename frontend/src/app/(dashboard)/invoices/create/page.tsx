'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  invoices as invoicesApi, 
  quotes as quotesApi, 
  services as servicesApi,
  leads as leadsApi
} from '@/lib/api';
import type { Lead, Service, Quote, Invoice, InvoiceItem } from '@/lib/api';
import { Plus, Trash2, ArrowLeft, Percent, Check, X, ShieldAlert, FileText, Calendar, User } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface LineItemState {
  service_id: number | '';
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  tax_rate: number;
}

// Fallback mocks if APIs fail
const MOCK_LEADS: Lead[] = [
  { id: 1, company_name: 'Apex Designs', budget: 100000, priority: 'medium', temperature: 'warm', contacts: [], activities: [], stage_id: 1, source_id: 1, created_at: '', updated_at: '' },
  { id: 2, company_name: 'NovaTech Corp', budget: 500000, priority: 'high', temperature: 'hot', contacts: [], activities: [], stage_id: 1, source_id: 1, created_at: '', updated_at: '' },
  { id: 3, company_name: 'GreenLife Retail', budget: 80000, priority: 'low', temperature: 'cold', contacts: [], activities: [], stage_id: 1, source_id: 1, created_at: '', updated_at: '' },
  { id: 4, company_name: 'EduPath Learning', budget: 120000, priority: 'medium', temperature: 'warm', contacts: [], activities: [], stage_id: 1, source_id: 1, created_at: '', updated_at: '' }
];

const MOCK_SERVICES: Service[] = [
  { id: 1, category_id: 1, name: 'SEO Optimization', description: 'Comprehensive on-page and off-page search engine optimization to boost organic rank.', base_price: 25000, unit: 'month', tax_rate: 18 },
  { id: 2, category_id: 1, name: 'Social Media Management', description: 'Handling 3 major platforms, weekly postings, and engagement reports.', base_price: 35000, unit: 'month', tax_rate: 18 },
  { id: 3, category_id: 1, name: 'Google Ads Management', description: 'Setup, copywriting, budget optimization, and management of Google search/display campaigns.', base_price: 15000, unit: 'month', tax_rate: 18 },
  { id: 4, category_id: 2, name: 'Next.js Web App Development', description: 'Custom full-stack web applications using React, Next.js 15, and Tailwind CSS.', base_price: 150000, unit: 'project', tax_rate: 18 },
  { id: 5, category_id: 2, name: 'Mobile App Development (iOS/Android)', description: 'Cross-platform mobile apps built using React Native or Flutter.', base_price: 300000, unit: 'project', tax_rate: 18 },
  { id: 6, category_id: 2, name: 'UI/UX Design System', description: 'High-fidelity Figma prototypes, design tokens, responsive components, and style guides.', base_price: 75000, unit: 'project', tax_rate: 18 },
];

function InvoiceBuilderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteParamId = searchParams.get('quoteId') || searchParams.get('quote_id');

  // Form Field States
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [quoteId, setQuoteId] = useState<number | ''>('');
  const [leadId, setLeadId] = useState<number | ''>('');
  const [currency, setCurrency] = useState('INR');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [terms, setTerms] = useState(
    '1. Payment Mode: Bank Transfer / UPI.\n2. Interest of 2% per month will be charged on overdue invoices after the due date.\n3. All disputes are subject to local jurisdiction.'
  );
  const [notes, setNotes] = useState('Thank you for choosing Creativals!');
  const [lineItems, setLineItems] = useState<LineItemState[]>([
    { service_id: '', description: '', quantity: 1, unit_price: 0, discount_percentage: 0, tax_rate: 18 }
  ]);

  // Fetch Quotes (to allow prefilling directly from dropdown)
  const { data: quotesList = [] } = useQuery<Quote[]>({
    queryKey: ['quotes_all'],
    queryFn: async () => {
      try {
        const res = await quotesApi.list({ per_page: 100 });
        return res.data.data;
      } catch {
        if (typeof window !== 'undefined') {
          // fallback to localStorage
          const stored = localStorage.getItem('creativals_quotes');
          if (stored) return JSON.parse(stored);
        }
        return [];
      }
    }
  });

  // Fetch CRM Leads
  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ['leads_all'],
    queryFn: async () => {
      try {
        const res = await leadsApi.list({ per_page: 100 });
        return res.data.data;
      } catch {
        return MOCK_LEADS;
      }
    }
  });

  // Fetch Catalog Services
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services_all'],
    queryFn: async () => {
      try {
        const res = await servicesApi.list();
        return res.data;
      } catch {
        return MOCK_SERVICES;
      }
    }
  });

  // Set default issue and due dates
  useEffect(() => {
    if (!issueDate) {
      setIssueDate(new Date().toISOString().split('T')[0]);
    }
    if (!dueDate) {
      const future = new Date();
      future.setDate(future.getDate() + 14); // 14 days default payment terms
      setDueDate(future.toISOString().split('T')[0]);
    }
  }, [issueDate, dueDate]);

  // Prefill when quoteId is selected or loaded via URL param
  const loadQuoteDetails = (qId: number) => {
    // Search in quotesList
    const quote = quotesList.find(q => q.id === qId);
    if (quote) {
      setTitle(`Invoice for ${quote.title}`);
      setQuoteId(quote.id);
      setLeadId(quote.lead_id || '');
      setCurrency(quote.currency);
      
      // Get client name
      if (quote.lead) {
        setClientName(quote.lead.company_name);
        const contact = quote.lead.contacts?.find(c => c.is_primary) || quote.lead.contacts?.[0];
        if (contact?.email) setClientEmail(contact.email);
      } else {
        setClientName('Custom Client');
      }

      if (quote.items && quote.items.length > 0) {
        setLineItems(
          quote.items.map(item => ({
            service_id: item.service_id || '',
            description: item.description || '',
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            discount_percentage: item.discount_percentage || 0,
            tax_rate: item.tax_rate ?? 18,
          }))
        );
      }
      
      if (quote.terms_conditions) {
        setTerms(quote.terms_conditions);
      }
    }
  };

  // Check URL quoteId param
  useEffect(() => {
    if (quoteParamId && quotesList.length > 0) {
      loadQuoteDetails(Number(quoteParamId));
    }
  }, [quoteParamId, quotesList]);

  // Handle service drop-down selection
  const handleServiceChange = (index: number, serviceIdVal: number | '') => {
    setLineItems(prev => {
      const updated = [...prev];
      updated[index].service_id = serviceIdVal;
      
      if (serviceIdVal !== '') {
        const found = services.find(s => s.id === serviceIdVal);
        if (found) {
          updated[index].description = found.description || found.name;
          updated[index].unit_price = found.base_price;
          updated[index].tax_rate = found.tax_rate ?? 18;
        }
      }
      return updated;
    });
  };

  const handleLineItemChange = (index: number, field: keyof LineItemState, value: any) => {
    setLineItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  const addLineItem = () => {
    setLineItems(prev => [
      ...prev,
      { service_id: '', description: '', quantity: 1, unit_price: 0, discount_percentage: 0, tax_rate: 18 }
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Math Calculations
  const rowCalculations = lineItems.map(item => {
    const subtotal = item.quantity * item.unit_price;
    const discountAmount = subtotal * (item.discount_percentage / 100);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = taxableAmount * (item.tax_rate / 100);
    const totalAmount = taxableAmount + taxAmount;
    return { subtotal, discountAmount, taxableAmount, taxAmount, totalAmount };
  });

  const subtotalSum = rowCalculations.reduce((sum, row) => sum + row.subtotal, 0);
  const itemsDiscountSum = rowCalculations.reduce((sum, row) => sum + row.discountAmount, 0);
  const taxSum = rowCalculations.reduce((sum, row) => sum + row.taxAmount, 0);
  const finalNetTotal = rowCalculations.reduce((sum, row) => sum + row.totalAmount, 0);

  // Submit/Save Action
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter an invoice title.');
      return;
    }
    if (!clientName.trim()) {
      alert('Please specify the client name.');
      return;
    }
    if (lineItems.some(i => i.unit_price < 0 || i.quantity <= 0)) {
      alert('Line items must have positive quantity and non-negative unit price.');
      return;
    }

    const payload = {
      quote_id: quoteId ? Number(quoteId) : undefined,
      lead_id: leadId ? Number(leadId) : undefined,
      title: title.trim(),
      client_name: clientName.trim(),
      client_email: clientEmail.trim() || undefined,
      currency,
      issue_date: issueDate,
      due_date: dueDate,
      terms_conditions: terms,
      notes,
      items: lineItems.map(item => ({
        service_id: item.service_id ? Number(item.service_id) : undefined,
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        discount_percentage: Number(item.discount_percentage),
        tax_rate: Number(item.tax_rate),
      }))
    };

    // Store inside LocalStorage for mock-persistence
    let currentInvoices: Invoice[] = [];
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('creativals_invoices');
      if (stored) {
        try { currentInvoices = JSON.parse(stored); } catch { currentInvoices = []; }
      }
    }

    const invoiceNum = `INV-2026-${String(currentInvoices.length + 1).padStart(4, '0')}`;
    const newInvoice: Invoice = {
      id: Math.floor(Math.random() * 100000),
      invoice_number: invoiceNum,
      quote_id: payload.quote_id,
      lead_id: payload.lead_id,
      title: payload.title,
      client_name: payload.client_name,
      client_email: payload.client_email,
      currency: payload.currency,
      issue_date: payload.issue_date,
      due_date: payload.due_date,
      status: 'sent', // defaults to sent when created
      subtotal: subtotalSum,
      discount_amount: itemsDiscountSum,
      tax_amount: taxSum,
      total_amount: finalNetTotal,
      paid_amount: 0,
      balance_amount: finalNetTotal,
      terms_conditions: payload.terms_conditions,
      notes: payload.notes,
      items: payload.items.map((item, idx) => ({
        ...item,
        subtotal: rowCalculations[idx].subtotal,
        discount_amount: rowCalculations[idx].discountAmount,
        tax_amount: rowCalculations[idx].taxAmount,
        total_amount: rowCalculations[idx].totalAmount,
      })),
      payments: [],
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0]
    };

    // Save
    const updated = [newInvoice, ...currentInvoices];
    if (typeof window !== 'undefined') {
      localStorage.setItem('creativals_invoices', JSON.stringify(updated));
    }

    // Try posting to API, ignore if it errors
    try {
      await invoicesApi.create(payload);
    } catch {
      // offline/mock behavior works
    }

    // Redirect to the newly created invoice details page
    router.push(`/invoices/${newInvoice.id}`);
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Link href="/invoices" className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition">
          <ArrowLeft size={16} />
        </Link>
        <span className="text-zinc-500 text-sm font-semibold">Back to Invoices</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          Create Client Invoice
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Draft a custom client invoice or import line items and scope agreements directly from a pre-approved quotation.
        </p>
      </div>

      {/* Pre-fill toolbar */}
      <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-300">
          <FileText size={18} className="text-violet-500" />
          <span className="text-xs font-bold uppercase tracking-wider">Convert Approved Quotation</span>
        </div>
        <div className="flex gap-2">
          <select
            onChange={(e) => {
              if (e.target.value) loadQuoteDetails(Number(e.target.value));
            }}
            className="bg-zinc-950 border border-zinc-800 text-zinc-150 text-xs rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="">-- Choose Quote to Prefill --</option>
            {quotesList
              .filter(q => q.status === 'approved' || q.status === 'accepted' || q.status === 'converted' || q.status === 'pending_approval')
              .map(q => (
                <option key={q.id} value={q.id}>
                  {q.quote_number} - {q.lead?.company_name || q.title}
                </option>
              ))
            }
          </select>
        </div>
      </div>

      <form onSubmit={handleSaveInvoice} className="space-y-6">
        
        {/* Step 1: Invoice metadata */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md space-y-4">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2 flex items-center gap-1.5">
            <User size={14} className="text-violet-400" />
            1. Invoice & Client Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Title */}
            <div className="form-group md:col-span-2">
              <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Invoice Title *</label>
              <input
                type="text"
                placeholder="e.g. Website Development Milestone 1 Payment"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>

            {/* Client Name */}
            <div className="form-group">
              <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Client Company / Name *</label>
              <input
                type="text"
                placeholder="e.g. NovaTech Corp"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>

            {/* Client Email */}
            <div className="form-group">
              <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Client Billing Email</label>
              <input
                type="email"
                placeholder="e.g. accounts@client.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Lead relation */}
            <div className="form-group">
              <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">CRM Lead (Optional)</label>
              <select
                value={leadId}
                onChange={(e) => setLeadId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">-- Unlinked --</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>{l.company_name}</option>
                ))}
              </select>
            </div>

            {/* Currency */}
            <div className="form-group">
              <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Billing Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>

            {/* Issue Date */}
            <div className="form-group">
              <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Issue Date *</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>

            {/* Due Date */}
            <div className="form-group">
              <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Due Date *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Step 2: Line items */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} className="text-violet-400" />
              2. Line Items Details
            </h2>
            <button
              type="button"
              onClick={addLineItem}
              className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 hover:bg-zinc-850"
            >
              <Plus size={14} /> Add Item Row
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 font-bold uppercase tracking-wider">
                  <th className="pb-2.5 pr-2.5 w-1/4">Catalog Service</th>
                  <th className="pb-2.5 pr-2.5 w-1/3">Item Description</th>
                  <th className="pb-2.5 pr-2.5 w-[8%] text-center">Qty</th>
                  <th className="pb-2.5 pr-2.5 w-[14%]">Unit Price ({currency})</th>
                  <th className="pb-2.5 pr-2.5 w-[8%] text-center">Discount %</th>
                  <th className="pb-2.5 pr-2.5 w-[8%]">Tax Rate (GST)</th>
                  <th className="pb-2.5 pr-2.5 w-[12%] text-right">Total Amount</th>
                  <th className="pb-2.5 w-[4%] text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {lineItems.map((item, index) => (
                  <tr key={index} className="group align-top">
                    {/* Service Selection */}
                    <td className="py-3 pr-2.5">
                      <select
                        value={item.service_id}
                        onChange={(e) => handleServiceChange(index, e.target.value ? Number(e.target.value) : '')}
                        className="w-full bg-zinc-950 border border-zinc-850 text-zinc-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-violet-500"
                      >
                        <option value="">-- Custom Invoice Entry --</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </td>

                    {/* Description */}
                    <td className="py-3 pr-2.5">
                      <textarea
                        rows={2}
                        value={item.description}
                        onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                        placeholder="Detailed deliverables description..."
                        className="w-full bg-zinc-950 border border-zinc-850 text-zinc-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-violet-500 text-xs resize-none"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="py-3 pr-2.5 text-center">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(index, 'quantity', Number(e.target.value))}
                        className="w-full bg-zinc-950 border border-zinc-850 text-zinc-200 text-center rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-violet-500"
                        required
                      />
                    </td>

                    {/* Unit Price */}
                    <td className="py-3 pr-2.5">
                      <input
                        type="number"
                        min={0}
                        value={item.unit_price}
                        onChange={(e) => handleLineItemChange(index, 'unit_price', Number(e.target.value))}
                        placeholder="0"
                        className="w-full bg-zinc-950 border border-zinc-850 text-zinc-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-violet-500"
                        required
                      />
                    </td>

                    {/* Discount % */}
                    <td className="py-3 pr-2.5 text-center">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={item.discount_percentage}
                        onChange={(e) => handleLineItemChange(index, 'discount_percentage', Number(e.target.value))}
                        className="w-full bg-zinc-950 border border-zinc-850 text-zinc-200 text-center rounded-lg px-1 py-1.5 outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </td>

                    {/* Tax Rate */}
                    <td className="py-3 pr-2.5">
                      <select
                        value={item.tax_rate}
                        onChange={(e) => handleLineItemChange(index, 'tax_rate', Number(e.target.value))}
                        className="w-full bg-zinc-950 border border-zinc-850 text-zinc-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-violet-500"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </td>

                    {/* Total */}
                    <td className="py-3 pr-2.5 text-right font-bold text-zinc-200 align-middle">
                      {formatCurrency(rowCalculations[index]?.totalAmount || 0, currency)}
                    </td>

                    {/* Delete item */}
                    <td className="py-3 align-middle text-center">
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length === 1}
                        className="p-1.5 text-zinc-500 hover:text-red-400 disabled:opacity-30 disabled:hover:text-zinc-500 transition rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Step 3: Terms and Totals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notes and Terms */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">3. Terms & Notes</h3>
              
              <div className="space-y-4">
                <div className="form-group">
                  <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Client Terms & Conditions</label>
                  <textarea
                    rows={4}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-250 text-xs rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500 resize-none font-mono leading-relaxed"
                  />
                </div>

                <div className="form-group">
                  <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Invoice Footer Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500 resize-none font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Totals panel */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md h-fit space-y-5">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">4. Summary Invoice Totals</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Subtotal (Base)</span>
                <span className="font-semibold text-zinc-200">{formatCurrency(subtotalSum, currency)}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Line Discounts</span>
                <span className="font-semibold text-red-400">-{formatCurrency(itemsDiscountSum, currency)}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400 border-t border-zinc-800 pt-2.5">
                <span>Taxable Value</span>
                <span className="font-semibold text-zinc-200">{formatCurrency(subtotalSum - itemsDiscountSum, currency)}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>GST Tax Total</span>
                <span className="font-semibold text-zinc-200">{formatCurrency(taxSum, currency)}</span>
              </div>

              <div className="flex justify-between items-center border-t border-zinc-800 pt-3 mt-2">
                <span className="text-base font-bold text-zinc-250">Final Invoice Amount</span>
                <span className="text-xl font-extrabold text-violet-400">
                  {formatCurrency(finalNetTotal, currency)}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex flex-col gap-2">
              <button
                type="submit"
                className="w-full btn btn-primary py-2.5 font-semibold text-sm flex items-center justify-center gap-1.5"
              >
                Create & Send Invoice
              </button>
              <Link
                href="/invoices"
                className="w-full btn btn-secondary py-2.5 font-semibold text-sm text-center block hover:bg-zinc-800"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}

export default function CreateInvoicePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12 min-h-screen bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    }>
      <InvoiceBuilderForm />
    </Suspense>
  );
}
