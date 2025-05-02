import express from 'express';
import { signUp, logIn, getUser } from '../controllers/authController.js';
import multer from 'multer';

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage });

const router = express.Router();

// Route for sign-up with file upload middleware
router.post('/signup', upload.single('profilePic'), signUp);

// Route for login
router.post('/login', logIn);

// Route to fetch the authenticated user's data
router.get('/user', getUser);

export default router;
