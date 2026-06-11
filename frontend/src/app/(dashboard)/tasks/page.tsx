'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare, Search, Plus, List, LayoutGrid, Calendar, MoreHorizontal,
  Trash2, User, Clock, AlertCircle, PlusCircle, CheckCircle2, RefreshCw, X
} from 'lucide-react';
import {
  tasks as tasksApi,
  projects as projectsApi,
  users as usersApi,
  Task, Project, User as UserType
} from '@/lib/api';
import TaskDetailSlideOver from '@/components/TaskDetailSlideOver';
import { formatDate } from '@/lib/utils';

const STATUS_COLUMNS = [
  { id: 'todo', label: 'To Do', color: '#3b82f6', bg: 'rgba(59,130,246,0.05)' },
  { id: 'in_progress', label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.05)' },
  { id: 'review', label: 'Review', color: '#7c3aed', bg: 'rgba(124,58,237,0.05)' },
  { id: 'blocked', label: 'Blocked', color: '#ef4444', bg: 'rgba(239,68,68,0.05)' },
  { id: 'done', label: 'Done', color: '#10b981', bg: 'rgba(16,185,129,0.05)' }
];

export default function TasksPage() {
  const queryClient = useQueryClient();

  // Layout & Navigation View Mode
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  // Drag and Drop Column state
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);

  // Selected Task for Slide-Over Drawer
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  // Create Task Form State
  const [createTitle, setCreateTitle] = useState('');
  const [createProjectId, setCreateProjectId] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createPriority, setCreatePriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [createAssigneeId, setCreateAssigneeId] = useState('');
  const [createDueDate, setCreateDueDate] = useState('');
  const [createEstimate, setCreateEstimate] = useState('');
  const [createError, setCreateError] = useState('');

  // ============================================================
  // Queries
  // ============================================================

  const { data: tasksData, isLoading, refetch } = useQuery({
    queryKey: ['globalTasks'],
    queryFn: async () => {
      const res = await tasksApi.list({ per_page: 250 });
      // If interceptor returns paginated response envelope, extract data array
      const payload = res.data as any;
      if (payload && Array.isArray(payload.data)) {
        return payload.data as Task[];
      }
      return (Array.isArray(payload) ? payload : []) as Task[];
    }
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projectsList'],
    queryFn: async () => {
      const res = await projectsApi.list({ per_page: 100 });
      const payload = res.data as any;
      if (payload && Array.isArray(payload.data)) {
        return payload.data;
      }
      return Array.isArray(payload) ? payload : [];
    }
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ['usersList'],
    queryFn: async () => {
      const res = await usersApi.list({ per_page: 100 });
      const payload = res.data as any;
      if (payload && Array.isArray(payload.data)) {
        return payload.data;
      }
      return Array.isArray(payload) ? payload : [];
    }
  });

  // ============================================================
  // Mutations
  // ============================================================

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: Task['status'] }) =>
      tasksApi.updateStatus(taskId, status),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['globalTasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['globalTasks']);
      if (previousTasks) {
        queryClient.setQueryData<Task[]>(
          ['globalTasks'],
          previousTasks.map((t) => (t.id === taskId ? { ...t, status } : t))
        );
      }
      return { previousTasks };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['globalTasks'], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['globalTasks'] });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalTasks'] });
      setShowCreateModal(false);
      resetCreateForm();
    },
    onError: (err: any) => {
      setCreateError(err.response?.data?.message || 'Failed to create task.');
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalTasks'] });
    }
  });

  // ============================================================
  // Helpers & Drag-and-Drop Handlers
  // ============================================================

  const resetCreateForm = () => {
    setCreateTitle('');
    setCreateProjectId('');
    setCreateDescription('');
    setCreatePriority('medium');
    setCreateAssigneeId('');
    setCreateDueDate('');
    setCreateEstimate('');
    setCreateError('');
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData('text/plain', id.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData('text/plain') || draggedTaskId?.toString();
    if (taskIdStr) {
      const taskId = parseInt(taskIdStr);
      updateStatusMutation.mutate({ taskId, status });
    }
    setDraggedTaskId(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim() || !createProjectId) {
      setCreateError('Task title and Project selection are required.');
      return;
    }

    createTaskMutation.mutate({
      title: createTitle,
      project_id: parseInt(createProjectId),
      description: createDescription || undefined,
      priority: createPriority,
      assigned_to: createAssigneeId ? parseInt(createAssigneeId) : undefined,
      due_date: createDueDate || undefined,
      estimated_hours: createEstimate ? parseFloat(createEstimate) : undefined,
      status: 'todo',
      completion_percentage: 0
    });
  };

  const handleCardClick = (id: number) => {
    setSelectedTaskId(id);
    setTaskDetailOpen(true);
  };

  // ============================================================
  // Filtering & Math Metrics
  // ============================================================

  const taskList = tasksData || [];

  const filteredTasks = taskList.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = !projectFilter || t.project_id === parseInt(projectFilter);
    const matchesPriority = !priorityFilter || t.priority === priorityFilter;
    const matchesAssignee = !assigneeFilter || t.assignee_id === parseInt(assigneeFilter);
    return matchesSearch && matchesProject && matchesPriority && matchesAssignee;
  });

  const todoTasks = filteredTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress');
  const reviewTasks = filteredTasks.filter((t) => t.status === 'review');
  const blockedTasks = filteredTasks.filter((t) => t.status === 'blocked');
  const doneTasks = filteredTasks.filter((t) => t.status === 'done');

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <CheckSquare className="text-violet-500 w-6 h-6" />
            Task Manager
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Track milestones, log timesheet workloads, and check project tasks progression.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle view mode */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition ${viewMode === 'kanban' ? 'bg-zinc-800 text-violet-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Kanban Board"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition ${viewMode === 'list' ? 'bg-zinc-800 text-violet-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="List View"
            >
              <List size={16} />
            </button>
          </div>

          <button
            onClick={() => refetch()}
            className="p-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-150 rounded-lg transition"
            title="Refresh tasks"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center gap-1.5"
          >
            <Plus size={16} /> Add Task
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STATUS_COLUMNS.map((col) => {
          const count = taskList.filter((t) => t.status === col.id).length;
          return (
            <div key={col.id} className="bg-zinc-900/60 border border-zinc-850 p-3.5 rounded-xl">
              <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: col.color }}>{col.label}</span>
              <h3 className="text-lg font-extrabold text-zinc-100 mt-1">{count}</h3>
            </div>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 text-zinc-500 w-4.5 h-4.5" />
          <input
            type="text"
            placeholder="Search tasks title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-880 text-zinc-100 text-sm rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Project filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-880 text-zinc-300 text-xs rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.project_number} - {p.name}</option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-880 text-zinc-300 text-xs rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          {/* Assignee filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-880 text-zinc-300 text-xs rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All Assignees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          {/* Clear Filters */}
          {(searchQuery || projectFilter || priorityFilter || assigneeFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setProjectFilter('');
                setPriorityFilter('');
                setAssigneeFilter('');
              }}
              className="text-xs text-zinc-400 hover:text-zinc-200 underline px-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Views */}
      {isLoading ? (
        <div className="p-12 text-center text-zinc-400 animate-pulse">Loading Tasks Board...</div>
      ) : viewMode === 'kanban' ? (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
          {STATUS_COLUMNS.map((col) => {
            const colTasks = 
              col.id === 'todo' ? todoTasks :
              col.id === 'in_progress' ? inProgressTasks :
              col.id === 'review' ? reviewTasks :
              col.id === 'blocked' ? blockedTasks : doneTasks;

            return (
              <div 
                key={col.id} 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id as Task['status'])}
                className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-3 flex flex-col space-y-3.5 min-h-[500px]"
                style={{ background: col.bg }}
              >
                {/* Column Title */}
                <div className="flex justify-between items-center border-b border-zinc-850 pb-2">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: col.color }} />
                    {col.label}
                  </span>
                  <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-bold">
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards Container */}
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[70vh] scrollbar-none">
                  {colTasks.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, t.id)}
                      onClick={() => handleCardClick(t.id)}
                      className="bg-zinc-900 border border-zinc-850 hover:border-zinc-700 p-3 rounded-lg cursor-grab active:cursor-grabbing transition shadow-sm hover:shadow flex flex-col space-y-2.5"
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[10px] text-zinc-500 font-mono">TSK-{t.id}</span>
                        <span 
                          className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded"
                          style={{
                            background: 
                              t.priority === 'urgent' ? 'rgba(239,68,68,0.1)' : 
                              t.priority === 'high' ? 'rgba(245,158,11,0.1)' : 'rgba(120,120,120,0.1)',
                            color: 
                              t.priority === 'urgent' ? 'var(--danger)' : 
                              t.priority === 'high' ? 'var(--warning)' : 'var(--text-secondary)'
                          }}
                        >
                          {t.priority}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-zinc-200 line-clamp-2 leading-relaxed">{t.title}</h4>
                      
                      {t.project && (
                        <div className="text-[10px] text-violet-400 font-medium truncate">
                          📁 {t.project.name}
                        </div>
                      )}

                      {/* Card Footer */}
                      <div className="pt-2 border-t border-zinc-850 flex items-center justify-between text-[10px] text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {t.due_date ? formatDate(t.due_date) : 'No due date'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {t.estimated_hours && (
                            <span className="font-mono text-[9px] bg-zinc-850 text-zinc-400 px-1.5 py-0.5 rounded">
                              {t.estimated_hours}h
                            </span>
                          )}
                          <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-300" title={t.assignee?.name || 'Unassigned'}>
                            {t.assignee ? t.assignee.name.substring(0, 2).toUpperCase() : '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <div className="py-6 text-center text-zinc-600 text-[10px] border border-dashed border-zinc-850 rounded-lg">
                      Empty column
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View (Table Mode) */
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 space-y-2">
              <CheckSquare className="mx-auto w-12 h-12 text-zinc-650" />
              <h3 className="font-semibold text-zinc-300">No Tasks Found</h3>
              <p className="text-xs text-zinc-500">Try adjusting your filters or create a task.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                    <th className="p-4">Task Info</th>
                    <th className="p-4">Project</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Assignee</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4 text-right">Estimate</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {filteredTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-900/40 transition">
                      <td className="p-4">
                        <button 
                          onClick={() => handleCardClick(t.id)}
                          className="font-semibold text-zinc-200 hover:text-violet-400 text-left transition"
                        >
                          {t.title}
                        </button>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">TSK-{t.id}</div>
                      </td>
                      <td className="p-4 font-medium text-zinc-450">
                        {t.project ? t.project.name : '—'}
                      </td>
                      <td className="p-4">
                        <span 
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{
                            background: 
                              t.status === 'done' ? 'rgba(16,185,129,0.15)' : 
                              t.status === 'in_progress' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
                            color: 
                              t.status === 'done' ? 'var(--success)' : 
                              t.status === 'in_progress' ? 'var(--warning)' : 'var(--accent)'
                          }}
                        >
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 capitalize">{t.priority}</td>
                      <td className="p-4">{t.assignee?.name || 'Unassigned'}</td>
                      <td className="p-4">{t.due_date ? formatDate(t.due_date) : '—'}</td>
                      <td className="p-4 text-right font-mono font-medium">{t.estimated_hours ? `${t.estimated_hours} hrs` : '—'}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this task?')) {
                              deleteTaskMutation.mutate(t.id);
                            }
                          }}
                          className="text-zinc-500 hover:text-red-400 transition"
                          title="Delete task"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowCreateModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-zinc-900 border border-zinc-850 p-6 rounded-xl z-50 shadow-2xl flex flex-col space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <PlusCircle className="text-violet-500 w-5 h-5" />
                Add New Task
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-zinc-200">
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400 flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="What needs to be completed?"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 text-zinc-150 text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">Select Project *</label>
                  <select
                    required
                    value={createProjectId}
                    onChange={(e) => setCreateProjectId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 text-zinc-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500"
                  >
                    <option value="">Select a project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">Priority</label>
                  <select
                    value={createPriority}
                    onChange={(e) => setCreatePriority(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-850 text-zinc-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Description</label>
                <textarea
                  placeholder="Task details and scope..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-850 text-zinc-150 text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">Assignee</label>
                  <select
                    value={createAssigneeId}
                    onChange={(e) => setCreateAssigneeId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 text-zinc-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">Due Date</label>
                  <input
                    type="date"
                    value={createDueDate}
                    onChange={(e) => setCreateDueDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 text-zinc-150 text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">Estimate (Hours)</label>
                  <input
                    type="number"
                    placeholder="e.g. 15"
                    value={createEstimate}
                    onChange={(e) => setCreateEstimate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 text-zinc-150 text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 bg-zinc-850 hover:bg-zinc-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="px-4 py-2 text-xs font-bold text-zinc-100 bg-violet-650 hover:bg-violet-600 rounded-lg transition"
                >
                  {createTaskMutation.isPending ? 'Saving...' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Slide-over Task Detail Drawer */}
      <TaskDetailSlideOver
        open={taskDetailOpen}
        onClose={() => setTaskDetailOpen(false)}
        taskId={selectedTaskId}
      />

    </div>
  );
}
