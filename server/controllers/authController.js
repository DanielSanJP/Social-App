import { supabase } from '../supabaseClient.js';
import cookie from 'cookie'; // Import cookie library

// Define process if not defined (for environments where it's not globally available)
const process = process || { env: { NODE_ENV: 'development' } };

// Sign-Up function
async function signUp(req, res) {
  try {
    const { email, password, username } = req.body;
    const profilePic = req.file; // Assuming you're using multer for file uploads

    // Create a new user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData?.user) {
      return res.status(400).json({ error: authError?.message || "Failed to sign up." });
    }

    const user = authData.user;
    let profilePicUrl = null;

    // If a profile picture is uploaded, upload it to the Supabase bucket
    if (profilePic) {
      const uniqueFileName = `${user.id}-${profilePic.originalname}`;
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(uniqueFileName, profilePic.buffer, {
          contentType: profilePic.mimetype,
        });

      if (uploadError) {
        return res.status(400).json({ error: uploadError.message });
      }

      // Get the public URL of the uploaded image
      const { data: publicUrlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(uniqueFileName);

      profilePicUrl = publicUrlData.publicUrl;
    }

    // Insert the user into the 'public.users' table with the same ID as in 'auth.users'
    const { error: dbError } = await supabase.from('users').insert([
      {
        id: user.id, // Use the Auth User ID
        username, // Store the username
        profile_pic_url: profilePicUrl, // Store the profile picture URL
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    if (dbError) {
      console.error("Database insertion error:", dbError);
      return res.status(400).json({ error: dbError.message });
    }

    res.status(201).json({ user: { ...user, username, profile_pic_url: profilePicUrl } });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Log-In function
async function logIn(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user) {
      return res.status(400).json({ error: error?.message || "Invalid login credentials" });
    }

    const user = data.user;

    // Fetch the username from the 'users' table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('username, profile_pic_url')
      .eq('id', user.id)
      .single();

    if (userError) {
      if (userError.message === "Requested single row but no rows returned") {
        return res.status(400).json({ error: "User not found in the database." });
      }
      return res.status(400).json({ error: "Error fetching user data." });
    }

    // Set both the access token and refresh token as cookies
    res.setHeader('Set-Cookie', [
      cookie.serialize('authToken', data.session.access_token, {
        httpOnly: false, // Allow client-side access for debugging
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Use lax for development
        maxAge: 60 * 60 * 24, // 1 day
        path: '/',
      }),
      cookie.serialize('refreshToken', data.session.refresh_token, {
        httpOnly: true, // Keep refresh token secure
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      })
    ]);

    res.status(200).json({
      user: {
        ...user,
        username: userData.username,
        profile_pic_url: userData.profile_pic_url,
      },
      token: data.session.access_token,           // Include token in response
      refreshToken: data.session.refresh_token    // Include refresh token in response
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Get User Data function
async function getUserData(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error("Error fetching user data:", error);
      return { error: error.message };
    }

    return { data };
  } catch (err) {
    console.error("Unexpected error fetching user data:", err);
    return { error: "Unexpected error occurred." };
  }
}

// Get User function
export const getUser = async (req, res) => {
  const userId = req.user?.id; // Assuming middleware attaches the user ID
  
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, profile_pic_url") // Include id in the selection
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching user data from Supabase:", error);
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({
      id: data.id, // Explicitly include the ID in the response
      username: data.username,
      profile_pic_url: data.profile_pic_url
    });
  } catch (err) {
    console.error("Unexpected error in getUser:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Refresh Token function
export const refreshAuthToken = async (req, res) => {
  try {
    // Get refresh token from cookies
    const cookies = cookie.parse(req.headers.cookie || '');
    const refreshToken = cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ error: "No refresh token provided" });
    }
    
    // Try to refresh the session with Supabase
    const { data, error } = await supabase.auth.refreshSession({ 
      refresh_token: refreshToken 
    });
    
    if (error) {
      console.error("Error refreshing token with Supabase:", error.message);
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }
    
    if (!data || !data.session) {
      console.error("No session data returned when refreshing token");
      return res.status(401).json({ error: "Failed to refresh session" });
    }
    
    // Set the new access token and refresh token as cookies
    res.setHeader('Set-Cookie', [
      cookie.serialize('authToken', data.session.access_token, {
        httpOnly: false, // Frontend needs to access this
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 1 day
        path: '/',
      }),
      cookie.serialize('refreshToken', data.session.refresh_token, {
        httpOnly: true, // More secure
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      })
    ]);
    
    res.status(200).json({ 
      message: "Token refreshed successfully",
      user: data.user ? {
        id: data.user.id,
        email: data.user.email
      } : null
    });
  } catch (err) {
    console.error("Unexpected error during token refresh:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export { signUp, logIn, getUserData };
