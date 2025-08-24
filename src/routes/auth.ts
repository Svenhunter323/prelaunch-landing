import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { auth, adminOnly } from '../middlewares/auth';
import { verifyEmailSchema, adminLoginSchema } from '../types';
import * as authController from '../controllers/authController';

const router = Router();

router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/admin/login', validate(adminLoginSchema), authController.adminLogin);
router.get('/me', auth, authController.getProfile);

export default router;