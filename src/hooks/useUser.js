import { useContext } from "react";
import { UserContext } from "../contexts/UserContextBase"; // Updated to import from UserContextBase

// Custom hook to use the UserContext
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export default useUser;