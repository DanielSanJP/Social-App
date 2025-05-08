import { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie"; // Use js-cookie for reliable cookie handling
import PropTypes from "prop-types"; // Add this import for prop-types
import { fetchUser } from "../utils/userUtils"; // Ensure fetchUser is imported
import { UserContext } from "./UserContextBase"; // Import from base file

// Create a provider component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const hasFetchedUser = useRef(false);

  useEffect(() => {
    if (!hasFetchedUser.current) {
      hasFetchedUser.current = true;
      fetchUser();
    }
  }, []); // Removed fetchUser from dependency array

  const updateUser = (updatedUser) => {
    setUser((prevUser) => ({ ...prevUser, ...updatedUser }));
  };

  const logout = () => {
    // Clear the auth token cookie
    Cookies.remove("authToken");
    Cookies.remove("refreshToken");
    // Reset user state
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, setUser, updateUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

// Add prop-types validation for the children prop
UserProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
