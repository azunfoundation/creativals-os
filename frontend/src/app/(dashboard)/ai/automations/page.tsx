'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles, Plus, Trash2, CheckCircle2, AlertCircle, Play,
  Settings, ToggleLeft, ToggleRight, ArrowRight, ShieldAlert,
  Sliders, Calendar, PlusCircle, Check, X
} from 'lucide-react';
import { aiApi, type AiAutomation } from '@/lib/api';

export default function AiAutomationsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create rule form state
  const [name, setName] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('lead.updated');
  const [conditionField, setConditionField] = useState('stage_id');
  const [conditionOperator, setConditionOperator] = useState('=');
  const [conditionValue, setConditionValue] = useState('4');
  
  const [actionType, setActionType] = useState('create_task');
  const [taskTitle, setTaskTitle] = useState('Follow up on newly qualified lead: {company_name}');
  const [taskProjectId, setTaskProjectId] = useState('1');
  const [taskPriority, setTaskPriority] = useState('high');
  
  const [alertTitle, setAlertTitle] = useState('Lead Qualified Notification');
  const [alertBody, setAlertBody] = useState('Lead {company_name} was converted to qualified status.');
  
  // Queries
  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['ai_automations'],
    queryFn: async () => {
      const res = await aiApi.listAutomations();
      return res.data;
    }
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; trigger_event: string; conditions: any[]; actions: any[] }) => {
      const res = await aiApi.createAutomation(data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai_automations'] });
      setShowCreateModal(false);
      resetForm();
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (params: { id: number; active: boolean }) => {
      await aiApi.updateAutomation(params.id, { is_active: params.active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai_automations'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await aiApi.deleteAutomation(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai_automations'] });
    }
  });

  const resetForm = () => {
    setName('');
    setTriggerEvent('lead.updated');
    setConditionField('stage_id');
    setConditionOperator('=');
    setConditionValue('4');
    setActionType('create_task');
    setTaskTitle('Follow up on newly qualified lead: {company_name}');
    setTaskProjectId('1');
    setTaskPriority('high');
    setAlertTitle('Lead Qualified Notification');
    setAlertBody('Lead {company_name} was converted to qualified status.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const conditions = conditionField ? [{
      field: conditionField,
      operator: conditionOperator,
      value: conditionValue
    }] : [];

    const actions = [];
    if (actionType === 'create_task') {
      actions.push({
        type: 'create_task',
        params: {
          project_id: parseInt(taskProjectId) || 1,
          title: taskTitle,
          priority: taskPriority
        }
      });
    } else {
      actions.push({
        type: 'send_alert',
        params: {
          title: alertTitle,
          body: alertBody
        }
      });
    }

    createMutation.mutate({
      name,
      trigger_event: triggerEvent,
      conditions,
      actions
    });
  };

  const formatTriggerEvent = (event: string) => {
    return event.replace('.', ' is ').toUpperCase();
  };

  return (
    <div style={{ padding: '1.5rem', background: 'var(--background)', minHeight: '100%', borderRadius: 'var(--radius-xl)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Sliders size={24} color="var(--accent)" /> AI Automations Engine
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Configure smart, reactive rules that automatically run tasks and trigger alerts when platform states change.
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1rem', background: 'var(--accent)', color: '#fff',
            borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600,
            boxShadow: 'var(--shadow-glow)',
          }}
        >
          <Plus size={16} /> Create Rule
        </button>
      </div>

      {/* Automations list */}
      {isLoading ? (
        <div style={{ display: 'flex', padding: '4rem', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Loading automation rules…
        </div>
      ) : automations.length === 0 ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 2rem', gap: '1rem', borderStyle: 'dashed' }}>
          <Sparkles size={40} style={{ opacity: 0.4, color: 'var(--accent)' }} />
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>No automations active</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '360px' }}>
            Create custom trigger-action flows (like creating follow-up tasks when leads become qualified or alerts when utilization goes high).
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-secondary btn-sm"
          >
            Create your first rule
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {automations.map((auto) => (
            <div key={auto.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', background: 'var(--surface)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    padding: '0.25rem 0.5rem', background: 'var(--accent-subtle)',
                    color: 'var(--accent)', fontSize: '0.6875rem', fontWeight: 700,
                    borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.04em'
                  }}>
                    {formatTriggerEvent(auto.trigger_event)}
                  </span>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{auto.name}</h3>
                </div>
                
                {/* Conditions & Actions breakdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {auto.conditions && auto.conditions.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span style={{ fontWeight: 600 }}>If:</span>
                      <span style={{ background: 'var(--surface-elevated)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-primary)' }}>
                        {auto.conditions[0].field} {auto.conditions[0].operator} {auto.conditions[0].value}
                      </span>
                    </div>
                  )}
                  <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{ fontWeight: 600 }}>Then:</span>
                    <span style={{ background: 'var(--surface-elevated)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-primary)' }}>
                      {auto.actions[0]?.type === 'create_task' ? 'Create Task' : 'Trigger Notification'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status toggles & actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <button
                  onClick={() => toggleActiveMutation.mutate({ id: auto.id, active: !auto.is_active })}
                  title={auto.is_active ? "Deactivate Rule" : "Activate Rule"}
                  style={{ display: 'flex', color: auto.is_active ? 'var(--success)' : 'var(--text-muted)' }}
                >
                  {auto.is_active ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                </button>

                <button
                  onClick={() => deleteMutation.mutate(auto.id)}
                  title="Delete Rule"
                  style={{ color: 'var(--danger)', padding: '0.5rem', background: 'var(--danger-subtle)', borderRadius: 'var(--radius-md)' }}
                  className="hover:brightness-110"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Rule Modal Drawer ── */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
          zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '520px',
            boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Create AI Automation Rule</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Name */}
              <div className="form-group">
                <label className="form-label">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Qualified Lead Follow-up Alert"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Trigger Event */}
              <div className="form-group">
                <label className="form-label">When Event Triggers</label>
                <select
                  value={triggerEvent}
                  onChange={(e) => setTriggerEvent(e.target.value)}
                  className="form-input"
                  style={{ appearance: 'none' }}
                >
                  <option value="lead.updated">Lead is Updated</option>
                  <option value="lead.created">Lead is Created</option>
                  <option value="invoice.created">Invoice is Drafted</option>
                  <option value="invoice.updated">Invoice is Paid/Overdue</option>
                  <option value="task.created">Task is Created</option>
                  <option value="task.updated">Task is Completed</option>
                  <option value="project.updated">Project is Modified</option>
                </select>
              </div>

              {/* Conditions */}
              <div style={{ padding: '1rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>Check Conditions (Optional)</h4>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Field name (e.g. stage_id)"
                    value={conditionField}
                    onChange={(e) => setConditionField(e.target.value)}
                    className="form-input text-xs"
                    style={{ flex: 1, padding: '0.5rem 0.625rem' }}
                  />
                  <select
                    value={conditionOperator}
                    onChange={(e) => setConditionOperator(e.target.value)}
                    className="form-input text-xs"
                    style={{ width: '70px', padding: '0.5rem' }}
                  >
                    <option value="=">=</option>
                    <option value="!=">!=</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value="contains">contains</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Value (e.g. 4)"
                    value={conditionValue}
                    onChange={(e) => setConditionValue(e.target.value)}
                    className="form-input text-xs"
                    style={{ flex: 1, padding: '0.5rem 0.625rem' }}
                  />
                </div>
              </div>

              {/* Action */}
              <div style={{ padding: '1rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>Execute AI Action</h4>
                
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label text-xs">Action Type</label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="form-input text-xs"
                    style={{ padding: '0.5rem' }}
                  >
                    <option value="create_task">Create Platform Task</option>
                    <option value="send_alert">Trigger App Alert Notification</option>
                  </select>
                </div>

                {actionType === 'create_task' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Task Title (e.g. Qualified Lead Follow-up)"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="form-input text-xs"
                      style={{ padding: '0.5rem 0.625rem' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="number"
                        placeholder="Project ID"
                        value={taskProjectId}
                        onChange={(e) => setTaskProjectId(e.target.value)}
                        className="form-input text-xs"
                        style={{ flex: 1, padding: '0.5rem 0.625rem' }}
                      />
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value)}
                        className="form-input text-xs"
                        style={{ flex: 1, padding: '0.5rem' }}
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Notification Title"
                      value={alertTitle}
                      onChange={(e) => setAlertTitle(e.target.value)}
                      className="form-input text-xs"
                      style={{ padding: '0.5rem 0.625rem' }}
                    />
                    <textarea
                      placeholder="Notification Body"
                      value={alertBody}
                      onChange={(e) => setAlertBody(e.target.value)}
                      className="form-input text-xs"
                      style={{ padding: '0.5rem 0.625rem', resize: 'none', height: '60px' }}
                    />
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn btn-primary btn-sm"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
