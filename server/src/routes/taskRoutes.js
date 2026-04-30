import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { acceptTask, getMyTaskAccepts, getTaskDetail, listOpenTasks } from '../controllers/taskController.js';

const router = Router();

router.get('/tasks', listOpenTasks);
router.get('/tasks/:id', getTaskDetail);
router.post('/tasks/:id/accept', requireAuth, acceptTask);
router.get('/my/accepts', requireAuth, getMyTaskAccepts);

export default router;
