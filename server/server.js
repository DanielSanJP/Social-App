import express from 'express';
import process from 'process';
import authRoutes from './routes/authRoutes.js';  // Ensure this import path is correct
import postRoutes from "./routes/postRoutes.js"; // Import the posts routes
import userRoutes from "./routes/userRoutes.js"; // Import the users routes
import messagesRoutes from "./routes/messagesRoutes.js"; // Import the messages routes
import followRoutes from "./routes/followRoutes.js"; // Import the follow routes
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 5000; // Railway will provide the PORT

// Configure CORS for multiple origins
const allowedOrigins = [
  'https://social-app-omega-pied.vercel.app',
  'http://localhost:5173'
];

// Use environment variables for CORS or fall back to the allowed origins list
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.CORS_ORIGIN === origin) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true // Allow credentials (cookies)
};

app.use(cors(corsOptions));
app.use(express.json()); // Middleware to parse JSON bodies

// Handle preflight requests
app.options("*", cors(corsOptions));

// Mount the authRoutes at /api/auth
app.use('/api/auth', authRoutes);  // This ensures the route prefix is correct

// Mount the posts routes at /api/posts
app.use("/api/posts", postRoutes);

// Mount the users routes at /api/users
app.use("/api/users", userRoutes);

// Mount the messages routes at /api/messages
app.use("/api/messages", messagesRoutes); // Add this line to include messages routes

// Mount the follow routes at /api/follows
app.use("/api/follows", followRoutes);

// Middleware to log the Auth User ID for debugging
app.use((req, res, next) => {
  if (req.body && req.body.email) {
    console.log(`Auth User Email: ${req.body.email}`);
  }
  next();
});

app.use((req, res, next) => {
  console.log(`${req.method} request made to: ${req.url}`);
  next();
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
