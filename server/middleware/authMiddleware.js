import { supabase } from "../supabaseClient.js";

export const authenticateUser = async (req, res, next) => {
  console.log("Authorization header:", req.headers.authorization); // Debugging
  console.log("Authorization header:", req.headers.authorization); // Log the full Authorization header for debugging

  const token = req.headers.authorization?.split(" ")[1]; // Extract token from Authorization header
  console.log("Token received:", token); // Debugging
  console.log("Token received:", token); // Log the token for debugging

  if (!token) {
    console.error("No token provided");
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  try {
    const { data: user, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error("Token verification failed:", error);
      return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
    }

    if (user) {
      req.user = user.user; // Attach the user object directly
      console.log("Authenticated user:", req.user); // Log the full user object for debugging
    } else {
      console.error("No user found in token");
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    // Ensure req.user is validated before accessing it in middleware
    if (!req.user) {
      console.error("User not authenticated");
      return res.status(401).json({ error: "Unauthorized: User not authenticated" });
    }

    next();
  } catch (err) {
    console.error("Unexpected error in authentication middleware:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};