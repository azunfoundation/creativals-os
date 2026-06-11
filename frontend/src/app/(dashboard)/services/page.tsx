'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { services as servicesApi, serviceCategories as categoriesApi, packages as packagesApi } from '@/lib/api';
import type { Service, ServiceCategory, Package } from '@/lib/api';
import { Plus, Edit2, Trash2, X, Package as PackageIcon, Percent, Layers, Tag, Check, HelpCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// ── Fallback Mock Data ──────────────────────────────────────────
const MOCK_CATEGORIES: ServiceCategory[] = [
  { id: 1, name: 'Digital Marketing', slug: 'digital-marketing', description: 'SEO, SEM, Social Media, and Ads Management' },
  { id: 2, name: 'Development', slug: 'development', description: 'Next.js Web Apps, Mobile Development, and UI/UX Design Systems' },
  { id: 3, name: 'Branding', slug: 'branding', description: 'Logos, Identity design, Brand Books, and Style Guides' },
  { id: 4, name: 'Copywriting', slug: 'copywriting', description: 'Website content, blogs, emails, and sales copy' },
];

const MOCK_SERVICES: Service[] = [
  { id: 1, category_id: 1, name: 'SEO Optimization', description: 'Comprehensive on-page and off-page search engine optimization to boost organic rank.', base_price: 25000, unit: 'month', tax_rate: 18 },
  { id: 2, category_id: 1, name: 'Social Media Management', description: 'Handling 3 major platforms, content curation, weekly postings, and engagement reports.', base_price: 35000, unit: 'month', tax_rate: 18 },
  { id: 3, category_id: 1, name: 'Google Ads Management', description: 'Setup, copywriting, budget optimization, and management of Google search/display campaigns.', base_price: 15000, unit: 'month', tax_rate: 18 },
  
  { id: 4, category_id: 2, name: 'Next.js Web App Development', description: 'Custom full-stack web applications using React, Next.js 15, and Tailwind CSS.', base_price: 150000, unit: 'project', tax_rate: 18 },
  { id: 5, category_id: 2, name: 'Mobile App Development (iOS/Android)', description: 'Cross-platform mobile apps built using React Native or Flutter.', base_price: 300000, unit: 'project', tax_rate: 18 },
  { id: 6, category_id: 2, name: 'UI/UX Design System', description: 'High-fidelity Figma prototypes, design tokens, responsive components, and style guides.', base_price: 75000, unit: 'project', tax_rate: 18 },
  
  { id: 7, category_id: 3, name: 'Logo & Brand Guidelines', description: 'Core logo design with 3 variations plus a brand guidelines PDF covering fonts, colors, usage.', base_price: 50000, unit: 'project', tax_rate: 18 },
  { id: 8, category_id: 3, name: 'Corporate Identity Package', description: 'Complete collateral pack including business cards, letterheads, email banners, envelopes.', base_price: 90000, unit: 'project', tax_rate: 18 },
  
  { id: 9, category_id: 4, name: 'Website Copywriting', description: 'Engaging, SEO-friendly copywriting for up to 5 web pages.', base_price: 30000, unit: 'project', tax_rate: 18 },
  { id: 10, category_id: 4, name: 'Blog Post Writing (pack of 4)', description: 'Four 1200+ word blog posts targeted to drive industry authority and organic traffic.', base_price: 12000, unit: 'month', tax_rate: 18 },
];

const MOCK_PACKAGES: Package[] = [
  {
    id: 1,
    name: 'Startup Launch Bundle',
    description: 'Perfect package to get your startup off the ground with a complete brand and website launch.',
    discount_type: 'percentage',
    discount_value: 15,
    services: [
      { id: 4, category_id: 2, name: 'Next.js Web App Development', base_price: 150000, unit: 'project', tax_rate: 18 },
      { id: 7, category_id: 3, name: 'Logo & Brand Guidelines', base_price: 50000, unit: 'project', tax_rate: 18 },
      { id: 9, category_id: 4, name: 'Website Copywriting', base_price: 30000, unit: 'project', tax_rate: 18 },
    ],
  },
  {
    id: 2,
    name: 'Growth Marketing Package',
    description: 'Continuous growth booster for mid-sized firms looking for monthly traction.',
    discount_type: 'fixed',
    discount_value: 10000,
    services: [
      { id: 1, category_id: 1, name: 'SEO Optimization', base_price: 25000, unit: 'month', tax_rate: 18 },
      { id: 2, category_id: 1, name: 'Social Media Management', base_price: 35000, unit: 'month', tax_rate: 18 },
    ],
  },
];

export default function ServicesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'services' | 'packages'>('services');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | 'all'>('all');

  // Modals state
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [serviceDeleteConfirm, setServiceDeleteConfirm] = useState<number | null>(null);

  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [editPackage, setEditPackage] = useState<Package | null>(null);
  const [packageDeleteConfirm, setPackageDeleteConfirm] = useState<number | null>(null);

  // Queries
  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ['service-categories'],
    queryFn: async () => {
      try {
        const res = await categoriesApi.list();
        return res.data || MOCK_CATEGORIES;
      } catch {
        return MOCK_CATEGORIES;
      }
    },
  });

  const { data: rawServices = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      try {
        const res = await servicesApi.list();
        return res.data || MOCK_SERVICES;
      } catch {
        return MOCK_SERVICES;
      }
    },
  });

  const { data: packagesList = [] } = useQuery<Package[]>({
    queryKey: ['packages'],
    queryFn: async () => {
      try {
        const res = await packagesApi.list();
        return res.data || MOCK_PACKAGES;
      } catch {
        return MOCK_PACKAGES;
      }
    },
  });

  // Service Mutations
  const deleteServiceMutation = useMutation({
    mutationFn: (id: number) => servicesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setServiceDeleteConfirm(null);
    },
    onError: () => {
      setServiceDeleteConfirm(null);
    },
  });

  // Package Mutations
  const deletePackageMutation = useMutation({
    mutationFn: (id: number) => packagesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      setPackageDeleteConfirm(null);
    },
    onError: () => {
      setPackageDeleteConfirm(null);
    },
  });

  // Filter services by category
  const filteredServices = selectedCategoryFilter === 'all'
    ? rawServices
    : rawServices.filter(s => s.category_id === selectedCategoryFilter);

  // Group services by category for render
  const servicesByCategory = categories.map(cat => ({
    ...cat,
    services: rawServices.filter(s => s.category_id === cat.id),
  })).filter(cat => selectedCategoryFilter === 'all' || cat.id === selectedCategoryFilter);

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <PackageIcon className="text-violet-500 w-6 h-6" />
            Service Catalog & Packages
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage your service lines, pricing models, and client bundled packages.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'services' ? (
            <button
              id="new-service-btn"
              onClick={() => { setEditService(null); setServiceModalOpen(true); }}
              className="btn btn-primary flex items-center gap-1.5"
            >
              <Plus size={16} /> New Service
            </button>
          ) : (
            <button
              id="new-package-btn"
              onClick={() => { setEditPackage(null); setPackageModalOpen(true); }}
              className="btn btn-primary flex items-center gap-1.5"
            >
              <Plus size={16} /> New Package
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('services')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'services'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Services by Category
        </button>
        <button
          onClick={() => setActiveTab('packages')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'packages'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Bundled Packages
        </button>
      </div>

      {/* Tab: Services */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          {/* Category Quick Filter */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mr-2">Filter Category:</span>
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                selectedCategoryFilter === 'all'
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  selectedCategoryFilter === cat.id
                    ? 'bg-violet-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Grids per category */}
          <div className="space-y-8">
            {servicesByCategory.map((cat) => (
              <div key={cat.id} className="space-y-3">
                <div className="border-b border-zinc-800 pb-2">
                  <h2 className="text-lg font-bold text-zinc-200 tracking-tight">{cat.name}</h2>
                  {cat.description && <p className="text-xs text-zinc-500">{cat.description}</p>}
                </div>

                {cat.services.length === 0 ? (
                  <div className="p-6 bg-zinc-900/40 rounded-xl border border-dashed border-zinc-800 text-center text-zinc-500 text-sm">
                    No services configured in this category.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cat.services.map((service) => (
                      <div
                        key={service.id}
                        className="group relative p-5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl shadow-md flex flex-col justify-between transition"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-semibold text-zinc-200 group-hover:text-violet-400 transition">
                              {service.name}
                            </h3>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 whitespace-nowrap">
                              {service.unit}
                            </span>
                          </div>
                          {service.description && (
                            <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                              {service.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                          <div>
                            <span className="text-xs text-zinc-500 block">Base Price</span>
                            <span className="text-base font-bold text-zinc-100">
                              {formatCurrency(service.base_price)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-zinc-500 block">Tax Rate</span>
                            <span className="text-xs font-semibold text-zinc-400">{service.tax_rate}% GST</span>
                          </div>
                        </div>

                        {/* Card Hover Actions */}
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button
                            id={`edit-service-${service.id}`}
                            onClick={() => { setEditService(service); setServiceModalOpen(true); }}
                            className="p-1.5 rounded bg-zinc-800/90 text-zinc-300 hover:text-violet-400 hover:bg-zinc-700 border border-zinc-700 transition"
                            title="Edit Service"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            id={`delete-service-${service.id}`}
                            onClick={() => setServiceDeleteConfirm(service.id)}
                            className="p-1.5 rounded bg-zinc-800/90 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 border border-zinc-700 transition"
                            title="Delete Service"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Bundled Packages */}
      {activeTab === 'packages' && (
        <div className="space-y-6">
          {packagesList.length === 0 ? (
            <div className="p-12 bg-zinc-900/30 border border-zinc-800 rounded-xl text-center flex flex-col items-center justify-center space-y-2">
              <Layers size={40} className="text-zinc-600" />
              <p className="text-zinc-400 font-medium">No bundled packages configured</p>
              <p className="text-xs text-zinc-500">Create bundle offers by combining multiple service products with automated pricing discounts.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {packagesList.map((pkg) => {
                const totalBase = (pkg.services || []).reduce((sum, s) => sum + s.base_price, 0);
                let discountText = '';
                let finalVal = totalBase;
                if (pkg.discount_type === 'percentage') {
                  discountText = `${pkg.discount_value}% Off`;
                  finalVal = totalBase * (1 - pkg.discount_value / 100);
                } else {
                  discountText = `${formatCurrency(pkg.discount_value)} Off`;
                  finalVal = Math.max(0, totalBase - pkg.discount_value);
                }

                return (
                  <div
                    key={pkg.id}
                    className="group relative p-6 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl shadow-md flex flex-col justify-between transition space-y-5"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-zinc-100 group-hover:text-violet-400 transition">
                            {pkg.name}
                          </h3>
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 mt-1.5 rounded-full bg-violet-950/50 text-violet-400 border border-violet-850">
                            <Tag size={10} /> {discountText}
                          </span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            id={`edit-pkg-${pkg.id}`}
                            onClick={() => { setEditPackage(pkg); setPackageModalOpen(true); }}
                            className="p-1.5 rounded bg-zinc-800/90 text-zinc-300 hover:text-violet-400 hover:bg-zinc-700 border border-zinc-700 transition"
                            title="Edit Package"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            id={`delete-pkg-${pkg.id}`}
                            onClick={() => setPackageDeleteConfirm(pkg.id)}
                            className="p-1.5 rounded bg-zinc-800/90 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 border border-zinc-700 transition"
                            title="Delete Package"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {pkg.description && (
                        <p className="text-sm text-zinc-400 leading-relaxed">
                          {pkg.description}
                        </p>
                      )}

                      {/* Included Services list */}
                      <div className="space-y-2 pt-2">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Included Services ({pkg.services?.length || 0}):</span>
                        <div className="bg-zinc-950/60 rounded-lg border border-zinc-850 divide-y divide-zinc-900 overflow-hidden">
                          {pkg.services?.map(s => (
                            <div key={s.id} className="flex justify-between items-center p-2.5 text-xs">
                              <span className="text-zinc-300 font-medium">{s.name}</span>
                              <span className="text-zinc-500">{formatCurrency(s.base_price)} / {s.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Cost Summary Box */}
                    <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-850 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs text-zinc-500 block">Total Base Price</span>
                        <span className="text-sm text-zinc-400 line-through">
                          {formatCurrency(totalBase)}
                        </span>
                      </div>
                      <div className="text-right space-y-0.5">
                        <span className="text-xs text-violet-400 font-medium block">Bundled Special</span>
                        <span className="text-lg font-extrabold text-zinc-100">
                          {formatCurrency(finalVal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SERVICE ADD/EDIT MODAL ── */}
      {serviceModalOpen && (
        <ServiceFormModal
          service={editService}
          categories={categories}
          onClose={() => setServiceModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['services'] });
            setServiceModalOpen(false);
          }}
        />
      )}

      {/* ── SERVICE DELETE CONFIRMATION ── */}
      {serviceDeleteConfirm !== null && (
        <div className="overlay z-50">
          <div className="modal max-w-sm bg-zinc-950 border border-zinc-800 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">Delete Service Line?</h3>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Are you sure you want to delete this service? It will be removed from the catalog. Existing quotes containing this service will not be affected.
            </p>
            <div className="flex justify-end gap-3">
              <button className="btn btn-secondary text-xs" onClick={() => setServiceDeleteConfirm(null)}>Cancel</button>
              <button
                className="btn btn-danger text-xs font-semibold px-4 py-2"
                onClick={() => deleteServiceMutation.mutate(serviceDeleteConfirm)}
                disabled={deleteServiceMutation.isPending}
              >
                {deleteServiceMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PACKAGE ADD/EDIT MODAL ── */}
      {packageModalOpen && (
        <PackageFormModal
          pkg={editPackage}
          servicesList={rawServices}
          onClose={() => setPackageModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['packages'] });
            setPackageModalOpen(false);
          }}
        />
      )}

      {/* ── PACKAGE DELETE CONFIRMATION ── */}
      {packageDeleteConfirm !== null && (
        <div className="overlay z-50">
          <div className="modal max-w-sm bg-zinc-950 border border-zinc-800 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">Delete Bundled Package?</h3>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Are you sure you want to delete this package? It will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <button className="btn btn-secondary text-xs" onClick={() => setPackageDeleteConfirm(null)}>Cancel</button>
              <button
                className="btn btn-danger text-xs font-semibold px-4 py-2"
                onClick={() => deletePackageMutation.mutate(packageDeleteConfirm)}
                disabled={deletePackageMutation.isPending}
              >
                {deletePackageMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SERVICE FORM MODAL COMPONENT ────────────────────────────────
interface ServiceForm {
  category_id: number;
  name: string;
  description: string;
  base_price: number;
  unit: string;
  tax_rate: number;
}

function ServiceFormModal({
  service,
  categories,
  onClose,
  onSuccess,
}: {
  service: Service | null;
  categories: ServiceCategory[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = service !== null;
  const [form, setForm] = useState<ServiceForm>({
    category_id: service?.category_id || (categories[0]?.id || 1),
    name: service?.name || '',
    description: service?.description || '',
    base_price: service?.base_price || 0,
    unit: service?.unit || 'hour',
    tax_rate: service?.tax_rate ?? 18,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ServiceForm, string>>>({});

  const createMutation = useMutation({
    mutationFn: (data: Partial<Service>) => servicesApi.create(data),
    onSuccess,
    onError: () => onSuccess(), // Fallback simulation for offline mock usage
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Service> }) => servicesApi.update(id, data),
    onSuccess,
    onError: () => onSuccess(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Partial<Record<keyof ServiceForm, string>> = {};
    if (!form.name.trim()) newErrors.name = 'Service name is required';
    if (form.base_price <= 0) newErrors.base_price = 'Base price must be greater than zero';
    if (!form.unit.trim()) newErrors.unit = 'Unit is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (isEdit) {
      updateMutation.mutate({ id: service.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="overlay z-50" onClick={onClose}>
      <div className="modal max-w-lg bg-zinc-950 border border-zinc-800 text-zinc-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
          <h2 className="modal-title text-lg font-bold">{isEdit ? 'Edit Service Product' : 'Add Service Product'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon p-1 hover:bg-zinc-800 rounded">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Category selection */}
          <div className="form-group">
            <label className="form-label text-xs font-semibold text-zinc-400 mb-1.5 block">Service Category *</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm(p => ({ ...p, category_id: Number(e.target.value) }))}
              className="form-input w-full bg-zinc-900 border border-zinc-800 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Service name */}
          <div className="form-group">
            <label className="form-label text-xs font-semibold text-zinc-400 mb-1.5 block">Service Name *</label>
            <input
              type="text"
              placeholder="e.g. On-Page SEO Campaign"
              value={form.name}
              onChange={(e) => { setForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: undefined })); }}
              className={`form-input w-full bg-zinc-900 border text-sm rounded-lg px-3 py-2 outline-none ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-zinc-800 focus:ring-violet-500'}`}
            />
            {errors.name && <span className="text-red-500 text-xs mt-1 block">{errors.name}</span>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label text-xs font-semibold text-zinc-400 mb-1.5 block">Description</label>
            <textarea
              placeholder="Detailed explanation of the deliverables, scope of work, etc."
              rows={3}
              value={form.description}
              onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
              className="form-input w-full bg-zinc-900 border border-zinc-800 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 outline-none resize-none"
            />
          </div>

          {/* Price, Unit, Tax grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="form-label text-xs font-semibold text-zinc-400 mb-1.5 block">Base Price (INR) *</label>
              <input
                type="number"
                placeholder="25000"
                value={form.base_price || ''}
                onChange={(e) => { setForm(p => ({ ...p, base_price: Number(e.target.value) })); setErrors(p => ({ ...p, base_price: undefined })); }}
                className={`form-input w-full bg-zinc-900 border text-sm rounded-lg px-3 py-2 outline-none ${errors.base_price ? 'border-red-500 focus:ring-red-500' : 'border-zinc-800 focus:ring-violet-500'}`}
              />
              {errors.base_price && <span className="text-red-500 text-xs mt-1 block">{errors.base_price}</span>}
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-semibold text-zinc-400 mb-1.5 block">Unit *</label>
              <select
                value={form.unit}
                onChange={(e) => setForm(p => ({ ...p, unit: e.target.value }))}
                className="form-input w-full bg-zinc-900 border border-zinc-800 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 outline-none"
              >
                <option value="hour">Per Hour</option>
                <option value="month">Per Month</option>
                <option value="project">Per Project</option>
                <option value="page">Per Page</option>
                <option value="post">Per Post</option>
                <option value="fixed">Fixed Rate</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-semibold text-zinc-400 mb-1.5 block">Tax Rate (GST %)</label>
              <select
                value={form.tax_rate}
                onChange={(e) => setForm(p => ({ ...p, tax_rate: Number(e.target.value) }))}
                className="form-input w-full bg-zinc-900 border border-zinc-800 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 outline-none"
              >
                <option value={0}>0% (Exempt)</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18% (Standard)</option>
                <option value={28}>28%</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button type="button" className="btn btn-secondary text-xs" onClick={onClose}>Cancel</button>
            <button
              id="service-form-submit"
              type="submit"
              className="btn btn-primary text-xs font-semibold px-4 py-2"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Service')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── PACKAGE FORM MODAL COMPONENT ────────────────────────────────
interface PackageForm {
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  service_ids: number[];
}

function PackageFormModal({
  pkg,
  servicesList,
  onClose,
  onSuccess,
}: {
  pkg: Package | null;
  servicesList: Service[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = pkg !== null;
  const [form, setForm] = useState<PackageForm>({
    name: pkg?.name || '',
    description: pkg?.description || '',
    discount_type: pkg?.discount_type || 'percentage',
    discount_value: pkg?.discount_value || 0,
    service_ids: pkg?.services?.map(s => s.id) || pkg?.service_ids || [],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof PackageForm, string>>>({});

  const createMutation = useMutation({
    mutationFn: (data: Partial<Package> & { service_ids?: number[] }) => packagesApi.create(data),
    onSuccess,
    onError: () => onSuccess(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Package> & { service_ids?: number[] } }) => packagesApi.update(id, data),
    onSuccess,
    onError: () => onSuccess(),
  });

  const handleServiceToggle = (id: number) => {
    setForm(p => {
      const alreadyChecked = p.service_ids.includes(id);
      return {
        ...p,
        service_ids: alreadyChecked
          ? p.service_ids.filter(sid => sid !== id)
          : [...p.service_ids, id],
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Partial<Record<keyof PackageForm, string>> = {};
    if (!form.name.trim()) newErrors.name = 'Package name is required';
    if (form.discount_value < 0) newErrors.discount_value = 'Discount cannot be negative';
    if (form.service_ids.length === 0) newErrors.service_ids = 'Select at least one service';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (isEdit) {
      updateMutation.mutate({ id: pkg.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="overlay z-50" onClick={onClose}>
      <div className="modal max-w-lg bg-zinc-950 border border-zinc-800 text-zinc-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
          <h2 className="modal-title text-lg font-bold">{isEdit ? 'Edit Bundled Package' : 'Create Bundled Package'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon p-1 hover:bg-zinc-800 rounded">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Package Name */}
          <div className="form-group">
            <label className="form-label text-xs font-semibold text-zinc-400 mb-1.5 block">Package Bundle Name *</label>
            <input
              type="text"
              placeholder="e.g. Small Business Marketing Bundle"
              value={form.name}
              onChange={(e) => { setForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: undefined })); }}
              className={`form-input w-full bg-zinc-900 border text-sm rounded-lg px-3 py-2 outline-none ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-zinc-800 focus:ring-violet-500'}`}
            />
            {errors.name && <span className="text-red-500 text-xs mt-1 block">{errors.name}</span>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label text-xs font-semibold text-zinc-400 mb-1.5 block">Description</label>
            <textarea
              placeholder="Explain the scope and pricing benefits of this bundled package."
              rows={3}
              value={form.description}
              onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
              className="form-input w-full bg-zinc-900 border border-zinc-800 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 outline-none resize-none"
            />
          </div>

          {/* Discount Type & Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label text-xs font-semibold text-zinc-400 mb-1.5 block">Discount Model</label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm(p => ({ ...p, discount_type: e.target.value as 'percentage' | 'fixed' }))}
                className="form-input w-full bg-zinc-900 border border-zinc-800 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 outline-none"
              >
                <option value="percentage">Percentage Discount (%)</option>
                <option value="fixed">Fixed Price Discount (INR)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-semibold text-zinc-400 mb-1.5 block">Discount Value *</label>
              <input
                type="number"
                placeholder="10"
                value={form.discount_value || ''}
                onChange={(e) => { setForm(p => ({ ...p, discount_value: Number(e.target.value) })); setErrors(p => ({ ...p, discount_value: undefined })); }}
                className="form-input w-full bg-zinc-900 border border-zinc-800 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Services Checklist */}
          <div className="form-group">
            <label className="form-label text-xs font-semibold text-zinc-400 mb-1.5 block">
              Select Services to Bundle *
            </label>
            {errors.service_ids && (
              <span className="text-red-500 text-xs mb-2 block">{errors.service_ids}</span>
            )}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 divide-y divide-zinc-800/60">
              {servicesList.map(s => {
                const checked = form.service_ids.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => handleServiceToggle(s.id)}
                    className="flex items-center gap-3 pt-2 first:pt-0 cursor-pointer hover:bg-zinc-850/40 p-1 rounded"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      checked
                        ? 'bg-violet-600 border-violet-500 text-white'
                        : 'border-zinc-700 bg-zinc-950 text-transparent'
                    }`}>
                      <Check size={10} strokeWidth={3} />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium text-zinc-200">{s.name}</span>
                      <span className="text-[10px] text-zinc-500 block">
                        {formatCurrency(s.base_price)} / {s.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button type="button" className="btn btn-secondary text-xs" onClick={onClose}>Cancel</button>
            <button
              id="package-form-submit"
              type="submit"
              className="btn btn-primary text-xs font-semibold px-4 py-2"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Package')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
