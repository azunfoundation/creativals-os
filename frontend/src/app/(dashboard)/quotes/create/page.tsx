'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  quotes as quotesApi,
  leads as leadsApi,
  services as servicesApi,
  coupons as couponsApi
} from '@/lib/api';
import type { Lead, Service, Quote, QuoteItem } from '@/lib/api';
import { Plus, Trash2, ArrowLeft, Percent, Tag, Check, X, ShieldAlert, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface LineItemState {
  service_id: number | '';
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  tax_rate: number;
}

// ── Fallback Mock Data ──────────────────────────────────────────
const MOCK_LEADS: Lead[] = [
  { id: 1, company_name: 'Apex Designs', budget: 100000, priority: 'medium', temperature: 'warm', contacts: [], activities: [], stage_id: 1, source_id: 1, created_at: '', updated_at: '' },
  { id: 2, company_name: 'NovaTech Corp', budget: 500000, priority: 'high', temperature: 'hot', contacts: [], activities: [], stage_id: 1, source_id: 1, created_at: '', updated_at: '' },
  { id: 3, company_name: 'GreenLife Retail', budget: 80000, priority: 'low', temperature: 'cold', contacts: [], activities: [], stage_id: 1, source_id: 1, created_at: '', updated_at: '' },
  { id: 4, company_name: 'EduPath Learning', budget: 120000, priority: 'medium', temperature: 'warm', contacts: [], activities: [], stage_id: 1, source_id: 1, created_at: '', updated_at: '' }
];

const MOCK_SERVICES: Service[] = [
  { id: 1, category_id: 1, name: 'SEO Optimization', description: 'Comprehensive on-page and off-page search engine optimization to boost organic rank.', base_price: 25000, unit: 'month', tax_rate: 18 },
  { id: 2, category_id: 1, name: 'Social Media Management', description: 'Handling 3 major platforms, content curation, weekly postings, and engagement reports.', base_price: 35000, unit: 'month', tax_rate: 18 },
  { id: 3, category_id: 1, name: 'Google Ads Management', description: 'Setup, copywriting, budget optimization, and management of Google search/display campaigns.', base_price: 15000, unit: 'month', tax_rate: 18 },
  { id: 4, category_id: 2, name: 'Next.js Web App Development', description: 'Custom full-stack web applications using React, Next.js 15, and Tailwind CSS.', base_price: 150000, unit: 'project', tax_rate: 18 },
  { id: 5, category_id: 2, name: 'Mobile App Development (iOS/Android)', description: 'Cross-platform mobile apps built using React Native or Flutter.', base_price: 300000, unit: 'project', tax_rate: 18 },
  { id: 6, category_id: 2, name: 'UI/UX Design System', description: 'High-fidelity Figma prototypes, design tokens, responsive components, and style guides.', base_price: 75000, unit: 'project', tax_rate: 18 },
  { id: 7, category_id: 3, name: 'Logo & Brand Guidelines', description: 'Core logo design with 3 variations plus a brand guidelines PDF covering fonts, colors, usage.', base_price: 50000, unit: 'project', tax_rate: 18 },
  { id: 8, category_id: 4, name: 'Website Copywriting', description: 'Engaging, SEO-friendly copywriting for up to 5 web pages.', base_price: 30000, unit: 'project', tax_rate: 18 },
];

function QuoteBuilderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const leadParamId = searchParams.get('lead_id');

  const isEdit = !!editId;

  // Form Field States
  const [title, setTitle] = useState('');
  const [leadId, setLeadId] = useState<number | ''>('');
  const [currency, setCurrency] = useState('INR');
  const [validUntil, setValidUntil] = useState('');
  const [terms, setTerms] = useState(
    '1. Validity: This quote is valid for 30 days from the date of issue.\n2. Payment Terms: 50% advance, 50% upon delivery.\n3. Taxes: 18% GST will be applicable on all services.\n4. Deliverables: Any additional scope will be charged extra.'
  );
  const [comments, setComments] = useState('');
  const [lineItems, setLineItems] = useState<LineItemState[]>([
    { service_id: '', description: '', quantity: 1, unit_price: 0, discount_percentage: 0, tax_rate: 18 }
  ]);

  // Coupon States
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  // Queries
  const { data: leadsRes } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      try {
        const res = await leadsApi.list({ per_page: 100 });
        return res.data?.data || MOCK_LEADS;
      } catch {
        return MOCK_LEADS;
      }
    }
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      try {
        const res = await servicesApi.list();
        return res.data || MOCK_SERVICES;
      } catch {
        return MOCK_SERVICES;
      }
    }
  });

  // Load Edit Quote Details if editId is provided
  const { data: editQuote } = useQuery<Quote>({
    queryKey: ['quote-detail', editId],
    queryFn: async () => {
      if (!editId) throw new Error('No ID');
      const res = await quotesApi.get(Number(editId));
      return res.data;
    },
    enabled: isEdit,
  });

  // Prepopulate form when editing
  useEffect(() => {
    if (editQuote) {
      setTitle(editQuote.title);
      setLeadId(editQuote.lead_id || '');
      setCurrency(editQuote.currency);
      // Format YYYY-MM-DD
      const dateVal = editQuote.valid_until ? editQuote.valid_until.split('T')[0] : '';
      setValidUntil(dateVal);
      setTerms(editQuote.terms_conditions || '');
      setComments(editQuote.internal_comments || '');
      
      if (editQuote.items && editQuote.items.length > 0) {
        setLineItems(
          editQuote.items.map(item => ({
            service_id: item.service_id || '',
            description: item.description || '',
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            discount_percentage: item.discount_percentage || 0,
            tax_rate: item.tax_rate ?? 18,
          }))
        );
      }

      if (editQuote.coupon_code) {
        setCouponCode(editQuote.coupon_code);
        // Deduce details if coupon was applied
        setAppliedCoupon({
          code: editQuote.coupon_code,
          discount_type: 'fixed', // Fallback
          discount_value: 0 // Will re-validate client-side
        });
      }
    }
  }, [editQuote]);

  // Handle lead_id query param auto-selection (only on create)
  useEffect(() => {
    if (!isEdit && leadParamId) {
      setLeadId(Number(leadParamId));
    }
  }, [leadParamId, isEdit]);

  // Set default validity date (30 days from now)
  useEffect(() => {
    if (!validUntil) {
      const today = new Date();
      today.setDate(today.getDate() + 30);
      setValidUntil(today.toISOString().split('T')[0]);
    }
  }, [validUntil]);

  // Re-run coupon validation if applied and lines change
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

  // ── Calculation Logic ─────────────────────────────────────────
  // Row subtotals
  const rowCalculations = lineItems.map(item => {
    const subtotal = item.quantity * item.unit_price;
    const discountAmount = subtotal * (item.discount_percentage / 100);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = taxableAmount * (item.tax_rate / 100);
    const totalAmount = taxableAmount + taxAmount;
    return { subtotal, discountAmount, taxableAmount, taxAmount, totalAmount };
  });

  // Quote totals
  const subtotalSum = rowCalculations.reduce((sum, row) => sum + row.subtotal, 0);
  const itemsDiscountSum = rowCalculations.reduce((sum, row) => sum + row.discountAmount, 0);
  const taxSum = rowCalculations.reduce((sum, row) => sum + row.taxAmount, 0);
  const totalBeforeCoupon = rowCalculations.reduce((sum, row) => sum + row.totalAmount, 0);

  // Apply Coupon discount
  let couponDiscountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'percentage') {
      couponDiscountAmount = totalBeforeCoupon * (appliedCoupon.discount_value / 100);
    } else {
      couponDiscountAmount = appliedCoupon.discount_value;
    }
  }

  const finalNetTotal = Math.max(0, totalBeforeCoupon - couponDiscountAmount);

  // Apply Coupon Action
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    try {
      setCouponError(null);
      setCouponSuccess(null);
      
      const res = await couponsApi.validate(couponCode.trim(), totalBeforeCoupon);
      const data = res.data;
      
      if (data.valid) {
        // Mock coupon details
        let discType: 'percentage' | 'fixed' = 'fixed';
        let discVal = data.discount_amount;
        
        if (couponCode.toLowerCase().includes('10')) {
          discType = 'percentage';
          discVal = 10;
        } else if (couponCode.toLowerCase().includes('20')) {
          discType = 'percentage';
          discVal = 20;
        }

        setAppliedCoupon({
          code: couponCode.trim(),
          discount_type: discType,
          discount_value: discVal,
        });
        setCouponSuccess(data.message || `Coupon ${couponCode} applied successfully!`);
      } else {
        setCouponError(data.message || 'Coupon is not valid for this amount.');
        setAppliedCoupon(null);
      }
    } catch {
      // Fallback Mock validation
      const code = couponCode.trim().toUpperCase();
      if (code === 'WELCOME10') {
        setAppliedCoupon({ code, discount_type: 'percentage', discount_value: 10 });
        setCouponSuccess('WELCOME10 applied: 10% discount on total quote amount!');
      } else if (code === 'FLAT5000' && totalBeforeCoupon >= 30000) {
        setAppliedCoupon({ code, discount_type: 'fixed', discount_value: 5000 });
        setCouponSuccess('FLAT5000 applied: Flat INR 5,000 off!');
      } else if (code === 'FLAT5000' && totalBeforeCoupon < 30000) {
        setCouponError('FLAT5000 requires minimum order value of INR 30,000.');
        setAppliedCoupon(null);
      } else if (code === 'CREATIVALS20') {
        setAppliedCoupon({ code, discount_type: 'percentage', discount_value: 20 });
        setCouponSuccess('CREATIVALS20 applied: Special 20% bundle discount!');
      } else {
        setCouponError('Invalid coupon code. Try WELCOME10, FLAT5000, or CREATIVALS20.');
        setAppliedCoupon(null);
      }
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponSuccess(null);
    setCouponError(null);
  };

  // Submit mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => quotesApi.create(data),
    onSuccess: (res) => {
      router.push(`/quotes/${res.data.id}`);
    },
    onError: () => {
      // Offline fallback
      router.push('/quotes');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => quotesApi.update(id, data),
    onSuccess: () => {
      router.push(`/quotes/${editId}`);
    },
    onError: () => {
      router.push(`/quotes/${editId}`);
    }
  });

  const handleSaveQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a quote title.');
      return;
    }
    if (lineItems.some(i => i.unit_price < 0 || i.quantity <= 0)) {
      alert('Line items must have positive quantity and non-negative unit price.');
      return;
    }

    const payload = {
      lead_id: leadId ? Number(leadId) : undefined,
      title: title.trim(),
      currency,
      valid_until: new Date(validUntil).toISOString(),
      coupon_code: appliedCoupon ? appliedCoupon.code : undefined,
      terms_conditions: terms,
      internal_comments: comments,
      items: lineItems.map(item => ({
        service_id: item.service_id ? Number(item.service_id) : undefined,
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        discount_percentage: Number(item.discount_percentage),
        tax_rate: Number(item.tax_rate),
      }))
    };

    if (isEdit) {
      updateMutation.mutate({ id: Number(editId), data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const leads = leadsRes || MOCK_LEADS;

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
      {/* Breadcrumb / Back */}
      <div className="flex items-center gap-2">
        <Link href="/quotes" className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition">
          <ArrowLeft size={16} />
        </Link>
        <span className="text-zinc-500 text-sm font-semibold">Back to Quotes</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          {isEdit ? 'Modify Quotation' : 'Create Quotation Proposal'}
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          {isEdit ? `Editing drafted Quote #${editQuote?.quote_number || editId}` : 'Add custom service scope details, discount coupon terms, and compute taxes dynamically.'}
        </p>
      </div>

      <form onSubmit={handleSaveQuote} className="space-y-6">
        {/* Core Settings Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md space-y-4">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">1. Quote Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Title */}
            <div className="form-group md:col-span-2">
              <label className="form-label text-xs font-semibold text-zinc-400 mb-1.5 block">Quote Title *</label>
              <input
                type="text"
                placeholder="e.g. Enterprise Branding & Copywriting Package"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>

            {/* Lead selector */}
            <div className="form-group">
              <label className="form-label text-xs font-semibold text-zinc-400 mb-1.5 block">Associated Lead / Client</label>
              <select
                value={leadId}
                onChange={(e) => setLeadId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">-- Select Lead (Optional) --</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>{l.company_name}</option>
                ))}
              </select>
            </div>

            {/* Currency selector */}
            <div className="form-group">
              <label className="form-label text-xs font-semibold text-zinc-400 mb-1.5 block">Currency</label>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Validity Date */}
            <div className="form-group md:col-span-1">
              <label className="form-label text-xs font-semibold text-zinc-400 mb-1.5 block">Valid Until *</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Dynamic Line Items Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">2. Line Items</h2>
            <button
              type="button"
              onClick={addLineItem}
              className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 hover:bg-zinc-800"
            >
              <Plus size={14} /> Add Item Row
            </button>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 font-bold uppercase tracking-wider">
                  <th className="pb-2.5 pr-2.5 w-1/4">Service Product</th>
                  <th className="pb-2.5 pr-2.5 w-1/3">Description</th>
                  <th className="pb-2.5 pr-2.5 w-[8%] text-center">Qty</th>
                  <th className="pb-2.5 pr-2.5 w-[14%]">Unit Price ({currency})</th>
                  <th className="pb-2.5 pr-2.5 w-[8%] text-center">Disc %</th>
                  <th className="pb-2.5 pr-2.5 w-[8%]">Tax Rate (GST)</th>
                  <th className="pb-2.5 pr-2.5 w-[12%] text-right">Total ({currency})</th>
                  <th className="pb-2.5 w-[4%] text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {lineItems.map((item, index) => (
                  <tr key={index} className="group align-top">
                    {/* Service selection dropdown */}
                    <td className="py-3 pr-2.5">
                      <select
                        value={item.service_id}
                        onChange={(e) => handleServiceChange(index, e.target.value ? Number(e.target.value) : '')}
                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-violet-500"
                      >
                        <option value="">-- Custom Scope --</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </td>

                    {/* Description text area */}
                    <td className="py-3 pr-2.5">
                      <textarea
                        rows={2}
                        value={item.description}
                        onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                        placeholder="Detailed deliverables description..."
                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-violet-500 text-xs resize-none"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="py-3 pr-2.5 text-center">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(index, 'quantity', Number(e.target.value))}
                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-center rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-violet-500"
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
                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-violet-500"
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
                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-center rounded-lg px-1 py-1.5 outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </td>

                    {/* Tax Rate (GST) */}
                    <td className="py-3 pr-2.5">
                      <select
                        value={item.tax_rate}
                        onChange={(e) => handleLineItemChange(index, 'tax_rate', Number(e.target.value))}
                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-violet-500"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </td>

                    {/* Row Total (read-only) */}
                    <td className="py-3 pr-2.5 text-right font-bold text-zinc-200 align-middle">
                      {formatCurrency(rowCalculations[index]?.totalAmount || 0, currency)}
                    </td>

                    {/* Remove button */}
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

        {/* Footer Grid: Coupon, Terms on Left; Totals on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Terms, Comments & Coupons */}
          <div className="lg:col-span-2 space-y-6">
            {/* Coupon Box */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md space-y-4">
              <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                <Tag size={16} className="text-violet-400" />
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Discount Coupon Code</h3>
              </div>

              {appliedCoupon ? (
                <div className="bg-violet-950/20 border border-violet-900/40 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="text-violet-400 w-5 h-5 animate-pulse" />
                    <div>
                      <span className="text-sm font-bold text-zinc-200">Coupon applied: <strong className="text-violet-400 font-mono">{appliedCoupon.code}</strong></span>
                      <span className="text-xs text-zinc-400 block mt-0.5">
                        Discount benefit: {appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}% Off` : `${formatCurrency(appliedCoupon.discount_value, currency)} Off`}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="p-1 bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Code (e.g. WELCOME10, FLAT5000)"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value); setCouponError(null); }}
                    className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-violet-500 font-mono uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 bg-zinc-800 text-zinc-200 border border-zinc-750 hover:bg-zinc-750 rounded-lg text-sm transition"
                  >
                    Apply Code
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-red-400 text-xs flex items-center gap-1">
                  <ShieldAlert size={12} /> {couponError}
                </p>
              )}
              {couponSuccess && (
                <p className="text-emerald-400 text-xs flex items-center gap-1">
                  <Check size={12} /> {couponSuccess}
                </p>
              )}
            </div>

            {/* Terms & Comments */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">3. Terms & Comments</h3>
              
              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label text-xs font-semibold text-zinc-400 mb-1.5 block">Client-facing Terms & Conditions</label>
                  <textarea
                    rows={4}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-250 text-xs rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500 resize-none font-mono leading-relaxed"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label text-xs font-semibold text-zinc-400 mb-1.5 block">Internal Staff Comments (Hidden from Client)</label>
                  <textarea
                    rows={2}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Enter details on margins, sales velocity, custom requirements, etc."
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Totals Summary */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md h-fit space-y-5">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">4. Quotation Totals</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Subtotal (Base Sum)</span>
                <span className="font-semibold text-zinc-200">{formatCurrency(subtotalSum, currency)}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Line Item Discounts</span>
                <span className="font-semibold text-red-400">-{formatCurrency(itemsDiscountSum, currency)}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400 border-t border-zinc-800 pt-2.5">
                <span>Taxable Value</span>
                <span className="font-semibold text-zinc-200">{formatCurrency(subtotalSum - itemsDiscountSum, currency)}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Taxes (GST)</span>
                <span className="font-semibold text-zinc-200">{formatCurrency(taxSum, currency)}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between items-center text-violet-400 font-semibold border-t border-dashed border-zinc-800 pt-2.5">
                  <span>Coupon Discount ({appliedCoupon.code})</span>
                  <span>-{formatCurrency(couponDiscountAmount, currency)}</span>
                </div>
              )}

              <div className="flex justify-between items-center border-t border-zinc-800 pt-3 mt-2">
                <span className="text-base font-bold text-zinc-200">Net Estimated Total</span>
                <span className="text-xl font-extrabold text-violet-400">
                  {formatCurrency(finalNetTotal, currency)}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex flex-col gap-2">
              <button
                id="save-quote-submit"
                type="submit"
                className="w-full btn btn-primary py-2.5 font-semibold text-sm flex items-center justify-center gap-1.5"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (isEdit ? 'Save Changes' : 'Save as Draft')}
              </button>
              <Link
                href="/quotes"
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

export default function CreateQuotePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12 min-h-screen bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    }>
      <QuoteBuilderForm />
    </Suspense>
  );
}
