import express from "express";
import { followUser, unfollowUser, getFollowers, getFollowing, checkFollowing } from "../controllers/followController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Route to follow a user
router.post("/", authenticateUser, followUser);

// Route to unfollow a user
router.delete("/:followingId", authenticateUser, unfollowUser);

// Route to get followers of a user
router.get("/:userId/followers", getFollowers);

// Route to get users a user is following
router.get("/:userId/following", getFollowing);

// New route to check if a user is following another
router.get("/check/:followingId", authenticateUser, checkFollowing);

export default router;