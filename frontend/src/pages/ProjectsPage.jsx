import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { projectsAPI } from '../api';
import { Plus, FolderKanban, Users, CheckSquare, X } from 'lucide-react';

function CreateProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const res = await projectsAPI.create(form);
      onCreate(res.data.project);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">New Project</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Website Redesign"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                placeholder="What is this project about?"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !form.name.trim()}>
              {loading ? <span className="spinner" /> : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    projectsAPI.list().then(r => setProjects(r.data.projects)).finally(() => setLoading(false));
  }, []);

  const progress = (p) => {
    if (!p.task_count) return 0;
    return Math.round((p.done_count / p.task_count) * 100);
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner spinner-lg" />
    </div>
  );

  return (
    <>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} you're part of</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ marginTop: 8 }}>
          <Plus size={16} /> New Project
        </button>
      </div>

      <div className="page-content">
        {projects.length === 0 ? (
          <div className="empty-state">
            <FolderKanban size={48} />
            <h3>No projects yet</h3>
            <p>Create your first project to get started</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ marginTop: 16 }}>
              <Plus size={16} /> Create Project
            </button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(p => (
              <Link key={p.id} to={`/projects/${p.id}`} className="project-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className={`badge badge-${p.my_role}`}>{p.my_role}</span>
                  {p.status === 'archived' && <span className="badge" style={{ background: 'var(--bg-4)', color: 'var(--text-3)' }}>Archived</span>}
                </div>
                <div className="project-card-name">{p.name}</div>
                <div className="project-card-desc">{p.description || 'No description'}</div>
                <div className="progress-bar" style={{ marginBottom: 12 }}>
                  <div className="progress-fill" style={{ width: `${progress(p)}%` }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-2)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckSquare size={13} /> {p.done_count}/{p.task_count} tasks
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={13} /> {(p.member_count || 0) + 1} members
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreate={p => setProjects(prev => [p, ...prev])}
        />
      )}
    </>
  );
}
