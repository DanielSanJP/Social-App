// filepath: server/routes/userRoutes.js
import express from "express";
import { updateUser, uploadMiddleware } from "../controllers/userUpdateController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { searchUsers } from "../controllers/userController.js"; // Import searchUsers

const router = express.Router();

// Route to update user details with file upload
router.put("/:id", authenticateUser, uploadMiddleware, updateUser);

// Route to search users
router.get("/search", searchUsers);

export default router;