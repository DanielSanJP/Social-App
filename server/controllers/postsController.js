import { supabase } from "../supabaseClient.js"; // Import the Supabase client
import multer from "multer";
import path from "path";
import { hasUserLikedPost, addLike } from "../utils/likesUtil.js";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Save files to the 'uploads' directory
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Refactor getAllPosts to include pagination
export const getAllPosts = async (req, res) => {
  const { userId } = req.query; // Get userId from query params
  const currentUserId = req.user?.id;

  try {
    // Get all posts without pagination limits and without filtering by likes
    let query = supabase
      .from("posts")
      .select(`
        id,
        description,
        image_url,
        tags,
        visibility,
        created_at,
        likes,
        user_id,
        users (
          username,
          profile_pic_url
        )
      `)
      .order("created_at", { ascending: false });

    // Only filter by userId if it was specifically provided
    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: posts, error: postsError } = await query;

    if (postsError) {
      console.error("Supabase posts query error:", postsError);
      throw postsError;
    }

    // Log the number of posts retrieved to help debug
    console.log(`Retrieved ${posts?.length || 0} posts from database`);

    if (!currentUserId || !posts || posts.length === 0) {
      // If no user is authenticated or no posts, return posts without liked status
      return res.status(200).json(posts || []);
    }

    // Get all likes for the current user
    const { data: userLikes, error: likesError } = await supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", currentUserId);

    if (likesError) {
      console.error("Supabase likes query error:", likesError);
      throw likesError;
    }

    // Create a Set of post IDs that the user has liked for efficient lookup
    const likedPostIds = new Set(userLikes?.map(like => like.post_id) || []);

    // Add liked status to each post
    const postsWithLikedStatus = posts.map(post => ({
      ...post,
      liked: likedPostIds.has(post.id)
    }));

    // Log the number of posts being returned
    console.log(`Returning ${postsWithLikedStatus.length} posts with liked status`);

    res.status(200).json(postsWithLikedStatus);
  } catch (err) {
    console.error("Error fetching posts:", err.message);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};

// Refactor createPost to use a utility function for file uploads
export const createPost = async (req, res) => {
  try {
    const { description } = req.body;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!description) {
      return res.status(400).json({ error: "Description is required" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Image is required" });
    }

    console.log("Processing file upload:", file);
    console.log("User ID:", user_id);

    const fileName = `${Date.now()}-${file.originalname}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
      });

    if (uploadError) {
      console.error("Error uploading file to Supabase:", uploadError);
      return res.status(500).json({ error: "Failed to upload image" });
    }

    const { data: publicUrlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(fileName);

    const image_url = publicUrlData.publicUrl;

    const { data: postData, error: postError } = await supabase
      .from("posts")
      .insert([
        {
          image_url,
          description,
          user_id,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ])
      .select();

    if (postError) {
      console.error("Error inserting post into database:", postError);
      return res.status(500).json({ error: "Failed to create post" });
    }

    res.status(201).json(postData[0]);
  } catch (err) {
    console.error("Error creating post:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
};

// Get a single post by ID
export const getPostById = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching post:", err.message);
    res.status(500).json({ error: "Failed to fetch post" });
  }
};

// Update a post
export const updatePost = async (req, res) => {
  const { id } = req.params;
  const { description, tags, visibility } = req.body;

  try {
    const { data, error } = await supabase
      .from("posts")
      .update({
        description,
        tags,
        visibility,
        updated_at: new Date(),
      })
      .eq("id", id)
      .select();

    if (error) throw error;

    res.status(200).json(data[0]);
  } catch (err) {
    console.error("Error updating post:", err.message);
    res.status(500).json({ error: "Failed to update post" });
  }
};

// Delete a post
export const deletePost = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("posts")
      .delete()
      .eq("id", id)
      .select();

    if (error) throw error;

    res.status(200).json({ message: "Post deleted successfully", data });
  } catch (err) {
    console.error("Error deleting post:", err.message);
    res.status(500).json({ error: "Failed to delete post" });
  }
};

// Increment likes for a post
export const likePost = async (req, res) => {
  const { id: postId } = req.params;
  const userId = req.user.id;

  try {
    // Check if the user has already liked the post
    const alreadyLiked = await hasUserLikedPost(userId, postId);

    if (alreadyLiked) {
      return res.status(400).json({ error: "You have already liked this post" });
    }

    // Add the like to the likes table
    await addLike(userId, postId);

    // Count the total likes for the post
    const { count, error: countError } = await supabase
      .from("likes")
      .select("*", { count: "exact" })
      .eq("post_id", postId);

    if (countError) {
      console.error("Error counting likes:", countError);
      throw countError;
    }

    // Update the likes column in the posts table
    const { data: updatedPost, error: updateError } = await supabase
      .from("posts")
      .update({ likes: count })
      .eq("id", postId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating likes count in posts table:", updateError);
      throw updateError;
    }

    res.status(200).json({ message: "Post liked successfully", post: updatedPost });
  } catch (err) {
    console.error("Error in likePost controller:", err.message);
    res.status(500).json({ error: "Failed to like post" });
  }
};

// Toggle like for a post
export const toggleLike = async (req, res) => {
  const { id: postId } = req.params;
  const userId = req.user.id;

  try {
    // Check if the user has already liked the post
    const { data: like, error: likeError } = await supabase
      .from("likes")
      .select("*")
      .eq("user_id", userId)
      .eq("post_id", postId)
      .single();

    if (likeError && likeError.code !== "PGRST116") {
      // Ignore "Row not found" error
      console.error("Error checking like relation:", likeError);
      throw likeError;
    }

    // Get the current post to read its likes count
    const { data: currentPost, error: postError } = await supabase
      .from("posts")
      .select("likes")
      .eq("id", postId)
      .single();
      
    if (postError) {
      console.error("Error fetching current post:", postError);
      throw postError;
    }
    
    let updatedPost;
    if (like) {
      // User has already liked the post, so remove the like
      await supabase
        .from("likes")
        .delete()
        .eq("user_id", userId)
        .eq("post_id", postId);

      // Calculate new likes count (decrement)
      const newLikesCount = Math.max(0, (currentPost.likes || 0) - 1); // Prevent negative likes
      
      const { data, error: updateError } = await supabase
        .from("posts")
        .update({ likes: newLikesCount })
        .eq("id", postId)
        .select()
        .single();

      if (updateError) throw updateError;

      updatedPost = { ...data, liked: false };
    } else {
      // User has not liked the post, so add a like
      await supabase
        .from("likes")
        .insert([{ user_id: userId, post_id: postId }]);

      // Calculate new likes count (increment)
      const newLikesCount = (currentPost.likes || 0) + 1;
      
      const { data, error: updateError } = await supabase
        .from("posts")
        .update({ likes: newLikesCount })
        .eq("id", postId)
        .select()
        .single();

      if (updateError) throw updateError;

      updatedPost = { ...data, liked: true };
    }

    res.status(200).json(updatedPost);
  } catch (err) {
    console.error("Error in toggleLike controller:", err.message);
    res.status(500).json({ error: "Failed to toggle like" });
  }
};