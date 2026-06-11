'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Clock, CheckCircle, AlertCircle, Play, Square, 
  Coffee, Users, ArrowRight, Sun, UserCheck, ShieldAlert
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { formatDate } from '@/lib/utils';

interface AttendanceLog {
  date: string;
  checkIn: string;
  checkOut: string | null;
  breaks: number; // minutes
  status: 'present' | 'partial' | 'absent' | 'leave';
}

const INITIAL_LOGS: AttendanceLog[] = [
  { date: '2026-06-01', checkIn: '09:15 AM', checkOut: '06:30 PM', breaks: 45, status: 'present' },
  { date: '2026-06-02', checkIn: '09:05 AM', checkOut: '06:15 PM', breaks: 50, status: 'present' },
  { date: '2026-06-03', checkIn: '09:30 AM', checkOut: '06:05 PM', breaks: 60, status: 'present' },
  { date: '2026-06-04', checkIn: '10:15 AM', checkOut: '04:30 PM', breaks: 30, status: 'partial' },
  { date: '2026-06-05', checkIn: '09:00 AM', checkOut: '06:00 PM', breaks: 40, status: 'present' },
  { date: '2026-06-08', checkIn: '09:10 AM', checkOut: '06:45 PM', breaks: 45, status: 'present' },
  { date: '2026-06-09', checkIn: '—', checkOut: '—', breaks: 0, status: 'leave' },
  { date: '2026-06-10', checkIn: '09:20 AM', checkOut: '06:10 PM', breaks: 55, status: 'present' },
];

const MOCK_TEAM_REGISTRY = [
  { name: 'Amit Verma', role: 'Developer', status: 'active', checkIn: '09:05 AM', location: 'Office' },
  { name: 'Rohan Mehta', role: 'Designer', status: 'active', checkIn: '09:15 AM', location: 'Remote' },
  { name: 'Sarah Dsouza', role: 'Developer', status: 'break', checkIn: '08:55 AM', location: 'Office' },
  { name: 'Priya Singh', role: 'Project Manager', status: 'active', checkIn: '09:00 AM', location: 'Office' },
  { name: 'Vikram Nair', role: 'Accounts', status: 'absent', checkIn: '—', location: '—' },
  { name: 'Anjali Patel', role: 'HR Manager', status: 'leave', checkIn: '—', location: '—' },
];

export default function AttendancePage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'my_attendance' | 'team_registry'>('my_attendance');

  // Clock state
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [logs, setLogs] = useState<AttendanceLog[]>(INITIAL_LOGS);
  const [timerText, setTimerText] = useState('00:00:00');
  const [timeCheckedIn, setTimeCheckedIn] = useState<Date | null>(null);

  // Checks if user is Founder/Admin/HR
  const isHR = useMemo(() => {
    if (!user) return true;
    return user.roles.some(r => {
      const name = typeof r === 'string' ? r : r?.name || '';
      return ['founder', 'admin', 'hr'].includes(name.toLowerCase());
    });
  }, [user]);

  // Load state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCheckIn = localStorage.getItem('attendance_check_in');
      const storedBreak = localStorage.getItem('attendance_on_break');
      if (storedCheckIn) {
        setIsCheckedIn(true);
        setCheckInTime(new Date(storedCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setTimeCheckedIn(new Date(storedCheckIn));
      }
      if (storedBreak === 'true') {
        setIsOnBreak(true);
      }
    }
  }, []);

  // Update live clock timer
  useEffect(() => {
    let interval: any;
    if (isCheckedIn && timeCheckedIn && !isOnBreak) {
      interval = setInterval(() => {
        const diff = new Date().getTime() - timeCheckedIn.getTime();
        const hrs = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const mins = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const secs = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        setTimerText(`${hrs}:${mins}:${secs}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCheckedIn, timeCheckedIn, isOnBreak]);

  const handleCheckIn = () => {
    const now = new Date();
    localStorage.setItem('attendance_check_in', now.toISOString());
    setIsCheckedIn(true);
    setCheckInTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setTimeCheckedIn(now);
  };

  const handleBreakToggle = () => {
    const nextState = !isOnBreak;
    setIsOnBreak(nextState);
    localStorage.setItem('attendance_on_break', String(nextState));
  };

  const handleCheckOut = () => {
    if (confirm('Are you sure you want to clock out for today?')) {
      const now = new Date();
      const checkOutStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const newLog: AttendanceLog = {
        date: now.toISOString().split('T')[0],
        checkIn: checkInTime || '—',
        checkOut: checkOutStr,
        breaks: isOnBreak ? 15 : 45, // mock break duration
        status: 'present'
      };

      setLogs([newLog, ...logs]);
      setIsCheckedIn(false);
      setIsOnBreak(false);
      setCheckInTime(null);
      setTimeCheckedIn(null);
      setTimerText('00:00:00');
      
      localStorage.removeItem('attendance_check_in');
      localStorage.removeItem('attendance_on_break');
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <CalendarIcon className="text-violet-500 w-6 h-6" />
            Attendance Management
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Check-in to log working hours, schedule breaks, and audit team attendance logs.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 pb-2">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('my_attendance')}
            className={`pb-2 text-sm font-semibold border-b-2 transition ${
              activeTab === 'my_attendance' 
                ? 'border-violet-500 text-violet-400' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            My Attendance
          </button>
          {isHR && (
            <button
              onClick={() => setActiveTab('team_registry')}
              className={`pb-2 text-sm font-semibold border-b-2 transition ${
                activeTab === 'team_registry' 
                  ? 'border-violet-500 text-violet-400' 
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Team Registry
            </button>
          )}
        </div>
      </div>

      {/* Tab: My Attendance */}
      {activeTab === 'my_attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Clock Actions & Mini Stats */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Clock Widget */}
            <div className="bg-zinc-900 border border-zinc-850 p-6 rounded-xl flex flex-col items-center justify-center text-center space-y-5 shadow-lg">
              <div className="p-3 bg-zinc-800/80 rounded-full text-violet-400 border border-zinc-750">
                <Clock size={36} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-zinc-100 tracking-tight font-mono">{timerText}</h3>
                <p className="text-xs text-zinc-400 mt-1 uppercase tracking-wider font-semibold">Logged Working Hours Today</p>
              </div>

              {isCheckedIn && (
                <div className="text-xs text-zinc-400 flex items-center gap-1.5 bg-zinc-850 px-3 py-1.5 rounded-lg border border-zinc-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Clocked In at <span className="font-bold text-zinc-250 font-mono">{checkInTime}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 w-full">
                {!isCheckedIn ? (
                  <button 
                    onClick={handleCheckIn}
                    className="flex-1 py-3 bg-violet-650 hover:bg-violet-600 text-zinc-100 font-bold text-sm rounded-lg flex items-center justify-center gap-2 transition"
                  >
                    <Play size={16} /> Check In Today
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={handleBreakToggle}
                      className={`flex-1 py-3 font-bold text-sm rounded-lg flex items-center justify-center gap-2 transition border ${
                        isOnBreak 
                          ? 'bg-amber-600/90 text-zinc-100 border-amber-500/30 hover:bg-amber-550' 
                          : 'bg-zinc-800 text-zinc-300 border-zinc-750 hover:bg-zinc-750'
                      }`}
                    >
                      <Coffee size={16} /> {isOnBreak ? 'Resume Work' : 'Start Break'}
                    </button>
                    <button 
                      onClick={handleCheckOut}
                      className="flex-1 py-3 bg-red-650 hover:bg-red-600 text-zinc-100 font-bold text-sm rounded-lg flex items-center justify-center gap-2 transition"
                    >
                      <Square size={16} /> Check Out
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Quick Stats Panel */}
            <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2">Monthly Stats Summary</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-850">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Present Days</span>
                  <p className="text-base font-bold text-emerald-400 mt-1">{logs.filter(l => l.status === 'present').length}</p>
                </div>
                <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-850">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Leave / Absents</span>
                  <p className="text-base font-bold text-zinc-400 mt-1">{logs.filter(l => l.status === 'leave').length}</p>
                </div>
                <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-850">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Avg. Daily Hrs</span>
                  <p className="text-base font-bold text-violet-400 mt-1">8.5h</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Monthly Visual Calendar & Logs */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Visual Calendar */}
            <div className="bg-zinc-900 border border-zinc-850 p-6 rounded-xl space-y-4 shadow-lg">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-200">June 2026 Grid View</h3>
                <div className="flex gap-2 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> Present</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500" /> Partial</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500" /> Leave</span>
                </div>
              </div>

              {/* Grid 7 Columns for Days */}
              <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="text-zinc-500 font-bold py-1">{day}</div>
                ))}
                
                {/* Seed Grid items for June 2026 */}
                {Array.from({ length: 30 }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateStr = `2026-06-${String(dayNum).padStart(2, '0')}`;
                  const log = logs.find(l => l.date === dateStr);
                  
                  let bgClass = 'bg-zinc-950/40 border border-zinc-850 text-zinc-500';
                  if (log) {
                    if (log.status === 'present') bgClass = 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/50';
                    if (log.status === 'partial') bgClass = 'bg-amber-950/30 text-amber-400 border border-amber-900/50';
                    if (log.status === 'leave') bgClass = 'bg-blue-950/30 text-blue-400 border border-blue-900/50';
                  }

                  return (
                    <div 
                      key={dayNum} 
                      className={`py-2 rounded-lg font-bold ${bgClass}`}
                      title={log ? `${log.status.toUpperCase()} check-in: ${log.checkIn}` : 'No Log'}
                    >
                      {dayNum}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Attendance Logs List */}
            <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl space-y-3">
              <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2">Recent Logs</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-zinc-400 border-b border-zinc-850 pb-2 uppercase tracking-wider font-bold">
                      <th className="py-2">Date</th>
                      <th className="py-2">Clock In</th>
                      <th className="py-2">Clock Out</th>
                      <th className="py-2">Breaks</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850 text-zinc-300">
                    {logs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-zinc-850/20">
                        <td className="py-2 font-medium">{formatDate(log.date)}</td>
                        <td className="py-2 font-mono font-semibold">{log.checkIn}</td>
                        <td className="py-2 font-mono font-semibold">{log.checkOut || '—'}</td>
                        <td className="py-2">{log.breaks}m</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            log.status === 'present' ? 'border-emerald-900/50 bg-emerald-950/30 text-emerald-400' :
                            log.status === 'partial' ? 'border-amber-900/50 bg-amber-950/30 text-amber-400' :
                            'border-blue-900/50 bg-blue-950/30 text-blue-400'
                          }`}>
                            {log.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Tab: Team Registry (Founder / HR view only) */}
      {activeTab === 'team_registry' && isHR && (
        <div className="bg-zinc-900 border border-zinc-850 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 bg-zinc-950/40 border-b border-zinc-800 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-zinc-200">Live Team Presence Status</h3>
            <span className="text-xs bg-zinc-800 px-2.5 py-0.5 rounded-full font-bold text-zinc-300">
              {MOCK_TEAM_REGISTRY.filter(t => t.status === 'active').length} active now
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Employee</th>
                  <th className="p-4">Designated Role</th>
                  <th className="p-4">Daily Check-In</th>
                  <th className="p-4">Work Location</th>
                  <th className="p-4">Current Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {MOCK_TEAM_REGISTRY.map((t, idx) => (
                  <tr key={idx} className="hover:bg-zinc-900/40 transition">
                    <td className="p-4 font-semibold text-zinc-200">{t.name}</td>
                    <td className="p-4 text-zinc-400 text-xs font-medium">{t.role}</td>
                    <td className="p-4 font-mono text-xs">{t.checkIn}</td>
                    <td className="p-4 text-zinc-300 text-xs">{t.location}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        t.status === 'active' ? 'border-emerald-900/50 bg-emerald-950/30 text-emerald-400' :
                        t.status === 'break' ? 'border-amber-900/50 bg-amber-950/30 text-amber-400' :
                        t.status === 'leave' ? 'border-blue-900/50 bg-blue-950/30 text-blue-400' :
                        'border-zinc-800 bg-zinc-850 text-zinc-500'
                      }`}>
                        {t.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
