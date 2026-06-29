import express from 'express';
import * as shareController from '../controllers/shareController.js';

const router = express.Router();

router.post('/:note_id', shareController.shareNode);
router.get('/:note_id', shareController.getShares);
router.delete('/:share_id', shareController.removeShare);

export default router;