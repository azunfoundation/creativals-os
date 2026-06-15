'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Save, Loader2, AlertCircle, Mail, Smartphone } from 'lucide-react';
import { notificationPreferences as prefsApi } from '@/lib/api';

interface PreferenceItem {
  id?: number;
  event_type: string;
  in_app: boolean;
  email: boolean;
  push: boolean;
}

const EVENT_TYPES = [
  { key: 'lead_assigned', label: 'Lead Assignment', desc: 'When you are assigned as the executive or head on a new lead.' },
  { key: 'task_assigned', label: 'Task Assignment', desc: 'When a new project task is assigned to you.' },
  { key: 'invoice_overdue', label: 'Invoice Overdue Alerts', desc: 'When a project invoice remains unpaid after the due date.' },
  { key: 'payment_received', label: 'Payment Confirmations', desc: 'When a client pays an invoice and the payment is approved.' },
  { key: 'timesheet_submitted', label: 'Timesheet Submissions', desc: 'When a team member submits a timesheet for your review.' },
  { key: 'payroll_processed', label: 'Payslip Availability', desc: 'When your monthly salary run is approved and payslip is ready.' },
];

export default function NotificationSettingsPage() {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // local state map for checkboxes
  const [prefsMap, setPrefsMap] = useState<Record<string, { in_app: boolean; email: boolean; push: boolean }>>({});

  // Fetch preferences
  const { data: serverPrefs, isLoading } = useQuery<{ data: PreferenceItem[] }>({
    queryKey: ['notificationPreferences'],
    queryFn: async () => {
      const res = await prefsApi.get();
      return res.data;
    },
  });

  // Load state when data is loaded
  useEffect(() => {
    const initialMap: Record<string, { in_app: boolean; email: boolean; push: boolean }> = {};
    
    // Seed defaults
    EVENT_TYPES.forEach(evt => {
      initialMap[evt.key] = { in_app: true, email: false, push: false };
    });

    if (serverPrefs && Array.isArray(serverPrefs.data)) {
      serverPrefs.data.forEach(item => {
        if (initialMap[item.event_type]) {
          initialMap[item.event_type] = {
            in_app: item.in_app,
            email: item.email,
            push: item.push,
          };
        }
      });
    }

    setPrefsMap(initialMap);
  }, [serverPrefs]);

  // Mutations
  const updatePrefsMutation = useMutation({
    mutationFn: (data: any[]) => prefsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      triggerAlert('Notification preferences saved successfully.');
    },
    onError: (err: any) => {
      triggerError(err.response?.data?.message || 'Failed to save notification preferences.');
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

  const handleCheckboxChange = (eventType: string, channel: 'in_app' | 'email' | 'push', checked: boolean) => {
    setPrefsMap(prev => ({
      ...prev,
      [eventType]: {
        ...prev[eventType],
        [channel]: checked
      }
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = Object.entries(prefsMap).map(([eventType, channels]) => ({
      event_type: eventType,
      in_app: channels.in_app,
      email: channels.email,
      push: channels.push,
    }));
    
    updatePrefsMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent)' }} />
        <span style={{ color: 'var(--text-muted)' }}>Loading preferences...</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
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

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Bell size={18} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Personal Notification Settings</h2>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Choose which channels you want to receive notifications on for each type of system activity.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '0.5rem',
              fontWeight: 600,
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
              alignItems: 'center',
              textAlign: 'center',
            }}>
              <div style={{ textAlign: 'left' }}>Event Activity</div>
              <div><span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Bell size={12} /> In-App</span></div>
              <div><span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> Email</span></div>
              <div><span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Smartphone size={12} /> Push</span></div>
            </div>

            {/* List */}
            {EVENT_TYPES.map(evt => {
              const current = prefsMap[evt.key] || { in_app: true, email: false, push: false };
              return (
                <div 
                  key={evt.key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '0.875rem',
                    alignItems: 'center',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{evt.label}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{evt.desc}</span>
                  </div>
                  
                  <div>
                    <input
                      type="checkbox"
                      checked={current.in_app}
                      onChange={(e) => handleCheckboxChange(evt.key, 'in_app', e.target.checked)}
                      style={{ transform: 'scale(1.25)', cursor: 'pointer' }}
                    />
                  </div>
                  
                  <div>
                    <input
                      type="checkbox"
                      checked={current.email}
                      onChange={(e) => handleCheckboxChange(evt.key, 'email', e.target.checked)}
                      style={{ transform: 'scale(1.25)', cursor: 'pointer' }}
                    />
                  </div>
                  
                  <div>
                    <input
                      type="checkbox"
                      checked={current.push}
                      onChange={(e) => handleCheckboxChange(evt.key, 'push', e.target.checked)}
                      style={{ transform: 'scale(1.25)', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={updatePrefsMutation.isPending}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {updatePrefsMutation.isPending ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Save size={14} />
              )}
              <span>Save Preferences</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
