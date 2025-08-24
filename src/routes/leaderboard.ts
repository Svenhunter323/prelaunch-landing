import { Router } from 'express';
import * as leaderboardController from '../controllers/leaderboardController';

const router = Router();

router.get('/top10', leaderboardController.getTop10);

export default router;