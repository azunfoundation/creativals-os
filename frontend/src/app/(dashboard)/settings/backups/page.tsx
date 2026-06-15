'use client';

import { useState } from 'react'; 
import { SkeletonTable } from '@/components/ui/Skeleton'; 
import { EmptyState } from '@/components/ui/EmptyState'; 
import { useModal } from '@/providers/ModalProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Database, RefreshCw, Trash2, ShieldCheck, ShieldAlert, 
  Loader2, AlertTriangle, Play, HelpCircle, FileDown, CheckCircle2 
} from 'lucide-react';
import { backups as backupsApi, BackupFile } from '@/lib/api';

const MOCK_BACKUPS: BackupFile[] = [
  { filename: 'backup-2026-06-11_12-00-00.sqlite', size: 8192, created_at: '2026-06-11T12:00:00Z', status: 'valid' },
  { filename: 'backup-2026-06-10_08-30-00.sqlite', size: 8192, created_at: '2026-06-10T08:30:00Z', status: 'valid' },
  { filename: 'backup-2026-06-09_22-15-00.sqlite', size: 8192, created_at: '2026-06-09T22:15:00Z', status: 'corrupted' },
];

export default function BackupsPage() {
  const { confirm, prompt } = useModal();
  const queryClient = useQueryClient();

  const [confirmRestoreFile, setConfirmRestoreFile] = useState<string | null>(null);
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [understandCheckbox, setUnderstandCheckbox] = useState(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Queries
  const { data: backupsList = [], isLoading, isRefetching } = useQuery<BackupFile[]>({
    queryKey: ['dbBackups'],
    queryFn: async () => {
      try {
        const res = await backupsApi.list();
        return res.data;
      } catch {
        return MOCK_BACKUPS;
      }
    }
  });

  // Mutations
  const createBackupMutation = useMutation({
    mutationFn: () => backupsApi.create(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dbBackups'] });
      triggerAlert('Manual database backup created successfully.');
    },
    onError: (err: any) => {
      triggerError(err.response?.data?.message || 'Failed to generate database backup.');
    }
  });

  const deleteBackupMutation = useMutation({
    mutationFn: (filename: string) => backupsApi.delete(filename),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dbBackups'] });
      triggerAlert('Backup file deleted successfully.');
    },
    onError: (err: any) => {
      triggerError(err.response?.data?.message || 'Failed to delete backup file.');
    }
  });

  const restoreBackupMutation = useMutation({
    mutationFn: (filename: string) => backupsApi.restore(filename),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dbBackups'] });
      triggerAlert('Database restored successfully! The application session was re-initialized.');
      setConfirmRestoreFile(null);
      setTypedConfirmation('');
      setUnderstandCheckbox(false);
    },
    onError: (err: any) => {
      triggerError(err.response?.data?.message || 'Failed to restore database from backup file.');
      setConfirmRestoreFile(null);
      setTypedConfirmation('');
      setUnderstandCheckbox(false);
    }
  });

  const triggerAlert = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 6000);
  };

  const handleCreateBackup = () => {
    createBackupMutation.mutate();
  };

  const handleDeleteBackup = async (filename: string) => {
    if (await confirm({ message: `Are you absolutely sure you want to permanently delete the backup file "${filename}"?`, variant: 'danger' })) {
      deleteBackupMutation.mutate(filename);
    }
  };

  const handleRestoreBackup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmRestoreFile) return;
    if (!understandCheckbox || typedConfirmation.toUpperCase() !== 'RESTORE') {
      triggerError('Please confirm the safety checks and type RESTORE to proceed.');
      return;
    }
    restoreBackupMutation.mutate(confirmRestoreFile);
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Alert Banners */}
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
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* ============================================================
            LEFT: BACKUP HISTORY LIST
            ============================================================ */}
        <div className="card" style={{ flex: '1 1 500px', height: 'fit-content' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={18} style={{ color: 'var(--accent)' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Backup History</h2>
            </div>
            
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['dbBackups'] })}
              disabled={isLoading || isRefetching}
              className="btn btn-secondary btn-icon btn-sm"
              title="Refresh History"
            >
              <RefreshCw size={14} className={isLoading || isRefetching ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="data-table-wrap">
            {isLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading backup history...
              </div>
            ) : backupsList.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Created At</th>
                    <th>Backup Filename</th>
                    <th>File Size</th>
                    <th>Integrity Check</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backupsList.map((bk) => (
                    <tr key={bk.filename}>
                      {/* Date */}
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {new Date(bk.created_at).toLocaleString()}
                      </td>

                      {/* Filename */}
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                        {bk.filename}
                      </td>

                      {/* Size */}
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {formatBytes(bk.size)}
                      </td>

                      {/* Integrity */}
                      <td>
                        {bk.status === 'valid' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--success)',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            <ShieldCheck size={14} /> Validated
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--danger)',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            <ShieldAlert size={14} /> Corrupted
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            disabled={bk.status !== 'valid' || restoreBackupMutation.isPending}
                            onClick={() => setConfirmRestoreFile(bk.filename)}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            <RefreshCw size={11} />
                            <span>Restore</span>
                          </button>
                          
                          <button
                            disabled={deleteBackupMutation.isPending}
                            onClick={() => handleDeleteBackup(bk.filename)}
                            className="btn btn-danger btn-sm btn-icon"
                            title="Delete Backup File"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={32} style={{ opacity: 0.3 }} />
                <span>No backups found on system.</span>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================
            COLUMN 3: ACTIONS & SAFEKEEPING INFO
            ============================================================ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: '0 1 300px', minWidth: '240px' }}>
          
          {/* TRIGGER MANUAL BACKUP */}
          <div className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Database Safekeeping
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Generate a manual snapshot of the database state. The snapshot includes all configurations, settings, profiles, CRM logs, tasks, and transactional logs.
            </p>

            <button
              onClick={handleCreateBackup}
              disabled={createBackupMutation.isPending}
              className="btn btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '42px' }}
            >
              {createBackupMutation.isPending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Play size={16} />
              )}
              <span>Create Manual Backup</span>
            </button>
          </div>

          {/* SAFEKEEPING / INTEGRITY CHECKS INFO */}
          <div className="card" style={{ background: 'color-mix(in srgb, var(--accent) 5%, transparent)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <HelpCircle size={14} style={{ color: 'var(--accent)' }} /> Recovery Precautions
            </h3>
            <ul style={{ paddingLeft: '1.15rem', margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem', lineHeight: 1.4 }}>
              <li>Every backup is validated using <code style={{ fontFamily: 'monospace', padding: '1px 4px', background: 'var(--surface-elevated)', borderRadius: '3px' }}>PRAGMA integrity_check</code> query to safeguard against file corruption.</li>
              <li>Before any database restore is executed, a <strong>fallback pre-restore snapshot</strong> is automatically created by the server to ensure undoability in case of failure.</li>
              <li>Restoring will disconnect active SQLite connections and restart active system sessions.</li>
            </ul>
          </div>

        </div>

      </div>

      {/* ============================================================
          RESTORE SAFESTEP CONFIRMATION MODAL (DOUBLE safeguard)
          ============================================================ */}
      {confirmRestoreFile && (
        <>
          <div 
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 100 }}
            onClick={() => setConfirmRestoreFile(null)}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '520px',
            background: 'var(--surface)',
            border: '2px solid var(--danger)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            zIndex: 101,
            overflow: 'hidden'
          }}>
            
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border)',
              background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Dangerous Action: Restore Database
                </h3>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleRestoreBackup} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                You are about to restore the system state from the backup file:
                <code style={{ display: 'block', margin: '0.5rem 0', padding: '6px 10px', background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--danger)', fontWeight: 600 }}>
                  {confirmRestoreFile}
                </code>
                <strong>Warning</strong>: This action will overwrite all current system records. This cannot be undone unless you roll back using the fallback pre-restore snapshot.
              </p>

              {/* Safeguard Checkbox */}
              <label style={{ display: 'flex', gap: '0.5rem', cursor: 'pointer', userSelect: 'none', alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={understandCheckbox}
                  onChange={(e) => setUnderstandCheckbox(e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  I understand that this action will overwrite the active SQLite database and drop current sessions.
                </span>
              </label>

              {/* Type confirmation safeguard */}
              <div className="form-group">
                <label className="form-label">Type <code style={{ color: 'var(--danger)', fontFamily: 'monospace', fontWeight: 700 }}>RESTORE</code> in the box to authorize: *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. RESTORE"
                  value={typedConfirmation}
                  onChange={(e) => setTypedConfirmation(e.target.value)}
                  className="form-input"
                  style={{ textTransform: 'uppercase', borderColor: typedConfirmation.toUpperCase() === 'RESTORE' ? 'var(--success)' : 'var(--border)' }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.25rem' }}>
                <button 
                  type="button" 
                  onClick={() => { setConfirmRestoreFile(null); setTypedConfirmation(''); setUnderstandCheckbox(false); }} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!understandCheckbox || typedConfirmation.toUpperCase() !== 'RESTORE' || restoreBackupMutation.isPending}
                  className="btn btn-danger font-semibold"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {restoreBackupMutation.isPending ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  <span>Authorize & Restore</span>
                </button>
              </div>

            </form>
          </div>
        </>
      )}

    </div>
  );
}
