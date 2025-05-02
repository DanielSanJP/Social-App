import { supabase } from "../supabaseClient.js"; // Import the Supabase client
import multer from "multer";
import path from "path";

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

// Get all posts
export const getAllPosts = async (req, res) => {
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
        users (username)  -- Join with the users table to get the username
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Transform the data to include username at the top level
    const postsWithUsername = data.map((post) => ({
      ...post,
      username: post.users?.username || "Unknown User",
    }));

    res.status(200).json(postsWithUsername);
  } catch (err) {
    console.error("Error fetching posts:", err.message);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};

// Updated createPost function
export const createPost = async (req, res) => {
  try {
    const { description } = req.body;
    const user_id = req.user?.id; // Fetch user_id from req.user set by authenticateUser middleware

    console.log("Description:", description);
    console.log("User ID:", user_id);

    if (!description || !user_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const file = req.file; // Assuming the file is sent as 'file' in the request

    if (!file) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Upload the file to Supabase storage
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

    // Get the public URL of the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(fileName);

    const image_url = publicUrlData.publicUrl;

    // Insert the post into the database
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
  const { id } = req.params;

  try {
    console.log(`Attempting to like post with ID: ${id}`); // Log the post ID

    // Fetch the current likes count
    const { data: post, error: fetchError } = await supabase
      .from("posts")
      .select("likes")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching post for likes update:", fetchError);
      return res.status(404).json({ error: "Post not found" });
    }

    // Increment the likes count
    const { data, error } = await supabase
      .from("posts")
      .update({ likes: post.likes + 1 }) // Increment likes by 1
      .eq("id", id)
      .select();

    if (error) {
      console.error("Supabase error while liking post:", error); // Log Supabase error
      throw error;
    }

    console.log(`Post liked successfully:`, data[0]); // Log the updated post
    res.status(200).json({ message: "Post liked successfully", post: data[0] });
  } catch (err) {
    console.error("Error in likePost function:", err.message); // Log the error
    res.status(500).json({ error: "Failed to like post" });
  }
};