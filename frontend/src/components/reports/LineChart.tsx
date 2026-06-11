'use client';

import React, { useState } from 'react';

interface LineChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  secondaryYKey?: string;
  height?: number;
  valueFormatter?: (value: number) => string;
}

export default function LineChart({
  data = [],
  xKey,
  yKey,
  secondaryYKey,
  height = 300,
  valueFormatter = (val) => String(val),
}: LineChartProps) {
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

  const pointsCount = data.length;
  const xStep = chartWidth / (pointsCount - 1 || 1);

  const getCoordinates = (index: number, val: number) => {
    const x = padding.left + index * xStep;
    const pct = val / valRange;
    const y = padding.top + chartHeight * (1 - pct);
    return { x, y };
  };

  // Generate paths
  const linePoints = data.map((d, i) => getCoordinates(i, Number(d[yKey] || 0)));
  const linePath = linePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Area path
  const areaPath = linePoints.length > 0
    ? `${linePath} L ${linePoints[linePoints.length - 1].x} ${height - padding.bottom} L ${linePoints[0].x} ${height - padding.bottom} Z`
    : '';

  // Secondary line and area
  let secLinePath = '';
  let secAreaPath = '';
  let secLinePoints: any[] = [];
  if (secondaryYKey) {
    secLinePoints = data.map((d, i) => getCoordinates(i, Number(d[secondaryYKey] || 0)));
    secLinePath = secLinePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    secAreaPath = secLinePoints.length > 0
      ? `${secLinePath} L ${secLinePoints[secLinePoints.length - 1].x} ${height - padding.bottom} L ${secLinePoints[0].x} ${height - padding.bottom} Z`
      : '';
  }

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
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="secAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0" />
          </linearGradient>
        </defs>

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

        {/* Areas */}
        {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}
        {secAreaPath && <path d={secAreaPath} fill="url(#secAreaGrad)" />}

        {/* X Axis labels */}
        {data.map((d, idx) => {
          const x = padding.left + idx * xStep;
          // Only show labels every few ticks if there are many labels
          const showLabel = data.length <= 12 || idx % Math.ceil(data.length / 12) === 0;

          return (
            showLabel && (
              <text
                key={idx}
                x={x}
                y={height - padding.bottom + 16}
                textAnchor="middle"
                className="fill-slate-500 text-[9px] font-medium"
              >
                {d[xKey]}
              </text>
            )
          );
        })}

        {/* Lines */}
        {linePath && (
          <path d={linePath} fill="none" className="stroke-emerald-500 stroke-[2] stroke-linejoin-round" />
        )}
        {secLinePath && (
          <path d={secLinePath} fill="none" className="stroke-sky-500 stroke-[2] stroke-linejoin-round" />
        )}

        {/* Invisible vertical slices for hover detection */}
        {data.map((_, idx) => {
          const x = padding.left + idx * xStep;
          return (
            <rect
              key={idx}
              x={x - xStep / 2}
              y={padding.top}
              width={xStep}
              height={chartHeight}
              className="fill-transparent cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          );
        })}

        {/* Hover elements */}
        {hoveredIdx !== null && (
          <g>
            <line
              x1={padding.left + hoveredIdx * xStep}
              y1={padding.top}
              x2={padding.left + hoveredIdx * xStep}
              y2={height - padding.bottom}
              className="stroke-slate-800 stroke-[1.5] stroke-dasharray-[2,2]"
              pointerEvents="none"
            />
            {/* Primary value circle */}
            <circle
              cx={linePoints[hoveredIdx].x}
              cy={linePoints[hoveredIdx].y}
              r="4.5"
              className="fill-slate-950 stroke-emerald-500 stroke-2"
              pointerEvents="none"
            />
            {/* Secondary value circle */}
            {secondaryYKey && (
              <circle
                cx={secLinePoints[hoveredIdx].x}
                cy={secLinePoints[hoveredIdx].y}
                r="4.5"
                className="fill-slate-950 stroke-sky-500 stroke-2"
                pointerEvents="none"
              />
            )}
          </g>
        )}
      </svg>

      {/* HTML tooltip overlay */}
      {hoveredIdx !== null && (
        <div
          className="absolute bg-slate-950/95 border border-slate-800 rounded-lg p-2.5 shadow-xl pointer-events-none text-xs text-slate-300 font-medium z-10"
          style={{
            left: `${padding.left + hoveredIdx * xStep}px`,
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
