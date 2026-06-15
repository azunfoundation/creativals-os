'use client';

import { useState, useEffect, Suspense } from 'react'; 
import { SkeletonTable } from '@/components/ui/Skeleton'; 
import { EmptyState } from '@/components/ui/EmptyState'; 
import { useToast } from '@/hooks/useToast';
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
  const { showToast } = useToast();
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
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [recurringEndDate, setRecurringEndDate] = useState('');
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
        const data = res.data || [];
        return data.map((s: any) => ({
          ...s,
          base_price: s.base_price || s.default_price || 0
        }));
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
      showToast('Please enter an invoice title.', 'info');
      return;
    }
    if (!clientName.trim()) {
      showToast('Please specify the client name.', 'info');
      return;
    }
    if (lineItems.some(i => i.unit_price < 0 || i.quantity <= 0)) {
      showToast('Line items must have positive quantity and non-negative unit price.', 'info');
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
      is_recurring: isRecurring,
      recurring_interval: isRecurring ? recurringInterval : undefined,
      recurring_end_date: (isRecurring && recurringEndDate) ? recurringEndDate : undefined,
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
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Link href="/invoices" className="btn btn-secondary btn-icon" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={16} />
        </Link>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Back to Invoices</span>
      </div>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Create Client Invoice
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Draft a custom client invoice or import line items and scope agreements directly from a pre-approved quotation.
        </p>
      </div>

      {/* Pre-fill toolbar */}
      <div className="card" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
          <FileText size={18} className="text-accent" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Convert Approved Quotation</span>
        </div>
        <div>
          <select
            onChange={(e) => {
              if (e.target.value) loadQuoteDetails(Number(e.target.value));
            }}
            className="form-input"
            style={{ width: 'auto', minWidth: '240px', padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
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

      <form onSubmit={handleSaveInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Step 1: Invoice metadata */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <User size={14} className="text-accent" />
            1. Invoice & Client Details
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {/* Title */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Invoice Title *</label>
              <input
                type="text"
                placeholder="e.g. Website Development Milestone 1 Payment"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-input"
                required
              />
            </div>

            {/* Client Name */}
            <div className="form-group">
              <label className="form-label">Client Company / Name *</label>
              <input
                type="text"
                placeholder="e.g. NovaTech Corp"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="form-input"
                required
              />
            </div>

            {/* Client Email */}
            <div className="form-group">
              <label className="form-label">Client Billing Email</label>
              <input
                type="email"
                placeholder="e.g. accounts@client.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {/* Lead relation */}
            <div className="form-group">
              <label className="form-label">CRM Lead (Optional)</label>
              <select
                value={leadId}
                onChange={(e) => setLeadId(e.target.value ? Number(e.target.value) : '')}
                className="form-input"
              >
                <option value="">-- Unlinked --</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>{l.company_name}</option>
                ))}
              </select>
            </div>

            {/* Currency */}
            <div className="form-group">
              <label className="form-label">Billing Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="form-input"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>

            {/* Issue Date */}
            <div className="form-group">
              <label className="form-label">Issue Date *</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="form-input"
                required
              />
            </div>

            {/* Due Date */}
            <div className="form-group">
              <label className="form-label">Due Date *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="form-input"
                required
              />
            </div>
          </div>
        </div>

        {/* Step 2: Line items */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              2. Line Items Details
            </h2>
            <button
              type="button"
              onClick={addLineItem}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
            >
              <Plus size={14} /> Add Item Row
            </button>
          </div>

          <div className="data-table-wrap">
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ tableLayout: 'fixed', minWidth: '950px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '22%' }}>Catalog Service</th>
                    <th style={{ width: '28%' }}>Item Description</th>
                    <th style={{ width: '8%', textAlign: 'center' }}>Qty</th>
                    <th style={{ width: '14%' }}>Unit Price ({currency})</th>
                    <th style={{ width: '8%', textAlign: 'center' }}>Discount %</th>
                    <th style={{ width: '10%' }}>Tax Rate (GST)</th>
                    <th style={{ width: '12%', textAlign: 'right' }}>Total Amount</th>
                    <th style={{ width: '4%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr key={index}>
                      {/* Service Selection */}
                      <td>
                        <select
                          value={item.service_id}
                          onChange={(e) => handleServiceChange(index, e.target.value ? Number(e.target.value) : '')}
                          className="form-input"
                          style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem' }}
                        >
                          <option value="">-- Custom Invoice Entry --</option>
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </td>

                      {/* Description */}
                      <td>
                        <textarea
                          rows={2}
                          value={item.description}
                          onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                          placeholder="Detailed deliverables description..."
                          className="form-input"
                          style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem', resize: 'none', lineHeight: 1.4 }}
                        />
                      </td>

                      {/* Quantity */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity ?? 1}
                          onChange={(e) => handleLineItemChange(index, 'quantity', Number(e.target.value))}
                          className="form-input"
                          style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem', textAlign: 'center' }}
                          required
                        />
                      </td>

                      {/* Unit Price */}
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={item.unit_price ?? 0}
                          onChange={(e) => handleLineItemChange(index, 'unit_price', Number(e.target.value))}
                          placeholder="0"
                          className="form-input"
                          style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem' }}
                          required
                        />
                      </td>

                      {/* Discount % */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={item.discount_percentage ?? 0}
                          onChange={(e) => handleLineItemChange(index, 'discount_percentage', Number(e.target.value))}
                          className="form-input"
                          style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem', textAlign: 'center' }}
                        />
                      </td>

                      {/* Tax Rate */}
                      <td>
                        <select
                          value={item.tax_rate ?? 18}
                          onChange={(e) => handleLineItemChange(index, 'tax_rate', Number(e.target.value))}
                          className="form-input"
                          style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem' }}
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </td>

                      {/* Total */}
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', verticalAlign: 'middle' }}>
                        {formatCurrency(rowCalculations[index]?.totalAmount || 0, currency)}
                      </td>

                      {/* Delete item */}
                      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          disabled={lineItems.length === 1}
                          className="btn btn-danger btn-sm btn-icon"
                          style={{ opacity: lineItems.length === 1 ? 0.3 : 1 }}
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
        </div>

        {/* Step 3: Terms and Totals */}
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '1.5rem' }}>
          {/* Notes and Terms */}
          <div style={{ flex: '2 1 600px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                3. Terms & Notes
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Client Terms & Conditions</label>
                  <textarea
                    rows={4}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    className="form-input"
                    style={{ resize: 'none', fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: 1.5 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Invoice Footer Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="form-input"
                    style={{ resize: 'none', fontFamily: 'monospace', fontSize: '0.75rem' }}
                  />
                </div>

                {/* Recurring Settings */}
                <div className="form-group" style={{ marginTop: '0.5rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: '0.375rem', backgroundColor: 'var(--bg-secondary)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer', marginBottom: isRecurring ? '1rem' : 0, fontSize: '0.875rem' }}>
                    <input 
                      type="checkbox" 
                      checked={isRecurring} 
                      onChange={(e) => setIsRecurring(e.target.checked)} 
                      style={{ accentColor: 'var(--accent)', width: '1rem', height: '1rem' }}
                    />
                    Make this a Recurring Invoice
                  </label>
                  
                  {isRecurring && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Billing Interval</label>
                        <select 
                          value={recurringInterval} 
                          onChange={(e) => setRecurringInterval(e.target.value as any)} 
                          className="form-input"
                        >
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">End Date (Optional)</label>
                        <input 
                          type="date" 
                          value={recurringEndDate} 
                          onChange={(e) => setRecurringEndDate(e.target.value)} 
                          className="form-input"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Totals panel */}
          <div style={{ flex: '1 1 300px' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                4. Summary Invoice Totals
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
                  <span>Subtotal (Base)</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(subtotalSum, currency)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
                  <span>Line Discounts</span>
                  <span style={{ fontWeight: 600, color: 'var(--danger)' }}>-{formatCurrency(itemsDiscountSum, currency)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <span>Taxable Value</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(subtotalSum - itemsDiscountSum, currency)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
                  <span>GST Tax Total</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(taxSum, currency)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>Final Invoice Amount</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)' }}>
                    {formatCurrency(finalNetTotal, currency)}
                  </span>
                </div>
              </div>

              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem' }}
                >
                  Create & Send Invoice
                </button>
                <Link
                  href="/invoices"
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '0.75rem', textAlign: 'center' }}
                >
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}

export default function CreateInvoicePage() {
  const { showToast } = useToast();
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', minHeight: '60vh' }}>
        <div className="animate-pulse" style={{ color: 'var(--accent)', fontWeight: 600 }}>Loading Invoice Builder...</div>
      </div>
    }>
      <InvoiceBuilderForm />
    </Suspense>
  );
}
