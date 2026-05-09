import { useState, useEffect } from 'react';
import { tasksAPI } from '../api';
import { X, MessageSquare, Trash2, Calendar, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';

function formatDate(d) {
  if (!d) return null;
  try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d; }
}

export default function TaskModal({ task: initialTask, projectId, members, onClose, onUpdate, onDelete, canEdit }) {
  const [task, setTask] = useState(initialTask);
  const [comments, setComments] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: initialTask.title,
    description: initialTask.description || '',
    status: initialTask.status,
    priority: initialTask.priority,
    assignee_id: initialTask.assignee_id || '',
    due_date: initialTask.due_date || '',
  });
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    tasksAPI.get(projectId, initialTask.id)
      .then(r => {
        setTask(r.data.task);
        setComments(r.data.comments);
        setForm({
          title: r.data.task.title,
          description: r.data.task.description || '',
          status: r.data.task.status,
          priority: r.data.task.priority,
          assignee_id: r.data.task.assignee_id || '',
          due_date: r.data.task.due_date || '',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        assignee_id: form.assignee_id ? parseInt(form.assignee_id) : null,
        due_date: form.due_date || null,
      };
      const res = await tasksAPI.update(projectId, task.id, payload);
      setTask(res.data.task);
      onUpdate(res.data.task);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    await tasksAPI.delete(projectId, task.id);
    onDelete(task.id);
    onClose();
  };

  const postComment = async () => {
    if (!commentText.trim()) return;
    const res = await tasksAPI.addComment(projectId, task.id, commentText.trim());
    setComments(c => [...c, res.data.comment]);
    setCommentText('');
  };

  const handleStatusChange = async (status) => {
    const res = await tasksAPI.update(projectId, task.id, { status });
    setTask(res.data.task);
    setForm(f => ({ ...f, status }));
    onUpdate(res.data.task);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span>
            <span className={`badge badge-${task.priority}`}>{task.priority}</span>
            {task.is_overdue ? <span className="badge" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>Overdue</span> : null}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {canEdit && !editing && (
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit</button>
            )}
            {canEdit && (
              <button className="btn btn-danger btn-sm btn-icon" onClick={handleDelete}><Trash2 size={14} /></button>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner spinner-lg" /></div> : (
            editing ? (
              <div>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-input form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-input form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assignee</label>
                    <select className="form-input form-select" value={form.assignee_id} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}>
                      <option value="">Unassigned</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input type="date" className="form-input" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <span className="spinner" /> : 'Save Changes'}</button>
                  <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>{task.title}</h2>
                {task.description && (
                  <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: 20 }}>{task.description}</p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                  <div style={{ background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Assignee</div>
                    <div style={{ fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={13} style={{ color: 'var(--text-3)' }} />
                      {task.assignee_name || 'Unassigned'}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Due Date</div>
                    <div style={{ fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={13} style={{ color: 'var(--text-3)' }} />
                      <span className={task.is_overdue ? 'overdue-text' : ''}>
                        {formatDate(task.due_date) || 'No due date'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick status change */}
                {canEdit && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Move to</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {['todo', 'in_progress', 'review', 'done'].filter(s => s !== task.status).map(s => (
                        <button key={s} className={`btn btn-sm badge-${s}`} style={{ borderRadius: 100, border: 'none', cursor: 'pointer' }} onClick={() => handleStatusChange(s)}>
                          {s.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <MessageSquare size={16} style={{ color: 'var(--text-3)' }} />
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Comments ({comments.length})</span>
                  </div>

                  {comments.map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                      <div className="user-avatar" style={{ flexShrink: 0, width: 28, height: 28, fontSize: '0.7rem' }}>
                        {c.author_name?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{c.author_name}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{formatDate(c.created_at)}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', background: 'var(--bg-3)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                          {c.content}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <input
                      className="form-input"
                      placeholder="Write a comment..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && postComment()}
                    />
                    <button className="btn btn-primary" onClick={postComment} disabled={!commentText.trim()}>Post</button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
