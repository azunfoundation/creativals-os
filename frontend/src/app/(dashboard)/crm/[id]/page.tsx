'use client';

import { use, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Star, Phone, MessageSquareCode, Mail, FileText, 
  Users, Flag, UserCheck, Info, Check, Plus, Trash2, Edit2, 
  ExternalLink, Calendar, DollarSign, Globe, CheckSquare, Clock
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  leads as leadsApi, 
  users as usersApi,
  leadStages as stagesApi,
  Lead, LeadContact, LeadActivity, User, LeadStage
} from '@/lib/api';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';

// ============================================================
// Fallback Mock Data Generator
// ============================================================

const MOCK_USERS: User[] = [
  { id: 1, name: 'Amit Verma', email: 'amit@creativals.in', employee_id: 'CRE010', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null },
  { id: 2, name: 'Rohan Mehta', email: 'rohan@creativals.in', employee_id: 'CRE011', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null },
  { id: 3, name: 'Sarah Dsouza', email: 'sarah@creativals.in', employee_id: 'CRE012', roles: [], departments: [], status: 'active', permissions: [], avatar_url: null }
];

const INTERESTED_SERVICES_OPTIONS = [
  'Brand Identity',
  'UI/UX Design',
  'Web Development',
  'Mobile App Development',
  'Performance Marketing',
  'SEO Optimization',
  'Social Media Management'
];

const makeMockLead = (id: number): Lead => {
  return {
    id,
    company_name: id === 2 ? 'Stark Industries' : 'Acme Corp',
    website_url: id === 2 ? 'https://stark.com' : 'https://acme.com',
    timezone: id === 2 ? 'America/New_York' : 'Asia/Kolkata',
    expected_start_date: '2026-07-15',
    priority: 'high',
    temperature: 'hot',
    budget: id === 2 ? 2500000 : 850000,
    interested_services: ['UI/UX Design', 'Web Development'],
    stage_id: id === 2 ? 3 : 1,
    source_id: 1,
    sales_exec_id: 1,
    sales_head_id: 2,
    contacts: [
      { id: 1, lead_id: id, name: 'John Doe', designation: 'CEO', email: 'john@acme.com', phone: '+91 99999 88888', whatsapp: '+91 99999 88888', notes: 'Prefers WhatsApp updates.', is_primary: true },
      { id: 2, lead_id: id, name: 'Jane Smith', designation: 'VP Product', email: 'jane@acme.com', phone: '+91 99999 77777', whatsapp: '', notes: 'Technical evaluator.', is_primary: false }
    ],
    activities: [
      { id: 101, lead_id: id, type: 'system_event', description: 'Lead created in OS via Web Form', created_at: new Date(Date.now() - 4 * 86400000).toISOString() },
      { id: 102, lead_id: id, type: 'stage_change', description: 'Stage changed to New', created_at: new Date(Date.now() - 4 * 86400000).toISOString() },
      { id: 103, lead_id: id, type: 'call', description: 'Introduction call with John. He explained his requirements for a new UI/UX design and React web app.', logged_by: MOCK_USERS[0], created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
      { id: 104, lead_id: id, type: 'assignment_change', description: 'Assigned Sales Executive: Amit Verma', created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
      { id: 105, lead_id: id, type: 'email', description: 'Sent follow-up email with agency portfolio and general pricing sheet.', logged_by: MOCK_USERS[0], created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
      { id: 106, lead_id: id, type: 'whatsapp', description: 'WhatsApp chat: John acknowledged receipt of portfolio, scheduled a meeting.', logged_by: MOCK_USERS[0], created_at: new Date(Date.now() - 1 * 86400000).toISOString() },
      { id: 107, lead_id: id, type: 'meeting', description: 'Discovery session to scope UI/UX requirements.', logged_by: MOCK_USERS[0], created_at: new Date(Date.now() - 4 * 3600000).toISOString() },
      { id: 108, lead_id: id, type: 'note', description: 'Budget looks healthy but they want to start by July. Need to prepare proposal quickly.', logged_by: MOCK_USERS[0], created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
      // Followups
      { id: 109, lead_id: id, type: 'meeting', description: 'Scheduled Proposal Presentation', due_date: new Date(Date.now() + 2 * 86400000).toISOString(), status: 'pending', created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
      { id: 110, lead_id: id, type: 'call', description: 'Call to review feedback on proposal', due_date: new Date(Date.now() + 5 * 86400000).toISOString(), status: 'pending', created_at: new Date(Date.now() - 1 * 3600000).toISOString() },
    ],
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString()
  };
};

// ============================================================
// Activity Feed Helpers
// ============================================================

const ACTIVITY_CONFIG = {
  call:              { icon: Phone,              color: 'text-blue-400',       bg: 'rgba(59,130,246,0.1)' },
  whatsapp:          { icon: MessageSquareCode,  color: 'text-emerald-400',    bg: 'rgba(16,185,129,0.1)' },
  email:             { icon: Mail,               color: 'text-purple-400',     bg: 'rgba(168,85,247,0.1)' },
  note:              { icon: FileText,           color: 'text-yellow-400',     bg: 'rgba(234,179,8,0.1)' },
  meeting:           { icon: Users,              color: 'text-indigo-400',     bg: 'rgba(99,102,241,0.1)' },
  stage_change:      { icon: Flag,               color: 'text-amber-400',      bg: 'rgba(245,158,11,0.1)' },
  assignment_change: { icon: UserCheck,          color: 'text-gray-400',       bg: 'rgba(156,163,175,0.1)' },
  system_event:      { icon: Info,               color: 'text-cyan-400',       bg: 'rgba(6,182,212,0.1)' },
};

// ============================================================
// Main Component
// ============================================================

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // Unwrap parameters
  const resolvedParams = use(params);
  const leadId = parseInt(resolvedParams.id, 10);

  // UI state
  const [activeTab, setActiveTab] = useState<'call' | 'whatsapp' | 'meeting' | 'note' | 'followup'>('call');
  const [activityText, setActivityText] = useState('');
  const [followupDate, setFollowupDate] = useState('');
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [quoteName, setQuoteName] = useState('');
  const [quoteValidity, setQuoteValidity] = useState('');

  // Contacts editing states
  const [editingContactId, setEditingContactId] = useState<number | null>(null);
  const [editContactForm, setEditContactForm] = useState<Partial<LeadContact>>({});
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactForm, setNewContactForm] = useState<Partial<LeadContact>>({
    name: '', designation: '', email: '', phone: '', whatsapp: '', notes: '', is_primary: false
  });

  // ============================================================
  // Queries
  // ============================================================

  const { data: lead, isLoading } = useQuery<Lead>({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      try {
        const res = await leadsApi.get(leadId);
        return res.data;
      } catch {
        return makeMockLead(leadId);
      }
    }
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const res = await usersApi.list({ per_page: 100 });
        return res.data.data;
      } catch {
        return MOCK_USERS;
      }
    }
  });

  const { data: stages = [] } = useQuery<LeadStage[]>({
    queryKey: ['leadStages'],
    queryFn: async () => {
      try {
        const res = await stagesApi.list();
        return res.data;
      } catch {
        return [];
      }
    }
  });

  // Initialize Quote Conversion fields
  useEffect(() => {
    if (lead) {
      setQuoteName(`${lead.company_name} - Brand & Web Strategy Quote`);
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      setQuoteValidity(defaultDate.toISOString().split('T')[0]);
    }
  }, [lead]);

  // ============================================================
  // Mutations
  // ============================================================

  const updateLeadMutation = useMutation({
    mutationFn: (data: any) => leadsApi.update(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });

  const logActivityMutation = useMutation({
    mutationFn: (data: any) => leadsApi.logActivity(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      setActivityText('');
      setFollowupDate('');
    }
  });

  const convertLeadMutation = useMutation({
    mutationFn: (data: any) => leadsApi.convert(leadId, data),
    onSuccess: (res) => {
      setShowConvertModal(false);
      // Redirect to builder page
      router.push(`/quotes/builder?lead_id=${leadId}&quote_id=${res.data.quote_id}`);
    }
  });

  if (isLoading || !lead) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '50vh' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading lead details...</div>
      </div>
    );
  }

  // ============================================================
  // Process Timeline & Follow-ups
  // ============================================================

  // Activities sorted in reverse chronological order
  const sortedActivities = [...lead.activities].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Pending follow-ups lists
  const pendingFollowups = lead.activities.filter(
    (a) => a.due_date && a.status === 'pending'
  );

  // ============================================================
  // Contact Actions
  // ============================================================

  const handleTogglePrimary = (contactId: number) => {
    const updatedContacts = lead.contacts.map((c) => ({
      ...c,
      is_primary: c.id === contactId
    }));
    updateLeadMutation.mutate({ contacts: updatedContacts });
  };

  const handleEditContactClick = (contact: LeadContact) => {
    setEditingContactId(contact.id);
    setEditContactForm(contact);
  };

  const handleSaveContactEdit = () => {
    if (!editContactForm.name) return;
    const updatedContacts = lead.contacts.map((c) => 
      c.id === editingContactId ? { ...c, ...editContactForm } : c
    );
    updateLeadMutation.mutate({ contacts: updatedContacts });
    setEditingContactId(null);
  };

  const handleDeleteContact = (contactId: number) => {
    if (lead.contacts.length <= 1) {
      alert('Must have at least one contact.');
      return;
    }
    const updatedContacts = lead.contacts.filter((c) => c.id !== contactId);
    // Ensure one contact is primary
    if (!updatedContacts.some((c) => c.is_primary)) {
      updatedContacts[0].is_primary = true;
    }
    updateLeadMutation.mutate({ contacts: updatedContacts });
  };

  const handleAddContact = () => {
    if (!newContactForm.name) return;
    
    const newContact: LeadContact = {
      id: Date.now(), // Local temporary ID for mock
      lead_id: leadId,
      name: newContactForm.name,
      designation: newContactForm.designation || '',
      email: newContactForm.email || '',
      phone: newContactForm.phone || '',
      whatsapp: newContactForm.whatsapp || '',
      notes: newContactForm.notes || '',
      is_primary: !!newContactForm.is_primary
    };

    let updatedContacts = [...lead.contacts];
    if (newContact.is_primary) {
      updatedContacts = updatedContacts.map((c) => ({ ...c, is_primary: false }));
    }
    updatedContacts.push(newContact);

    updateLeadMutation.mutate({ contacts: updatedContacts });
    setIsAddingContact(false);
    setNewContactForm({ name: '', designation: '', email: '', phone: '', whatsapp: '', notes: '', is_primary: false });
  };

  // ============================================================
  // Services Update
  // ============================================================

  const handleServiceChange = (service: string, checked: boolean) => {
    let services = [...(lead.interested_services || [])];
    if (checked) {
      services.push(service);
    } else {
      services = services.filter((s) => s !== service);
    }
    updateLeadMutation.mutate({ interested_services: services });
  };

  // ============================================================
  // Activity Logging
  // ============================================================

  const handleLogActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityText.trim()) return;

    const loggedBy = users.find(u => u.id === 1) || MOCK_USERS[0]; // mock logged in user

    if (activeTab === 'followup') {
      logActivityMutation.mutate({
        type: 'meeting', // or general followup type
        description: `Scheduled Follow-up: ${activityText}`,
        due_date: followupDate || new Date(Date.now() + 86400000).toISOString(),
        status: 'pending',
        logged_by: loggedBy
      });
    } else {
      logActivityMutation.mutate({
        type: activeTab,
        description: activityText,
        logged_by: loggedBy
      });
    }
  };

  const handleCompleteFollowup = (activityId: number) => {
    // update status to completed
    const updatedActivities = lead.activities.map((a) => {
      if (a.id === activityId) {
        return { ...a, status: 'completed' as const };
      }
      return a;
    });

    // Also log completion system event
    const followObj = lead.activities.find(a => a.id === activityId);
    const systemLog: LeadActivity = {
      id: Date.now(),
      lead_id: leadId,
      type: 'system_event',
      description: `Follow-up completed: "${followObj?.description}"`,
      created_at: new Date().toISOString()
    };
    updatedActivities.push(systemLog);

    updateLeadMutation.mutate({ activities: updatedActivities });
  };

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      
      {/* ── Breadcrumb Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <Link href="/crm" className="btn btn-secondary btn-icon" style={{ borderRadius: '50%', padding: '0.375rem' }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Leads / Details</span>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1px' }}>
            {lead.company_name}
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: stages.find(s => s.id === lead.stage_id)?.color || 'var(--accent)' }} />
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ============================================================
            LEFT PANEL: Profile & Contacts (lg:col-span-3)
            ============================================================ */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          
          {/* Metadata Card */}
          <div className="card">
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.875rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              Lead Meta List
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Website</div>
                {lead.website_url ? (
                  <a href={lead.website_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '3px' }} className="hover:underline">
                    {lead.website_url.replace('https://', '').replace('http://', '')}
                    <ExternalLink size={10} />
                  </a>
                ) : (
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>—</span>
                )}
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Timezone</div>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Globe size={12} /> {lead.timezone || 'Asia/Kolkata'}
                </span>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Priority</div>
                <span className="badge badge-accent" style={{ marginTop: '2px' }}>{lead.priority}</span>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Temperature</div>
                <span className={`badge ${lead.temperature === 'hot' ? 'badge-danger' : lead.temperature === 'warm' ? 'badge-warning' : 'badge-info'}`} style={{ marginTop: '2px' }}>
                  {lead.temperature}
                </span>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly Budget</div>
                <span style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'monospace' }}>
                  {formatCurrency(lead.budget)}
                </span>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expected Start Date</div>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Calendar size={12} /> {lead.expected_start_date ? formatDate(lead.expected_start_date) : '—'}
                </span>
              </div>
            </div>

            {/* Assignments Section */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }} className="flex flex-col gap-3">
              <div className="form-group">
                <label className="form-label">Sales Executive</label>
                <select
                  value={lead.sales_exec_id || ''}
                  onChange={(e) => {
                    const execId = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    const execName = e.target.value ? users.find(u => u.id === execId)?.name : 'Unassigned';
                    updateLeadMutation.mutate({ 
                      sales_exec_id: execId,
                      activities: [
                        ...lead.activities,
                        {
                          id: Date.now(),
                          lead_id: leadId,
                          type: 'assignment_change',
                          description: `Reassigned Sales Executive to: ${execName}`,
                          created_at: new Date().toISOString()
                        }
                      ]
                    });
                  }}
                  className="form-input"
                  style={{ height: '34px', fontSize: '0.8125rem', padding: '0 0.5rem' }}
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Sales Head</label>
                <select
                  value={lead.sales_head_id || ''}
                  onChange={(e) => {
                    const headId = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    const headName = e.target.value ? users.find(u => u.id === headId)?.name : 'Unassigned';
                    updateLeadMutation.mutate({ 
                      sales_head_id: headId,
                      activities: [
                        ...lead.activities,
                        {
                          id: Date.now(),
                          lead_id: leadId,
                          type: 'assignment_change',
                          description: `Reassigned Sales Head to: ${headName}`,
                          created_at: new Date().toISOString()
                        }
                      ]
                    });
                  }}
                  className="form-input"
                  style={{ height: '34px', fontSize: '0.8125rem', padding: '0 0.5rem' }}
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Interested Services Checklist */}
          <div className="card">
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.875rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              Interested Services
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {INTERESTED_SERVICES_OPTIONS.map((service) => {
                const isChecked = (lead.interested_services || []).includes(service);
                return (
                  <label key={service} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleServiceChange(service, e.target.checked)}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    {service}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Contacts Section */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Contacts</h2>
              <button
                onClick={() => setIsAddingContact(!isAddingContact)}
                style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                <Plus size={12} /> Add
              </button>
            </div>

            {/* ADD INLINE FORM */}
            {isAddingContact && (
              <div style={{ padding: '0.75rem', background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>New Contact</div>
                <input
                  type="text"
                  placeholder="Name *"
                  value={newContactForm.name}
                  onChange={(e) => setNewContactForm({ ...newContactForm, name: e.target.value })}
                  className="form-input"
                  style={{ height: '28px', fontSize: '0.75rem', background: 'var(--surface)' }}
                />
                <input
                  type="text"
                  placeholder="Designation"
                  value={newContactForm.designation}
                  onChange={(e) => setNewContactForm({ ...newContactForm, designation: e.target.value })}
                  className="form-input"
                  style={{ height: '28px', fontSize: '0.75rem', background: 'var(--surface)' }}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newContactForm.email}
                  onChange={(e) => setNewContactForm({ ...newContactForm, email: e.target.value })}
                  className="form-input"
                  style={{ height: '28px', fontSize: '0.75rem', background: 'var(--surface)' }}
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={newContactForm.phone}
                  onChange={(e) => setNewContactForm({ ...newContactForm, phone: e.target.value })}
                  className="form-input"
                  style={{ height: '28px', fontSize: '0.75rem', background: 'var(--surface)' }}
                />
                <input
                  type="text"
                  placeholder="WhatsApp"
                  value={newContactForm.whatsapp}
                  onChange={(e) => setNewContactForm({ ...newContactForm, whatsapp: e.target.value })}
                  className="form-input"
                  style={{ height: '28px', fontSize: '0.75rem', background: 'var(--surface)' }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newContactForm.is_primary}
                    onChange={(e) => setNewContactForm({ ...newContactForm, is_primary: e.target.checked })}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  Mark Primary
                </label>
                <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                  <button onClick={() => setIsAddingContact(false)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>Cancel</button>
                  <button onClick={handleAddContact} className="btn btn-primary btn-sm" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>Save</button>
                </div>
              </div>
            )}

            {/* CONTACTS LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {lead.contacts.map((contact) => {
                const isEditing = editingContactId === contact.id;
                return (
                  <div 
                    key={contact.id} 
                    style={{ 
                      padding: '0.75rem', 
                      borderRadius: 'var(--radius-md)', 
                      background: 'var(--surface-elevated)', 
                      border: contact.is_primary ? '1px solid var(--accent)' : '1px solid var(--border)',
                      position: 'relative'
                    }}
                  >
                    {isEditing ? (
                      /* EDITING CONTACT INLINE FORM */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input
                          type="text"
                          value={editContactForm.name || ''}
                          onChange={(e) => setEditContactForm({ ...editContactForm, name: e.target.value })}
                          className="form-input"
                          style={{ height: '28px', fontSize: '0.75rem', background: 'var(--surface)' }}
                          placeholder="Name"
                        />
                        <input
                          type="text"
                          value={editContactForm.designation || ''}
                          onChange={(e) => setEditContactForm({ ...editContactForm, designation: e.target.value })}
                          className="form-input"
                          style={{ height: '28px', fontSize: '0.75rem', background: 'var(--surface)' }}
                          placeholder="Designation"
                        />
                        <input
                          type="email"
                          value={editContactForm.email || ''}
                          onChange={(e) => setEditContactForm({ ...editContactForm, email: e.target.value })}
                          className="form-input"
                          style={{ height: '28px', fontSize: '0.75rem', background: 'var(--surface)' }}
                          placeholder="Email"
                        />
                        <input
                          type="text"
                          value={editContactForm.phone || ''}
                          onChange={(e) => setEditContactForm({ ...editContactForm, phone: e.target.value })}
                          className="form-input"
                          style={{ height: '28px', fontSize: '0.75rem', background: 'var(--surface)' }}
                          placeholder="Phone"
                        />
                        <input
                          type="text"
                          value={editContactForm.whatsapp || ''}
                          onChange={(e) => setEditContactForm({ ...editContactForm, whatsapp: e.target.value })}
                          className="form-input"
                          style={{ height: '28px', fontSize: '0.75rem', background: 'var(--surface)' }}
                          placeholder="WhatsApp"
                        />
                        <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                          <button onClick={() => setEditingContactId(null)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>Cancel</button>
                          <button onClick={handleSaveContactEdit} className="btn btn-primary btn-sm" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>Save</button>
                        </div>
                      </div>
                    ) : (
                      /* RENDER CONTACT DETAIL */
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            {contact.name}
                            {contact.is_primary && (
                              <span title="Primary contact">
                                <Star size={11} fill="var(--warning)" color="var(--warning)" />
                              </span>
                            )}
                          </span>
                          
                          <div style={{ display: 'flex', gap: '3px' }}>
                            {!contact.is_primary && (
                              <button 
                                onClick={() => handleTogglePrimary(contact.id)}
                                style={{ color: 'var(--text-muted)' }} 
                                className="hover:text-warning"
                                title="Make primary"
                              >
                                <Star size={11} />
                              </button>
                            )}
                            <button onClick={() => handleEditContactClick(contact)} style={{ color: 'var(--text-muted)' }} className="hover:text-primary" title="Edit inline">
                              <Edit2 size={11} />
                            </button>
                            <button onClick={() => handleDeleteContact(contact.id)} style={{ color: 'var(--text-muted)' }} className="hover:text-danger" title="Delete contact">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        {contact.designation && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{contact.designation}</div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.375rem' }}>
                          {contact.email && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Mail size={10} style={{ color: 'var(--text-muted)' }} />
                              <a href={`mailto:${contact.email}`} className="hover:text-accent truncate" style={{ maxWidth: '160px' }}>{contact.email}</a>
                            </div>
                          )}
                          {contact.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={10} style={{ color: 'var(--text-muted)' }} />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                          {contact.whatsapp && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MessageSquareCode size={10} style={{ color: 'var(--success)' }} />
                              <span>{contact.whatsapp}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ============================================================
            CENTER PANEL: Activity Timeline (lg:col-span-6)
            ============================================================ */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          
          {/* Quick Logger Form */}
          <div className="card">
            {/* Tabs Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto' }}>
              {(['call', 'whatsapp', 'meeting', 'note', 'followup'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ textTransform: 'capitalize' }}
                >
                  {tab === 'followup' ? 'Follow-up' : tab}
                </button>
              ))}
            </div>

            {/* Tabs Body Form */}
            <form onSubmit={handleLogActivity} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div className="form-group">
                <textarea
                  required
                  rows={3}
                  value={activityText}
                  onChange={(e) => setActivityText(e.target.value)}
                  placeholder={
                    activeTab === 'call' ? 'Log notes from phone call...' :
                    activeTab === 'whatsapp' ? 'Paste WhatsApp message text or summary...' :
                    activeTab === 'meeting' ? 'Write summary of meeting agreements...' :
                    activeTab === 'followup' ? 'What needs to be done next?...' :
                    'Type a general internal note...'
                  }
                  className="form-input"
                  style={{ resize: 'none', fontSize: '0.875rem' }}
                />
              </div>

              {activeTab === 'followup' && (
                <div className="form-group">
                  <label className="form-label">Due Date for Follow-up *</label>
                  <input
                    required
                    type="datetime-local"
                    value={followupDate}
                    onChange={(e) => setFollowupDate(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.875rem' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={logActivityMutation.isPending}
                  className="btn btn-primary"
                  style={{ padding: '0.375rem 1rem', fontSize: '0.8125rem' }}
                >
                  {logActivityMutation.isPending ? 'Logging...' : 'Log Activity'}
                </button>
              </div>
            </form>
          </div>

          {/* Timeline Feed */}
          <div className="card">
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
              Activity Timeline
            </h2>

            {sortedActivities.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No activity has been logged yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', paddingLeft: '1rem', borderLeft: '1px solid var(--border)' }}>
                {sortedActivities.map((act) => {
                  const config = ACTIVITY_CONFIG[act.type] || ACTIVITY_CONFIG.system_event;
                  const Icon = config.icon;
                  return (
                    <div key={act.id} style={{ position: 'relative' }}>
                      
                      {/* Timeline node icon */}
                      <div 
                        style={{ 
                          position: 'absolute', left: '-1.5rem', top: '2px', 
                          width: '18px', height: '18px', borderRadius: '50%',
                          background: 'var(--surface)', border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'currentColor' }} className={config.color} />
                      </div>

                      {/* Timeline content body */}
                      <div style={{ paddingLeft: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Icon size={12} className={config.color} />
                            {act.type.replace('_', ' ')}
                          </span>
                          {act.logged_by && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              by {act.logged_by.name}
                            </span>
                          )}
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                            {formatRelativeTime(act.created_at)}
                          </span>
                        </div>

                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                          {act.description}
                        </p>

                        {act.due_date && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '0.75rem', color: act.status === 'pending' ? 'var(--warning)' : 'var(--success)' }}>
                            <Clock size={11} />
                            <span>Due: {formatDate(act.due_date)}</span>
                            {act.status === 'completed' && (
                              <span className="badge badge-success" style={{ fontSize: '0.6rem', padding: '0px 4px' }}>Completed</span>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* ============================================================
            RIGHT PANEL: Actions & Follow-ups (lg:col-span-3)
            ============================================================ */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {/* Main Actions */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              Pipeline Actions
            </h2>
            
            {/* Current Stage */}
            <div className="form-group">
              <label className="form-label">Deal Pipeline Stage</label>
              <select
                value={lead.stage_id}
                onChange={(e) => {
                  const targetStageId = parseInt(e.target.value, 10);
                  const stageName = stages.find(s => s.id === targetStageId)?.name || 'Unknown';
                  updateLeadMutation.mutate({ 
                    stage_id: targetStageId,
                    activities: [
                      ...lead.activities,
                      {
                        id: Date.now(),
                        lead_id: leadId,
                        type: 'stage_change',
                        description: `Moved stage to: ${stageName}`,
                        created_at: new Date().toISOString()
                      }
                    ]
                  });
                }}
                className="form-input font-medium"
                style={{ height: '38px', fontSize: '0.875rem' }}
              >
                {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Convert to Quote Trigger */}
            <button
              onClick={() => setShowConvertModal(true)}
              className="btn btn-primary w-full"
              style={{ padding: '0.625rem' }}
            >
              <UserCheck size={16} /> Convert to Quote
            </button>
          </div>

          {/* Follow-up Widget */}
          <div className="card">
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.875rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              Pending Follow-ups
            </h2>

            {pendingFollowups.length === 0 ? (
              <div style={{ padding: '1rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                No pending follow-ups scheduled.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pendingFollowups.map((act) => (
                  <div 
                    key={act.id} 
                    style={{ 
                      padding: '0.625rem', 
                      background: 'var(--surface-elevated)', 
                      border: '1px solid var(--border)', 
                      borderRadius: 'var(--radius-md)',
                      display: 'flex', gap: '8px', alignItems: 'flex-start'
                    }}
                  >
                    <button
                      onClick={() => handleCompleteFollowup(act.id)}
                      style={{ 
                        marginTop: '2px', width: 14, height: 14, border: '1px solid var(--text-muted)',
                        borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--success)'
                      }}
                      className="hover:border-green-500"
                    >
                      <Check size={10} style={{ opacity: 0 }} className="hover:opacity-100" />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        {act.description.replace('Scheduled Follow-up: ', '')}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--warning)', fontSize: '0.6875rem', marginTop: '4px' }}>
                        <Calendar size={10} />
                        <span>{act.due_date ? formatDate(act.due_date) : ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ============================================================
          CONVERT TO QUOTE MODAL (DIALOG)
          ============================================================ */}
      {showConvertModal && (
        <div className="overlay animate-fade-in" style={{ zIndex: 100 }}>
          <div className="modal animate-slide-up" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserCheck size={18} style={{ color: 'var(--accent)' }} />
                Convert Lead to Quote
              </span>
              <button onClick={() => setShowConvertModal(false)} className="btn btn-ghost btn-icon" style={{ borderRadius: '50%', padding: '4px' }}>
                ✕
              </button>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                convertLeadMutation.mutate({
                  quote_name: quoteName,
                  valid_until: quoteValidity
                });
              }}
            >
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  This will freeze the lead parameter specifications and initiate the agency quote building process.
                </p>

                <div className="form-group">
                  <label className="form-label">Quote Blueprint Name *</label>
                  <input
                    required
                    type="text"
                    value={quoteName}
                    onChange={(e) => setQuoteName(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Validity Period Date *</label>
                  <input
                    required
                    type="date"
                    value={quoteValidity}
                    onChange={(e) => setQuoteValidity(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowConvertModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={convertLeadMutation.isPending}
                  className="btn btn-primary"
                >
                  {convertLeadMutation.isPending ? 'Generating...' : 'Initiate Quote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
