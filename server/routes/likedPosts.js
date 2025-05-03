import express from "express";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { getLikedPostsByUser } from "../utils/likesUtil.js";

const router = express.Router();

// Apply the authenticateUser middleware to protect the route
router.use(authenticateUser);

// Route to get all posts liked by the authenticated user
router.get("/", async (req, res) => {
  const userId = req.user.id;

  try {
    const likedPosts = await getLikedPostsByUser(userId);
    res.status(200).json(likedPosts);
  } catch (err) {
    console.error("Error in likedPosts route:", err.message);
    res.status(500).json({ error: "Failed to fetch liked posts" });
  }
});

export default router;