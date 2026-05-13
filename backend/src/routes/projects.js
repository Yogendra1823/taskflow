const router = require('express').Router();
const { body } = require('express-validator');
const {
  createProject, getProjects, getProject, updateProject, deleteProject,
  addMember, removeMember, updateMemberRole
} = require('../controllers/projectController');
const { authenticate, requireProjectRole } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

router.use(authenticate);

router.get('/', getProjects);
router.post('/',
  [body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Project name required')],
  validate,
  createProject
);

router.get('/:projectId', requireProjectRole(), getProject);
router.put('/:projectId', requireProjectRole(['admin']), updateProject);
router.delete('/:projectId', deleteProject);

// Members
router.post('/:projectId/members',
  requireProjectRole(['admin']),
  [body('email').isEmail().withMessage('Valid email required')],
  validate,
  addMember
);
router.delete('/:projectId/members/:userId', requireProjectRole(['admin']), removeMember);
router.put('/:projectId/members/:userId',
  requireProjectRole(['admin']),
  [body('role').isIn(['admin', 'member'])],
  validate,
  updateMemberRole
);

module.exports = router;
