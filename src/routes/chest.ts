import { Router } from 'express';
import { auth } from '../middlewares/auth';
import * as chestController from '../controllers/chestController';

const router = Router();

router.post('/open', auth, chestController.openChest);

export default router;