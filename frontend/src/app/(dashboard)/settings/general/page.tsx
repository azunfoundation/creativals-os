'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, Coins, Percent, Save, Loader2, 
  Globe, Mail, Phone, MapPin, Clock, AlertCircle
} from 'lucide-react';
import { platformSettings as settingsApi, SystemSettings } from '@/lib/api';

const MOCK_SETTINGS: SystemSettings = {
  company: {
    company_name: 'Creativals Studio',
    company_email: 'finance@creativals.com',
    company_phone: '+91 98765 43210',
    company_address: 'No 45, Residency Road, Bangalore - 560025',
    timezone: 'Asia/Kolkata',
  },
  tax: {
    default_tax_rate: 18.00,
  },
  currencies: [
    { id: 1, code: 'INR', name: 'Indian Rupee', symbol: '₹', exchange_rate_to_inr: 1.0000, is_default: true, is_active: true },
    { id: 2, code: 'USD', name: 'US Dollar', symbol: '$', exchange_rate_to_inr: 83.5000, is_default: false, is_active: true },
    { id: 3, code: 'EUR', name: 'Euro', symbol: '€', exchange_rate_to_inr: 90.2000, is_default: false, is_active: false },
    { id: 4, code: 'GBP', name: 'British Pound', symbol: '£', exchange_rate_to_inr: 106.1000, is_default: false, is_active: false },
  ],
  number_sequences: [],
};

const COMMON_TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Singapore',
  'Asia/Dubai',
];

export default function GeneralSettingsPage() {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  const [taxRate, setTaxRate] = useState('0');

  const [defaultCurrency, setDefaultCurrency] = useState('');
  const [activeCurrencies, setActiveCurrencies] = useState<string[]>([]);

  // Fetch Settings
  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      try {
        const res = await settingsApi.get();
        return res.data;
      } catch {
        return MOCK_SETTINGS;
      }
    },
  });

  // Load state when data is loaded
  useEffect(() => {
    if (settings) {
      setCompanyName(settings.company.company_name);
      setCompanyEmail(settings.company.company_email);
      setCompanyPhone(settings.company.company_phone);
      setCompanyAddress(settings.company.company_address);
      setTimezone(settings.company.timezone);

      setTaxRate(settings.tax.default_tax_rate.toString());

      const def = settings.currencies.find(c => c.is_default)?.code || 'INR';
      setDefaultCurrency(def);

      const actives = settings.currencies.filter(c => c.is_active).map(c => c.code);
      setActiveCurrencies(actives);
    }
  }, [settings]);

  // Mutations
  const updateCompanyMutation = useMutation({
    mutationFn: (data: any) => settingsApi.updateCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
      triggerAlert('Company details saved successfully.');
    },
    onError: (err: any) => {
      triggerError(err.response?.data?.message || 'Failed to save company details.');
    }
  });

  const updateTaxMutation = useMutation({
    mutationFn: (data: any) => settingsApi.updateTax(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
      triggerAlert('Tax settings updated successfully.');
    },
    onError: (err: any) => {
      triggerError(err.response?.data?.message || 'Failed to update tax settings.');
    }
  });

  const updateCurrenciesMutation = useMutation({
    mutationFn: (data: { default_currency_code: string; active_currency_codes: string[] }) =>
      settingsApi.updateCurrencies(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
      triggerAlert('Currency settings saved successfully.');
    },
    onError: (err: any) => {
      triggerError(err.response?.data?.message || 'Failed to update currency configurations.');
    }
  });

  const triggerAlert = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyMutation.mutate({
      company_name: companyName,
      company_email: companyEmail,
      company_phone: companyPhone,
      company_address: companyAddress,
      timezone: timezone,
    });
  };

  const handleTaxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTaxMutation.mutate({
      default_tax_rate: parseFloat(taxRate) || 0,
    });
  };

  const handleCurrenciesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure default currency code is inside active currencies
    const finalActives = [...activeCurrencies];
    if (!finalActives.includes(defaultCurrency)) {
      finalActives.push(defaultCurrency);
    }
    updateCurrenciesMutation.mutate({
      default_currency_code: defaultCurrency,
      active_currency_codes: finalActives,
    });
  };

  const toggleActiveCurrency = (code: string) => {
    if (code === defaultCurrency) return; // Cannot toggle off default currency
    setActiveCurrencies(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent)' }} />
        <span style={{ color: 'var(--text-muted)' }}>Loading general parameters...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Notifications */}
      {successMsg && (
        <div style={{
          padding: '0.875rem 1.25rem',
          background: 'var(--success-subtle)',
          color: 'var(--success)',
          border: '1px solid var(--success)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.875rem',
          fontWeight: 500,
        }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{
          padding: '0.875rem 1.25rem',
          background: 'var(--danger-subtle)',
          color: 'var(--danger)',
          border: '1px solid var(--danger)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.875rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1.5rem' }} className="grid grid-cols-1 lg:grid-cols-2">
        
        {/* ============================================================
            COLUMN 1: COMPANY PROFILE CARD
            ============================================================ */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Building2 size={18} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Company Profile</h2>
          </div>
          
          <form onSubmit={handleCompanySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div className="form-group">
              <label className="form-label">Company Name *</label>
              <input
                required
                type="text"
                placeholder="e.g. Acme Corp"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Billing Email Address *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  required
                  type="email"
                  placeholder="e.g. accounting@company.com"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2.25rem' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Contact Phone *</label>
              <div style={{ position: 'relative' }}>
                <Phone size={14} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  required
                  type="text"
                  placeholder="e.g. +91 99999 88888"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2.25rem' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Registered Physical Address *</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={14} style={{ position: 'absolute', left: '0.875rem', top: '12px', color: 'var(--text-muted)' }} />
                <textarea
                  required
                  rows={3}
                  placeholder="Street, City, Zip, Country"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2.25rem', resize: 'vertical' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Default System Timezone *</label>
              <div style={{ position: 'relative' }}>
                <Clock size={14} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2.25rem' }}
                >
                  {COMMON_TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={updateCompanyMutation.isPending}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {updateCompanyMutation.isPending ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <Save size={14} />
                )}
                <span>Save Company Profile</span>
              </button>
            </div>

          </form>
        </div>

        {/* ============================================================
            COLUMN 2: TAX & CURRENCIES CARDS
            ============================================================ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* TAX SETTINGS */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Percent size={18} style={{ color: 'var(--accent)' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Default Tax Settings</h2>
            </div>

            <form onSubmit={handleTaxSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Define the default tax percentage applied to new service catalogs, quotes, and invoices created in the system.
              </p>
              
              <div className="form-group">
                <label className="form-label">Default GST/Tax Rate (%)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="e.g. 18.00"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="form-input font-medium"
                  />
                  <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: 'var(--text-secondary)' }}>%</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                <button
                  type="submit"
                  disabled={updateTaxMutation.isPending}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {updateTaxMutation.isPending ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Save size={14} />
                  )}
                  <span>Save Tax Settings</span>
                </button>
              </div>
            </form>
          </div>

          {/* CURRENCY MANAGEMENT */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Coins size={18} style={{ color: 'var(--accent)' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Currency Configuration</h2>
            </div>

            <form onSubmit={handleCurrenciesSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="form-label">Default Operating Currency</label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Used as base reference for reporting analytics and payroll runs.
                </p>
                <select
                  value={defaultCurrency}
                  onChange={(e) => {
                    const code = e.target.value;
                    setDefaultCurrency(code);
                    if (!activeCurrencies.includes(code)) {
                      setActiveCurrencies(prev => [...prev, code]);
                    }
                  }}
                  className="form-input font-medium"
                >
                  {settings?.currencies.map(curr => (
                    <option key={curr.id} value={curr.code}>
                      {curr.code} - {curr.name} ({curr.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Active Billing Currencies</label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Select which currencies are available for invoices, quotes, and expenses. Default currency is locked active.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {settings?.currencies.map(curr => {
                    const isDefault = curr.code === defaultCurrency;
                    const isActive = activeCurrencies.includes(curr.code) || isDefault;
                    return (
                      <div 
                        key={curr.id}
                        onClick={() => toggleActiveCurrency(curr.code)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.625rem 0.875rem',
                          borderRadius: 'var(--radius-md)',
                          background: isActive ? 'var(--accent-subtle)' : 'var(--surface-elevated)',
                          border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                          cursor: isDefault ? 'default' : 'pointer',
                          transition: 'all 0.15s ease',
                          opacity: isDefault ? 0.8 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{curr.symbol} {curr.code}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{curr.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {isDefault && (
                            <span style={{
                              fontSize: '0.625rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: 'var(--accent)',
                              color: '#fff',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}>Base Default</span>
                          )}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Active: {isActive ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                <button
                  type="submit"
                  disabled={updateCurrenciesMutation.isPending}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {updateCurrenciesMutation.isPending ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Save size={14} />
                  )}
                  <span>Save Currency Settings</span>
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
