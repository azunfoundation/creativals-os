'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

export default function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [preset, setPreset] = useState<string>('This FY');

  // Helper to format Date objects as YYYY-MM-DD local dates
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getPresets = () => {
    const now = new Date();
    const year = now.getFullYear();

    // 1. This Month
    const thisMonthStart = new Date(year, now.getMonth(), 1);
    const thisMonthEnd = new Date(year, now.getMonth() + 1, 0);

    // 2. This Quarter
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const thisQuarterStart = new Date(year, currentQuarter * 3, 1);
    const thisQuarterEnd = new Date(year, (currentQuarter + 1) * 3, 0);

    // 3. Indian Financial Year (Apr 1 -> Mar 31)
    let fyStartYear = year;
    if (now.getMonth() < 3) {
      fyStartYear = year - 1;
    }
    const thisFyStart = new Date(fyStartYear, 3, 1);
    const thisFyEnd = new Date(fyStartYear + 1, 2, 31);

    // 4. Last Financial Year
    const lastFyStart = new Date(fyStartYear - 1, 3, 1);
    const lastFyEnd = new Date(fyStartYear, 2, 31);

    return {
      'This Month': { from: formatDateString(thisMonthStart), to: formatDateString(thisMonthEnd) },
      'This Quarter': { from: formatDateString(thisQuarterStart), to: formatDateString(thisQuarterEnd) },
      'This FY': { from: formatDateString(thisFyStart), to: formatDateString(thisFyEnd) },
      'Last FY': { from: formatDateString(lastFyStart), to: formatDateString(lastFyEnd) },
    };
  };

  const presets = getPresets();

  const handlePresetSelect = (name: string) => {
    setPreset(name);
    if (name !== 'Custom') {
      const selected = presets[name as keyof typeof presets];
      onChange(selected.from, selected.to);
    }
    setIsOpen(false);
  };

  const handleCustomDateChange = (type: 'from' | 'to', value: string) => {
    setPreset('Custom');
    if (type === 'from') {
      onChange(value, to);
    } else {
      onChange(from, value);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 shadow-sm">
      <Calendar className="w-4 h-4 text-emerald-500" />
      
      {/* Preset Selector */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 font-semibold text-slate-100 hover:text-white cursor-pointer"
        >
          <span>{preset}</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-2 w-40 bg-slate-950 border border-slate-850 rounded-lg shadow-xl z-50 py-1">
            {Object.keys(presets).map((name) => (
              <button
                key={name}
                onClick={() => handlePresetSelect(name)}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-900 text-slate-300 hover:text-white text-xs cursor-pointer"
              >
                {name}
              </button>
            ))}
            <button
              onClick={() => handlePresetSelect('Custom')}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-900 text-slate-300 hover:text-white text-xs cursor-pointer border-t border-slate-900"
            >
              Custom Range
            </button>
          </div>
        )}
      </div>

      <span className="text-slate-600">|</span>

      {/* Date Inputs */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={from}
          onChange={(e) => handleCustomDateChange('from', e.target.value)}
          className="bg-transparent border-0 text-slate-300 focus:ring-0 text-xs w-28 cursor-pointer p-0"
        />
        <span className="text-slate-500 text-xs">to</span>
        <input
          type="date"
          value={to}
          onChange={(e) => handleCustomDateChange('to', e.target.value)}
          className="bg-transparent border-0 text-slate-300 focus:ring-0 text-xs w-28 cursor-pointer p-0"
        />
      </div>
    </div>
  );
}
