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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("authToken");

        if (!token) {
          console.log("No authentication token found. Skipping user fetch.");
          return;
        }

        const response = await fetch("http://localhost:5000/api/auth/user", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          console.warn(
            "Unauthorized. Clearing token and resetting user state."
          );
          localStorage.removeItem("authToken");
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
