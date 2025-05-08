import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import { useUser } from "../hooks/useUser";
import "../styles/Navbar.css"; // Import CSS for styling
import {
  FaHome,
  FaSearch,
  FaEnvelope,
  FaPlus,
  FaUser,
  FaSignOutAlt,
  FaSignInAlt,
  FaUserPlus,
} from "react-icons/fa"; // Import icons from react-icons

function Navbar() {
  const { user, logout } = useUser(); // Get logout function from UserContext
  const navigate = useNavigate(); // Initialize useNavigate

  const handleSignOut = () => {
    logout(); // Use the logout function from UserContext which properly clears cookies
    navigate("/login"); // Redirect to login page
  };

  return (
    <nav>
      <ul>
        <li>
          <Link to="/socialfeed">
            <FaHome />
            <span>Social Feed</span>
          </Link>
        </li>
        <li>
          <Link to="/search">
            <FaSearch />
            <span>Search</span>
          </Link>
        </li>
        <li>
          <Link to="/messages">
            <FaEnvelope />
            <span>Messages</span>
          </Link>
        </li>
        {user ? (
          <>
            <li>
              <Link to="/createpost">
                <FaPlus />
                <span>Create Post</span>
              </Link>
            </li>
            <li>
              <Link to={`/profile/${user.id}`}>
                <FaUser />
                <span>Profile</span>
              </Link>
            </li>
            <li>
              <a onClick={handleSignOut}>
                <FaSignOutAlt />
                <span>Sign Out</span>
              </a>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link to="/login">
                <FaSignInAlt />
                <span>Login</span>
              </Link>
            </li>
            <li>
              <Link to="/signup">
                <FaUserPlus />
                <span>Signup</span>
              </Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}

export default Navbar;
