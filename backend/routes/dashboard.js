const express = require('express');
const { getDb } = require('../models/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard - global stats for current user
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  // All projects user belongs to
  const projectIds = db.prepare(`
    SELECT p.id FROM projects p
    LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    WHERE p.owner_id = ? OR pm.user_id = ?
  `).all(userId, userId, userId).map(r => r.id);

  if (projectIds.length === 0) {
    return res.json({
      stats: { total_tasks: 0, my_tasks: 0, overdue: 0, done_today: 0 },
      tasksByStatus: {},
      tasksByPriority: {},
      recentTasks: [],
      overdueTasks: [],
      myTasks: []
    });
  }

  const placeholders = projectIds.map(() => '?').join(',');

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_tasks,
      SUM(CASE WHEN assignee_id = ? THEN 1 ELSE 0 END) as my_tasks,
      SUM(CASE WHEN due_date < date('now') AND status != 'done' THEN 1 ELSE 0 END) as overdue,
      SUM(CASE WHEN status = 'done' AND date(updated_at) = date('now') THEN 1 ELSE 0 END) as done_today
    FROM tasks WHERE project_id IN (${placeholders})
  `).get(userId, ...projectIds);

  const tasksByStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM tasks
    WHERE project_id IN (${placeholders})
    GROUP BY status
  `).all(...projectIds);

  const tasksByPriority = db.prepare(`
    SELECT priority, COUNT(*) as count FROM tasks
    WHERE project_id IN (${placeholders}) AND status != 'done'
    GROUP BY priority
  `).all(...projectIds);

  const recentTasks = db.prepare(`
    SELECT t.*, p.name as project_name, u.name as assignee_name
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.project_id IN (${placeholders})
    ORDER BY t.updated_at DESC LIMIT 10
  `).all(...projectIds);

  const overdueTasks = db.prepare(`
    SELECT t.*, p.name as project_name, u.name as assignee_name
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.project_id IN (${placeholders})
      AND t.due_date < date('now') AND t.status != 'done'
    ORDER BY t.due_date ASC LIMIT 10
  `).all(...projectIds);

  const myTasks = db.prepare(`
    SELECT t.*, p.name as project_name
    FROM tasks t JOIN projects p ON t.project_id = p.id
    WHERE t.project_id IN (${placeholders}) AND t.assignee_id = ? AND t.status != 'done'
    ORDER BY t.due_date ASC NULLS LAST LIMIT 10
  `).all(...projectIds, userId);

  // Tasks assigned per member (for the dashboard assignee breakdown)
  const tasksByAssignee = db.prepare(`
    SELECT u.id, u.name,
      COUNT(*) as total,
      SUM(CASE WHEN t.status != 'done' THEN 1 ELSE 0 END) as active
    FROM tasks t
    JOIN users u ON t.assignee_id = u.id
    WHERE t.project_id IN (${placeholders})
    GROUP BY u.id, u.name
    ORDER BY active DESC
  `).all(...projectIds);

  // Weekly activity (last 7 days)
  const weeklyActivity = db.prepare(`
    SELECT date(updated_at) as day, COUNT(*) as count
    FROM tasks
    WHERE project_id IN (${placeholders})
      AND date(updated_at) >= date('now', '-6 days')
    GROUP BY date(updated_at)
    ORDER BY day ASC
  `).all(...projectIds);

  res.json({
    stats,
    tasksByStatus: Object.fromEntries(tasksByStatus.map(r => [r.status, r.count])),
    tasksByPriority: Object.fromEntries(tasksByPriority.map(r => [r.priority, r.count])),
    recentTasks,
    overdueTasks,
    myTasks,
    tasksByAssignee,
    weeklyActivity
  });
});

module.exports = router;
