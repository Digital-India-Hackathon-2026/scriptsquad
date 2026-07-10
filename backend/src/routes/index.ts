import { Router } from 'express';
import authRouter from './auth.routes';
import profileRouter from './profile.routes';
import farmsRouter from './farms.routes';
import telemetryRouter from './telemetry.routes';
import arexRouter from './arex.routes';
import voiceRouter from './voice.routes';
import bhoonidhi from './bhoonidhi.routes';
import insuranceRouter from './insurance.routes';
import carbonRouter from './carbon.routes';
import droneRouter from './drone.routes';
import pfrieRouter from './pfrie.routes';
import marketplaceRouter from './marketplace.routes';
import aiRouter from './ai.routes';

const router = Router();

router.use('/', authRouter);
router.use('/', profileRouter);
router.use('/', farmsRouter);
router.use('/', telemetryRouter);
router.use('/', arexRouter);
router.use('/', voiceRouter);
router.use('/', bhoonidhi);
router.use('/', insuranceRouter);
router.use('/', carbonRouter);
router.use('/', droneRouter);
router.use('/', pfrieRouter);
router.use('/', marketplaceRouter);
router.use('/', aiRouter);

export default router;
