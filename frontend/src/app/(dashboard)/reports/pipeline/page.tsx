'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reports } from '@/lib/api';
import ReportShell from '@/components/reports/ReportShell';
import KpiCard from '@/components/reports/KpiCard';
import BarChart from '@/components/reports/BarChart';
import ReportTable from '@/components/reports/ReportTable';
import { Users, UserCheck, Flame, PieChart, Sparkles } from 'lucide-react';

export default function SalesPipelineReport() {
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
  const [dateType, setDateType] = useState<'created' | 'converted'>('created');

  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', 'pipeline', dates.from, dates.to, dateType],
    queryFn: async () => {
      const res = await reports.getPipeline({
        from: dates.from,
        to: dates.to,
        lead_date_type: dateType,
      });
      return res.data;
    },
  });

  const handleExport = () => {
    if (typeof window !== 'undefined') {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const token = localStorage.getItem('auth_token');
      const url = `${apiUrl}/reports/pipeline?export=csv&from=${dates.from}&to=${dates.to}&lead_date_type=${dateType}&token=${token}`;
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

  const sourceColumns = [
    { key: 'source_name', label: 'Lead Source' },
    { key: 'lead_count', label: 'Total Leads', align: 'center' as const },
    { key: 'conversion_count', label: 'Conversions', align: 'center' as const },
    {
      key: 'conversion_rate_pct',
      label: 'Conversion Rate',
      align: 'right' as const,
      render: (val: any) => <span className="font-mono font-semibold text-emerald-400">{val}%</span>,
    },
  ];

  const execColumns = [
    { key: 'exec_name', label: 'Sales Executive' },
    { key: 'lead_count', label: 'Leads Handled', align: 'center' as const },
    { key: 'converted_count', label: 'Leads Converted', align: 'center' as const },
    {
      key: 'total_pipeline_value',
      label: 'Active Pipeline Value',
      align: 'right' as const,
      render: (val: any) => <span className="font-mono">{formatCurrency(Number(val))}</span>,
    },
    {
      key: 'conversion_rate_pct',
      label: 'Conversion Rate',
      align: 'right' as const,
      render: (val: any) => <span className="font-mono text-emerald-400">{val}%</span>,
    },
  ];

  return (
    <ReportShell
      title="Sales Pipeline & Lead Report"
      description="Understand lead acquisition, executive performance, and deals conversion rate."
      from={dates.from}
      to={dates.to}
      onDateChange={(from, to) => setDates({ from, to })}
      onExport={handleExport}
      isLoading={isLoading}
      error={error ? (error as any).message : null}
    >
      {/* Date Type Filter (created vs converted date type) */}
      <div className="flex bg-slate-950/60 p-1 border border-slate-800/80 rounded-lg max-w-sm">
        <button
          onClick={() => setDateType('created')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
            dateType === 'created' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          By Lead Created Date
        </button>
        <button
          onClick={() => setDateType('converted')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
            dateType === 'converted' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          By Lead Converted Date
        </button>
      </div>

      {data && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            <KpiCard
              title="Leads In Scope"
              value={data.summary.total_leads}
              subtext={`Based on ${dateType} date`}
              icon={<Users className="w-5 h-5" />}
            />
            <KpiCard
              title="Converted Leads"
              value={data.summary.converted_leads}
              subtext="Successfully Won"
              icon={<UserCheck className="w-5 h-5 text-emerald-400" />}
            />
            <KpiCard
              title="Conversion Rate"
              value={`${data.summary.conversion_rate_pct}%`}
              subtext="Win Ratio in Period"
              icon={<Sparkles className="w-5 h-5 text-amber-400" />}
            />
            <KpiCard
              title="Avg Budget"
              value={formatCurrency(data.summary.avg_budget)}
              subtext="Estimated Monthly Budget"
              icon={<PieChart className="w-5 h-5" />}
            />
            <KpiCard
              title="Active Pipeline Value"
              value={formatCurrency(data.summary.total_pipeline_value)}
              subtext="Expected Monthly Revenue"
              icon={<Flame className="w-5 h-5 text-rose-400" />}
            />
          </div>

          {/* Leads by Stage Chart */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Leads by Deal Stage</h3>
            <BarChart
              data={data.by_stage}
              xKey="stage_name"
              yKey="lead_count"
              valueFormatter={(val) => `${val} Leads`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sources Table */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Acquisition Channels Performance</h3>
              <ReportTable columns={sourceColumns} data={data.by_source} />
            </div>

            {/* Executives Table */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Sales Executives Performance</h3>
              <ReportTable columns={execColumns} data={data.by_exec} />
            </div>
          </div>
        </div>
      )}
    </ReportShell>
  );
}
