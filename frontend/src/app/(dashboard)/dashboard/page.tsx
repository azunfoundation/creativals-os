'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { reports, projects, alerts } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, Minus,
  Users, DollarSign, Briefcase,
  Clock, Activity, AlertTriangle, Lock,
  ShieldCheck, Award, Flame, CreditCard, Sparkles
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────
interface KpiCardData {
  label: string;
  value: string | number;
  trend: 'up' | 'down' | 'flat';
  trendLabel: string;
  sub?: string;
  highlight?: 'danger' | 'success' | 'warning' | null;
}

// Helper to get offset dates
const getMonthDates = (offsetMonths = 0) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month + offsetMonths, 1);
  const end = new Date(year, month + offsetMonths + 1, 0);

  const formatDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    from: formatDateString(start),
    to: formatDateString(end)
  };
};

// ── Components ─────────────────────────────────────────────────
function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up')   return <TrendingUp size={12} />;
  if (trend === 'down') return <TrendingDown size={12} />;
  return <Minus size={12} />;
}

function KpiCard({ card }: { card: KpiCardData }) {
  const trendClass =
    card.trend === 'up' ? 'up' :
    card.trend === 'down' ? 'down' : 'flat';

  const valueColor =
    card.highlight === 'danger'  ? 'var(--danger)' :
    card.highlight === 'success' ? 'var(--success)' :
    card.highlight === 'warning' ? 'var(--warning)' :
    'var(--text-primary)';

  return (
    <div className="kpi-card">
      <div className="kpi-label">{card.label}</div>
      <div className="kpi-value" style={{ color: valueColor }}>{card.value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
        <span className={`kpi-trend ${trendClass}`}>
          <TrendIcon trend={card.trend} />
          {card.trendLabel}
        </span>
        {card.sub && (
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            {card.sub}
          </span>
        )}
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="kpi-card animate-pulse bg-slate-900/60 border border-slate-900">
      <div className="h-3.5 bg-slate-800 rounded w-2/3 mb-3"></div>
      <div className="h-6 bg-slate-850 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-slate-900 rounded w-3/4"></div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.875rem' }}>
      <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
        {title}
      </h2>
      {subtitle && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subtitle}</span>
      )}
    </div>
  );
}

function SectionLock({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <SectionHeader title={title} subtitle={subtitle} />
      <div className="flex items-center gap-3 p-4 bg-slate-950/40 border border-slate-900 rounded-xl select-none">
        <Lock className="w-4 h-4 text-slate-600" />
        <span className="text-xs text-slate-500 font-medium">
          Access Restricted — You do not have the required permissions to view this summary module.
        </span>
      </div>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const currentMonthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // ── Permission Helpers ──────────────────────────────────────────
  const check = (permissions: string[], roles: string[] = []) => {
    if (!user) return false;
    if (user.roles.some((r: any) => {
      const name = typeof r === 'string' ? r : r?.name || '';
      return name === 'founder' || name === 'director';
    })) {
      return true;
    }
    if (roles.length > 0 && user.roles.some((r: any) => {
      const name = typeof r === 'string' ? r : r?.name || '';
      return roles.includes(name);
    })) {
      return true;
    }
    return user.permissions.some((p: string) => permissions.includes(p));
  };

  const canViewFinancial = check(['reports.view_financial']);
  const canViewSales = check(['reports.view_sales']);
  const canViewProjects = check(['reports.view_hr'], ['project_manager']);

  // Dates
  const thisMonthDates = getMonthDates(0);
  const lastMonthDates = getMonthDates(-1);

  // ── Queries ────────────────────────────────────────────────────
  // Financial Overview
  const thisMonthRevenueQuery = useQuery({
    queryKey: ['dashboard', 'revenue', 'this-month'],
    queryFn: async () => {
      const res = await reports.getRevenue({ from: thisMonthDates.from, to: thisMonthDates.to });
      return res.data;
    },
    enabled: !!user && canViewFinancial,
  });

  const lastMonthRevenueQuery = useQuery({
    queryKey: ['dashboard', 'revenue', 'last-month'],
    queryFn: async () => {
      const res = await reports.getRevenue({ from: lastMonthDates.from, to: lastMonthDates.to });
      return res.data;
    },
    enabled: !!user && canViewFinancial,
  });

  const expensesQuery = useQuery({
    queryKey: ['dashboard', 'expenses', 'this-month'],
    queryFn: async () => {
      const res = await reports.getExpenses({ from: thisMonthDates.from, to: thisMonthDates.to });
      return res.data;
    },
    enabled: !!user && canViewFinancial,
  });

  const profitabilityQuery = useQuery({
    queryKey: ['dashboard', 'profitability', 'this-month'],
    queryFn: async () => {
      const res = await reports.getProfitability({ from: thisMonthDates.from, to: thisMonthDates.to });
      return res.data;
    },
    enabled: !!user && canViewFinancial,
  });

  // Sales & CRM
  const pipelineQuery = useQuery({
    queryKey: ['dashboard', 'pipeline', 'this-month'],
    queryFn: async () => {
      const res = await reports.getPipeline({ from: thisMonthDates.from, to: thisMonthDates.to, lead_date_type: 'created' });
      return res.data;
    },
    enabled: !!user && canViewSales,
  });

  const quotesQuery = useQuery({
    queryKey: ['dashboard', 'quotes', 'this-month'],
    queryFn: async () => {
      const res = await reports.getQuotes({ from: thisMonthDates.from, to: thisMonthDates.to });
      return res.data;
    },
    enabled: !!user && canViewSales,
  });

  // Projects & Team
  const utilisationQuery = useQuery({
    queryKey: ['dashboard', 'utilisation', 'this-month'],
    queryFn: async () => {
      const res = await reports.getUtilisation({ from: thisMonthDates.from, to: thisMonthDates.to });
      return res.data;
    },
    enabled: !!user && canViewProjects,
  });

  const projectsQuery = useQuery({
    queryKey: ['dashboard', 'projects-list'],
    queryFn: async () => {
      const res = await projects.list();
      return res.data;
    },
    enabled: !!user && (canViewProjects || canViewFinancial),
  });

  // Notifications
  const alertsQuery = useQuery<any[]>({
    queryKey: ['dashboard', 'alerts'],
    queryFn: async () => {
      const res = await alerts.list();
      const payload = res.data as any;
      if (payload && Array.isArray(payload.data)) {
        return payload.data;
      }
      return Array.isArray(payload) ? payload : [];
    },
    enabled: !!user,
  });

  // ── Financial KPI Builder ───────────────────────────────────────
  const getFinancialKpis = (): KpiCardData[] => {
    if (!thisMonthRevenueQuery.data || !lastMonthRevenueQuery.data || !expensesQuery.data || !profitabilityQuery.data) {
      return [];
    }
    const thisMonthRevenue = thisMonthRevenueQuery.data.summary.total_invoiced || 0;
    const lastMonthRevenue = lastMonthRevenueQuery.data.summary.total_invoiced || 0;
    const outstanding = thisMonthRevenueQuery.data.summary.total_outstanding || 0;
    const expenses = expensesQuery.data.summary.total_approved || 0;
    const netProfit = profitabilityQuery.data.summary.total_net_profit || 0;
    const margin = profitabilityQuery.data.summary.avg_margin_pct || 0;

    // Calc monthly revenue trend
    const revDiff = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;
    const revTrend = revDiff >= 0 ? 'up' : 'down';
    const revTrendLabel = `${revDiff >= 0 ? '+' : ''}${revDiff.toFixed(1)}%`;

    return [
      {
        label: 'Revenue This Month',
        value: formatCurrency(thisMonthRevenue),
        trend: revTrend,
        trendLabel: revTrendLabel,
        sub: 'vs last month',
      },
      {
        label: 'Revenue Last Month',
        value: formatCurrency(lastMonthRevenue),
        trend: 'flat',
        trendLabel: '0.0%',
        sub: 'prior calendar month',
      },
      {
        label: 'Outstanding',
        value: formatCurrency(outstanding),
        trend: outstanding > 0 ? 'up' : 'flat',
        trendLabel: outstanding > 0 ? 'Pending collections' : 'Clear balance',
        sub: `${thisMonthRevenueQuery.data.summary.invoice_count} invoices issued`,
        highlight: outstanding > 0 ? 'warning' : null,
      },
      {
        label: 'Expenses Approved',
        value: formatCurrency(expenses),
        trend: expenses > 0 ? 'up' : 'flat',
        trendLabel: 'Operation costs',
        sub: 'cleared outlays',
        highlight: expenses > 0 ? 'danger' : null,
      },
      {
        label: 'Net Profit',
        value: formatCurrency(netProfit),
        trend: netProfit >= 0 ? 'up' : 'down',
        trendLabel: netProfit >= 0 ? 'Positive return' : 'Loss in month',
        sub: 'revenue minus costs',
        highlight: netProfit >= 0 ? 'success' : 'danger',
      },
      {
        label: 'Average Margin',
        value: `${margin.toFixed(1)}%`,
        trend: margin >= 0 ? 'up' : 'down',
        trendLabel: 'Project return',
        sub: 'profit margin',
        highlight: margin >= 0 ? 'success' : 'danger',
      },
    ];
  };

  // ── CRM KPI Builder ─────────────────────────────────────────────
  const getCrmKpis = (): KpiCardData[] => {
    if (!pipelineQuery.data || !quotesQuery.data) {
      return [];
    }
    const totalLeads = pipelineQuery.data.summary.total_leads || 0;
    const convRate = pipelineQuery.data.summary.conversion_rate_pct || 0;
    const converted = pipelineQuery.data.summary.converted_leads || 0;
    const quotesPending = quotesQuery.data.summary.pending_count || 0;

    return [
      {
        label: 'New Leads',
        value: totalLeads,
        trend: totalLeads > 0 ? 'up' : 'flat',
        trendLabel: 'Active acquisitions',
        sub: 'created this month',
      },
      {
        label: 'Conversion Rate',
        value: `${convRate.toFixed(1)}%`,
        trend: convRate > 0 ? 'up' : 'flat',
        trendLabel: 'Lead → client conversion',
        sub: 'win percentage',
        highlight: convRate > 0 ? 'success' : null,
      },
      {
        label: 'Won Deals',
        value: converted,
        trend: converted > 0 ? 'up' : 'flat',
        trendLabel: 'Conversions registered',
        sub: 'leads converted',
        highlight: converted > 0 ? 'success' : null,
      },
      {
        label: 'Quotes Pending Approval',
        value: quotesPending,
        trend: quotesPending > 0 ? 'up' : 'flat',
        trendLabel: 'Awaiting signature',
        sub: 'pipeline quotes',
        highlight: quotesPending > 0 ? 'warning' : null,
      },
    ];
  };

  // ── Project KPI Builder ─────────────────────────────────────────
  const getProjectKpis = (): KpiCardData[] => {
    if (!utilisationQuery.data || !projectsQuery.data) {
      return [];
    }

    const projectsList = projectsQuery.data?.data || [];
    const activeProjects = projectsList.filter((p: any) => p.status === 'active') || [];
    const overdueCount = activeProjects.filter((p: any) => p.end_date && new Date(p.end_date) < new Date()).length;
    const hoursLogged = utilisationQuery.data.summary.total_logged_hours || 0;
    const avgUtilisation = utilisationQuery.data.summary.avg_utilisation_pct || 0;

    return [
      {
        label: 'Active Projects',
        value: activeProjects.length,
        trend: activeProjects.length > 0 ? 'up' : 'flat',
        trendLabel: 'Deliveries in progress',
        sub: 'active status',
      },
      {
        label: 'Overdue Milestones',
        value: overdueCount,
        trend: overdueCount > 0 ? 'up' : 'flat',
        trendLabel: 'Past deadline date',
        sub: 'requires PM attention',
        highlight: overdueCount > 0 ? 'danger' : null,
      },
      {
        label: 'Hours Logged',
        value: `${hoursLogged.toFixed(0)}h`,
        trend: hoursLogged > 0 ? 'up' : 'flat',
        trendLabel: 'Approved timesheets',
        sub: 'aggregated this month',
      },
      {
        label: 'Team Utilisation',
        value: `${avgUtilisation.toFixed(1)}%`,
        trend: avgUtilisation >= 75 ? 'up' : 'down',
        trendLabel: 'Capacity performance',
        sub: 'avg. across team',
        highlight: avgUtilisation >= 75 ? 'success' : 'warning',
      },
    ];
  };

  // ── Deadlines List Builder ──────────────────────────────────────
  const getUpcomingDeadlines = () => {
    if (!projectsQuery.data) return [];
    const projectsList = projectsQuery.data?.data || [];
    const activeProjects = projectsList.filter((p: any) => p.status === 'active') || [];

    return activeProjects
      .filter((p: any) => p.end_date)
      .sort((a: any, b: any) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
      .slice(0, 4)
      .map((p: any) => {
        const dueDate = new Date(p.end_date);
        const isOverdue = dueDate < new Date();
        const formattedDate = dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        return {
          name: p.name,
          due: isOverdue ? 'Overdue' : formattedDate,
          overdue: isOverdue,
        };
      });
  };

  // ── Activity Feed Builder ────────────────────────────────────────
  const getRecentActivities = () => {
    if (!alertsQuery.data) return [];
    const alertsList = alertsQuery.data || [];

    const timeAgo = (dateStr: string) => {
      const diffMs = new Date().getTime() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    };

    return alertsList.slice(0, 4).map((a: any) => {
      const dotColor =
        a.type === 'danger' ? 'var(--danger)' :
        a.type === 'warning' ? 'var(--warning)' :
        a.type === 'success' ? 'var(--success)' : 'var(--info)';

      return {
        action: a.title,
        actor: a.body,
        time: timeAgo(a.created_at),
        dot: dotColor,
      };
    });
  };

  const showFinancialLoading = canViewFinancial && (thisMonthRevenueQuery.isLoading || lastMonthRevenueQuery.isLoading || expensesQuery.isLoading || profitabilityQuery.isLoading);
  const showSalesLoading = canViewSales && (pipelineQuery.isLoading || quotesQuery.isLoading);
  const showProjectsLoading = canViewProjects && (utilisationQuery.isLoading || projectsQuery.isLoading);

  const financialKpis = getFinancialKpis();
  const crmKpis = getCrmKpis();
  const projectKpis = getProjectKpis();
  const upcomingDeadlines = getUpcomingDeadlines();
  const recentActivities = getRecentActivities();

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          {greeting}, {user?.name || 'User'} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          Live insights aggregated from CRM pipeline, client collections, timesheets, and expenditures.
        </p>
      </div>

      {/* ── Row 1: Financial KPIs ── */}
      {canViewFinancial ? (
        <section style={{ marginBottom: '2rem' }}>
          <SectionHeader
            title="Financial Overview"
            subtitle={currentMonthName}
          />
          {showFinancialLoading ? (
            <div className="kpi-grid kpi-grid-6">
              {[...Array(6)].map((_, i) => <KpiSkeleton key={i} />)}
            </div>
          ) : (
            <div className="kpi-grid kpi-grid-6">
              {financialKpis.map((card) => (
                <KpiCard key={card.label} card={card} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <SectionLock title="Financial Overview" subtitle={currentMonthName} />
      )}

      {/* ── Row 2: CRM KPIs ── */}
      {canViewSales ? (
        <section style={{ marginBottom: '2rem' }}>
          <SectionHeader
            title="CRM & Sales"
            subtitle="This month"
          />
          {showSalesLoading ? (
            <div className="kpi-grid kpi-grid-4">
              {[...Array(4)].map((_, i) => <KpiSkeleton key={i} />)}
            </div>
          ) : (
            <div className="kpi-grid kpi-grid-4">
              {crmKpis.map((card) => (
                <KpiCard key={card.label} card={card} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <SectionLock title="CRM & Sales" subtitle="This month" />
      )}

      {/* ── Row 3: Project KPIs ── */}
      {canViewProjects ? (
        <section style={{ marginBottom: '2rem' }}>
          <SectionHeader
            title="Projects & Team"
            subtitle="Current sprint"
          />
          {showProjectsLoading ? (
            <div className="kpi-grid kpi-grid-4">
              {[...Array(4)].map((_, i) => <KpiSkeleton key={i} />)}
            </div>
          ) : (
            <div className="kpi-grid kpi-grid-4">
              {projectKpis.map((card) => (
                <KpiCard key={card.label} card={card} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <SectionLock title="Projects & Team" subtitle="Current sprint" />
      )}

      {/* ── Quick Summary Row ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {/* Upcoming deadlines */}
        <div className="card animate-fade-in" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Active Project Deadlines</h3>
            <span className="badge badge-warning">
              {upcomingDeadlines.filter((d: any) => d.overdue).length} overdue
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {projectsQuery.isLoading ? (
              <div className="text-xs text-slate-500 py-4 text-center">Loading deadlines...</div>
            ) : upcomingDeadlines.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center">No active project deadlines in current period.</div>
            ) : (
              upcomingDeadlines.map((item: any, index: number) => (
                <div key={index} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-elevated)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    {item.overdue
                      ? <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />
                      : <Briefcase size={14} style={{ color: 'var(--text-muted)' }} />
                    }
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{item.name}</span>
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: item.overdue ? 'var(--danger)' : 'var(--text-secondary)',
                  }}>{item.due}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card animate-fade-in" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Recent Alerts & Activity</h3>
            <Activity size={15} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {alertsQuery.isLoading ? (
              <div className="text-xs text-slate-500 py-4 text-center">Loading system events...</div>
            ) : recentActivities.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center">No recent alerts registered.</div>
            ) : (
              recentActivities.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.dot, marginTop: '0.45rem', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{item.action}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {item.actor} · {item.time}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Notice bar */}
      <div style={{
        padding: '1rem 1.25rem',
        background: 'var(--accent-subtle)',
        border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        color: '#10B981',
        fontSize: '0.875rem',
      }}>
        <ShieldCheck size={16} />
        <span>
          <strong>Dashboard Fully Operational.</strong> KPI calculations are computed on-demand from live database transactions.
        </span>
      </div>
    </div>
  );
}
