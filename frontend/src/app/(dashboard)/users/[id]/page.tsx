'use client';

import { useState } from 'react'; 
import { useToast } from '@/hooks/useToast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { users as usersApi } from '@/lib/api';

export default function UserProfilePage() {
  const { showToast } = useToast();
  const params = useParams();
  const userId = Number(params?.id);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('profile');
  const [tds, setTds] = useState<number | ''>('');
  const [pf, setPf] = useState<number | ''>('');
  const [esi, setEsi] = useState<number | ''>('');

  const { data: userResponse, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => usersApi.show(userId),
    enabled: !!userId,
  });

  const user = userResponse?.data?.data || null;

  const updateMutation = useMutation({
    mutationFn: (data: any) => usersApi.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      showToast('Compensation updated successfully!', 'info');
    },
    onError: () => {
      showToast('Failed to update compensation.', 'info');
    }
  });

  const handleSaveCompensation = () => {
    // Ideally this would go to a compensations endpoint, but we send it to user update for now
    updateMutation.mutate({
      tds_percent: Number(tds),
      pf_percent: Number(pf),
      esi_percent: Number(esi),
    });
  };

  if (isLoading) return <div style={{ padding: '2rem' }}>Loading...</div>;
  if (!user) return <div style={{ padding: '2rem' }}>User not found</div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>{user.name}'s Profile</h1>
      
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('profile')}
          style={{ padding: '0.5rem 1rem', borderBottom: activeTab === 'profile' ? '2px solid var(--accent)' : 'none', fontWeight: activeTab === 'profile' ? 600 : 400 }}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('compensation')}
          style={{ padding: '0.5rem 1rem', borderBottom: activeTab === 'compensation' ? '2px solid var(--accent)' : 'none', fontWeight: activeTab === 'compensation' ? 600 : 400 }}
        >
          Compensation
        </button>
      </div>

      {activeTab === 'profile' && (
        <div>
          <p>Email: {user.email}</p>
          <p>Employee ID: {user.employee_id || 'N/A'}</p>
          <p>Phone: {user.phone || 'N/A'}</p>
        </div>
      )}

      {activeTab === 'compensation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 400 }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Deductions</h2>
          
          <div className="form-group">
            <label className="form-label">TDS (%)</label>
            <input 
              type="number" 
              className="form-input" 
              value={tds} 
              onChange={e => setTds(e.target.value ? Number(e.target.value) : '')} 
              placeholder="e.g. 10" 
            />
          </div>

          <div className="form-group">
            <label className="form-label">PF (%)</label>
            <input 
              type="number" 
              className="form-input" 
              value={pf} 
              onChange={e => setPf(e.target.value ? Number(e.target.value) : '')} 
              placeholder="e.g. 12" 
            />
          </div>

          <div className="form-group">
            <label className="form-label">ESI (%)</label>
            <input 
              type="number" 
              className="form-input" 
              value={esi} 
              onChange={e => setEsi(e.target.value ? Number(e.target.value) : '')} 
              placeholder="e.g. 1.75" 
            />
          </div>

          <button 
            className="btn btn-primary" 
            onClick={handleSaveCompensation}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Compensation'}
          </button>
        </div>
      )}
    </div>
  );
}
