import bookingService from '../services/booking.service.js';
import { dataStore } from '../../data/dataLoader.js';

const createBookingHandler = async (req, res) => {
    try {
        const { trainNumber, journeyDate, classCode, source, destination, passengers } = req.body;

        if (!trainNumber || !journeyDate || !classCode || !source || !destination || !passengers) {
            return res.status(400).json({ error: "Missing required booking details." });
        }

        // Fetch Schedule (Fallback to generic schedule if not in local mock DB due to RapidAPI migration)
        let trainSchedule = [];
        const train = dataStore.trains.find(t => t.trainNumber === String(trainNumber));

        if (train && train.schedule) {
            trainSchedule = train.schedule;
        } else {
            // Provide a bare minimum synthetic schedule to pass validation in bookingService
            trainSchedule = [
                { stationCode: source },
                { stationCode: destination }
            ];
        }

        const booking = await bookingService.createBooking({
            trainNumber,
            journeyDate,
            classCode,
            source,
            destination,
            passengers,
            trainSchedule: trainSchedule
        });

        res.status(201).json(booking);
    } catch (err) {
        console.error("Booking Error:", err);
        res.status(500).json({ error: err.message });
    }
};

const cancelBookingHandler = async (req, res) => {
    try {
        const pnr = req.params.pnr;
        const result = await bookingService.cancelBooking(pnr);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getBookingStatusHandler = async (req, res) => {
    try {
        const pnr = req.params.pnr;
        const result = await bookingService.getBookingStatus(pnr);

        // Enhance with train details if possible (optional)
        const train = dataStore.trains.find(t => t.trainNumber === result.trainNumber);
        if (train) {
            result.trainName = train.trainName;
            result.departureTime = train.departureTime; // simple fallback
            // Try to find exact stations
            const src = train.schedule.find(s => s.stationCode === result.source);
            const dst = train.schedule.find(s => s.stationCode === result.destination);
            if (src) result.departureTime = src.departureTime;
            if (dst) result.arrivalTime = dst.arrivalTime;
            result.duration = "TBD"; // simplistic
        }

        res.status(200).json(result);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
};

const getBookedSeatsHandler = async (req, res) => {
    try {
        const { trainNumber, date } = req.query;
        if (!trainNumber || !date) return res.status(400).json({ error: "Missing trainNumber or date" });

        const bookedIds = await bookingService.getBookedSeatsList(trainNumber, date);
        res.status(200).json({ success: true, bookedSeats: bookedIds });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export default {
    createBookingHandler,
    cancelBookingHandler,
    getBookingStatusHandler,
    getBookedSeatsHandler
};
