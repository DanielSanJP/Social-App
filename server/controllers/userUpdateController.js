import { supabase } from "../supabaseClient.js";
import multer from "multer";
import { v4 as uuidv4 } from "uuid"; // For generating unique file names

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory for processing
});

// Middleware to handle file uploads
export const uploadMiddleware = upload.single("file");

// Update user details
export const updateUser = async (req, res) => {
  const { id } = req.params; // User ID from the request parameters
  const { username } = req.body; // Fields to update
  const profilePicFile = req.file; // File uploaded by the user

  try {
    // Check if this user exists and get current data
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("username")
      .eq("id", id)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: "User not found" });
    }

    let profilePicUrl = null;

    // If a file is uploaded, upload it to the Supabase bucket
    if (profilePicFile) {
      const uniqueFileName = `${id}-${uuidv4()}-${profilePicFile.originalname}`;
      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(uniqueFileName, profilePicFile.buffer, {
          contentType: profilePicFile.mimetype,
        });

      if (uploadError) {
        console.error("Error uploading file to Supabase:", uploadError);
        return res.status(400).json({ error: uploadError.message });
      }

      // Get the public URL of the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from("uploads")
        .getPublicUrl(uniqueFileName);

      profilePicUrl = publicUrlData.publicUrl;
    }

    // Prepare the update object
    const updateData = { updated_at: new Date() };
    
    // Only update username if it's different from the current one
    if (username && username !== existingUser.username) {
      updateData.username = username;
    }

    // If a new profile picture is uploaded, include it in the update
    if (profilePicUrl) {
      updateData.profile_pic_url = profilePicUrl;
    }

    // Skip update if there's nothing to update
    if (Object.keys(updateData).length === 1 && updateData.updated_at) {
      return res.status(200).json({ 
        message: "No changes to update", 
        user: existingUser 
      });
    }

    // Update the user in the 'public.users' table
    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating user:", error);
      
      // Check for common constraint violations
      if (error.code === '23505') {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      // Check for potential RLS policy restrictions
      if (error.code === '42501') {
        return res.status(403).json({ error: "You don't have permission to update this username" });
      }
      
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ message: "User updated successfully", user: data[0] });
  } catch (err) {
    console.error("Unexpected error updating user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};