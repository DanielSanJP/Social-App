import { supabase } from "../supabaseClient.js"; // Use named import

// Search users by username
export const searchUsers = async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ error: "Query parameter is required" });
    }

    try {
        const { data, error } = await supabase
            .from("users")
            .select("id, username, profile_pic_url") // Use the correct column name
            .ilike("username", `%${query}%`); // Case-insensitive search

        if (error) {
            throw error;
        }

        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};