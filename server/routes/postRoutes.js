import express from "express";
import multer from "multer";
import {
  getAllPosts,
  createPost,
  getPostById,
  updatePost,
  deletePost,
  likePost,
  toggleLike,
} from "../controllers/postsController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply the authenticateUser middleware to protect all post routes
router.use(authenticateUser);

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Use memory storage for Supabase uploads
const upload = multer({ storage });

// Route to get all posts
router.get("/", getAllPosts);

// Route to create a new post with file upload
router.post("/", upload.single("image"), createPost);

// Route to get a single post by ID
router.get("/:id", getPostById);

// Route to update a post
router.put("/:id", updatePost);

// Route to delete a post
router.delete("/:id", deletePost);

// Route to like a post
router.patch("/:id/like", likePost);

// Route to toggle a like on a post
router.patch("/:id/toggle-like", toggleLike);

export default router;