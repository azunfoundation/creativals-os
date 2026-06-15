'use client';

import { useToast } from '@/hooks/useToast';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Download, FileText } from 'lucide-react';
import { payroll as payrollApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function PayrollRunDetailsPage() {
  const { showToast } = useToast();
  const params = useParams();
  const runId = Number(params?.id);

  const { data: runResponse, isLoading } = useQuery({
    queryKey: ['payroll-run', runId],
    queryFn: () => payrollApi.getRunDetails(runId),
    enabled: !!runId,
  });

  const run = runResponse?.data;

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const response = await payrollApi.exportRun(runId, format);
      const url = window.URL.createObjectURL(new Blob([response.data as any]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll-run-${runId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(`Failed to export ${format}`, err);
      showToast(`Failed to export ${format}`, 'info');
    }
  };

  if (isLoading) return <div style={{ padding: '2rem' }}>Loading...</div>;
  if (!run) return <div style={{ padding: '2rem' }}>Run not found</div>;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Payroll Run #{run.id}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Period: {run.month}/{run.year} | Status: <span style={{ textTransform: 'capitalize' }}>{run.status}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => handleExport('csv')}>
            <Download size={16} style={{ marginRight: '0.25rem' }} /> Export (CSV)
          </button>
          <button className="btn btn-secondary" onClick={() => handleExport('pdf')}>
            <FileText size={16} style={{ marginRight: '0.25rem' }} /> Export (PDF)
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Base Salary</th>
              <th>Bonus</th>
              <th>Deductions</th>
              <th>Net Pay</th>
            </tr>
          </thead>
          <tbody>
            {(run.items || []).map((item) => {
              const { tds = 0, pf = 0, esi = 0 } = item.breakdown?.deductions?.reduce((acc: any, d: any) => {
                if (d.description.toLowerCase().includes('tds')) acc.tds += d.amount;
                if (d.description.toLowerCase().includes('pf')) acc.pf += d.amount;
                if (d.description.toLowerCase().includes('esi')) acc.esi += d.amount;
                return acc;
              }, { tds: 0, pf: 0, esi: 0 }) || {};

              return (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.user?.name || `User #${item.user_id}`}</div>
                  </td>
                  <td>{formatCurrency(item.base_salary)}</td>
                  <td>{formatCurrency(item.bonus_amount)}</td>
                  <td>
                    <div style={{ color: 'var(--danger)' }}>
                      -{formatCurrency(item.deductions)}
                      {(tds > 0 || pf > 0 || esi > 0) && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {tds > 0 && `TDS: ${tds} `}
                          {pf > 0 && `PF: ${pf} `}
                          {esi > 0 && `ESI: ${esi}`}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(item.net_salary)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
