'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reports } from '@/lib/api';
import ReportShell from '@/components/reports/ReportShell';
import KpiCard from '@/components/reports/KpiCard';
import ReportTable from '@/components/reports/ReportTable';
import { Users, Clock, Flame, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function TeamUtilisationReport() {
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
    queryKey: ['reports', 'utilisation', dates.from, dates.to],
    queryFn: async () => {
      const res = await reports.getUtilisation({ from: dates.from, to: dates.to });
      return res.data;
    },
  });

  const handleExport = () => {
    if (typeof window !== 'undefined') {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const token = localStorage.getItem('auth_token');
      const url = `${apiUrl}/reports/utilisation?export=csv&from=${dates.from}&to=${dates.to}&token=${token}`;
      window.open(url, '_blank');
    }
  };

  const memberColumns = [
    { key: 'user_name', label: 'Team Member' },
    {
      key: 'department',
      label: 'Department',
      render: (val: any) => (
        <span className="badge badge-muted">
          {val || 'General'}
        </span>
      ),
    },
    { key: 'expected_hours', label: 'Target Hours', align: 'center' as const, sortable: true },
    { key: 'logged_hours', label: 'Logged Hours', align: 'center' as const, sortable: true },
    { key: 'billable_hours', label: 'Billable Hours', align: 'center' as const, sortable: true },
    {
      key: 'utilisation_pct',
      label: 'Utilisation',
      align: 'right' as const,
      sortable: true,
      render: (val: any) => {
        const pct = Number(val);
        let color = 'text-slate-400';
        if (pct >= 85) color = 'text-emerald-400 font-semibold';
        else if (pct >= 65) color = 'text-sky-400';
        else if (pct > 0) color = 'text-amber-400';
        return <span className={`font-mono ${color}`}>{pct}%</span>;
      },
    },
    {
      key: 'billable_rate_pct',
      label: 'Billable Rate',
      align: 'right' as const,
      sortable: true,
      render: (val: any) => <span className="font-mono font-medium text-emerald-455">{val}%</span>,
    },
  ];

  const projectColumns = [
    { key: 'project_name', label: 'Project Name' },
    {
      key: 'total_hours',
      label: 'Total Hours Logged',
      align: 'center' as const,
      sortable: true,
      render: (val: any) => <span className="font-mono text-slate-300">{val} hrs</span>,
    },
    {
      key: 'billable_hours',
      label: 'Billable Hours',
      align: 'right' as const,
      sortable: true,
      render: (val: any) => <span className="font-mono text-emerald-400">{val} hrs</span>,
    },
  ];

  return (
    <ReportShell
      title="Team Utilisation Report"
      description="Track resource utilization metrics, comparing hours logged against available work capacities."
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
              title="Team Size"
              value={data.summary.team_size}
              subtext="Active Employees"
              icon={<Users className="w-5 h-5 text-sky-400" />}
            />
            <KpiCard
              title="Total Hours Logged"
              value={`${data.summary.total_logged_hours} h`}
              subtext="Approved / Submitted"
              icon={<Clock className="w-5 h-5" />}
            />
            <KpiCard
              title="Billable Hours"
              value={`${data.summary.total_billable_hours} h`}
              subtext="Invoiced tasks"
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            />
            <KpiCard
              title="Billable Rate"
              value={`${data.summary.billable_rate_pct}%`}
              subtext="Billable / Logged"
              icon={<Flame className="w-5 h-5 text-amber-400" />}
            />
            <KpiCard
              title="Avg Utilisation"
              value={`${data.summary.avg_utilisation_pct}%`}
              subtext="Logged / Available"
              icon={<ShieldAlert className="w-5 h-5 text-violet-400" />}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
            {/* Left Column: Team breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 className="kpi-label" style={{ fontSize: '0.8125rem' }}>Resource Allocation Breakdown</h3>
              <ReportTable columns={memberColumns} data={data.breakdown} />
            </div>

            {/* Right Column: Top Projects by Logged Hours */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 className="kpi-label" style={{ fontSize: '0.8125rem' }}>Top Projects by Hours Logged</h3>
              <ReportTable columns={projectColumns} data={data.top_projects_by_hours} />
            </div>
          </div>
        </div>
      )}
    </ReportShell>
  );
}
