const router = require('express').Router({ mergeParams: true });
const { body } = require('express-validator');
const { getTasks, createTask, getTask, updateTask, deleteTask, addComment } = require('../controllers/taskController');
const { authenticate, requireProjectRole } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

router.use(authenticate);
router.use(requireProjectRole());

router.get('/', getTasks);
router.post('/',
  [body('title').trim().isLength({ min: 1, max: 300 }).withMessage('Task title required')],
  validate,
  createTask
);
router.get('/:taskId', getTask);
router.put('/:taskId', updateTask);
router.delete('/:taskId', requireProjectRole(['admin']), deleteTask);
router.post('/:taskId/comments',
  [body('content').trim().isLength({ min: 1 }).withMessage('Comment cannot be empty')],
  validate,
  addComment
);

module.exports = router;
