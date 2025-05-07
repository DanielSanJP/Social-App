import { supabase } from "../supabaseClient.js";

export const followUser = async (req, res) => {
  const { followingId } = req.body;
  const followerId = req.user.id; // Authenticated user's ID

  if (followerId === followingId) {
    return res.status(400).json({ error: "You cannot follow yourself." });
  }

  try {
    const { data, error } = await supabase
      .from("follows")
      .insert([{ follower_id: followerId, following_id: followingId }])
      .select();

    if (error) throw error;

    res.status(201).json({ message: "Followed successfully.", follow: data[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to follow user." });
  }
};

export const unfollowUser = async (req, res) => {
  const followerId = req.user.id;
  const { followingId } = req.params;

  try {
    const { error, count } = await supabase
      .from("follows")
      .delete()
      .match({ follower_id: followerId, following_id: followingId });

    if (error) throw error;
    
    if (count === 0) {
      return res.status(404).json({ error: "Follow relationship not found." });
    }
    
    res.status(200).json({ message: "Unfollowed successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to unfollow user." });
  }
};

export const getFollowers = async (req, res) => {
  const { userId } = req.params;

  try {
    // Get followers with user details
    const { data, error } = await supabase
      .from("follows")
      .select(`
        follower_id,
        users:follower_id (id, username, profile_pic_url)
      `)
      .eq("following_id", userId);

    if (error) throw error;

    res.status(200).json({
      count: data.length,
      followers: data
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch followers." });
  }
};

export const getFollowing = async (req, res) => {
  const { userId } = req.params;

  try {
    // Get following with user details
    const { data, error } = await supabase
      .from("follows")
      .select(`
        following_id,
        users:following_id (id, username, profile_pic_url)
      `)
      .eq("follower_id", userId);

    if (error) throw error;

    res.status(200).json({
      count: data.length,
      following: data
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch following." });
  }
};

// Add new function to check following status
export const checkFollowing = async (req, res) => {
  const followerId = req.user.id; // Current authenticated user
  const { followingId } = req.params; // User profile being viewed

  try {
    const { data, error } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    // PGRST116 means no rows returned, which means not following
    res.status(200).json({ isFollowing: !!data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to check following status." });
  }
};