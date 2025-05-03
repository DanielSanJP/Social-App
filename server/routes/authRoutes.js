import express from 'express';
import { signUp, logIn, getUser } from '../controllers/authController.js';
import { uploadMiddleware } from '../utils/multerConfig.js';

const router = express.Router();

// Route for sign-up with file upload middleware
router.post('/signup', uploadMiddleware.single('profilePic'), signUp);

// Route for login
router.post('/login', logIn);

// Route to fetch the authenticated user's data
router.get('/user', getUser);

export default router;
