import { Router } from 'express';
import { auth, adminOnly } from '../middlewares/auth';
import { validate, validateQuery } from '../middlewares/validate';
import { adminUsersQuerySchema, adminReferralsQuerySchema, adminFlagUserSchema } from '../types';
import * as adminController from '../controllers/adminController';

const router = Router();

// Apply auth and adminOnly to all routes
router.use(auth, adminOnly);

router.get('/users', validateQuery(adminUsersQuerySchema), adminController.getUsers);
router.get('/referrals', validateQuery(adminReferralsQuerySchema), adminController.getReferrals);
router.get('/exports/claim-codes.csv', adminController.exportClaimCodes);
router.post('/flag-user', validate(adminFlagUserSchema), adminController.flagUser);

export default router;