'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reports } from '@/lib/api';
import ReportShell from '@/components/reports/ReportShell';
import KpiCard from '@/components/reports/KpiCard';
import ReportTable from '@/components/reports/ReportTable';
import { Building2, Wallet, DollarSign, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function Client360Report() {
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
    queryKey: ['reports', 'clients', dates.from, dates.to],
    queryFn: async () => {
      const res = await reports.getClients({ from: dates.from, to: dates.to });
      return res.data;
    },
  });

  const handleExport = () => {
    if (typeof window !== 'undefined') {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const token = localStorage.getItem('auth_token');
      const url = `${apiUrl}/reports/clients?export=csv&from=${dates.from}&to=${dates.to}&token=${token}`;
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return <span className="text-slate-600">-</span>;
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const columns = [
    {
      key: 'client_name',
      label: 'Client / Company Name',
      render: (val: any, row: any) => (
        <div>
          <div className="font-bold text-slate-200">{val}</div>
          <div className="text-[10px] text-slate-550 mt-0.5">{row.client_email}</div>
        </div>
      ),
    },
    {
      key: 'active_projects',
      label: 'Projects (Active/Total)',
      align: 'center' as const,
      render: (_: any, row: any) => (
        <span className="font-mono text-slate-300">
          {row.active_projects} <span className="text-slate-600 text-[10px]">/</span> {row.total_projects}
        </span>
      ),
    },
    {
      key: 'total_billed',
      label: 'Total Billed',
      align: 'right' as const,
      sortable: true,
      render: (val: any) => <span className="font-mono text-slate-300">{formatCurrency(Number(val))}</span>,
    },
    {
      key: 'total_paid',
      label: 'Total Collected',
      align: 'right' as const,
      sortable: true,
      render: (val: any) => <span className="font-mono text-emerald-450">{formatCurrency(Number(val))}</span>,
    },
    {
      key: 'total_outstanding',
      label: 'Outstanding',
      align: 'right' as const,
      sortable: true,
      render: (val: any) => {
        const amt = Number(val);
        return (
          <span className={`font-mono font-semibold ${amt > 0 ? 'text-rose-450' : 'text-slate-500'}`}>
            {formatCurrency(amt)}
          </span>
        );
      },
    },
    {
      key: 'last_invoice_date',
      label: 'Last Invoice Date',
      align: 'center' as const,
      render: (val: any) => <span className="text-slate-400">{formatDate(val)}</span>,
    },
    {
      key: 'last_payment_date',
      label: 'Last Payment Date',
      align: 'center' as const,
      render: (val: any) => <span className="text-slate-400">{formatDate(val)}</span>,
    },
  ];

  return (
    <ReportShell
      title="Client 360 Summary Report"
      description="Analyze accounts values, aggregate client invoices, active projects count, and payout histories."
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <KpiCard
              title="Total Clients"
              value={data.summary.total_clients}
              subtext="Registered Clients"
              icon={<Building2 className="w-5 h-5 text-sky-400" />}
            />
            <KpiCard
              title="Active Accounts"
              value={data.summary.total_active}
              subtext="With Active Projects"
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            />
            <KpiCard
              title="Total Billed"
              value={formatCurrency(data.summary.total_billed)}
              subtext="Lifetime Billings"
              icon={<DollarSign className="w-5 h-5 text-indigo-400" />}
            />
            <KpiCard
              title="Total Collected"
              value={formatCurrency(data.summary.total_collected)}
              subtext="Cleared Payouts"
              icon={<Wallet className="w-5 h-5 text-emerald-450" />}
            />
            <KpiCard
              title="Outstanding"
              value={formatCurrency(data.summary.total_outstanding)}
              subtext="Awaiting Collections"
              icon={<AlertTriangle className="w-5 h-5 text-rose-400" />}
            />
          </div>

          {/* Client Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 className="kpi-label" style={{ fontSize: '0.8125rem' }}>Client Accounts Performance Breakdown</h3>
            <ReportTable columns={columns} data={data.breakdown} />
          </div>
        </div>
      )}
    </ReportShell>
  );
}
