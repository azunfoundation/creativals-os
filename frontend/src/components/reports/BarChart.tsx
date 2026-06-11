'use client';

import React, { useState } from 'react';

interface BarChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  secondaryYKey?: string;
  height?: number;
  valueFormatter?: (value: number) => string;
}

export default function BarChart({
  data = [],
  xKey,
  yKey,
  secondaryYKey,
  height = 300,
  valueFormatter = (val) => String(val),
}: BarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center bg-slate-900 border border-slate-800 rounded-xl" style={{ height }}>
        <p className="text-slate-500 text-xs">No trend data available</p>
      </div>
    );
  }

  // Padding inside the SVG
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const svgWidth = 600;
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales
  const values = data.map((d) => Number(d[yKey] || 0));
  const secValues = secondaryYKey ? data.map((d) => Number(d[secondaryYKey] || 0)) : [];
  const maxVal = Math.max(...values, ...secValues, 10);
  const minVal = 0;
  const valRange = maxVal - minVal;

  const barCount = data.length;
  const rawBarWidth = chartWidth / barCount;
  const barGap = rawBarWidth * 0.25; // 25% gap
  const barWidth = rawBarWidth - barGap;

  const getCoordinates = (index: number, val: number) => {
    const x = padding.left + index * rawBarWidth + barGap / 2;
    const pct = val / valRange;
    const y = padding.top + chartHeight * (1 - pct);
    const h = chartHeight * pct;
    return { x, y, h };
  };

  // Grid lines
  const gridCount = 4;
  const gridYCoords = Array.from({ length: gridCount + 1 }, (_, i) => {
    const val = minVal + (valRange / gridCount) * i;
    const pct = val / valRange;
    const y = padding.top + chartHeight * (1 - pct);
    return { y, val };
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm relative group w-full">
      <svg viewBox={`0 0 ${svgWidth} ${height}`} className="w-full h-auto select-none">
        {/* Y Grid lines */}
        {gridYCoords.map((grid, idx) => (
          <g key={idx} className="opacity-40">
            <line
              x1={padding.left}
              y1={grid.y}
              x2={svgWidth - padding.right}
              y2={grid.y}
              className="stroke-slate-850 stroke-1 stroke-dasharray-[3,3]"
            />
            <text
              x={padding.left - 8}
              y={grid.y + 4}
              textAnchor="end"
              className="fill-slate-500 text-[10px] font-mono"
            >
              {valueFormatter(grid.val)}
            </text>
          </g>
        ))}

        {/* X Axis Line */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={svgWidth - padding.right}
          y2={height - padding.bottom}
          className="stroke-slate-800 stroke-1"
        />

        {/* Bars */}
        {data.map((d, idx) => {
          const val = Number(d[yKey] || 0);
          const { x, y, h } = getCoordinates(idx, val);

          // Double bars if secondary key exists
          if (secondaryYKey) {
            const secVal = Number(d[secondaryYKey] || 0);
            const coordSec = getCoordinates(idx, secVal);
            const halfWidth = barWidth / 2;

            return (
              <g key={idx}>
                {/* Bar 1 */}
                <rect
                  x={x}
                  y={y}
                  width={halfWidth}
                  height={Math.max(h, 2)}
                  rx="1.5"
                  className="fill-emerald-500 hover:fill-emerald-400 transition-colors duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
                {/* Bar 2 */}
                <rect
                  x={x + halfWidth + 1}
                  y={coordSec.y}
                  width={halfWidth}
                  height={Math.max(coordSec.h, 2)}
                  rx="1.5"
                  className="fill-sky-500 hover:fill-sky-400 transition-colors duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
                {/* X Axis Label */}
                <text
                  x={x + halfWidth}
                  y={height - padding.bottom + 16}
                  textAnchor="middle"
                  className="fill-slate-500 text-[9px] font-medium"
                >
                  {d[xKey]}
                </text>
              </g>
            );
          }

          // Single bar
          return (
            <g key={idx}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(h, 2)}
                rx="3"
                className="fill-emerald-500 hover:fill-emerald-400 transition-colors duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
              <text
                x={x + barWidth / 2}
                y={height - padding.bottom + 16}
                textAnchor="middle"
                className="fill-slate-500 text-[9px] font-medium"
              >
                {d[xKey]}
              </text>
            </g>
          );
        })}

        {/* Hover values tooltip */}
        {hoveredIdx !== null && (
          <g>
            <rect
              x={padding.left + hoveredIdx * rawBarWidth}
              y={padding.top}
              width={rawBarWidth}
              height={chartHeight}
              className="fill-slate-800/10 stroke-slate-800/50 stroke-1"
              pointerEvents="none"
            />
          </g>
        )}
      </svg>

      {/* HTML absolute tooltip overlay */}
      {hoveredIdx !== null && (
        <div
          className="absolute bg-slate-950/95 border border-slate-800 rounded-lg p-2.5 shadow-xl pointer-events-none text-xs text-slate-300 font-medium z-10"
          style={{
            left: `${padding.left + hoveredIdx * rawBarWidth + rawBarWidth / 2}px`,
            top: '20px',
            transform: 'translateX(-50%)',
          }}
        >
          <p className="text-slate-500 text-[10px] mb-1">{data[hoveredIdx][xKey]}</p>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 justify-between">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500 inline-block" /> Primary:</span>
              <span className="font-mono text-emerald-400">{valueFormatter(data[hoveredIdx][yKey])}</span>
            </div>
            {secondaryYKey && (
              <div className="flex items-center gap-1.5 justify-between">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-sky-500 inline-block" /> Secondary:</span>
                <span className="font-mono text-sky-400">{valueFormatter(data[hoveredIdx][secondaryYKey])}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
