import express from 'express';
export const router = express.Router({ mergeParams: true });
import { getReviews, addReview } from '../controllers/review.controller.js';

// Routes for /api/reviews/:trainNumber
router.get('/:trainNumber', getReviews);
router.post('/:trainNumber', addReview);

export default router;
