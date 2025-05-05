import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
} from "react";

// Create the UserContext
const UserContext = createContext();

// Create a provider component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Load the user from localStorage when the app initializes
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const hasFetchedUser = useRef(false); // Track if fetchUser has been called

  useEffect(() => {
    // Save the user to localStorage whenever it changes
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  const refreshAuthToken = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        console.warn("No refresh token found. Cannot refresh auth token.");
        return false;
      }

      const response = await fetch("http://localhost:5000/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        console.error("Failed to refresh auth token.");
        return false;
      }

      const data = await response.json();
      localStorage.setItem("authToken", data.authToken);
      return true;
    } catch (error) {
      console.error("Error refreshing auth token:", error);
      return false;
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        let token = localStorage.getItem("authToken");

        if (!token) {
          console.log("No authentication token found. Skipping user fetch.");
          return;
        }

        console.log("Authorization Token:", token); // Debugging

        let response = await fetch("http://localhost:5000/api/auth/user", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("Fetch User Response Status:", response.status); // Debugging

        if (response.status === 401) {
          console.warn("Unauthorized. Attempting to refresh token.");
          const refreshed = await refreshAuthToken();
          if (refreshed) {
            token = localStorage.getItem("authToken");
            response = await fetch("http://localhost:5000/api/auth/user", {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
          }
        }

        if (response.status === 401) {
          console.warn(
            "Unauthorized after refresh attempt. Clearing token and resetting user state."
          );
          alert("Your session has expired. Please log in again.");
          localStorage.removeItem("authToken");
          localStorage.removeItem("refreshToken");
          setUser(null);
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }

        const data = await response.json();
        setUser({
          username: data.username,
          profilePicture: data.profile_pic_url,
        });
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    if (!hasFetchedUser.current) {
      hasFetchedUser.current = true;
      fetchUser();
    }
  }, []);

  const updateUser = (updatedUser) => {
    setUser((prevUser) => ({ ...prevUser, ...updatedUser }));
  };

  return (
    <UserContext.Provider value={{ user, setUser, updateUser }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use the UserContext
export const useUser = () => {
  return useContext(UserContext);
};
