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
      render: (val: any) => <span className="font-mono">{formatCurrency(Number(val))}</span>,
    },
    {
      key: 'total_paid',
      label: 'Total Collected',
      align: 'right' as const,
      render: (val: any) => <span className="font-mono text-emerald-400">{formatCurrency(Number(val))}</span>,
    },
    {
      key: 'outstanding',
      label: 'Outstanding Balance',
      align: 'right' as const,
      render: (val: any) => (
        <span className={`font-mono ${Number(val) > 0 ? 'text-rose-400 font-semibold' : 'text-slate-500'}`}>
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
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <KpiCard
              title="Total Billed"
              value={formatCurrency(data.summary.total_invoiced)}
              subtext={`${data.summary.invoice_count} Invoices Issued`}
              icon={<DollarSign className="w-5 h-5" />}
            />
            <KpiCard
              title="Total Collected"
              value={formatCurrency(data.summary.total_collected)}
              subtext="Received Payments"
              icon={<Wallet className="w-5 h-5" />}
            />
            <KpiCard
              title="Outstanding receivables"
              value={formatCurrency(data.summary.total_outstanding)}
              subtext="Unpaid Balances"
              icon={<AlertCircle className="w-5 h-5 text-rose-400" />}
            />
            <KpiCard
              title="Collection Efficiency"
              value={`${data.summary.collection_rate_pct}%`}
              subtext="Billed vs Collected Ratio"
              icon={<RefreshCw className="w-5 h-5" />}
            />
          </div>

          {/* Charts Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Revenue Trend (INR)</h3>
            <LineChart
              data={data.trend}
              xKey="month_key"
              yKey="invoiced_amount"
              secondaryYKey="collected_amount"
              valueFormatter={(val) => formatCurrency(val)}
            />
            <div className="flex gap-4 text-xs text-slate-500 justify-end px-4">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Invoiced</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-sky-500 inline-block" /> Collected</span>
            </div>
          </div>

          {/* Top Clients Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Top 5 Clients by Revenue</h3>
            <ReportTable columns={columns} data={data.top_clients} />
          </div>
        </div>
      )}
    </ReportShell>
  );
}
