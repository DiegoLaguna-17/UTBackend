import express from 'express';
import { registerAdmin, registerClient } from '../controllers/authController.js';

const router = express.Router();

router.post('/admin', registerAdmin);
router.post('/cliente', registerClient);

export default router;