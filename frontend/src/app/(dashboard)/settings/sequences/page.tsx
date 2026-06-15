'use client';

import { useState, useEffect } from 'react'; 
import { SkeletonTable } from '@/components/ui/Skeleton'; 
import { EmptyState } from '@/components/ui/EmptyState';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sliders, Save, Loader2, AlertCircle, HelpCircle, Eye } from 'lucide-react';
import { platformSettings as settingsApi, SystemSettings, NumberSequence } from '@/lib/api';

const MOCK_SEQUENCES: NumberSequence[] = [
  { id: 1, entity_type: 'lead', prefix: 'LEA', current_number: 14, padding_length: 4, format: '{PREFIX}-{YEAR}-{NUMBER}' },
  { id: 2, entity_type: 'quote', prefix: 'QUO', current_number: 28, padding_length: 4, format: '{PREFIX}-{YEAR}-{NUMBER}' },
  { id: 3, entity_type: 'invoice', prefix: 'INV', current_number: 42, padding_length: 5, format: '{PREFIX}-{YEAR}-{NUMBER}' },
  { id: 4, entity_type: 'project', prefix: 'PRJ', current_number: 10, padding_length: 4, format: '{PREFIX}-{YEAR}-{NUMBER}' },
  { id: 5, entity_type: 'task', prefix: 'TSK', current_number: 215, padding_length: 6, format: '{PREFIX}-{NUMBER}' },
  { id: 6, entity_type: 'payroll', prefix: 'PAY', current_number: 6, padding_length: 3, format: '{PREFIX}-{YEAR}-{NUMBER}' },
];

export default function NumberSequencesPage() {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sequences, setSequences] = useState<NumberSequence[]>([]);

  // Fetch Settings
  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      try {
        const res = await settingsApi.get();
        return res.data;
      } catch {
        return { company: {} as any, tax: {} as any, currencies: [], number_sequences: MOCK_SEQUENCES };
      }
    },
  });

  // Sync state
  useEffect(() => {
    if (settings && settings.number_sequences) {
      // Create copies so we can edit local states
      setSequences(JSON.parse(JSON.stringify(settings.number_sequences)));
    }
  }, [settings]);

  // Mutation
  const updateSequencesMutation = useMutation({
    mutationFn: (data: NumberSequence[]) => settingsApi.updateNumberSequences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
      triggerAlert('All number sequences updated successfully.');
    },
    onError: (err: any) => {
      triggerError(err.response?.data?.message || 'Failed to update sequences.');
    }
  });

  const triggerAlert = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const handleFieldChange = (index: number, field: keyof NumberSequence, value: any) => {
    setSequences(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSequencesMutation.mutate(sequences);
  };

  // Live preview logic
  const getPreview = (seq: NumberSequence) => {
    const year = new Date().getFullYear().toString();
    const nextNumber = seq.current_number + 1;
    const paddedNum = nextNumber.toString().padStart(seq.padding_length, '0');
    return seq.format
      .replace('{PREFIX}', seq.prefix || '')
      .replace('{YEAR}', year)
      .replace('{NUMBER}', paddedNum);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent)' }} />
        <span style={{ color: 'var(--text-muted)' }}>Loading sequence patterns...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Notifications */}
      {successMsg && (
        <div style={{
          padding: '0.875rem 1.25rem',
          background: 'var(--success-subtle)',
          color: 'var(--success)',
          border: '1px solid var(--success)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.875rem',
          fontWeight: 500,
        }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{
          padding: '0.875rem 1.25rem',
          background: 'var(--danger-subtle)',
          color: 'var(--danger)',
          border: '1px solid var(--danger)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.875rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sliders size={18} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Number Sequences Management</h2>
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Configure unique prefix tags, numbering pads, and formatting structures for system modules.
          Use <code style={{ padding: '1px 6px', borderRadius: '4px', background: 'var(--surface-elevated)', color: 'var(--accent)', fontFamily: 'monospace', fontSize: '0.75rem', border: '1px solid var(--border)' }}>&#123;PREFIX&#125;</code>, <code style={{ padding: '1px 6px', borderRadius: '4px', background: 'var(--surface-elevated)', color: 'var(--accent)', fontFamily: 'monospace', fontSize: '0.75rem', border: '1px solid var(--border)' }}>&#123;YEAR&#125;</code>, and <code style={{ padding: '1px 6px', borderRadius: '4px', background: 'var(--surface-elevated)', color: 'var(--accent)', fontFamily: 'monospace', fontSize: '0.75rem', border: '1px solid var(--border)' }}>&#123;NUMBER&#125;</code> in format keys.
        </p>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ textTransform: 'capitalize' }}>Module Entity</th>
                <th>Prefix</th>
                <th>Next Number</th>
                <th>Padding Length</th>
                <th>Format Pattern</th>
                <th>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Eye size={12} /> Next Auto-Generated Code
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sequences.map((seq, idx) => (
                <tr key={seq.id}>
                  {/* Entity Type Label */}
                  <td style={{ fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                    {seq.entity_type}
                  </td>

                  {/* Prefix */}
                  <td>
                    <input
                      required
                      type="text"
                      value={seq.prefix}
                      onChange={(e) => handleFieldChange(idx, 'prefix', e.target.value.toUpperCase())}
                      className="form-input"
                      style={{ width: '80px', fontFamily: 'monospace', textTransform: 'uppercase' }}
                    />
                  </td>

                  {/* Current Number */}
                  <td>
                    <input
                      required
                      type="number"
                      min="0"
                      value={seq.current_number}
                      onChange={(e) => handleFieldChange(idx, 'current_number', parseInt(e.target.value, 10) || 0)}
                      className="form-input"
                      style={{ width: '100px' }}
                      title="Next generated number will be this value + 1"
                    />
                  </td>

                  {/* Padding Length */}
                  <td>
                    <select
                      value={seq.padding_length}
                      onChange={(e) => handleFieldChange(idx, 'padding_length', parseInt(e.target.value, 10))}
                      className="form-input"
                      style={{ width: '80px' }}
                    >
                      <option value={3}>3 digits (001)</option>
                      <option value={4}>4 digits (0001)</option>
                      <option value={5}>5 digits (00001)</option>
                      <option value={6}>6 digits (000001)</option>
                    </select>
                  </td>

                  {/* Format Pattern */}
                  <td>
                    <input
                      required
                      type="text"
                      value={seq.format}
                      onChange={(e) => handleFieldChange(idx, 'format', e.target.value)}
                      className="form-input"
                      style={{ width: '220px', fontFamily: 'monospace' }}
                    />
                  </td>

                  {/* Realtime Generated Code Preview */}
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: 'var(--accent-subtle)',
                      border: '1px solid var(--accent)',
                      color: 'var(--accent)',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '0.8125rem'
                    }}>
                      {getPreview(seq)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <button
            type="submit"
            disabled={updateSequencesMutation.isPending}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {updateSequencesMutation.isPending ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Save size={14} />
            )}
            <span>Save Number Sequences</span>
          </button>
        </div>

      </form>

    </div>
  );
}
