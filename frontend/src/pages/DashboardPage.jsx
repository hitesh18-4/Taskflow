import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, CheckCircle2, Clock, ListTodo, TrendingUp } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status.replace('_', ' ')}</span>;
}
function PriorityBadge({ priority }) {
  return <span className={`badge badge-${priority}`}>{priority}</span>;
}
function formatDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'MMM d'); } catch { return d; }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.get().then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner spinner-lg" />
      <span>Loading dashboard...</span>
    </div>
  );

  const { stats = {}, tasksByStatus = {}, overdueTasks = [], myTasks = [], recentTasks = [], weeklyActivity = [], tasksByAssignee = [] } = data || {};

  const totalNonDone = (stats.total_tasks || 0) - (tasksByStatus.done || 0);
  const progress = stats.total_tasks > 0
    ? Math.round(((tasksByStatus.done || 0) / stats.total_tasks) * 100)
    : 0;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">Here's what's happening across your projects today</p>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--accent-2)' }}>{stats.total_tasks || 0}</div>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ListTodo size={14} /> Total Tasks
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--blue)' }}>{stats.my_tasks || 0}</div>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} /> Assigned to Me
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--red)' }}>{stats.overdue || 0}</div>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} /> Overdue
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--green)' }}>{stats.done_today || 0}</div>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={14} /> Completed Today
            </div>
          </div>
        </div>

        {/* Overall progress + status breakdown */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Overall Progress</span>
              <span style={{ color: 'var(--accent-2)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{progress}%</span>
            </div>
            <div className="progress-bar" style={{ height: 8, marginBottom: 20 }}>
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'todo', label: 'To Do', color: 'var(--text-3)' },
                { key: 'in_progress', label: 'In Progress', color: 'var(--blue)' },
                { key: 'review', label: 'In Review', color: 'var(--yellow)' },
                { key: 'done', label: 'Done', color: 'var(--green)' },
              ].map(({ key, label, color }) => {
                const count = tasksByStatus[key] || 0;
                const pct = stats.total_tasks > 0 ? (count / stats.total_tasks) * 100 : 0;
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>{label}</span>
                      <span style={{ fontSize: '0.82rem', color, fontWeight: 600 }}>{count}</span>
                    </div>
                    <div className="progress-bar">
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tasks by Assignee */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Tasks by Assignee</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>active tasks</span>
            </div>
            {tasksByAssignee.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <p>No tasks assigned yet — assign tasks to team members when creating or editing tasks.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tasksByAssignee.map(member => {
                  const maxActive = Math.max(...tasksByAssignee.map(m => m.active), 1);
                  const pct = (member.active / maxActive) * 100;
                  return (
                    <div key={member.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div className="user-avatar" style={{ width: 22, height: 22, fontSize: '0.65rem', flexShrink: 0 }}>
                            {member.name?.[0]?.toUpperCase()}
                          </div>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>{member.name}</span>
                        </div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-2)' }}>
                          {member.active} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>/ {member.total}</span>
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent-2)', borderRadius: 2, transition: 'width 0.4s', opacity: 0.8 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* My Tasks */}
        {myTasks.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span className="card-title">My Tasks</span>
              <Link to="/projects" style={{ fontSize: '0.8rem', color: 'var(--accent-2)' }}>View all →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myTasks.slice(0, 5).map(task => (
                <Link
                  key={task.id}
                  to={`/projects/${task.project_id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-3)', textDecoration: 'none' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{task.project_name}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <PriorityBadge priority={task.priority} />
                    {task.due_date && <span className={task.is_overdue ? 'overdue-text' : 'text-sm text-muted'}>{formatDate(task.due_date)}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Overdue tasks */}
        {overdueTasks.length > 0 && (
          <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(248,113,113,0.3)' }}>
            <div className="card-header">
              <span className="card-title" style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={16} /> Overdue Tasks ({overdueTasks.length})
              </span>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Assignee</th>
                    <th>Due Date</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueTasks.map(task => (
                    <tr key={task.id}>
                      <td>
                        <Link to={`/projects/${task.project_id}`} style={{ color: 'var(--text)', fontWeight: 500 }}>{task.title}</Link>
                      </td>
                      <td style={{ color: 'var(--text-2)' }}>{task.project_name}</td>
                      <td style={{ color: 'var(--text-2)' }}>{task.assignee_name || '—'}</td>
                      <td className="overdue-text">{formatDate(task.due_date)}</td>
                      <td><PriorityBadge priority={task.priority} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent activity */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Activity</span>
          </div>
          {recentTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Status</th>
                    <th>Assignee</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTasks.map(task => (
                    <tr key={task.id}>
                      <td>
                        <Link to={`/projects/${task.project_id}`} style={{ color: 'var(--text)', fontWeight: 500 }}>{task.title}</Link>
                      </td>
                      <td style={{ color: 'var(--text-2)' }}>{task.project_name}</td>
                      <td><StatusBadge status={task.status} /></td>
                      <td style={{ color: 'var(--text-2)' }}>{task.assignee_name || '—'}</td>
                      <td style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{formatDate(task.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
