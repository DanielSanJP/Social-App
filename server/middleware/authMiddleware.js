import { supabase } from "../supabaseClient.js";

export const authenticateUser = async (req, res, next) => {
  console.log("Authorization header:", req.headers.authorization); // Log the full Authorization header for debugging
  const token = req.headers.authorization?.split(" ")[1]; // Extract token from Authorization header
  console.log("Token received:", token); // Log the token for debugging
  console.log("Token received in middleware:", token); // Debug log for token received

  if (!token) {
    console.error("No token provided");
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const { data: user, error } = await supabase.auth.getUser(token);
  if (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }

  if (user) {
    req.user = user.user; // Attach the user object directly
    console.log("Authenticated user ID:", req.user.id); // Log the user ID for debugging
  } else {
    console.error("No user found in token");
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }

  next();
};