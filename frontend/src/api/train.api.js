// Frontend API Service
// Abstracts all calls to the backend

// Use environment variable or fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = {
    // --- Trains ---

    // Search trains by name or number
    searchTrains: async (query) => {
        const res = await fetch(`${API_BASE_URL}/trains/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Search failed');
        return await res.json();
    },

    // Search trains between stations
    searchTrainsBetween: async (source, destination, date = '') => {
        let url = `${API_BASE_URL}/trains/between-stations?source=${source}&destination=${destination}`;
        if (date) url += `&date=${date}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Search failed');
        return await res.json();
    },

    // Get single train details
    getTrainDetails: async (trainNumber) => {
        const res = await fetch(`${API_BASE_URL}/trains/${trainNumber}`);
        if (!res.ok) throw new Error('Failed to fetch train details');
        return await res.json();
    },

    // Get train schedule
    getTrainSchedule: async (trainNumber) => {
        const res = await fetch(`${API_BASE_URL}/trains/${trainNumber}/schedule`);
        if (!res.ok) throw new Error('Failed to fetch schedule');
        return await res.json();
    },

    // Get seat layout
    getSeatLayout: async (trainNumber) => {
        const res = await fetch(`${API_BASE_URL}/trains/${trainNumber}/seat-layout`);
        if (!res.ok) throw new Error('Failed to fetch seat layout');
        return await res.json();
    },

    // --- Stations ---

    // Search stations
    searchStations: async (query) => {
        const res = await fetch(`${API_BASE_URL}/stations/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Station search failed');
        return await res.json();
    },

    // --- Bookings ---

    // Get true availability
    checkAvailability: async (trainNumber, date, source, destination) => {
        let url = `${API_BASE_URL}/trains/${trainNumber}/availability`;
        const params = new URLSearchParams();
        if (date) params.append('date', date);
        if (source) params.append('source', source);
        if (destination) params.append('destination', destination);

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch availability');
        return await res.json();
    },

    // Get Booked Seats List for a specific train and date
    getBookedSeats: async (trainNumber, date) => {
        const res = await fetch(`${API_BASE_URL}/bookings/booked-seats?trainNumber=${trainNumber}&date=${date}`);
        if (!res.ok) throw new Error('Failed to fetch booked seats');
        return await res.json();
    },

    // Get fare for a train (optionally between specific stations)
    getFare: async (trainNumber, source, destination) => {
        let url = `${API_BASE_URL}/trains/${trainNumber}/fare`;
        if (source && destination) {
            url += `?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch fare');
        return await res.json();
    },

    // Create Booking
    // Payload: { trainNumber, journeyDate, classCode, source, destination, passengers: [{name, age, gender}] }
    createBooking: async (bookingPayload) => {
        const res = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingPayload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Booking failed');
        }
        return await res.json();
    },

    // Create Unreserved Booking
    bookUnreserved: async (bookingPayload) => {
        const res = await fetch(`${API_BASE_URL}/unreserved/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingPayload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Unreserved booking failed');
        }
        return await res.json();
    },

    // --- Reviews ---

    getReviews: async (trainNumber) => {
        const res = await fetch(`${API_BASE_URL}/reviews/${trainNumber}`);
        if (!res.ok) throw new Error('Failed to fetch reviews');
        return await res.json();
    },

    submitReview: async (trainNumber, rating, comment, userId) => {
        const res = await fetch(`${API_BASE_URL}/reviews/${trainNumber}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating, comment, userId })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to submit review');
        }
        return await res.json();
    },

    // --- Legacy Bookings / PNR ---
    getBookingStatus: async (pnr) => {
        const res = await fetch(`${API_BASE_URL}/bookings/${pnr}`);
        if (!res.ok) throw new Error('PNR not found or server error');
        return await res.json();
    },

    // Cancel Booking
    cancelBooking: async (pnr) => {
        const res = await fetch(`${API_BASE_URL}/bookings/${pnr}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Cancellation failed');
        }
        return await res.json();
    }
};

export default api;
