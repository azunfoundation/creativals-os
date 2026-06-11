'use client';

import React, { useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (val: any, row: any) => React.ReactNode;
}

interface ReportTableProps {
  columns: Column[];
  data: any[];
  pageSize?: number;
}

export default function ReportTable({ columns, data = [], pageSize = 10 }: ReportTableProps) {
  const [sortKey, setSortKey] = useState<string>('');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
    setCurrentPage(1);
  };

  // 1. Sort data
  const sortedData = [...data];
  if (sortKey) {
    sortedData.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === undefined || valB === undefined) return 0;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }

  // 2. Paginate data
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col w-full">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`px-4 py-3.5 select-none ${col.sortable !== false ? 'cursor-pointer hover:bg-slate-900/60 hover:text-white' : ''} ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                    <span>{col.label}</span>
                    {col.sortable !== false && <ArrowUpDown className="w-3 h-3 opacity-60" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850/40 text-slate-300">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500 font-medium">
                  No records found
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-950/25 transition duration-150">
                  {columns.map((col) => {
                    const value = row[col.key];
                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-3 font-medium ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {col.render ? col.render(value, row) : value !== null && value !== undefined ? String(value) : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="bg-slate-950/20 border-t border-slate-800/80 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-300">{startIndex + 1}</span> to{' '}
            <span className="font-semibold text-slate-300">{Math.min(startIndex + pageSize, totalItems)}</span> of{' '}
            <span className="font-semibold text-slate-300">{totalItems}</span> rows
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page <span className="font-semibold text-slate-300">{currentPage}</span> of{' '}
              <span className="font-semibold text-slate-300">{totalPages}</span>
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
