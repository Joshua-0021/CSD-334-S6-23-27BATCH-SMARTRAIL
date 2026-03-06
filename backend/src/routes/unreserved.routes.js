import express from 'express';
export const router = express.Router();
import { bookUnreservedTicket, getUnreservedTickets } from '../controllers/unreserved.controller.js';

// Define Routes
router.post('/book', bookUnreservedTicket);
router.get('/', getUnreservedTickets);

export default router;
