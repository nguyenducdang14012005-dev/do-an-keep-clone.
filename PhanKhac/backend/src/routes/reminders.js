import express from 'express';
import * as reminderController from '../controllers/reminderController.js';

const router = express.Router();

router.get('/', reminderController.getReminders);      
router.post('/', reminderController.setReminder);      
router.put('/:id', reminderController.updateReminder);
router.delete('/:id', reminderController.deleteReminder);

export default router;