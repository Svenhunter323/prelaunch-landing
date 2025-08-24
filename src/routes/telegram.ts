import { Router } from 'express';
import { auth } from '../middlewares/auth';
import * as telegramController from '../controllers/telegramController';

const router = Router();

router.get('/deeplink', auth, telegramController.getDeeplink);
router.post('/webhook', telegramController.handleWebhook);
router.get('/verify-status', auth, telegramController.getVerifyStatus);

export default router;