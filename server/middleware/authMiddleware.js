import process from 'process';
import { supabase } from "../supabaseClient.js";
import cookie from 'cookie'; // Import cookie library

export const authenticateUser = async (req, res, next) => {
  try {
    console.log("Authenticating request...");
    
    // Extract the token from cookies or Authorization header
    const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
    let token = cookies.authToken;
    
    // Check for Authorization header (Bearer token) as a fallback
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
      }
    }
    
    console.log("Auth token found:", token ? "Token present" : "No token");
    
    if (!token) {
      console.warn("No auth token found. User is not authenticated.");
      req.user = null;
      return next(); // Allow the request to proceed as unauthenticated
    }
    
    // Try to get user from Supabase using the token
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error("Error validating token with Supabase:", error.message);
      
      // Try to refresh token
      const refreshToken = cookies.refreshToken;
      if (refreshToken) {
        console.log("Attempting to refresh token automatically");
        
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
            refresh_token: refreshToken
          });
          
          if (refreshError || !refreshData?.session) {
            console.error("Failed to refresh session:", refreshError?.message || "No session returned");
            return res.status(401).json({ 
              error: "Session expired. Please login again.",
              code: "AUTH_SESSION_EXPIRED"
            });
          }
          
          // Successfully refreshed token
          console.log("Session refreshed successfully");
          
          // Set updated cookies
          res.setHeader('Set-Cookie', [
            cookie.serialize('authToken', refreshData.session.access_token, {
              httpOnly: false, // Frontend needs to access this
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24, // 1 day
              path: '/',
            }),
            cookie.serialize('refreshToken', refreshData.session.refresh_token, {
              httpOnly: true, // More secure, frontend doesn't need direct access
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax', 
              maxAge: 60 * 60 * 24 * 30, // 30 days
              path: '/',
            })
          ]);
          
          // Use the new session
          req.user = refreshData.user;
          console.log("User authenticated after token refresh:", req.user.id);
          return next();
        } catch (refreshErr) {
          console.error("Unexpected error during token refresh:", refreshErr);
          return res.status(401).json({ error: "Authentication failed" });
        }
      } else {
        // No refresh token available
        return res.status(401).json({ 
          error: "Authentication required", 
          code: "AUTH_REQUIRED" 
        });
      }
    }
    
    // Token is valid
    if (data && data.user) {
      req.user = data.user;
      console.log("User authenticated:", req.user.id);
      next();
    } else {
      console.error("No user found with provided token");
      return res.status(401).json({ error: "Invalid authentication" });
    }
  } catch (err) {
    console.error("Unexpected error in authentication middleware:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};