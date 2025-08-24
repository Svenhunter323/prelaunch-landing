import { Router } from 'express';
import { validateQuery } from '../middlewares/validate';
import { z } from 'zod';
import * as winsController from '../controllers/winsController';

const router = Router();

const latestWinsSchema = z.object({
  limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).default('24'),
});

router.get('/latest', validateQuery(latestWinsSchema), winsController.getLatestWins);

export default router;