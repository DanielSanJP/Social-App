import { useState } from "react";
import { baseUrl } from "../utils/api"; // Import baseUrl
import "../styles/Register.css"; // Assuming you have some CSS for styling

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("email", email); // For auth.users
    formData.append("password", password); // For auth.users
    formData.append("username", username); // For public.users
    if (profilePic) formData.append("profilePic", profilePic); // For public.users

    try {
      const response = await fetch(`${baseUrl}/api/auth/signup`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess("Signup successful! You can now log in.");
      setEmail("");
      setPassword("");
      setUsername("");
      setProfilePic(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="Register-Form" onSubmit={handleSignup}>
      <h2>Signup</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}
      <div>
        <p>Username:</p>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
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
      <div>
        <p>Profile Picture:</p>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setProfilePic(e.target.files[0])}
        />
      </div>
      <button type="submit">Signup</button>
    </form>
  );
};

export default Signup;
