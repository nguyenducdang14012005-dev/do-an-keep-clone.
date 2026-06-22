const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireRole } = require('../middleware/auth');
const adminController = require('../controllers/admin.controller');

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

module.exports = router;
