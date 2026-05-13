const pool = require('../config/database');

exports.getTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, priority, assignee } = req.query;

    let query = `
      SELECT t.*,
        u.name as assignee_name, u.avatar_color as assignee_avatar,
        c.name as created_by_name,
        COUNT(tc.id) as comment_count
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users c ON t.created_by = c.id
      LEFT JOIN task_comments tc ON t.id = tc.task_id
      WHERE t.project_id = $1
    `;
    const params = [projectId];
    let i = 2;

    if (status) { query += ` AND t.status = $${i++}`; params.push(status); }
    if (priority) { query += ` AND t.priority = $${i++}`; params.push(priority); }
    if (assignee) { query += ` AND t.assignee_id = $${i++}`; params.push(assignee); }

    query += ' GROUP BY t.id, u.name, u.avatar_color, c.name ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ tasks: result.rows });
  } catch (err) {
    next(err);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { title, description, status, priority, assignee_id, due_date } = req.body;

    // Validate assignee is project member
    if (assignee_id) {
      const member = await pool.query('SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, assignee_id]);
      if (member.rows.length === 0) return res.status(400).json({ error: 'Assignee is not a project member.' });
    }

    const result = await pool.query(
      `INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, created_by, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [title.trim(), description || null, status || 'todo', priority || 'medium', projectId, assignee_id || null, req.user.id, due_date || null]
    );

    const task = result.rows[0];

    // Get enriched task
    const enriched = await pool.query(
      `SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_avatar
       FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id WHERE t.id = $1`,
      [task.id]
    );

    res.status(201).json({ task: enriched.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.getTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const taskResult = await pool.query(
      `SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_avatar, c.name as created_by_name
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN users c ON t.created_by = c.id
       WHERE t.id = $1`,
      [taskId]
    );

    if (taskResult.rows.length === 0) return res.status(404).json({ error: 'Task not found.' });

    const commentsResult = await pool.query(
      `SELECT tc.*, u.name as user_name, u.avatar_color FROM task_comments tc
       JOIN users u ON tc.user_id = u.id WHERE tc.task_id = $1 ORDER BY tc.created_at ASC`,
      [taskId]
    );

    res.json({ task: taskResult.rows[0], comments: commentsResult.rows });
  } catch (err) {
    next(err);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const { taskId, projectId } = req.params;
    const { title, description, status, priority, assignee_id, due_date } = req.body;

    if (assignee_id) {
      const member = await pool.query('SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, assignee_id]);
      if (member.rows.length === 0) return res.status(400).json({ error: 'Assignee is not a project member.' });
    }

    const result = await pool.query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        assignee_id = CASE WHEN $5::uuid IS NOT NULL THEN $5::uuid ELSE assignee_id END,
        due_date = COALESCE($6, due_date),
        updated_at = NOW()
       WHERE id = $7 AND project_id = $8 RETURNING *`,
      [title, description, status, priority, assignee_id || null, due_date || null, taskId, projectId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found.' });

    const enriched = await pool.query(
      `SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_avatar
       FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id WHERE t.id = $1`,
      [taskId]
    );

    res.json({ task: enriched.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const { taskId, projectId } = req.params;
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 AND project_id = $2 RETURNING id', [taskId, projectId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found.' });
    res.json({ message: 'Task deleted.' });
  } catch (err) {
    next(err);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;

    const result = await pool.query(
      'INSERT INTO task_comments (task_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [taskId, req.user.id, content.trim()]
    );

    const comment = await pool.query(
      `SELECT tc.*, u.name as user_name, u.avatar_color FROM task_comments tc
       JOIN users u ON tc.user_id = u.id WHERE tc.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({ comment: comment.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const stats = await pool.query(
      `SELECT
        COUNT(DISTINCT p.id) as total_projects,
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as completed_tasks,
        COUNT(DISTINCT CASE WHEN t.due_date < NOW() AND t.status != 'done' THEN t.id END) as overdue_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as in_progress_tasks
       FROM project_members pm
       JOIN projects p ON pm.project_id = p.id
       LEFT JOIN tasks t ON p.id = t.project_id AND t.assignee_id = $1
       WHERE pm.user_id = $1`,
      [userId]
    );

    const myTasks = await pool.query(
      `SELECT t.*, p.name as project_name, p.color as project_color,
        u.name as assignee_name, u.avatar_color as assignee_avatar
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.assignee_id = $1 AND t.status != 'done'
       ORDER BY t.due_date ASC NULLS LAST, t.priority DESC
       LIMIT 10`,
      [userId]
    );

    const recentTasks = await pool.query(
      `SELECT t.*, p.name as project_name, p.color as project_color
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       JOIN project_members pm ON p.id = pm.project_id
       WHERE pm.user_id = $1
       ORDER BY t.updated_at DESC
       LIMIT 8`,
      [userId]
    );

    res.json({
      stats: stats.rows[0],
      myTasks: myTasks.rows,
      recentTasks: recentTasks.rows,
    });
  } catch (err) {
    next(err);
  }
};
