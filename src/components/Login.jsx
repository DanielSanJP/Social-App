import { useState } from "react";
import { useUser } from "../contexts/UserContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const { user, setUser } = useUser(); // Use global user context

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      console.log("Logged in user:", data.user);
      setUser(data.user); // Set the global user state

      // Store the access token in localStorage
      localStorage.setItem("authToken", data.access_token);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {user ? (
        <div>
          <h2>Welcome, {user.username}!</h2>
          {user.profile_pic_url && (
            <img
              src={user.profile_pic_url}
              alt="Profile"
              style={{ width: "100px", height: "100px", borderRadius: "50%" }}
            />
          )}
        </div>
      ) : (
        <form onSubmit={handleLogin}>
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
      )}
    </div>
  );
}

export default Login;
