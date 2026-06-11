'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2, AlertCircle } from 'lucide-react';
import DateRangePicker from './DateRangePicker';

interface ReportShellProps {
  title: string;
  description?: string;
  from: string;
  to: string;
  onDateChange: (from: string, to: string) => void;
  onExport?: () => void;
  isLoading?: boolean;
  error?: string | null;
  children: React.ReactNode;
}

export default function ReportShell({
  title,
  description,
  from,
  to,
  onDateChange,
  onExport,
  isLoading = false,
  error = null,
  children,
}: ReportShellProps) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-100">
      {/* Back button & Title bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/reports"
            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Report Hub
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">{title}</h1>
          {description && <p className="text-slate-400 text-sm">{description}</p>}
        </div>

        {/* Date Filter & Export Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker from={from} to={to} onChange={onDateChange} />
          
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-3.5 py-2 rounded-lg text-sm font-semibold shadow-sm transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-500" /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-slate-500 text-sm">Aggregating report metrics...</p>
        </div>
      ) : error ? (
        <div className="min-h-[300px] bg-rose-950/20 border border-rose-900/35 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3">
          <AlertCircle className="w-10 h-10 text-rose-500" />
          <h3 className="text-slate-200 font-bold">Failed to load report</h3>
          <p className="text-slate-500 text-sm max-w-md">{error}</p>
        </div>
      ) : (
        <div className="space-y-6 transition duration-300 ease-in-out">
          {children}
        </div>
      )}
    </div>
  );
}
