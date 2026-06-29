import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import * as adminController from '../controllers/admin.controller.js';

const router = express.Router();

router.use(requireAuth, requireRole('Admin'));

router.get('/dashboard', asyncHandler(adminController.dashboard));
router.get('/users', asyncHandler(adminController.listUsers));
router.get('/roles', asyncHandler(adminController.listRoles));
router.patch('/users/:id/status', asyncHandler(adminController.setUserStatus));
router.put('/users/:id/roles', asyncHandler(adminController.updateUserRoles));
router.get('/audit-logs', asyncHandler(adminController.listAuditLogs));
router.get('/devices', asyncHandler(adminController.listUserDevices));
router.get('/backups', asyncHandler(adminController.listBackups));
router.post('/backups', asyncHandler(adminController.recordBackup));

export default router;
