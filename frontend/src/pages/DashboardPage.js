import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, AlertTriangle, FolderKanban, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { format, isAfter } from 'date-fns';

const fetchDashboard = () => api.get('/dashboard').then(r => r.data);



export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard });

  const stats = data?.stats;
  const completionRate = stats
    ? Math.round((parseInt(stats.completed_tasks) / Math.max(parseInt(stats.total_tasks), 1)) * 100)
    : 0;

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="avatar avatar-lg" style={{ background: user?.avatar_color }}>{initials}</div>
          <div>
            <p style={{ fontWeight: 600 }}>Hey, {user?.name?.split(' ')[0]}!</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Have a great day</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center" style={{ padding: 60 }}>
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid-4" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                <FolderKanban size={16} />
                <span className="stat-label">Projects</span>
              </div>
              <div className="stat-value">{stats?.total_projects || 0}</div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2" style={{ color: 'var(--info)' }}>
                <Clock size={16} />
                <span className="stat-label">In Progress</span>
              </div>
              <div className="stat-value">{stats?.in_progress_tasks || 0}</div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2" style={{ color: 'var(--success)' }}>
                <CheckCircle2 size={16} />
                <span className="stat-label">Completed</span>
              </div>
              <div className="stat-value">{stats?.completed_tasks || 0}</div>
              <div style={{ marginTop: 4 }}>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${completionRate}%`, background: 'var(--success)' }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{completionRate}% completion rate</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2" style={{ color: 'var(--danger)' }}>
                <AlertTriangle size={16} />
                <span className="stat-label">Overdue</span>
              </div>
              <div className="stat-value" style={{ color: parseInt(stats?.overdue_tasks) > 0 ? 'var(--danger)' : 'inherit' }}>
                {stats?.overdue_tasks || 0}
              </div>
            </div>
          </div>

          <div className="grid-2">
            {/* My Tasks */}
            <div className="card">
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>My Tasks</h2>
                <span className="tag">{data?.myTasks?.length || 0} pending</span>
              </div>

              {data?.myTasks?.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px 0' }}>
                  <CheckCircle2 size={32} />
                  <p>All caught up! No pending tasks.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data?.myTasks?.slice(0, 6).map(task => (
                    <Link key={task.id} to={`/projects/${task.project_id}`} style={{ textDecoration: 'none' }}>
                      <div className="task-row">
                        <div className="flex items-center gap-3" style={{ flex: 1, minWidth: 0 }}>
                          <div className={`badge badge-${task.priority}`} style={{ flexShrink: 0 }}>
                            {task.priority}
                          </div>
                          <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {task.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                          {task.due_date && (
                            <span style={{
                              fontSize: 11,
                              color: isAfter(new Date(), new Date(task.due_date)) ? 'var(--danger)' : 'var(--text-muted)'
                            }}>
                              {format(new Date(task.due_date), 'MMM d')}
                            </span>
                          )}
                          <div
                            className="project-dot"
                            style={{ background: task.project_color, width: 8, height: 8, borderRadius: '50%' }}
                          />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="card">
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent Activity</h2>
                <Link to="/projects" className="btn btn-ghost btn-sm flex items-center gap-1">
                  All projects <ArrowRight size={12} />
                </Link>
              </div>

              {data?.recentTasks?.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px 0' }}>
                  <Clock size={32} />
                  <p>No recent activity yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data?.recentTasks?.map(task => (
                    <Link key={task.id} to={`/projects/${task.project_id}`} style={{ textDecoration: 'none' }}>
                      <div className="task-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: task.project_color, flexShrink: 0
                          }} />
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                            {task.project_name}
                          </span>
                          <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {task.title}
                          </span>
                        </div>
                        <span className={`badge badge-${task.status}`} style={{ flexShrink: 0 }}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .task-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 10px;
          border-radius: 8px;
          transition: background 0.15s;
          cursor: pointer;
        }
        .task-row:hover { background: var(--bg-hover); }
      `}</style>
    </div>
  );
}
