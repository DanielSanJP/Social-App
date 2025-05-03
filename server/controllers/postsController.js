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
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  const userId = req.user?.id; // Get the authenticated user's ID

  try {
    const { data, error } = await supabase
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
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Fetch likes for the current user
    const { data: likedPosts, error: likesError } = await supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", userId);

    if (likesError) throw likesError;

    const likedPostIds = likedPosts.map((like) => like.post_id);

    // Map the posts to include the username, profile picture, and liked flag
    const postsWithUserDetails = data.map((post) => ({
      ...post,
      username: post.users?.username || "Unknown User",
      profile_pic_url: post.users?.profile_pic_url || null,
      liked: likedPostIds.includes(post.id), // Add liked flag
    }));

    res.status(200).json(postsWithUserDetails);
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

    if (!description || !user_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Missing required fields" });
    }

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

    let updatedPost;
    if (like) {
      // User has already liked the post, so remove the like
      const { error: deleteError } = await supabase
        .from("likes")
        .delete()
        .eq("user_id", userId)
        .eq("post_id", postId);

      if (deleteError) {
        console.error("Error removing like:", deleteError);
        throw deleteError;
      }

      // Decrement the likes count
      const { data: post, error: fetchError } = await supabase
        .from("posts")
        .select("likes")
        .eq("id", postId)
        .single();

      if (fetchError) {
        console.error("Error fetching post likes count:", fetchError);
        throw fetchError;
      }

      const updatedLikes = Math.max(0, post.likes - 1);

      const { data, error: updateError } = await supabase
        .from("posts")
        .update({ likes: updatedLikes })
        .eq("id", postId)
        .select()
        .single();

      if (updateError) {
        console.error("Error decrementing likes count:", updateError);
        throw updateError;
      }

      updatedPost = { ...data, liked: false };
    } else {
      // User has not liked the post, so add a like
      const { error: insertError } = await supabase
        .from("likes")
        .insert([{ user_id: userId, post_id: postId }]);

      if (insertError) {
        console.error("Error adding like:", insertError);
        throw insertError;
      }

      // Increment the likes count
      const { data: post, error: fetchError } = await supabase
        .from("posts")
        .select("likes")
        .eq("id", postId)
        .single();

      if (fetchError) {
        console.error("Error fetching post likes count:", fetchError);
        throw fetchError;
      }

      const updatedLikes = post.likes + 1;

      const { data, error: updateError } = await supabase
        .from("posts")
        .update({ likes: updatedLikes })
        .eq("id", postId)
        .select()
        .single();

      if (updateError) {
        console.error("Error incrementing likes count:", updateError);
        throw updateError;
      }

      updatedPost = { ...data, liked: true };
    }

    res.status(200).json(updatedPost);
  } catch (err) {
    console.error("Error in toggleLike controller:", err.message);
    res.status(500).json({ error: "Failed to toggle like" });
  }
};