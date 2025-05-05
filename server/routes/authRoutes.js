import express from 'express';
import { signUp, logIn, getUser, refreshAuthToken } from '../controllers/authController.js';
import { uploadMiddleware } from '../utils/multerConfig.js';
import { authenticateUser } from '../middleware/authMiddleware.js'; // Import authentication middleware

const router = express.Router();

// Route for sign-up with file upload middleware
router.post('/signup', uploadMiddleware.single('profilePic'), signUp);

// Route for login
router.post('/login', logIn);

// Route to fetch the authenticated user's data
router.get('/user', authenticateUser, getUser); // Add authenticateUser middleware

// Add a route for refreshing the auth token
router.post('/refresh', refreshAuthToken);

export default router;
