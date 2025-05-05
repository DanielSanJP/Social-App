import express from 'express';
import authRoutes from './routes/authRoutes.js';  // Ensure this import path is correct
import postRoutes from "./routes/postRoutes.js"; // Import the posts routes
import userRoutes from "./routes/userRoutes.js"; // Import the users routes
import messagesRoutes from "./routes/messagesRoutes.js"; // Import the messages routes
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 5000;

// Use environment variables for CORS origin
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: corsOrigin })); // Replace 3000 with your frontend port
app.use(express.json()); // Middleware to parse JSON bodies

// Mount the authRoutes at /api/auth
app.use('/api/auth', authRoutes);  // This ensures the route prefix is correct

// Mount the posts routes at /api/posts
app.use("/api/posts", postRoutes);

// Mount the users routes at /api/users
app.use("/api/users", userRoutes);

// Mount the messages routes at /api/messages
app.use("/api/messages", messagesRoutes); // Add this line to include messages routes

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
