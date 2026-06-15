'use client';

import { useState, useEffect, useMemo } from 'react'; 
import { SkeletonTable } from '@/components/ui/Skeleton'; 
import { EmptyState } from '@/components/ui/EmptyState';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar as CalendarIcon, Clock, Play, Square, Coffee,
  Users, FileText, Check, X, AlertCircle, Plus, Trash2
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { formatDate, formatCurrency } from '@/lib/utils';
import { attendanceApi, leaveApi, holidaysApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { InputModal } from '@/components/ui/InputModal';

// Available work locations
const LOCATIONS = ['Office', 'Remote', 'Client Site'];

export default function AttendancePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'my_attendance' | 'team_registry' | 'leave_requests' | 'holidays'>('my_attendance');

  // Month & Year select for My Attendance
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Clock state
  const [timerText, setTimerText] = useState('00:00:00');
  const [clockInNotes, setClockInNotes] = useState('');
  const [clockInLocation, setClockInLocation] = useState('Office');
  
  // Modals state
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [showAddHolidayModal, setShowAddHolidayModal] = useState(false);
  const [rejectLeaveId, setRejectLeaveId] = useState<number | null>(null);
  const [deleteLeaveId, setDeleteLeaveId] = useState<number | null>(null);
  const [deleteHolidayId, setDeleteHolidayId] = useState<number | null>(null);

  // Leave Form State
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  // Holiday Form State
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayType, setHolidayType] = useState('national');
  const [holidayDesc, setHolidayDesc] = useState('');

  // Checks if user is Founder/Admin/HR
  const isHR = useMemo(() => {
    if (!user) return false;
    return user.roles.some(r => {
      const name = typeof r === 'string' ? r : r?.name || '';
      return ['founder', 'admin', 'hr', 'hr_manager'].includes(name.toLowerCase());
    });
  }, [user]);

  // ─── API Queries ────────────────────────────────────────────────────────────

  // Today's attendance status
  const { data: todayRecordRes, isLoading: loadingToday } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => attendanceApi.today(),
  });
  const todayRecord = todayRecordRes?.data;

  // Monthly stats summary
  const { data: summaryRes } = useQuery({
    queryKey: ['attendance', 'summary', currentMonth, currentYear],
    queryFn: () => attendanceApi.summary({ month: currentMonth, year: currentYear }),
  });
  const summary = summaryRes?.data;

  // Monthly attendance logs list
  const { data: logsRes, isLoading: loadingLogs } = useQuery({
    queryKey: ['attendance', 'logs', currentMonth, currentYear],
    queryFn: () => attendanceApi.list({ month: currentMonth, year: currentYear }),
  });
  const logsList = useMemo(() => {
    if (!logsRes?.data) return [];
    return Array.isArray(logsRes.data) ? logsRes.data : logsRes.data.data || [];
  }, [logsRes]);

  // Team registry list (HR only)
  const { data: teamRes } = useQuery({
    queryKey: ['attendance', 'team'],
    queryFn: () => attendanceApi.team(),
    enabled: isHR && activeTab === 'team_registry',
  });
  const teamRegistry = teamRes?.data || [];

  // Leave types list
  const { data: leaveTypesRes } = useQuery({
    queryKey: ['leave', 'types'],
    queryFn: () => leaveApi.types(),
    enabled: activeTab === 'leave_requests',
  });
  const leaveTypes = leaveTypesRes?.data || [];

  // Leave requests list
  const { data: leaveRequestsRes } = useQuery({
    queryKey: ['leave', 'requests'],
    queryFn: () => leaveApi.list(),
    enabled: activeTab === 'leave_requests',
  });
  const leaveRequestsList = useMemo(() => {
    if (!leaveRequestsRes?.data) return [];
    return Array.isArray(leaveRequestsRes.data) ? leaveRequestsRes.data : leaveRequestsRes.data.data || [];
  }, [leaveRequestsRes]);

  // Holidays list
  const { data: holidaysRes } = useQuery({
    queryKey: ['holidays', currentYear],
    queryFn: () => holidaysApi.list({ year: currentYear }),
    enabled: activeTab === 'holidays',
  });
  const holidaysList = holidaysRes?.data || [];

  // ─── Live Timer Effect ──────────────────────────────────────────────────────
  useEffect(() => {
    let interval: any;
    if (todayRecord && todayRecord.check_in_at && !todayRecord.check_out_at) {
      const checkInTime = new Date(todayRecord.check_in_at).getTime();
      interval = setInterval(() => {
        const diff = new Date().getTime() - checkInTime;
        const hrs = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const mins = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const secs = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        setTimerText(`${hrs}:${mins}:${secs}`);
      }, 1000);
    } else {
      setTimerText('00:00:00');
    }
    return () => clearInterval(interval);
  }, [todayRecord]);

  // ─── API Mutations ──────────────────────────────────────────────────────────

  // Clock In
  const clockInMutation = useMutation({
    mutationFn: (data: { notes?: string; location?: string }) => attendanceApi.clockIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      showToast('Clocked in successfully!', 'success');
      setClockInNotes('');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to clock in.', 'error');
    }
  });

  // Clock Out
  const clockOutMutation = useMutation({
    mutationFn: (data: { break_minutes: number }) => attendanceApi.clockOut(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      showToast('Clocked out successfully!', 'success');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to clock out.', 'error');
    }
  });

  // Apply Leave
  const applyLeaveMutation = useMutation({
    mutationFn: (data: any) => leaveApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
      showToast('Leave request submitted successfully!', 'success');
      setShowApplyLeaveModal(false);
      setLeaveTypeId('');
      setLeaveStartDate('');
      setLeaveEndDate('');
      setLeaveReason('');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to apply for leave.', 'error');
    }
  });

  // Approve Leave (HR)
  const approveLeaveMutation = useMutation({
    mutationFn: (id: number) => leaveApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
      showToast('Leave request approved.', 'success');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to approve leave.', 'error');
    }
  });

  // Reject Leave (HR)
  const rejectLeaveMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => leaveApi.reject(id, { rejection_reason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
      showToast('Leave request rejected.', 'success');
      setRejectLeaveId(null);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to reject leave.', 'error');
    }
  });

  // Delete Leave (User draft/pending)
  const deleteLeaveMutation = useMutation({
    mutationFn: (id: number) => leaveApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
      showToast('Leave request cancelled.', 'success');
      setDeleteLeaveId(null);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to cancel leave request.', 'error');
    }
  });

  // Add Holiday (HR)
  const addHolidayMutation = useMutation({
    mutationFn: (data: any) => holidaysApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      showToast('Holiday added successfully!', 'success');
      setShowAddHolidayModal(false);
      setHolidayName('');
      setHolidayDate('');
      setHolidayType('national');
      setHolidayDesc('');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to add holiday.', 'error');
    }
  });

  // Delete Holiday (HR)
  const deleteHolidayMutation = useMutation({
    mutationFn: (id: number) => holidaysApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      showToast('Holiday deleted successfully.', 'success');
      setDeleteHolidayId(null);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to delete holiday.', 'error');
    }
  });

  // ─── Calendar Logic ─────────────────────────────────────────────────────────
  const { calendarDays, monthYearLabel } = useMemo(() => {
    const date = new Date(currentYear, currentMonth - 1, 1);
    const label = date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
    
    const startDayOfWeek = date.getDay(); // 0 is Sunday
    const totalDays = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<number | null> = [];
    // Pad initial empty blocks
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    // Fill days
    for (let d = 1; d <= totalDays; d++) {
      days.push(d);
    }
    return { calendarDays: days, monthYearLabel: label };
  }, [currentMonth, currentYear]);

  // Log map lookup for calendar styling
  const logsMap = useMemo(() => {
    const map: Record<string, any> = {};
    logsList.forEach((log: any) => {
      if (log.date) {
        // Date can be full ISO or date string
        const dateStr = log.date.split('T')[0];
        map[dateStr] = log;
      }
    });
    return map;
  }, [logsList]);

  // Month change helpers
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Clock Actions Handler
  const handleClockIn = (e: React.FormEvent) => {
    e.preventDefault();
    clockInMutation.mutate({
      notes: clockInNotes,
      location: clockInLocation,
    });
  };

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveTypeId || !leaveStartDate || !leaveEndDate) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }
    applyLeaveMutation.mutate({
      leave_type_id: parseInt(leaveTypeId),
      start_date: leaveStartDate,
      end_date: leaveEndDate,
      reason: leaveReason,
    });
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName || !holidayDate) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }
    addHolidayMutation.mutate({
      name: holidayName,
      date: holidayDate,
      type: holidayType,
      description: holidayDesc,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem', height: '100%', overflowY: 'auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', flexShrink: 0 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CalendarIcon size={24} style={{ color: 'var(--accent)' }} />
          Attendance & Leave Center
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Clock-in working hours, manage leave applications, check national calendars, and audit team presence logs.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', height: '48px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '1.5rem', height: '100%', overflowX: 'auto', scrollbarWidth: 'none' }}>
          <button
            onClick={() => setActiveTab('my_attendance')}
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              color: activeTab === 'my_attendance' ? 'var(--accent)' : 'var(--text-secondary)',
              borderStyle: 'solid',
              borderWidth: '0px 0px 2px 0px',
              borderColor: activeTab === 'my_attendance' ? 'var(--accent)' : 'transparent',
              fontWeight: 600,
              fontSize: '0.875rem',
              background: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            My Attendance
          </button>
          
          {isHR && (
            <button
              onClick={() => setActiveTab('team_registry')}
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                color: activeTab === 'team_registry' ? 'var(--accent)' : 'var(--text-secondary)',
                borderStyle: 'solid',
                borderWidth: '0px 0px 2px 0px',
                borderColor: activeTab === 'team_registry' ? 'var(--accent)' : 'transparent',
                fontWeight: 600,
                fontSize: '0.875rem',
                background: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Team Registry
            </button>
          )}

          <button
            onClick={() => setActiveTab('leave_requests')}
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              color: activeTab === 'leave_requests' ? 'var(--accent)' : 'var(--text-secondary)',
              borderStyle: 'solid',
              borderWidth: '0px 0px 2px 0px',
              borderColor: activeTab === 'leave_requests' ? 'var(--accent)' : 'transparent',
              fontWeight: 600,
              fontSize: '0.875rem',
              background: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Leave Requests
          </button>

          <button
            onClick={() => setActiveTab('holidays')}
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              color: activeTab === 'holidays' ? 'var(--accent)' : 'var(--text-secondary)',
              borderStyle: 'solid',
              borderWidth: '0px 0px 2px 0px',
              borderColor: activeTab === 'holidays' ? 'var(--accent)' : 'transparent',
              fontWeight: 600,
              fontSize: '0.875rem',
              background: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Holiday Calendar
          </button>
        </div>
      </div>

      {/* ─── TAB: MY ATTENDANCE ────────────────────────────────────────────────── */}
      {activeTab === 'my_attendance' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          
          {/* Left Panel: Clock actions and Stats */}
          <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Clock Widget */}
            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ padding: '0.75rem', background: 'var(--accent-subtle)', borderRadius: '50%', color: 'var(--accent)', display: 'flex', border: '1px solid var(--border-subtle)' }}>
                <Clock size={32} />
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace', margin: 0, letterSpacing: '-0.05em' }}>
                  {timerText}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, margin: '4px 0 0 0' }}>
                  Today's Working Hours
                </p>
              </div>

              {todayRecord && todayRecord.check_in_at && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', padding: '0.75rem 1rem', background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>Active Work Session</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Clock In Time:</span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {new Date(todayRecord.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Location:</span>
                    <span style={{ fontWeight: 600 }}>{todayRecord.location || 'Office'}</span>
                  </div>
                </div>
              )}

              {!todayRecord || !todayRecord.check_in_at ? (
                /* Clock In Form */
                <form onSubmit={handleClockIn} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Location</label>
                      <select 
                        value={clockInLocation} 
                        onChange={(e) => setClockInLocation(e.target.value)} 
                        className="form-input"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8125rem' }}
                      >
                        {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Notes (optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Starting tasks, meeting client..." 
                      value={clockInNotes} 
                      onChange={(e) => setClockInNotes(e.target.value)}
                      className="form-input" 
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8125rem' }}
                    />
                  </div>
                  <button type="submit" disabled={clockInMutation.isPending} className="btn btn-primary" style={{ width: '100%', padding: '0.625rem' }}>
                    <Play size={16} style={{ marginRight: '0.375rem' }} /> Clock In
                  </button>
                </form>
              ) : (
                /* Clock Out Button */
                <button 
                  onClick={() => setShowClockOutModal(true)} 
                  disabled={clockOutMutation.isPending} 
                  className="btn btn-danger" 
                  style={{ width: '100%', padding: '0.625rem' }}
                >
                  <Square size={16} style={{ marginRight: '0.375rem' }} /> Clock Out / Finish Day
                </button>
              )}
            </div>

            {/* Monthly Stats */}
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', margin: 0 }}>
                {monthYearLabel} Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div style={{ background: 'var(--surface-elevated)', padding: '0.75rem', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--success)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Present</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--success)' }}>{summary?.present_days || 0}</div>
                </div>
                <div style={{ background: 'var(--surface-elevated)', padding: '0.75rem', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--danger)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Absent</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--danger)' }}>{summary?.absent_days || 0}</div>
                </div>
                <div style={{ background: 'var(--surface-elevated)', padding: '0.75rem', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--info)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Leaves</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--info)' }}>{summary?.leave_days || 0}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.25rem 0 0.25rem', fontSize: '0.8125rem', borderTop: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Daily Average Worked Hours:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{summary?.avg_daily_hours || 0} hrs</span>
              </div>
            </div>
          </div>

          {/* Right Panel: Calendar & Recent Logs */}
          <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Calendar Widget */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {monthYearLabel} Calendar
                </h3>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <button onClick={handlePrevMonth} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem' }}>&larr;</button>
                  <button onClick={handleNextMonth} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem' }}>&rarr;</button>
                </div>
              </div>

              {/* Day Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
              </div>

              {/* Grid Days */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
                {calendarDays.map((dayNum, idx) => {
                  if (dayNum === null) {
                    return <div key={`empty-${idx}`} style={{ aspectRatio: '1', display: 'flex' }} />;
                  }

                  const dayStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const log = logsMap[dayStr];
                  
                  let dayStyle: React.CSSProperties = {
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface-elevated)',
                    color: 'var(--text-secondary)',
                    border: '1px solid transparent',
                    cursor: 'default',
                  };

                  if (log) {
                    if (log.status === 'present') {
                      dayStyle = { ...dayStyle, background: 'var(--success-subtle)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)' };
                    } else if (log.status === 'partial') {
                      dayStyle = { ...dayStyle, background: 'var(--warning-subtle)', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.3)' };
                    } else if (log.status === 'leave') {
                      dayStyle = { ...dayStyle, background: 'var(--info-subtle)', color: 'var(--info)', border: '1px solid rgba(59,130,246,0.3)' };
                    } else if (log.status === 'absent') {
                      dayStyle = { ...dayStyle, background: 'var(--danger-subtle)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' };
                    } else if (log.status === 'holiday') {
                      dayStyle = { ...dayStyle, background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid rgba(124,58,237,0.3)' };
                    }
                  }

                  return (
                    <div 
                      key={`day-${dayNum}`} 
                      style={dayStyle}
                      title={log ? `${log.status.toUpperCase()} worked: ${log.break_minutes ? `break ${log.break_minutes}m` : 'no breaks'}` : 'No records logged'}
                    >
                      {dayNum}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Logs List */}
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', margin: 0 }}>
                Logs in {monthYearLabel}
              </h3>
              {loadingLogs ? (
                <SkeletonTable rows={4} cols={5} />
              ) : logsList.length === 0 ? (
                <EmptyState title="No logs found" description="No logs registered for this month." />
              ) : (
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Clock In</th>
                        <th>Clock Out</th>
                        <th>Breaks</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logsList.map((log: any) => (
                        <tr key={log.id}>
                          <td style={{ fontWeight: 500 }}>{formatDate(log.date)}</td>
                          <td style={{ fontFamily: 'monospace' }}>
                            {log.check_in_at ? new Date(log.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td style={{ fontFamily: 'monospace' }}>
                            {log.check_out_at ? new Date(log.check_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td>{log.break_minutes} mins</td>
                          <td>
                            <span className={`badge ${
                              log.status === 'present' ? 'badge-success' :
                              log.status === 'partial' ? 'badge-warning' :
                              log.status === 'leave' ? 'badge-info' :
                              log.status === 'holiday' ? 'badge-accent' :
                              'badge-muted'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: TEAM REGISTRY (HR ONLY) ────────────────────────────────────── */}
      {activeTab === 'team_registry' && isHR && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', padding: '1rem 1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Live Team Presence Status
            </h3>
            <span className="badge badge-accent">
              {teamRegistry.filter((t: any) => t.attendance?.status === 'present').length} active now
            </span>
          </div>

          {teamRegistry.length === 0 ? (
            <EmptyState title="No employees found" description="No employee records loaded." />
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Role(s)</th>
                    <th>Today's Clock In</th>
                    <th>Today's Clock Out</th>
                    <th>Current Status</th>
                  </tr>
                </thead>
                <tbody>
                  {teamRegistry.map((t: any) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.name}</td>
                      <td>{t.roles?.join(', ') || 'Employee'}</td>
                      <td style={{ fontFamily: 'monospace' }}>{t.attendance?.check_in_at || '—'}</td>
                      <td style={{ fontFamily: 'monospace' }}>{t.attendance?.check_out_at || '—'}</td>
                      <td>
                        <span className={`badge ${
                          t.attendance?.status === 'present' ? 'badge-success' :
                          t.attendance?.status === 'partial' ? 'badge-warning' :
                          t.attendance?.status === 'leave' ? 'badge-info' :
                          'badge-muted'
                        }`}>
                          {t.attendance?.status || 'absent'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: LEAVE REQUESTS ──────────────────────────────────────────────── */}
      {activeTab === 'leave_requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowApplyLeaveModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Plus size={16} /> Request Leave
            </button>
          </div>

          {/* Pending HR Approvals Section (HR only) */}
          {isHR && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', gap: '1rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', margin: 0 }}>
                Pending Approval Requests
              </h3>
              
              {leaveRequestsList.filter((req: any) => req.status === 'pending').length === 0 ? (
                <EmptyState title="No pending requests" description="No pending approval requests." />
              ) : (
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Leave Type</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Days</th>
                        <th>Reason</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRequestsList.filter((req: any) => req.status === 'pending').map((req: any) => (
                        <tr key={req.id}>
                          <td style={{ fontWeight: 600 }}>{req.user?.name}</td>
                          <td>
                            <span style={{ color: req.leave_type?.color || 'var(--text-primary)', fontWeight: 600 }}>
                              {req.leave_type?.name}
                            </span>
                          </td>
                          <td>{formatDate(req.start_date)}</td>
                          <td>{formatDate(req.end_date)}</td>
                          <td>{req.days_count}</td>
                          <td style={{ maxWidth: '200px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={req.reason}>
                            {req.reason || '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.375rem' }}>
                              <button 
                                onClick={() => approveLeaveMutation.mutate(req.id)}
                                disabled={approveLeaveMutation.isPending}
                                className="btn btn-success btn-sm btn-icon" 
                                title="Approve"
                              >
                                <Check size={14} />
                              </button>
                              <button 
                                onClick={() => setRejectLeaveId(req.id)}
                                className="btn btn-danger btn-sm btn-icon" 
                                title="Reject"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* User Requests History Section */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', gap: '1rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', margin: 0 }}>
              Leave History & Status
            </h3>

            {leaveRequestsList.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No leave requests filed yet.</div>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      {isHR && <th>Employee</th>}
                      <th>Leave Type</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Days</th>
                      <th>Status</th>
                      <th>Approved/Rejected By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequestsList.map((req: any) => (
                      <tr key={req.id}>
                        {isHR && <td style={{ fontWeight: 600 }}>{req.user?.name}</td>}
                        <td>
                          <span style={{ color: req.leave_type?.color || 'var(--text-primary)', fontWeight: 600 }}>
                            {req.leave_type?.name}
                          </span>
                        </td>
                        <td>{formatDate(req.start_date)}</td>
                        <td>{formatDate(req.end_date)}</td>
                        <td>{req.days_count}</td>
                        <td>
                          <span className={`badge ${
                            req.status === 'approved' ? 'badge-success' :
                            req.status === 'rejected' ? 'badge-danger' :
                            'badge-warning'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td>{req.approver?.name || '—'}</td>
                        <td>
                          {req.status === 'pending' && req.user_id === user?.id && (
                            <button 
                              onClick={() => setDeleteLeaveId(req.id)}
                              className="btn btn-ghost btn-sm btn-icon" 
                              title="Cancel Request"
                              style={{ color: 'var(--danger)' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: HOLIDAY CALENDAR ────────────────────────────────────────────── */}
      {activeTab === 'holidays' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Year:</label>
              <select 
                value={currentYear} 
                onChange={(e) => setCurrentYear(parseInt(e.target.value))} 
                className="form-input"
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.875rem' }}
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
            
            {isHR && (
              <button onClick={() => setShowAddHolidayModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Plus size={16} /> Add Holiday
              </button>
            )}
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            {holidaysList.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>
                No holidays registered for {currentYear}.
              </div>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Holiday Name</th>
                      <th>Type</th>
                      <th>Description</th>
                      {isHR && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {holidaysList.map((hol: any) => (
                      <tr key={hol.id}>
                        <td style={{ fontWeight: 600 }}>{formatDate(hol.date)}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{hol.name}</td>
                        <td>
                          <span className={`badge ${
                            hol.type === 'national' ? 'badge-accent' :
                            hol.type === 'regional' ? 'badge-info' :
                            'badge-muted'
                          }`}>
                            {hol.type}
                          </span>
                        </td>
                        <td>{hol.description || '—'}</td>
                        {isHR && (
                          <td>
                            <button 
                              onClick={() => setDeleteHolidayId(hol.id)}
                              className="btn btn-ghost btn-sm btn-icon" 
                              title="Delete Holiday"
                              style={{ color: 'var(--danger)' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODALS & DRAWERS ─────────────────────────────────────────────────── */}

      {/* Clock Out Break minutes modal */}
      {showClockOutModal && (
        <InputModal
          title="Finish Work Session"
          message="Specify total break minutes taken today (minutes will be excluded from worked hours):"
          placeholder="Break duration in minutes (e.g. 45)"
          defaultValue="0"
          confirmLabel="Clock Out"
          onConfirm={(val) => {
            const mins = parseInt(val) || 0;
            clockOutMutation.mutate({ break_minutes: mins });
            setShowClockOutModal(false);
          }}
          onCancel={() => setShowClockOutModal(false)}
        />
      )}

      {/* Reject Leave Request (HR) */}
      {rejectLeaveId !== null && (
        <InputModal
          title="Reject Leave Request"
          message="Provide a brief reason for rejecting this leave request:"
          placeholder="Rejection reason..."
          defaultValue=""
          confirmLabel="Reject Request"
          onConfirm={(val) => {
            rejectLeaveMutation.mutate({ id: rejectLeaveId, reason: val });
          }}
          onCancel={() => setRejectLeaveId(null)}
        />
      )}

      {/* Cancel Leave Request Confirmation */}
      {deleteLeaveId !== null && (
        <ConfirmModal
          title="Cancel Leave Request"
          message="Are you sure you want to cancel and delete this pending leave request? This action cannot be undone."
          confirmLabel="Cancel Request"
          danger={true}
          onConfirm={() => deleteLeaveMutation.mutate(deleteLeaveId)}
          onCancel={() => setDeleteLeaveId(null)}
        />
      )}

      {/* Delete Holiday Confirmation (HR) */}
      {deleteHolidayId !== null && (
        <ConfirmModal
          title="Delete Holiday"
          message="Are you sure you want to delete this holiday from the corporate calendar?"
          confirmLabel="Delete Holiday"
          danger={true}
          onConfirm={() => deleteHolidayMutation.mutate(deleteHolidayId)}
          onCancel={() => setDeleteHolidayId(null)}
        />
      )}

      {/* Apply Leave Modal */}
      {showApplyLeaveModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Apply for Leave
            </h3>
            
            <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Leave Type *</label>
                <select 
                  required 
                  value={leaveTypeId} 
                  onChange={(e) => setLeaveTypeId(e.target.value)} 
                  className="form-input"
                >
                  <option value="">Select Leave Type</option>
                  {leaveTypes.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.is_paid ? 'Paid' : 'Unpaid'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Start Date *</label>
                  <input 
                    type="date" 
                    required 
                    value={leaveStartDate} 
                    onChange={(e) => setLeaveStartDate(e.target.value)} 
                    className="form-input" 
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">End Date *</label>
                  <input 
                    type="date" 
                    required 
                    value={leaveEndDate} 
                    onChange={(e) => setLeaveEndDate(e.target.value)} 
                    className="form-input" 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason / Notes</label>
                <textarea 
                  rows={3} 
                  placeholder="Provide details about your leave application..."
                  value={leaveReason} 
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="form-input"
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowApplyLeaveModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={applyLeaveMutation.isPending} className="btn btn-primary">
                  {applyLeaveMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Holiday Modal (HR) */}
      {showAddHolidayModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Add Corporate Calendar Holiday
            </h3>
            
            <form onSubmit={handleAddHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Holiday Name *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Independence Day" 
                  value={holidayName} 
                  onChange={(e) => setHolidayName(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Date *</label>
                  <input 
                    type="date" 
                    required 
                    value={holidayDate} 
                    onChange={(e) => setHolidayDate(e.target.value)} 
                    className="form-input" 
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Type *</label>
                  <select 
                    value={holidayType} 
                    onChange={(e) => setHolidayType(e.target.value)} 
                    className="form-input"
                  >
                    <option value="national">National</option>
                    <option value="regional">Regional</option>
                    <option value="optional">Optional</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea 
                  rows={2} 
                  placeholder="Additional details..." 
                  value={holidayDesc} 
                  onChange={(e) => setHolidayDesc(e.target.value)} 
                  className="form-input"
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddHolidayModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={addHolidayMutation.isPending} className="btn btn-primary">
                  {addHolidayMutation.isPending ? 'Adding...' : 'Add Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
