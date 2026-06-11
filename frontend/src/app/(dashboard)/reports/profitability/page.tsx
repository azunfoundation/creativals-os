'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reports } from '@/lib/api';
import ReportShell from '@/components/reports/ReportShell';
import KpiCard from '@/components/reports/KpiCard';
import ReportTable from '@/components/reports/ReportTable';
import { Briefcase, Wallet, Users, CreditCard, Sparkles, TrendingUp } from 'lucide-react';

export default function ProjectProfitabilityReport() {
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
    queryKey: ['reports', 'profitability', dates.from, dates.to],
    queryFn: async () => {
      const res = await reports.getProfitability({ from: dates.from, to: dates.to });
      return res.data;
    },
  });

  const handleExport = () => {
    if (typeof window !== 'undefined') {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const token = localStorage.getItem('auth_token');
      const url = `${apiUrl}/reports/profitability?export=csv&from=${dates.from}&to=${dates.to}&token=${token}`;
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

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      planning: 'bg-indigo-950/40 text-indigo-400 border-indigo-900/50',
      active: 'bg-sky-950/40 text-sky-400 border-sky-900/50',
      on_hold: 'bg-amber-950/40 text-amber-400 border-amber-900/50',
      completed: 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50',
      cancelled: 'bg-slate-950/40 text-slate-400 border-slate-900/50',
    };
    const classes = map[status] || 'bg-slate-950/40 text-slate-400 border-slate-900/50';
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${classes}`}>
        {status.toUpperCase().replace('_', ' ')}
      </span>
    );
  };

  const columns = [
    {
      key: 'project_name',
      label: 'Project Details',
      render: (val: any, row: any) => (
        <div>
          <div className="font-bold text-slate-200">{val}</div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">{row.project_number}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center' as const,
      render: (val: any) => getStatusBadge(val),
    },
    {
      key: 'hours_logged',
      label: 'Hours',
      align: 'center' as const,
      render: (val: any) => <span className="font-mono text-slate-400">{val} hrs</span>,
    },
    {
      key: 'revenue',
      label: 'Billed / Budget',
      align: 'right' as const,
      render: (val: any) => <span className="font-mono text-slate-300">{formatCurrency(Number(val))}</span>,
    },
    {
      key: 'labor_cost',
      label: 'Labor Cost',
      align: 'right' as const,
      render: (val: any) => <span className="font-mono text-slate-400">{formatCurrency(Number(val))}</span>,
    },
    {
      key: 'expense_cost',
      label: 'Expenses',
      align: 'right' as const,
      render: (val: any) => <span className="font-mono text-slate-450">{formatCurrency(Number(val))}</span>,
    },
    {
      key: 'net_profit',
      label: 'Net Profit',
      align: 'right' as const,
      render: (val: any) => {
        const amt = Number(val);
        return (
          <span className={`font-mono font-semibold ${amt >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
            {formatCurrency(amt)}
          </span>
        );
      },
    },
    {
      key: 'margin_percentage',
      label: 'Margin %',
      align: 'right' as const,
      render: (val: any) => {
        const pct = Number(val);
        return (
          <span className={`font-mono font-bold ${pct >= 0 ? 'text-emerald-450' : 'text-rose-500'}`}>
            {pct}%
          </span>
        );
      },
    },
  ];

  const profitColor = data && data.summary.total_net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400';
  const marginColor = data && data.summary.avg_margin_pct >= 0 ? 'text-emerald-400' : 'text-rose-400';

  return (
    <ReportShell
      title="Project Profitability Report"
      description="Compare project budget/revenue against timesheet labor costs and direct expenses to analyze net margins."
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5">
            <KpiCard
              title="Active Projects"
              value={data.summary.project_count}
              subtext="Projects In Period"
              icon={<Briefcase className="w-5 h-5 text-sky-400" />}
            />
            <KpiCard
              title="Total Revenue"
              value={formatCurrency(data.summary.total_revenue)}
              subtext="Project Billed/Revenue"
              icon={<Wallet className="w-5 h-5" />}
            />
            <KpiCard
              title="Labor Cost"
              value={formatCurrency(data.summary.total_labor_cost)}
              subtext="Timesheet Hourly Cost"
              icon={<Users className="w-5 h-5 text-violet-400" />}
            />
            <KpiCard
              title="Direct Expenses"
              value={formatCurrency(data.summary.total_expense_cost)}
              subtext="Approved Allocations"
              icon={<CreditCard className="w-5 h-5 text-rose-400" />}
            />
            <KpiCard
              title="Net Profit"
              value={formatCurrency(data.summary.total_net_profit)}
              subtext="Revenue - Labor - Expense"
              icon={<Sparkles className={`w-5 h-5 ${profitColor}`} />}
            />
            <KpiCard
              title="Avg Margin"
              value={`${data.summary.avg_margin_pct}%`}
              subtext="Return on Projects"
              icon={<TrendingUp className={`w-5 h-5 ${marginColor}`} />}
            />
          </div>

          {/* Project Breakdown Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Per-Project Profitability Breakdown</h3>
            <ReportTable columns={columns} data={data.breakdown} />
          </div>
        </div>
      )}
    </ReportShell>
  );
}
