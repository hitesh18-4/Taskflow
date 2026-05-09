const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../models/db');
const { authenticate, requireProjectRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/projects - list user's projects
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const projects = db.prepare(`
    SELECT p.*, u.name as owner_name,
      COALESCE(pm.role, 'admin') as my_role,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count,
      (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) as member_count
    FROM projects p
    JOIN users u ON p.owner_id = u.id
    LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    WHERE p.owner_id = ? OR pm.user_id = ?
    ORDER BY p.created_at DESC
  `).all(req.user.id, req.user.id, req.user.id);

  res.json({ projects });
});

// POST /api/projects - create project
router.post('/', authenticate, [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description } = req.body;
  const db = getDb();

  const result = db.prepare(
    'INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)'
  ).run(name, description || null, req.user.id);

  const project = db.prepare(`
    SELECT p.*, u.name as owner_name, 'admin' as my_role, 0 as task_count, 0 as done_count, 0 as member_count
    FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ project });
});

// GET /api/projects/:projectId
router.get('/:projectId', authenticate, requireProjectRole(), (req, res) => {
  const db = getDb();
  const project = db.prepare(`
    SELECT p.*, u.name as owner_name,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count
    FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?
  `).get(req.params.projectId);

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, pm.role, pm.joined_at
    FROM project_members pm JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ?
    UNION
    SELECT u.id, u.name, u.email, 'admin' as role, p.created_at as joined_at
    FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?
    ORDER BY role DESC, name
  `).all(req.params.projectId, req.params.projectId);

  res.json({ project: { ...project, my_role: req.projectRole }, members });
});

// PUT /api/projects/:projectId
router.put('/:projectId', authenticate, requireProjectRole('admin'), [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('status').optional().isIn(['active', 'archived']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
  if (project.owner_id !== req.user.id) return res.status(403).json({ error: 'Only owner can update project' });

  const { name, description, status } = req.body;
  db.prepare(`
    UPDATE projects SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      status = COALESCE(?, status)
    WHERE id = ?
  `).run(name || null, description !== undefined ? description : null, status || null, req.params.projectId);

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
  res.json({ project: updated });
});

// DELETE /api/projects/:projectId
router.delete('/:projectId', authenticate, (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.owner_id !== req.user.id) return res.status(403).json({ error: 'Only owner can delete project' });

  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.projectId);
  res.json({ message: 'Project deleted' });
});

// POST /api/projects/:projectId/members
router.post('/:projectId/members', authenticate, requireProjectRole('admin'), [
  body('email').isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'member']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const { email, role = 'member' } = req.body;

  const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(req.params.projectId);
  if (project.owner_id === user.id) return res.status(400).json({ error: 'User is already the project owner' });

  const existing = db.prepare(
    'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(req.params.projectId, user.id);
  if (existing) return res.status(409).json({ error: 'User is already a member' });

  db.prepare(
    'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
  ).run(req.params.projectId, user.id, role);

  res.status(201).json({ member: { ...user, role } });
});

// DELETE /api/projects/:projectId/members/:userId
router.delete('/:projectId/members/:userId', authenticate, requireProjectRole('admin'), (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(req.params.projectId);
  if (parseInt(req.params.userId) === project.owner_id) {
    return res.status(400).json({ error: 'Cannot remove project owner' });
  }

  db.prepare(
    'DELETE FROM project_members WHERE project_id = ? AND user_id = ?'
  ).run(req.params.projectId, req.params.userId);

  res.json({ message: 'Member removed' });
});

// PUT /api/projects/:projectId/members/:userId/role
router.put('/:projectId/members/:userId/role', authenticate, requireProjectRole('admin'), [
  body('role').isIn(['admin', 'member']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  db.prepare(
    'UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?'
  ).run(req.body.role, req.params.projectId, req.params.userId);

  res.json({ message: 'Role updated' });
});

module.exports = router;
