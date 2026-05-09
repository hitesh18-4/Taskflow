import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { projectsAPI, tasksAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import TaskModal from '../components/TaskModal';
import {
  Plus, Settings, Users, X, Trash2, ChevronLeft,
  AlertTriangle, Calendar, Filter
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: 'var(--text-3)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--blue)' },
  { key: 'review', label: 'Review', color: 'var(--yellow)' },
  { key: 'done', label: 'Done', color: 'var(--green)' },
];

function formatDate(d) {
  if (!d) return null;
  try { return format(parseISO(d), 'MMM d'); } catch { return d; }
}

function CreateTaskModal({ projectId, members, onClose, onCreate }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: '', description: '', status: 'todo', priority: 'medium',
    assignee_id: user?.id ? String(user.id) : '', due_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        status: form.status,
        priority: form.priority,
        assignee_id: form.assignee_id ? parseInt(form.assignee_id) : null,
        due_date: form.due_date || undefined,
      };
      const res = await tasksAPI.create(projectId, payload);
      onCreate(res.data.task);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">New Task</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" placeholder="Task title" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" placeholder="Optional description" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input form-select" value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-input form-select" value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Assignee</label>
                <select className="form-input form-select" value={form.assignee_id}
                  onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input type="date" className="form-input" value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !form.title.trim()}>
              {loading ? <span className="spinner" /> : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddMemberModal({ projectId, onClose, onAdd }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await projectsAPI.addMember(projectId, { email, role });
      onAdd(res.data.member);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Add Team Member</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="colleague@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 4 }}>
                The user must already have a TaskFlow account
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-input form-select" value={role} onChange={e => setRole(e.target.value)}>
                <option value="member">Member — Can view and manage tasks</option>
                <option value="admin">Admin — Can manage members and project settings</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('board');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [myRole, setMyRole] = useState('member');
  const [filterAssignee, setFilterAssignee] = useState('');

  useEffect(() => {
    Promise.all([
      projectsAPI.get(projectId),
      tasksAPI.list(projectId)
    ]).then(([projRes, tasksRes]) => {
      setProject(projRes.data.project);
      setMembers(projRes.data.members);
      setTasks(tasksRes.data.tasks);
      setMyRole(projRes.data.project.my_role);
    }).catch((err) => { console.error('Project load error:', err?.response?.status, err?.response?.data); navigate('/projects'); })
      .finally(() => setLoading(false));
  }, [projectId]);

  const isAdmin = myRole === 'admin';
  const canEdit = isAdmin || myRole === 'member';

  const tasksByStatus = (status) => {
    let filtered = tasks.filter(t => t.status === status);
    if (filterAssignee) filtered = filtered.filter(t => String(t.assignee_id) === filterAssignee);
    return filtered;
  };

  const handleDelete = async () => {
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    await projectsAPI.delete(projectId);
    navigate('/projects');
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Remove this member?')) return;
    await projectsAPI.removeMember(projectId, memberId);
    setMembers(m => m.filter(x => x.id !== memberId));
  };

  const handleRoleChange = async (memberId, role) => {
    await projectsAPI.updateMemberRole(projectId, memberId, role);
    setMembers(m => m.map(x => x.id === memberId ? { ...x, role } : x));
  };

  if (loading) return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;
  if (!project) return null;

  const progress = tasks.length > 0
    ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)
    : 0;

  return (
    <>
      <div className="page-header">
        <Link to="/projects" style={{ color: 'var(--text-3)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
          <ChevronLeft size={14} /> Projects
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 className="page-title">{project.name}</h1>
              <span className={`badge badge-${myRole}`}>{myRole}</span>
            </div>
            {project.description && <p className="page-subtitle">{project.description}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {isAdmin && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddMember(true)}>
                <Users size={14} /> Add Member
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateTask(true)}>
              <Plus size={14} /> New Task
            </button>
            {isAdmin && project.owner_id === user.id && (
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 8 }}>
          <div className="progress-bar" style={{ flex: 1, height: 6 }}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
            {tasks.filter(t => t.status === 'done').length}/{tasks.length} done ({progress}%)
          </span>
        </div>
      </div>

      <div className="page-content" style={{ paddingTop: 0 }}>
        {/* Tabs */}
        <div className="tab-nav">
          <button className={`tab-btn ${activeTab === 'board' ? 'active' : ''}`} onClick={() => setActiveTab('board')}>
            Board
          </button>
          <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
            List <span style={{ background: 'var(--bg-4)', borderRadius: 100, padding: '0 6px', fontSize: '0.72rem' }}>{tasks.length}</span>
          </button>
          <button className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
            <Users size={14} /> Members <span style={{ background: 'var(--bg-4)', borderRadius: 100, padding: '0 6px', fontSize: '0.72rem' }}>{members.length}</span>
          </button>
        </div>

        {/* Filter */}
        {(activeTab === 'board' || activeTab === 'list') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Filter size={14} style={{ color: 'var(--text-3)' }} />
            <select className="form-input form-select" style={{ width: 'auto', padding: '5px 28px 5px 10px', fontSize: '0.82rem' }}
              value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
              <option value="">All assignees</option>
              {members.map(m => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
            </select>
          </div>
        )}

        {/* Board view */}
        {activeTab === 'board' && (
          <div className="board-grid">
            {COLUMNS.map(col => {
              const colTasks = tasksByStatus(col.key);
              return (
                <div key={col.key} className="board-column">
                  <div className="column-header">
                    <span className="column-title" style={{ color: col.color }}>{col.label}</span>
                    <span className="column-count">{colTasks.length}</span>
                  </div>
                  <div className="task-cards">
                    {colTasks.map(task => (
                      <div key={task.id} className="task-card" onClick={() => setSelectedTask(task)}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
                          <div className="task-card-title" style={{ margin: 0 }}>{task.title}</div>
                          <span className={`badge badge-${task.priority}`} style={{ flexShrink: 0 }}>{task.priority}</span>
                        </div>
                        <div className="task-card-meta">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {task.assignee_name ? (
                              <div className="task-assignee" title={task.assignee_name}>
                                {task.assignee_name[0].toUpperCase()}
                              </div>
                            ) : <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Unassigned</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {task.is_overdue && <span className="overdue-dot" title="Overdue" />}
                            {task.due_date && (
                              <span className={task.is_overdue ? 'overdue-text' : 'text-sm text-muted'} style={{ fontSize: '0.75rem' }}>
                                <Calendar size={10} style={{ display: 'inline', marginRight: 2 }} />
                                {formatDate(task.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--text-3)', fontSize: '0.8rem' }}
                      onClick={() => setShowCreateTask(true)}
                    >
                      <Plus size={13} /> Add task
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List view */}
        {activeTab === 'list' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {tasks.length === 0 ? (
              <div className="empty-state">
                <h3>No tasks yet</h3>
                <p>Create your first task to get started</p>
                <button className="btn btn-primary" onClick={() => setShowCreateTask(true)} style={{ marginTop: 16 }}>
                  <Plus size={16} /> New Task
                </button>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Assignee</th>
                      <th>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filterAssignee ? tasks.filter(t => String(t.assignee_id) === filterAssignee) : tasks).map(task => (
                      <tr key={task.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedTask(task)}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{task.title}</div>
                          {task.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 2 }}>{task.description.slice(0, 60)}{task.description.length > 60 ? '...' : ''}</div>}
                        </td>
                        <td><span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span></td>
                        <td><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                        <td style={{ color: 'var(--text-2)' }}>{task.assignee_name || '—'}</td>
                        <td>
                          {task.due_date ? (
                            <span className={task.is_overdue ? 'overdue-text' : 'text-muted text-sm'}>
                              {task.is_overdue && <AlertTriangle size={11} style={{ display: 'inline', marginRight: 3 }} />}
                              {formatDate(task.due_date)}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Members tab */}
        {activeTab === 'members' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Email</th>
                    <th>Role</th>
                    {isAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="user-avatar" style={{ width: 28, height: 28, fontSize: '0.72rem' }}>
                            {m.name?.[0]?.toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 500 }}>{m.name}</span>
                          {m.id === user.id && <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>(you)</span>}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-2)' }}>{m.email}</td>
                      <td>
                        {isAdmin && m.id !== user.id && m.role !== 'admin' ? (
                          <select
                            className="form-input form-select"
                            style={{ width: 'auto', padding: '4px 24px 4px 8px', fontSize: '0.8rem' }}
                            value={m.role}
                            onChange={e => handleRoleChange(m.id, e.target.value)}
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className={`badge badge-${m.role}`}>{m.role}</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td>
                          {m.id !== user.id && m.role !== 'admin' && (
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleRemoveMember(m.id)}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showCreateTask && (
        <CreateTaskModal
          projectId={projectId}
          members={members}
          onClose={() => setShowCreateTask(false)}
          onCreate={task => setTasks(t => [task, ...t])}
        />
      )}

      {showAddMember && (
        <AddMemberModal
          projectId={projectId}
          onClose={() => setShowAddMember(false)}
          onAdd={m => setMembers(prev => [...prev, m])}
        />
      )}

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projectId={projectId}
          members={members}
          canEdit={canEdit}
          onClose={() => setSelectedTask(null)}
          onUpdate={updated => {
            setTasks(t => t.map(x => x.id === updated.id ? updated : x));
            setSelectedTask(null);
          }}
          onDelete={id => {
            setTasks(t => t.filter(x => x.id !== id));
            setSelectedTask(null);
          }}
        />
      )}
    </>
  );
}
