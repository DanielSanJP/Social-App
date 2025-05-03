import { supabase } from "../supabaseClient.js";

// Check if a user has already liked a post
export const hasUserLikedPost = async (userId, postId) => {
  const { data, error } = await supabase
    .from("likes")
    .select("*")
    .eq("user_id", userId)
    .eq("post_id", postId)
    .single();

  if (error && error.code !== "PGRST116") {
    // Ignore "Row not found" error
    console.error("Error checking if user liked post:", error);
    throw error;
  }

  return !!data; // Return true if a like exists, false otherwise
};

// Add a like to the database
export const addLike = async (userId, postId) => {
  const { data, error } = await supabase
    .from("likes")
    .insert([{ user_id: userId, post_id: postId }]);

  if (error) {
    console.error("Error adding like:", error);
    throw error;
  }

  return data;
};

// Fetch all posts liked by a specific user
export const getLikedPostsByUser = async (userId) => {
  const { data, error } = await supabase
    .from("likes")
    .select(`
      post_id,
      posts (
        id,
        description,
        image_url,
        tags,
        visibility,
        created_at,
        likes,
        user_id,
        users (username) -- Join with users table to get username
      )
    `)
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching liked posts:", error);
    throw error;
  }

  // Transform the data to include post details at the top level
  return data.map((like) => ({
    ...like.posts,
    username: like.posts?.users?.username || "Unknown User",
  }));
};