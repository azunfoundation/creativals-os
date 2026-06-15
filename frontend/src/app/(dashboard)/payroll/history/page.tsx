'use client';

import { useToast } from '@/hooks/useToast';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { payroll as payrollApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function MyPayslipsPage() {
  const { showToast } = useToast();
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['payroll-history'],
    queryFn: async () => {
      try {
        const res = await payrollApi.myHistory();
        return res.data;
      } catch {
        return { data: [] };
      }
    },
  });

  const handleDownload = async (itemId: number) => {
    try {
      const response = await payrollApi.downloadPayslip(itemId);
      const url = window.URL.createObjectURL(new Blob([response.data as any]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip-${itemId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download payslip', err);
      showToast('Failed to download payslip', 'info');
    }
  };

  const items = historyData?.data || [];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)' }}>My Payslips</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          View and download your historical payslips.
        </p>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No payslips found.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date / Period</th>
                <th>Base Salary</th>
                <th>Bonuses</th>
                <th>Deductions</th>
                <th>Net Salary</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id}>
                  <td>{item.created_at ? formatDate(item.created_at) : 'N/A'}</td>
                  <td>{item.base_salary}</td>
                  <td>{item.bonus_amount}</td>
                  <td>{item.deductions}</td>
                  <td style={{ fontWeight: 600 }}>{item.net_salary}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDownload(item.id)}
                    >
                      <Download size={14} style={{ marginRight: '0.25rem' }} /> Download Payslip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
