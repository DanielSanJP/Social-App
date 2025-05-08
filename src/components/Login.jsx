import { useState } from "react";
import { useUser } from "../contexts/UserContext";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import "../styles/Login.css"; // Import CSS for styling

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const { user, setUser } = useUser(); // Use global user context
  const navigate = useNavigate(); // Initialize useNavigate

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include", // Include cookies in the request
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      console.log("Logged in user:", data.user);

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
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;
