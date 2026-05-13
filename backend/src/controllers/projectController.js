const pool = require('../config/database');

exports.createProject = async (req, res, next) => {
  try {
    const { name, description, color } = req.body;
    const ownerId = req.user.id;

    const result = await pool.query(
      'INSERT INTO projects (name, description, color, owner_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name.trim(), description || null, color || '#6366f1', ownerId]
    );
    const project = result.rows[0];

    // Auto-add owner as admin member
    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [project.id, ownerId, 'admin']
    );

    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
};

exports.getProjects = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.*, pm.role as my_role,
        u.name as owner_name,
        COUNT(DISTINCT pm2.user_id) as member_count,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as completed_tasks
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $1
       JOIN users u ON p.owner_id = u.id
       LEFT JOIN project_members pm2 ON p.id = pm2.project_id
       LEFT JOIN tasks t ON p.id = t.project_id
       WHERE p.status != 'archived'
       GROUP BY p.id, pm.role, u.name
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json({ projects: result.rows });
  } catch (err) {
    next(err);
  }
};

exports.getProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const projectResult = await pool.query(
      `SELECT p.*, u.name as owner_name,
        COUNT(DISTINCT pm.user_id) as member_count,
        COUNT(DISTINCT t.id) as task_count
       FROM projects p
       JOIN users u ON p.owner_id = u.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       LEFT JOIN tasks t ON p.id = t.project_id
       WHERE p.id = $1
       GROUP BY p.id, u.name`,
      [projectId]
    );

    if (projectResult.rows.length === 0) return res.status(404).json({ error: 'Project not found.' });

    const membersResult = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar_color, pm.role, pm.joined_at
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1
       ORDER BY pm.joined_at ASC`,
      [projectId]
    );

    res.json({ project: projectResult.rows[0], members: membersResult.rows });
  } catch (err) {
    next(err);
  }
};

exports.updateProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, description, color, status } = req.body;

    const result = await pool.query(
      `UPDATE projects SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        color = COALESCE($3, color),
        status = COALESCE($4, status),
        updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [name, description, color, status, projectId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found.' });
    res.json({ project: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.deleteProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query('DELETE FROM projects WHERE id = $1 AND owner_id = $2 RETURNING id', [projectId, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found or you are not the owner.' });
    res.json({ message: 'Project deleted.' });
  } catch (err) {
    next(err);
  }
};

exports.addMember = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { email, role } = req.body;

    const userResult = await pool.query('SELECT id, name, email, avatar_color FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const user = userResult.rows[0];

    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3',
      [projectId, user.id, role || 'member']
    );

    res.json({ message: 'Member added.', member: { ...user, role: role || 'member' } });
  } catch (err) {
    next(err);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;

    const project = await pool.query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
    if (project.rows[0]?.owner_id === userId) {
      return res.status(400).json({ error: 'Cannot remove project owner.' });
    }

    await pool.query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
    res.json({ message: 'Member removed.' });
  } catch (err) {
    next(err);
  }
};

exports.updateMemberRole = async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;
    const { role } = req.body;

    await pool.query('UPDATE project_members SET role = $1 WHERE project_id = $2 AND user_id = $3', [role, projectId, userId]);
    res.json({ message: 'Role updated.' });
  } catch (err) {
    next(err);
  }
};
