import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
} from "react";
import Cookies from "js-cookie"; // Use js-cookie for reliable cookie handling

// Create the UserContext
const UserContext = createContext();

// Create a provider component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedUser = useRef(false);
  const refreshAttempts = useRef(0); // Track refresh attempts to avoid infinite loops

  const refreshAuthToken = async () => {
    // Prevent too many refresh attempts
    if (refreshAttempts.current >= 3) {
      console.error("Too many refresh attempts, aborting");
      return false;
    }

    refreshAttempts.current += 1;

    try {
      console.log("Attempting to refresh auth token...");
      const response = await fetch("http://localhost:5000/api/auth/refresh", {
        method: "POST",
        credentials: "include", // Include cookies in the request
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(
          "Failed to refresh auth token. Response status:",
          response.status
        );
        return false;
      }

      const data = await response.json();
      console.log("Auth token refreshed successfully:", data.message);
      return true;
    } catch (error) {
      console.error("Error refreshing auth token:", error);
      return false;
    }
  };

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      console.log("Document cookies (debug):", document.cookie);

      const authToken = Cookies.get("authToken");

      if (!authToken) {
        console.log("No authToken found in cookies. User is not logged in.");
        setIsLoading(false);
        return;
      }

      console.log("AuthToken found:", authToken);

      // Make request with explicit headers
      const response = await fetch("http://localhost:5000/api/auth/user", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.status === 401) {
        console.warn("Unauthorized. Attempting to refresh token.");
        const refreshed = await refreshAuthToken();

        if (refreshed) {
          // Reset the count for next time
          refreshAttempts.current = 0;

          // Try once more with the new token
          const newAuthToken = Cookies.get("authToken");
          if (newAuthToken) {
            const retryResponse = await fetch(
              "http://localhost:5000/api/auth/user",
              {
                method: "GET",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${newAuthToken}`,
                },
              }
            );

            if (retryResponse.ok) {
              const data = await retryResponse.json();
              console.log(
                "User data fetched successfully after token refresh:",
                data
              );

              // Make sure we get the complete user data including profile picture URL
              if (data && data.id) {
                // Store user ID along with username and profile picture
                setUser({
                  id: data.id,
                  username: data.username,
                  profilePicture: data.profile_pic_url, // Store profile_pic_url as profilePicture
                  profile_pic_url: data.profile_pic_url, // Also store the original name for consistency
                });
                console.log(
                  "User data set with profile picture:",
                  data.profile_pic_url
                );
                setIsLoading(false);
                return;
              }
            } else {
              console.error(
                "Failed to fetch user data after token refresh. Status:",
                retryResponse.status
              );
              // Clear invalid tokens and set user to null
              logout();
            }
          }
        } else {
          // Token refresh failed, clear cookies and user state
          logout();
        }

        console.error(
          "Token refresh failed or retry failed. Cannot fetch user."
        );
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        console.error(
          "Failed to fetch user data. Response status:",
          response.status
        );
        // Clear tokens if we get a non-200 response
        logout();
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      console.log("Fetched user data:", data);

      // Check if we have valid user data with an ID
      if (!data || !data.id) {
        console.error("Invalid user data returned from API:", data);
        logout();
        setIsLoading(false);
        return;
      }

      // Store user ID along with username and profile picture
      setUser({
        id: data.id,
        username: data.username,
        profilePicture: data.profile_pic_url, // Store profile_pic_url as profilePicture
        profile_pic_url: data.profile_pic_url, // Also store the original name for consistency
      });
      console.log("User data set with profile picture:", data.profile_pic_url);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching user:", error);
      // Clear tokens on any error
      logout();
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear the auth token cookie
    Cookies.remove("authToken");
    Cookies.remove("refreshToken");
    // Reset user state
    setUser(null);
  };

  useEffect(() => {
    if (!hasFetchedUser.current) {
      hasFetchedUser.current = true;
      fetchUser();
    }
  }, []);

  const updateUser = (updatedUser) => {
    setUser((prevUser) => ({ ...prevUser, ...updatedUser }));
  };

  return (
    <UserContext.Provider
      value={{ user, setUser, updateUser, isLoading, logout }}
    >
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use the UserContext
export const useUser = () => {
  return useContext(UserContext);
};
