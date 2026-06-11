'use client';

import React from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import {
  TrendingUp,
  GitMerge,
  FileSpreadsheet,
  DollarSign,
  TrendingDown,
  Activity,
  CreditCard,
  Building2,
  Lock,
  ChevronRight,
} from 'lucide-react';

interface ReportCard {
  title: string;
  description: string;
  href: string;
  icon: any;
  color: string;
  permissionCheck: (user: any) => boolean;
}

export default function ReportsHub() {
  const { user } = useAuthStore();

  const check = (permissions: string[], roles: string[] = []) => {
    if (!user) return false;
    // Founder and Director bypass all checks
    if (user.roles.some((r: any) => {
      const name = typeof r === 'string' ? r : r?.name || '';
      return name === 'founder' || name === 'director';
    })) {
      return true;
    }
    // Check specific roles
    if (roles.length > 0 && user.roles.some((r: any) => {
      const name = typeof r === 'string' ? r : r?.name || '';
      return roles.includes(name);
    })) {
      return true;
    }
    // Check permissions
    return user.permissions.some((p: string) => permissions.includes(p));
  };

  const REPORT_CARDS: ReportCard[] = [
    {
      title: 'Revenue Summary',
      description: 'Monthly invoicing trend, collection rate, and outstanding client balance breakdowns.',
      href: '/reports/revenue',
      icon: TrendingUp,
      color: 'text-emerald-500 bg-emerald-950/20 border-emerald-900/30',
      permissionCheck: (u) => check(['reports.view_financial']),
    },
    {
      title: 'Sales Pipeline',
      description: 'Conversion rates, average acquisition costs, budget estimations, and deal temperatures.',
      href: '/reports/pipeline',
      icon: GitMerge,
      color: 'text-sky-500 bg-sky-950/20 border-sky-900/30',
      permissionCheck: (u) => check(['reports.view_sales']),
    },
    {
      title: 'Quote Conversion',
      description: 'Quote funnel stats, win/loss conversion ratios, and top quoted services analysis.',
      href: '/reports/quotes',
      icon: FileSpreadsheet,
      color: 'text-violet-500 bg-violet-950/20 border-violet-900/30',
      permissionCheck: (u) => check(['reports.view_sales', 'reports.view_financial']),
    },
    {
      title: 'Project Profitability',
      description: 'Per-project revenue vs actual labor cost (timesheet aggregate) vs direct project expenses.',
      href: '/reports/profitability',
      icon: DollarSign,
      color: 'text-amber-500 bg-amber-950/20 border-amber-900/30',
      permissionCheck: (u) => check(['reports.view_financial'], ['project_manager']),
    },
    {
      title: 'Team Utilisation',
      description: 'Timesheets analysis comparing actual logged hours against target/billable expected hours.',
      href: '/reports/utilisation',
      icon: Activity,
      color: 'text-teal-500 bg-teal-950/20 border-teal-900/30',
      permissionCheck: (u) => check(['reports.view_hr'], ['project_manager']),
    },
    {
      title: 'Expense Breakdown',
      description: 'Operational overhead categorized by billing type, category, vendor, and project allocations.',
      href: '/reports/expenses',
      icon: CreditCard,
      color: 'text-rose-500 bg-rose-950/20 border-rose-900/30',
      permissionCheck: (u) => check(['reports.view_financial']),
    },
    {
      title: 'Payroll Summary',
      description: 'Gross-to-net payouts, bonus aggregates, deductions, and monthly payroll history.',
      href: '/reports/payroll',
      icon: TrendingDown,
      color: 'text-indigo-500 bg-indigo-950/20 border-indigo-900/30',
      permissionCheck: (u) => check(['reports.view_hr', 'reports.view_financial']),
    },
    {
      title: 'Client 360 Summary',
      description: 'Aggregate invoiced amounts, lifetime values, active projects count, and payment history per client.',
      href: '/reports/clients',
      icon: Building2,
      color: 'text-purple-500 bg-purple-950/20 border-purple-900/30',
      permissionCheck: (u) => check(['reports.view_sales', 'reports.view_financial']),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-100">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Reports & Analytics Hub</h1>
        <p className="text-slate-400 text-sm">
          Access role-restricted intelligence modules, trend metrics, and spreadsheet exports.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {REPORT_CARDS.map((card, idx) => {
          const isAllowed = card.permissionCheck(user);

          if (!isAllowed) {
            return (
              <div
                key={idx}
                className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 shadow-sm relative overflow-hidden opacity-50 select-none cursor-not-allowed"
              >
                <div className="flex justify-between items-start">
                  <div className={`p-2.5 rounded-lg bg-slate-950 text-slate-600 border border-slate-900`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                  <Lock className="w-4 h-4 text-slate-600" />
                </div>
                <h3 className="text-base font-bold text-slate-500 mt-4">{card.title}</h3>
                <p className="text-slate-650 text-xs mt-1.5 leading-relaxed">{card.description}</p>
              </div>
            );
          }

          return (
            <Link
              key={idx}
              href={card.href}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition duration-300 relative overflow-hidden group cursor-pointer flex flex-col justify-between"
            >
              {/* Glow highlight on hover */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-slate-850/10 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none" />

              <div>
                <div className="flex justify-between items-start">
                  <div className={`p-2.5 rounded-lg border ${card.color}`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition duration-300" />
                </div>
                <h3 className="text-base font-bold text-slate-100 mt-4 group-hover:text-white transition duration-200">
                  {card.title}
                </h3>
                <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">{card.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
