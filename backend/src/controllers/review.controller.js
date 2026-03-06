import { supabase, supabaseAdmin } from '../config/supabaseClient.js';

// Use admin client to bypass RLS in the server environment if available
const db = supabaseAdmin || supabase;

export async function getReviews(req, res) {
    try {
        const { trainNumber } = req.params;

        // Fetch reviews from Supabase
        const { data, error } = await db
            .from('reviews')
            .select(`
                id,
                rating,
                comment,
                created_at,
                userId
            `)
            .eq('trainNumber', trainNumber)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase fetch reviews error:", error);
            return res.status(400).json({ error: error.message });
        }

        // Calculate Average
        let averageRating = 0;
        if (data && data.length > 0) {
            const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
            averageRating = (sum / data.length).toFixed(1);
        }

        res.json({ success: true, reviews: data, averageRating: Number(averageRating) });
    } catch (err) {
        console.error("Get reviews error:", err);
        res.status(500).json({ error: "Failed to fetch reviews" });
    }
}

export async function addReview(req, res) {
    try {
        const { trainNumber } = req.params;
        const { rating, comment, userId } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: "Rating must be between 1 and 5" });
        }

        // We require a valid Supabase UUID for userId as per our schema
        if (!userId) {
            return res.status(400).json({ error: "User ID is required to post a review" });
        }

        const { data, error } = await db
            .from('reviews')
            .insert([{
                trainNumber,
                userId,
                rating,
                comment
            }])
            .select()
            .single();

        if (error) {
            console.error("Supabase add review error:", error);
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({ success: true, review: data });
    } catch (err) {
        console.error("Add review error:", err);
        res.status(500).json({ error: "Failed to submit review" });
    }
}
