// filepath: server/routes/userRoutes.js
import express from "express";
import { updateUser } from "../controllers/userUpdateController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { searchUsers } from "../controllers/userController.js"; // Import searchUsers
import { supabase } from '../supabaseClient.js'; // Import the supabase client
import { uploadMiddleware } from '../utils/multerConfig.js'; // Extract multer configuration to a utility module

const router = express.Router();

// Route to update user details with file upload
router.put("/:id", authenticateUser, uploadMiddleware.single('file'), updateUser);

// Route to search users
router.get("/search", searchUsers);

// Route to fetch a user's profile by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, profile_pic_url')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;