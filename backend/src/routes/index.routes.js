
import { Router } from 'express';
import trainRoutes from './train.routes.js';
import userRoutes from './user.routes.js';
import complaintsRoutes from './complaint.routes.js';

import { searchStations, getStationDetails } from '../controllers/train.controller.js';
import bookingRoutes from './booking.routes.js';
import unreservedRoutes from './unreserved.routes.js';
import reviewRoutes from './review.routes.js';

// We map everything under /api 
const router = Router();

const stationRouter = Router();
stationRouter.get('/search', searchStations);
stationRouter.get('/:stationCode', getStationDetails);

router.use('/auth', userRoutes);
router.use('/complaints', complaintsRoutes);
router.use('/trains', trainRoutes);
router.use('/stations', stationRouter);
router.use('/bookings', bookingRoutes);
router.use('/unreserved', unreservedRoutes);
router.use('/reviews', reviewRoutes);

export default router;
