import { supabase } from '../config/supabaseClient.js';

/**
 * Handles booking of Unreserved / General Sitting (GS/UR) tickets.
 * These tickets do not have an assigned seat or passenger manifest logic,
 * and they automatically age out after 30 days based on the Supabase cron job.
 */
export async function bookUnreservedTicket(req, res) {
    try {
        const { trainNumber, journeyDate, source, destination, passengerCount, totalFare } = req.body;

        if (!trainNumber || !journeyDate || !source || !destination || !passengerCount || !totalFare) {
            return res.status(400).json({ error: "Missing required booking details (trainNumber, journeyDate, source, destination, passengerCount, totalFare)" });
        }

        // We can optionally attach it to an auth user if the frontend passes a userId, or let it be anonymous
        const { data, error } = await supabase
            .from('unreserved_tickets')
            .insert([{
                trainNumber,
                journeyDate,
                source,
                destination,
                passengerCount: parseInt(passengerCount, 10),
                totalFare: parseFloat(totalFare),
                status: 'VALID'
            }])
            .select()
            .single();

        if (error) {
            console.error("Booking failed in Supabase:", error);
            return res.status(400).json({ error: error.message });
        }

        return res.status(201).json({
            success: true,
            message: "Unreserved ticket booked successfully!",
            ticket: data
        });

    } catch (err) {
        console.error("Unreserved ticket error:", err);
        return res.status(500).json({ error: "Internal Server Error during booking" });
    }
}

/**
 * Fetch all active unreserved tickets (for a user or general lookup)
 */
export async function getUnreservedTickets(req, res) {
    try {
        const { data, error } = await supabase
            .from('unreserved_tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Fetch failed:", error);
            return res.status(400).json({ error: error.message });
        }

        return res.json({ success: true, tickets: data });
    } catch (err) {
        return res.status(500).json({ error: "Internal Server Error fetching tickets" });
    }
}
