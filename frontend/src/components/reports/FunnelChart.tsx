import React from 'react';

interface FunnelStage {
  stage: string;
  count: number;
}

interface FunnelChartProps {
  data: FunnelStage[];
}

export default function FunnelChart({ data = [] }: FunnelChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[200px] flex items-center justify-center bg-slate-900 border border-slate-800 rounded-xl">
        <p className="text-slate-500 text-xs">No funnel data available</p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 w-full">
      <div className="flex justify-between items-center border-b border-slate-800/60 pb-2.5">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conversion Funnel</span>
        <span className="text-[10px] font-medium text-slate-500">Based on count</span>
      </div>

      <div className="space-y-3.5">
        {data.map((row, idx) => {
          const percentage = Math.round((row.count / maxVal) * 100);
          
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">{row.stage}</span>
                <span className="font-mono font-semibold text-slate-400">
                  {row.count} <span className="text-slate-500 font-normal text-[10px]">({percentage}%)</span>
                </span>
              </div>
              <div className="h-4 bg-slate-950/65 rounded overflow-hidden flex items-center border border-slate-850/30">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500/80 rounded transition-all duration-1000 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
