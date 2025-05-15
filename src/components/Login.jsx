import { useState } from "react";
import { useUser } from "../hooks/useUser";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { baseUrl } from "../utils/api"; // Import baseUrl
import "../styles/Login.css"; // Import CSS for styling
import Cookies from "js-cookie"; // Import js-cookie

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const { setUser } = useUser(); // Use global user context
  const navigate = useNavigate(); // Initialize useNavigate

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include", // Include cookies in the request
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Explicitly save the auth token to cookies
      if (data.token) {
        Cookies.set("authToken", data.token, {
          path: "/",
          secure: location.protocol === "https:",
          sameSite: "Lax",
        });
      }

      // If refresh token is provided, save it too
      if (data.refreshToken) {
        Cookies.set("refreshToken", data.refreshToken, {
          path: "/",
          secure: location.protocol === "https:",
          sameSite: "Lax",
        });
      }

      // Store both naming conventions for the profile picture
      setUser({
        ...data.user,
        profilePicture: data.user.profile_pic_url,
      });

      // Redirect to the SocialFeed page
      navigate("/socialfeed");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <form className="Login-Form" onSubmit={handleLogin}>
        <h2>Login</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <div>
          <p>Email:</p>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <p>Password:</p>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
      <div className="signup-prompt">
        <div>Don&apos;t have an account? </div>
        <br />
        <button onClick={() => navigate("/signup")}>Sign up</button>
      </div>
    </div>
  );
}

export default Login;
