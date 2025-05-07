import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import { useUser } from "../contexts/UserContext";

function Navbar() {
  const { user, logout } = useUser(); // Get logout function from UserContext
  const navigate = useNavigate(); // Initialize useNavigate

  const handleSignOut = () => {
    logout(); // Use the logout function from UserContext which properly clears cookies
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
        <li>
          <Link to="/search">Search</Link>
        </li>
        <li>
          <Link to="/messages">Messages</Link>
        </li>
        {user ? (
          <>
            <li>
              <Link to="/createpost">Create Post</Link>
            </li>
            <li>
              <Link to={`/profile/${user.id}`}>Profile</Link>{" "}
              {/* Dynamically navigate to the logged-in user's profile */}
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
