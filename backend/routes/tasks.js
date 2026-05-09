const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { getDb } = require('../models/db');
const { authenticate, requireProjectRole } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// GET /api/projects/:projectId/tasks
router.get('/', authenticate, requireProjectRole(), (req, res) => {
  const db = getDb();
  const { status, priority, assignee } = req.query;

  let sql = `
    SELECT t.*,
      u.name as assignee_name, u.email as assignee_email,
      c.name as creator_name,
      (SELECT COUNT(*) FROM task_comments tc WHERE tc.task_id = t.id) as comment_count,
      CASE WHEN t.due_date < date('now') AND t.status != 'done' THEN 1 ELSE 0 END as is_overdue
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    JOIN users c ON t.created_by = c.id
    WHERE t.project_id = ?
  `;
  const params = [req.params.projectId];

  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  if (priority) { sql += ' AND t.priority = ?'; params.push(priority); }
  if (assignee) { sql += ' AND t.assignee_id = ?'; params.push(assignee); }

sql += ' ORDER BY CASE t.priority WHEN \'urgent\' THEN 1 WHEN \'high\' THEN 2 WHEN \'medium\' THEN 3 ELSE 4 END, t.due_date ASC, t.created_at DESC';

  const tasks = db.prepare(sql).all(...params);
  res.json({ tasks });
});

// POST /api/projects/:projectId/tasks
router.post('/', authenticate, requireProjectRole(), [
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assignee_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('due_date').optional({ nullable: true }).isISO8601(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const { title, description, status, priority, due_date } = req.body;
  const assignee_id = req.body.assignee_id != null ? parseInt(req.body.assignee_id) : null;

  // Verify assignee is a project member or the owner
  if (assignee_id) {
    const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(req.params.projectId);
    const isMember = db.prepare(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(req.params.projectId, assignee_id);
    if (!isMember && project.owner_id !== assignee_id) {
      return res.status(400).json({ error: 'Assignee must be a project member' });
    }
  }

  const result = db.prepare(`
    INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, created_by, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.params.projectId, title, description || null,
    status || 'todo', priority || 'medium',
    assignee_id, req.user.id, due_date || null
  );

  const task = db.prepare(`
    SELECT t.*, u.name as assignee_name, c.name as creator_name, 0 as comment_count,
      CASE WHEN t.due_date < date('now') AND t.status != 'done' THEN 1 ELSE 0 END as is_overdue
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    JOIN users c ON t.created_by = c.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ task });
});

// GET /api/projects/:projectId/tasks/:taskId
router.get('/:taskId', authenticate, requireProjectRole(), (req, res) => {
  const db = getDb();
  const task = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.email as assignee_email, c.name as creator_name,
      CASE WHEN t.due_date < date('now') AND t.status != 'done' THEN 1 ELSE 0 END as is_overdue
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    JOIN users c ON t.created_by = c.id
    WHERE t.id = ? AND t.project_id = ?
  `).get(req.params.taskId, req.params.projectId);

  if (!task) return res.status(404).json({ error: 'Task not found' });

  const comments = db.prepare(`
    SELECT tc.*, u.name as author_name, u.email as author_email
    FROM task_comments tc JOIN users u ON tc.user_id = u.id
    WHERE tc.task_id = ? ORDER BY tc.created_at ASC
  `).all(req.params.taskId);

  res.json({ task, comments });
});

// PUT /api/projects/:projectId/tasks/:taskId
router.put('/:taskId', authenticate, requireProjectRole(), [
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assignee_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('due_date').optional({ nullable: true }).isISO8601(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?')
    .get(req.params.taskId, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { title, description, status, priority, due_date } = req.body;
  // assignee_id: undefined = don't change, null = unassign, number = assign
  const hasAssignee = 'assignee_id' in req.body;
  const assignee_id = hasAssignee
    ? (req.body.assignee_id != null ? parseInt(req.body.assignee_id) : null)
    : undefined;

  db.prepare(`
    UPDATE tasks SET
      title = COALESCE(?, title),
      description = CASE WHEN ? IS NOT NULL THEN ? ELSE description END,
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      assignee_id = CASE WHEN ? = 1 THEN ? ELSE assignee_id END,
      due_date = CASE WHEN ? IS NOT NULL THEN ? ELSE due_date END
    WHERE id = ?
  `).run(
    title || null,
    description !== undefined ? 1 : null, description !== undefined ? (description || null) : null,
    status || null, priority || null,
    hasAssignee ? 1 : 0, hasAssignee ? (assignee_id ?? null) : null,
    due_date !== undefined ? 1 : null, due_date !== undefined ? (due_date || null) : null,
    req.params.taskId
  );

  const updated = db.prepare(`
    SELECT t.*, u.name as assignee_name, c.name as creator_name,
      CASE WHEN t.due_date < date('now') AND t.status != 'done' THEN 1 ELSE 0 END as is_overdue
    FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id JOIN users c ON t.created_by = c.id
    WHERE t.id = ?
  `).get(req.params.taskId);

  res.json({ task: updated });
});

// DELETE /api/projects/:projectId/tasks/:taskId
router.delete('/:taskId', authenticate, requireProjectRole(), (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?')
    .get(req.params.taskId, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Only task creator, assignee, or admin can delete
  if (task.created_by !== req.user.id && req.projectRole !== 'admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.taskId);
  res.json({ message: 'Task deleted' });
});

// POST /api/projects/:projectId/tasks/:taskId/comments
router.post('/:taskId/comments', authenticate, requireProjectRole(), [
  body('content').trim().isLength({ min: 1, max: 1000 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO task_comments (task_id, user_id, content) VALUES (?, ?, ?)'
  ).run(req.params.taskId, req.user.id, req.body.content);

  const comment = db.prepare(`
    SELECT tc.*, u.name as author_name, u.email as author_email
    FROM task_comments tc JOIN users u ON tc.user_id = u.id WHERE tc.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ comment });
});

module.exports = router;
