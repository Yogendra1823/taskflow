import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Users, CheckSquare, ArrowRight, Trash2 } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const fetchProjects = () => api.get('/projects').then(r => r.data.projects);

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4', '#84cc16', '#f59e0b'];

export default function ProjectsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: projects = [], isLoading } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0] });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/projects', data),
    onSuccess: () => {
      qc.invalidateQueries(['projects']);
      setShowCreate(false);
      setForm({ name: '', description: '', color: COLORS[0] });
      toast.success('Project created!');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create project'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/projects/${id}`),
    onSuccess: () => { qc.invalidateQueries(['projects']); toast.success('Project deleted'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete'),
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Project name required'); return; }
    createMutation.mutate(form);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center" style={{ padding: 60 }}>
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none" viewBox="0 0 24 24">
            <path fill="currentColor" d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Z" opacity=".1" />
            <path stroke="currentColor" strokeWidth="1.5" d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Z" />
          </svg>
          <h3>No projects yet</h3>
          <p>Create your first project to start collaborating with your team.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create Project
          </button>
        </div>
      ) : (
        <div className="grid-3">
          {projects.map(p => {
            const progress = parseInt(p.task_count) > 0
              ? Math.round((parseInt(p.completed_tasks) / parseInt(p.task_count)) * 100)
              : 0;
            const isOwner = p.owner_id === user.id;

            return (
              <div key={p.id} className="project-card">
                <div className="project-card-header" style={{ borderTopColor: p.color }}>
                  <div className="flex items-center gap-3">
                    <div className="project-icon" style={{ background: p.color + '22', color: p.color }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </h3>
                      <span className={`badge badge-${p.my_role}`}>{p.my_role}</span>
                    </div>
                  </div>
                  {isOwner && (
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => { if (window.confirm('Delete project?')) deleteMutation.mutate(p.id); }}
                      style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {p.description && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '12px 0 0', lineHeight: 1.5 }}>
                    {p.description}
                  </p>
                )}

                <div className="project-stats">
                  <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    <Users size={13} />
                    <span>{p.member_count}</span>
                  </div>
                  <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    <CheckSquare size={13} />
                    <span>{p.completed_tasks}/{p.task_count}</span>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div className="flex justify-between" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Progress</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%`, background: p.color }} />
                  </div>
                </div>

                <Link to={`/projects/${p.id}`} className="btn btn-secondary w-full" style={{ marginTop: 16, justifyContent: 'center' }}>
                  Open Project <ArrowRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">New Project</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate} className="modal-body">
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input
                  className="form-input"
                  placeholder="e.g. Website Redesign"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  placeholder="What is this project about?"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Color</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, color: c }))}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', background: c, border: 'none',
                        cursor: 'pointer',
                        outline: form.color === c ? `3px solid ${c}` : 'none',
                        outlineOffset: 2,
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex-1" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .project-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 20px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .project-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .project-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding-top: 4px;
          border-top: 3px solid;
        }
        .project-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-family: 'Syne', sans-serif;
          font-size: 16px;
          flex-shrink: 0;
        }
        .project-stats {
          display: flex;
          gap: 16px;
          margin-top: 16px;
        }
      `}</style>
    </div>
  );
}
