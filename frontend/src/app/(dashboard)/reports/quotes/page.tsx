'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reports } from '@/lib/api';
import ReportShell from '@/components/reports/ReportShell';
import KpiCard from '@/components/reports/KpiCard';
import FunnelChart from '@/components/reports/FunnelChart';
import ReportTable from '@/components/reports/ReportTable';
import { FileSpreadsheet, Percent, Coins, Award, Layers } from 'lucide-react';

export default function QuoteConversionReport() {
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
    queryKey: ['reports', 'quotes', dates.from, dates.to],
    queryFn: async () => {
      const res = await reports.getQuotes({ from: dates.from, to: dates.to });
      return res.data;
    },
  });

  const handleExport = () => {
    if (typeof window !== 'undefined') {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const token = localStorage.getItem('auth_token');
      const url = `${apiUrl}/reports/quotes?export=csv&from=${dates.from}&to=${dates.to}&token=${token}`;
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
    { key: 'service_name', label: 'Service / Item Description' },
    { key: 'quote_count', label: 'Quote Mentions', align: 'center' as const, sortable: true },
    {
      key: 'total_value',
      label: 'Total Quoted Value',
      align: 'right' as const,
      sortable: true,
      render: (val: any) => <span className="font-mono text-emerald-400 font-medium">{formatCurrency(Number(val))}</span>,
    },
  ];

  return (
    <ReportShell
      title="Quote Conversion Report"
      description="Analyze quotation win rates, conversion funnel progression, and top-value service offerings."
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            <KpiCard
              title="Total Quotes"
              value={data.summary.total_quotes}
              subtext="Draft to Won Quotes"
              icon={<FileSpreadsheet className="w-5 h-5" />}
            />
            <KpiCard
              title="Win Rate"
              value={`${data.summary.win_rate_pct}%`}
              subtext="Won vs Rejected ratio"
              icon={<Percent className="w-5 h-5 text-emerald-400" />}
            />
            <KpiCard
              title="Won Quotes"
              value={data.summary.won_count}
              subtext={`${data.summary.sent_count} Sent to Clients`}
              icon={<Award className="w-5 h-5 text-amber-400" />}
            />
            <KpiCard
              title="Avg Quote Value"
              value={formatCurrency(data.summary.avg_quote_value)}
              subtext="Average Proposal Value"
              icon={<Coins className="w-5 h-5" />}
            />
            <KpiCard
              title="Total Quote Value"
              value={formatCurrency(data.summary.total_quote_value)}
              subtext="Active Pipeline (Approved+)"
              icon={<Layers className="w-5 h-5 text-sky-400" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel: Funnel Chart */}
            <div className="lg:col-span-1 space-y-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Conversion Funnel</h3>
              <FunnelChart data={data.funnel} />
            </div>

            {/* Right Panel: Top Quoted Services */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Top Quoted Services</h3>
              <ReportTable columns={columns} data={data.top_services} />
            </div>
          </div>
        </div>
      )}
    </ReportShell>
  );
}
