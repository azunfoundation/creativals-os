'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reports } from '@/lib/api';
import ReportShell from '@/components/reports/ReportShell';
import KpiCard from '@/components/reports/KpiCard';
import LineChart from '@/components/reports/LineChart';
import ReportTable from '@/components/reports/ReportTable';
import { DollarSign, Wallet, AlertCircle, RefreshCw } from 'lucide-react';

export default function RevenueReport() {
  const getInitialDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    let fyStartYear = year;
    if (now.getMonth() < 3) {
      fyStartYear = year - 1;
    }
    return {
      from: `${fyStartYear}-04-01`,
      to: `${fyStartYear + 1}-03-31`,
    };
  };

  const [dates, setDates] = useState(getInitialDates());

  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', 'revenue', dates.from, dates.to],
    queryFn: async () => {
      const res = await reports.getRevenue({ from: dates.from, to: dates.to });
      return res.data;
    },
  });

  const handleExport = () => {
    if (typeof window !== 'undefined') {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const token = localStorage.getItem('auth_token');
      const url = `${apiUrl}/reports/revenue?export=csv&from=${dates.from}&to=${dates.to}&token=${token}`;
      window.open(url, '_blank');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const columns = [
    { key: 'client_name', label: 'Client Name' },
    {
      key: 'total_billed',
      label: 'Total Billed',
      align: 'right' as const,
      render: (val: any) => (
        <span style={{ fontFamily: 'monospace' }}>{formatCurrency(Number(val))}</span>
      ),
    },
    {
      key: 'total_paid',
      label: 'Total Collected',
      align: 'right' as const,
      render: (val: any) => (
        <span style={{ fontFamily: 'monospace', color: 'var(--success)' }}>{formatCurrency(Number(val))}</span>
      ),
    },
    {
      key: 'outstanding',
      label: 'Outstanding Balance',
      align: 'right' as const,
      render: (val: any) => (
        <span
          style={{
            fontFamily: 'monospace',
            fontWeight: Number(val) > 0 ? 600 : undefined,
            color: Number(val) > 0 ? 'var(--danger)' : 'var(--text-muted)',
          }}
        >
          {formatCurrency(Number(val))}
        </span>
      ),
    },
  ];

  return (
    <ReportShell
      title="Revenue Summary Report"
      description="Track billing, collections efficiency, and receivables trends."
      from={dates.from}
      to={dates.to}
      onDateChange={(from, to) => setDates({ from, to })}
      onExport={handleExport}
      isLoading={isLoading}
      error={error ? (error as any).message : null}
    >
      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* KPI Cards */}
          <div className="kpi-grid kpi-grid-4">
            <KpiCard
              title="Total Billed"
              value={formatCurrency(data.summary.total_invoiced)}
              subtext={`${data.summary.invoice_count} Invoices Issued`}
              icon={<DollarSign size={18} />}
            />
            <KpiCard
              title="Total Collected"
              value={formatCurrency(data.summary.total_collected)}
              subtext="Received Payments"
              icon={<Wallet size={18} />}
            />
            <KpiCard
              title="Outstanding receivables"
              value={formatCurrency(data.summary.total_outstanding)}
              subtext="Unpaid Balances"
              icon={<AlertCircle size={18} />}
            />
            <KpiCard
              title="Collection Efficiency"
              value={`${data.summary.collection_rate_pct}%`}
              subtext="Billed vs Collected Ratio"
              icon={<RefreshCw size={18} />}
            />
          </div>

          {/* Charts Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 className="kpi-label" style={{ fontSize: '0.8125rem' }}>Revenue Trend (INR)</h3>
            <LineChart
              data={data.trend}
              xKey="month_key"
              yKey="invoiced_amount"
              secondaryYKey="collected_amount"
              valueFormatter={(val) => formatCurrency(val)}
            />
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', justifyContent: 'flex-end', paddingRight: '1rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'var(--success)', display: 'inline-block' }} /> Invoiced
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'var(--info)', display: 'inline-block' }} /> Collected
              </span>
            </div>
          </div>

          {/* Top Clients Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 className="kpi-label" style={{ fontSize: '0.8125rem' }}>Top 5 Clients by Revenue</h3>
            <ReportTable columns={columns} data={data.top_clients} />
          </div>
        </div>
      )}
    </ReportShell>
  );
}
