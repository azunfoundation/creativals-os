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
      render: (val: any) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--success)' }}>{val}%</span>
      ),
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
      render: (val: any) => (
        <span style={{ fontFamily: 'monospace' }}>{formatCurrency(Number(val))}</span>
      ),
    },
    {
      key: 'conversion_rate_pct',
      label: 'Conversion Rate',
      align: 'right' as const,
      render: (val: any) => (
        <span style={{ fontFamily: 'monospace', color: 'var(--success)' }}>{val}%</span>
      ),
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
      <div style={{ display: 'flex', background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '4px', maxWidth: '380px', marginBottom: '1rem' }}>
        <button
          onClick={() => setDateType('created')}
          style={{
            flex: 1,
            padding: '0.375rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            background: dateType === 'created' ? 'var(--accent)' : 'transparent',
            color: dateType === 'created' ? '#ffffff' : 'var(--text-secondary)',
            transition: 'all var(--transition-fast)',
            border: 'none',
          }}
        >
          By Lead Created Date
        </button>
        <button
          onClick={() => setDateType('converted')}
          style={{
            flex: 1,
            padding: '0.375rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            background: dateType === 'converted' ? 'var(--accent)' : 'transparent',
            color: dateType === 'converted' ? '#ffffff' : 'var(--text-secondary)',
            transition: 'all var(--transition-fast)',
            border: 'none',
          }}
        >
          By Lead Converted Date
        </button>
      </div>

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <KpiCard
              title="Leads In Scope"
              value={data.summary.total_leads}
              subtext={`Based on ${dateType} date`}
              icon={<Users size={18} />}
            />
            <KpiCard
              title="Converted Leads"
              value={data.summary.converted_leads}
              subtext="Successfully Won"
              icon={<UserCheck size={18} />}
            />
            <KpiCard
              title="Conversion Rate"
              value={`${data.summary.conversion_rate_pct}%`}
              subtext="Win Ratio in Period"
              icon={<Sparkles size={18} />}
            />
            <KpiCard
              title="Avg Budget"
              value={formatCurrency(data.summary.avg_budget)}
              subtext="Estimated Monthly Budget"
              icon={<PieChart size={18} />}
            />
            <KpiCard
              title="Active Pipeline Value"
              value={formatCurrency(data.summary.total_pipeline_value)}
              subtext="Expected Monthly Revenue"
              icon={<Flame size={18} />}
            />
          </div>

          {/* Leads by Stage Chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 className="kpi-label" style={{ fontSize: '0.8125rem' }}>Leads by Deal Stage</h3>
            <BarChart
              data={data.by_stage}
              xKey="stage_name"
              yKey="lead_count"
              valueFormatter={(val) => `${val} Leads`}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
            {/* Sources Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 className="kpi-label" style={{ fontSize: '0.8125rem' }}>Acquisition Channels Performance</h3>
              <ReportTable columns={sourceColumns} data={data.by_source} />
            </div>

            {/* Executives Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 className="kpi-label" style={{ fontSize: '0.8125rem' }}>Sales Executives Performance</h3>
              <ReportTable columns={execColumns} data={data.by_exec} />
            </div>
          </div>
        </div>
      )}
    </ReportShell>
  );
}
