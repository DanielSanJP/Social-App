import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import { useUser } from "../contexts/UserContext";

function Navbar() {
  const { user, setUser } = useUser();
  const navigate = useNavigate(); // Initialize useNavigate

  const handleSignOut = () => {
    setUser(null); // Clear the user from context
    localStorage.removeItem("user"); // Clear user from localStorage
    localStorage.removeItem("authToken"); // Clear auth token from localStorage
    navigate("/login"); // Redirect to login page
  };

  return (
    <nav style={{ padding: "1rem", background: "#f4f4f4" }}>
      <ul
        style={{
          display: "flex",
          listStyle: "none",
          gap: "1rem",
          alignItems: "center",
        }}
      >
        <li>
          <Link to="/socialfeed">Social Feed</Link>
        </li>
        {user ? (
          <>
            <li>
              <Link to="/createpost">Create Post</Link>
            </li>
            <li>
              <Link to="/profile">Profile</Link>
            </li>
            <li>
              <button
                onClick={handleSignOut}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "blue",
                }}
              >
                Sign Out
              </button>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link to="/login">Login</Link>
            </li>
            <li>
              <Link to="/signup">Signup</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}

export default Navbar;
