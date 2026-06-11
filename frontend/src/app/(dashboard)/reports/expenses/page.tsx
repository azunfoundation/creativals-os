'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reports } from '@/lib/api';
import ReportShell from '@/components/reports/ReportShell';
import KpiCard from '@/components/reports/KpiCard';
import LineChart from '@/components/reports/LineChart';
import ReportTable from '@/components/reports/ReportTable';
import { CreditCard, CheckCircle2, Clock, AlertTriangle, ListChecks } from 'lucide-react';

export default function ExpenseBreakdownReport() {
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
    queryKey: ['reports', 'expenses', dates.from, dates.to],
    queryFn: async () => {
      const res = await reports.getExpenses({ from: dates.from, to: dates.to });
      return res.data;
    },
  });

  const handleExport = () => {
    if (typeof window !== 'undefined') {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const token = localStorage.getItem('auth_token');
      const url = `${apiUrl}/reports/expenses?export=csv&from=${dates.from}&to=${dates.to}&token=${token}`;
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

  const catColumns = [
    {
      key: 'category_name',
      label: 'Category',
      render: (val: any, row: any) => (
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: row.category_color || 'var(--text-muted)' }}
          />
          <span>{val}</span>
        </div>
      ),
    },
    { key: 'count', label: 'Item Count', align: 'center' as const, sortable: true },
    {
      key: 'total_amount',
      label: 'Total Allocated',
      align: 'right' as const,
      sortable: true,
      render: (val: any) => <span className="font-mono text-emerald-400 font-semibold">{formatCurrency(Number(val))}</span>,
    },
  ];

  const vendorColumns = [
    { key: 'vendor_name', label: 'Vendor Name' },
    { key: 'count', label: 'Item Count', align: 'center' as const, sortable: true },
    {
      key: 'total_amount',
      label: 'Total Spent',
      align: 'right' as const,
      sortable: true,
      render: (val: any) => <span className="font-mono text-slate-350">{formatCurrency(Number(val))}</span>,
    },
  ];

  const projColumns = [
    { key: 'project_name', label: 'Project Allocation' },
    { key: 'count', label: 'Allocated Items', align: 'center' as const, sortable: true },
    {
      key: 'total_amount',
      label: 'Total Cost',
      align: 'right' as const,
      sortable: true,
      render: (val: any) => <span className="font-mono text-indigo-400">{formatCurrency(Number(val))}</span>,
    },
  ];

  return (
    <ReportShell
      title="Expense Breakdown Report"
      description="Track operational overheads, vendor payouts, and category-level/project-level expense distributions."
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
              title="Total Submitted"
              value={formatCurrency(data.summary.total_submitted)}
              subtext="Aggregated Expenses"
              icon={<CreditCard className="w-5 h-5 text-indigo-400" />}
            />
            <KpiCard
              title="Approved Expenses"
              value={formatCurrency(data.summary.total_approved)}
              subtext="Cleared Payouts"
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            />
            <KpiCard
              title="Pending Approval"
              value={formatCurrency(data.summary.total_pending)}
              subtext="Awaiting PM Action"
              icon={<Clock className="w-5 h-5 text-amber-400" />}
            />
            <KpiCard
              title="Rejected Expenses"
              value={formatCurrency(data.summary.total_rejected)}
              subtext="Declined Outlays"
              icon={<AlertTriangle className="w-5 h-5 text-rose-450" />}
            />
            <KpiCard
              title="Expense Count"
              value={data.summary.expense_count}
              subtext="Total Line Items"
              icon={<ListChecks className="w-5 h-5" />}
            />
          </div>

          {/* Line Chart Trend */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Expense Trend (INR)</h3>
            <LineChart
              data={data.trend}
              xKey="month_key"
              yKey="approved_amount"
              secondaryYKey="submitted_amount"
              valueFormatter={(val) => formatCurrency(val)}
            />
            <div className="flex gap-4 text-xs text-slate-500 justify-end px-4">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Approved
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-sky-500 inline-block" /> Submitted
              </span>
            </div>
          </div>

          {/* Breakdown Tables Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Categories */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">By Category</h3>
              <ReportTable columns={catColumns} data={data.by_category} pageSize={5} />
            </div>

            {/* Vendors */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">By Vendor</h3>
              <ReportTable columns={vendorColumns} data={data.by_vendor} pageSize={5} />
            </div>

            {/* Projects */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">By Project Allocation</h3>
              <ReportTable columns={projColumns} data={data.by_project} pageSize={5} />
            </div>
          </div>
        </div>
      )}
    </ReportShell>
  );
}
