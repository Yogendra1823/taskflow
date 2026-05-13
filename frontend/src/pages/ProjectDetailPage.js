import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, ArrowLeft, Trash2, Edit3, MessageSquare, Calendar } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUSES = ['todo', 'in_progress', 'review', 'done'];
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showAddTask, setShowAddTask] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', assignee_id: '', due_date: '', status: 'todo' });
  const [memberEmail, setMemberEmail] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`).then(r => r.data),
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', projectId, filterStatus],
    queryFn: () => api.get(`/projects/${projectId}/tasks${filterStatus ? `?status=${filterStatus}` : ''}`).then(r => r.data),
  });

  const isAdmin = data?.members?.find(m => m.id === user.id)?.role === 'admin' || data?.project?.owner_id === user.id;

  const createTask = useMutation({
    mutationFn: (d) => api.post(`/projects/${projectId}/tasks`, d),
    onSuccess: () => {
      qc.invalidateQueries(['tasks', projectId]);
      qc.invalidateQueries(['dashboard']);
      setShowAddTask(false);
      resetTaskForm();
      toast.success('Task created!');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const updateTask = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/projects/${projectId}/tasks/${id}`, d),
    onSuccess: () => {
      qc.invalidateQueries(['tasks', projectId]);
      qc.invalidateQueries(['dashboard']);
      setEditingTask(null);
      resetTaskForm();
      toast.success('Task updated!');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const deleteTask = useMutation({
    mutationFn: (id) => api.delete(`/projects/${projectId}/tasks/${id}`),
    onSuccess: () => { qc.invalidateQueries(['tasks', projectId]); toast.success('Task deleted'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const quickUpdateStatus = useMutation({
    mutationFn: ({ id, status }) => api.put(`/projects/${projectId}/tasks/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries(['tasks', projectId]); qc.invalidateQueries(['dashboard']); },
  });

  const addMember = useMutation({
    mutationFn: (email) => api.post(`/projects/${projectId}/members`, { email, role: 'member' }),
    onSuccess: () => {
      qc.invalidateQueries(['project', projectId]);
      setMemberEmail('');
      setShowAddMember(false);
      toast.success('Member added!');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const removeMember = useMutation({
    mutationFn: (uid) => api.delete(`/projects/${projectId}/members/${uid}`),
    onSuccess: () => { qc.invalidateQueries(['project', projectId]); toast.success('Member removed'); },
  });

  const resetTaskForm = () => setTaskForm({ title: '', description: '', priority: 'medium', assignee_id: '', due_date: '', status: 'todo' });

  const handleTaskSubmit = (e) => {
    e.preventDefault();
    const payload = { ...taskForm, assignee_id: taskForm.assignee_id || undefined, due_date: taskForm.due_date || undefined };
    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, ...payload });
    } else {
      createTask.mutate(payload);
    }
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      assignee_id: task.assignee_id || '',
      due_date: task.due_date ? task.due_date.slice(0, 10) : '',
    });
    setShowAddTask(true);
  };

  const tasks = tasksData?.tasks || [];
  const project = data?.project;
  const members = data?.members || [];

  const tasksByStatus = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s);
    return acc;
  }, {});

  if (isLoading) return <div className="loading-page"><div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} /></div>;
  if (!project) return <div className="page"><p>Project not found.</p></div>;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/projects')}>
            <ArrowLeft size={18} />
          </button>
          <div className="project-dot-lg" style={{ background: project.color }} />
          <div>
            <h1 className="page-title">{project.name}</h1>
            {project.description && <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{project.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary" onClick={() => setShowMembers(true)}>
            <Users size={15} /> {project.member_count} members
          </button>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => { resetTaskForm(); setEditingTask(null); setShowAddTask(true); }}>
              <Plus size={15} /> Add Task
            </button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Filter:</span>
        <button
          className={`btn btn-sm ${!filterStatus ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilterStatus('')}
        >All</button>
        {STATUSES.map(s => (
          <button
            key={s}
            className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus(s)}
          >
            {STATUS_LABELS[s]} <span style={{ opacity: 0.7 }}>({(tasksByStatus[s] || []).length})</span>
          </button>
        ))}
      </div>

      {/* Kanban */}
      {tasksLoading ? (
        <div className="flex justify-center" style={{ padding: 60 }}>
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
      ) : (
        <div className="kanban-board">
          {STATUSES.filter(s => !filterStatus || s === filterStatus).map(status => (
            <div key={status} className="kanban-col">
              <div className="kanban-col-header">
                <div className="flex items-center gap-2">
                  <div className={`status-dot status-${status}`} />
                  <span className="kanban-col-title">{STATUS_LABELS[status]}</span>
                  <span className="tag">{tasksByStatus[status].length}</span>
                </div>
              </div>

              <div className="kanban-tasks">
                {tasksByStatus[status].map(task => (
                  <div key={task.id} className="task-card">
                    <div className="task-card-top">
                      <div className="flex items-center gap-2">
                        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="btn btn-ghost btn-icon" style={{ padding: 4 }} onClick={() => openEdit(task)}>
                          <Edit3 size={13} />
                        </button>
                        {isAdmin && (
                          <button
                            className="btn btn-ghost btn-icon"
                            style={{ padding: 4, color: 'var(--danger)' }}
                            onClick={() => { if (window.confirm('Delete task?')) deleteTask.mutate(task.id); }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="task-title">{task.title}</p>
                    {task.description && <p className="task-desc">{task.description}</p>}

                    <div className="task-card-footer">
                      <div className="flex items-center gap-2">
                        {task.assignee_name && (
                          <div className="flex items-center gap-1">
                            <div className="avatar avatar-sm" style={{ background: task.assignee_avatar || '#6366f1' }}>
                              {task.assignee_name.charAt(0)}
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.assignee_name.split(' ')[0]}</span>
                          </div>
                        )}
                        {parseInt(task.comment_count) > 0 && (
                          <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                            <MessageSquare size={11} />
                            <span>{task.comment_count}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {task.due_date && (
                          <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                            <Calendar size={11} />
                            <span>{format(new Date(task.due_date), 'MMM d')}</span>
                          </div>
                        )}
                        {status !== 'done' && (
                          <select
                            className="status-select"
                            value={task.status}
                            onChange={e => quickUpdateStatus.mutate({ id: task.id, status: e.target.value })}
                          >
                            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {tasksByStatus[status].length === 0 && (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                    No tasks
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Modal */}
      {showAddTask && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddTask(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editingTask ? 'Edit Task' : 'New Task'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => { setShowAddTask(false); resetTaskForm(); setEditingTask(null); }}>✕</button>
            </div>
            <form onSubmit={handleTaskSubmit} className="modal-body">
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  className="form-input"
                  placeholder="Task title"
                  value={taskForm.title}
                  onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  placeholder="Optional details..."
                  value={taskForm.description}
                  onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={taskForm.status} onChange={e => setTaskForm(p => ({ ...p, status: e.target.value }))}>
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-input" value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Assign to</label>
                  <select className="form-input" value={taskForm.assignee_id} onChange={e => setTaskForm(p => ({ ...p, assignee_id: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={taskForm.due_date}
                    onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-3" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-secondary flex-1" onClick={() => { setShowAddTask(false); resetTaskForm(); setEditingTask(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1" disabled={createTask.isPending || updateTask.isPending}>
                  {(createTask.isPending || updateTask.isPending) ? 'Saving...' : (editingTask ? 'Update Task' : 'Create Task')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembers && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowMembers(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Team Members</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowMembers(false)}>✕</button>
            </div>
            <div className="modal-body">
              {isAdmin && (
                <div>
                  {showAddMember ? (
                    <div className="flex gap-2">
                      <input
                        className="form-input"
                        placeholder="Email address"
                        value={memberEmail}
                        onChange={e => setMemberEmail(e.target.value)}
                        type="email"
                        autoFocus
                      />
                      <button
                        className="btn btn-primary"
                        onClick={() => addMember.mutate(memberEmail)}
                        disabled={!memberEmail || addMember.isPending}
                      >Add</button>
                      <button className="btn btn-secondary" onClick={() => setShowAddMember(false)}>✕</button>
                    </div>
                  ) : (
                    <button className="btn btn-secondary w-full" onClick={() => setShowAddMember(true)}>
                      <Plus size={15} /> Invite Member
                    </button>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {members.map(m => (
                  <div key={m.id} className="flex items-center justify-between" style={{
                    padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: 8
                  }}>
                    <div className="flex items-center gap-10">
                      <div className="avatar" style={{ background: m.avatar_color }}>{m.name.charAt(0)}</div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge badge-${m.role}`}>{m.role}</span>
                      {isAdmin && m.id !== user.id && project.owner_id !== m.id && (
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => removeMember.mutate(m.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .project-dot-lg {
          width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0;
        }
        .kanban-board {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
          align-items: start;
        }
        .kanban-col {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          min-height: 200px;
        }
        .kanban-col-header {
          padding: 14px 14px 10px;
          border-bottom: 1px solid var(--border);
        }
        .kanban-col-title { font-size: 13px; font-weight: 600; }
        .status-dot {
          width: 8px; height: 8px; border-radius: 50%;
        }
        .status-dot.status-todo { background: var(--todo); }
        .status-dot.status-in_progress { background: var(--in-progress); }
        .status-dot.status-review { background: var(--review); }
        .status-dot.status-done { background: var(--done); }
        .kanban-tasks { padding: 10px; display: flex; flex-direction: column; gap: 8px; }
        .task-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px;
          transition: box-shadow 0.2s;
        }
        .task-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        .task-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .task-title { font-size: 13px; font-weight: 600; line-height: 1.4; margin-bottom: 4px; }
        .task-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .task-card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; gap: 8px; }
        .status-select {
          background: var(--bg-hover);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-secondary);
          font-size: 11px;
          padding: 2px 6px;
          cursor: pointer;
          outline: none;
        }
        .status-select:focus { border-color: var(--accent); }
        @media (max-width: 768px) {
          .kanban-board { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
