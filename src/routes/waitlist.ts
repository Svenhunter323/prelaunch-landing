import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { antiFraudOnSignup } from '../middlewares/antiFraud';
import { waitlistSchema } from '../types';
import * as waitlistController from '../controllers/waitlistController';

const router = Router();

router.post('/', 
  validate(waitlistSchema),
  antiFraudOnSignup,
  waitlistController.joinWaitlist
);

export default router;