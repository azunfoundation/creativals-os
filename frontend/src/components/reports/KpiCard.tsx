import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
}

export default function KpiCard({ title, value, subtext, icon, trend }: KpiCardProps) {
  const isPositive = trend ? trend.value >= 0 : true;

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm hover:border-slate-700 transition duration-300 relative overflow-hidden group">
      {/* Light gradient highlight on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-slate-800/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none" />

      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-slate-100 font-mono tracking-tight">{value}</h3>
        </div>
        {icon && (
          <div className="p-2.5 bg-slate-950/40 border border-slate-800/50 rounded-lg text-emerald-500 group-hover:text-emerald-400 group-hover:scale-105 transition duration-300">
            {icon}
          </div>
        )}
      </div>

      {(trend || subtext) && (
        <div className="mt-4 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={`flex items-center gap-0.5 font-semibold px-1.5 py-0.5 rounded ${
                isPositive
                  ? 'text-emerald-400 bg-emerald-950/30 border border-emerald-900/30'
                  : 'text-rose-400 bg-rose-950/30 border border-rose-900/30'
              }`}
            >
              {isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {Math.abs(trend.value)}%
            </span>
          )}
          {subtext && <span className="text-slate-500">{subtext}</span>}
        </div>
      )}
    </div>
  );
}
