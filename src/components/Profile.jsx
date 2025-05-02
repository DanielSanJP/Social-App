import React, { useEffect, useState } from "react";
import { useUser } from "../contexts/UserContext";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const { user } = useUser();

  if (!user) {
    return <Navigate to="/login" replace />; // Redirect to login if not logged in
  }

  return children; // Render the protected component if logged in
}

const Profile = () => {
  const { user, updateUser } = useUser();
  const [username, setUsername] = useState(user?.username || "");
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    console.log("Profile component mounted");
    console.log("User data in Profile component:", user);
  }, [user]);

  const handleSave = async () => {
    const formData = new FormData();
    formData.append("username", username);

    if (profilePicFile) {
      formData.append("profile_pic_file", profilePicFile);
    }

    try {
      const token = localStorage.getItem("authToken"); // Retrieve the token from localStorage or another secure storage
      if (!token) {
        console.error("No token found in localStorage");
      } else {
        console.log("Token being sent:", token); // Debug log for token
      }
      const response = await fetch(
        `http://localhost:5000/api/users/${user.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      // Update the user context with the new data
      updateUser(data.user);
      setMessage("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage("Failed to update profile.");
    }

    setIsEditing(false);
  };

  return (
    <div>
      <h1>{user?.username}</h1>
      <img
        src={user?.profile_pic_url || "https://via.placeholder.com/150"}
        alt={`${user?.username || "User"}`}
        style={{ width: "150px", height: "150px", borderRadius: "50%" }}
      />
      <h2></h2>
      <button onClick={() => setIsEditing(true)}>Edit Profile</button>

      {isEditing && (
        <div className="popup-form">
          <h3>Edit Profile</h3>
          <div>
            <label>
              Username:
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
          </div>
          <div>
            <label>
              Profile Picture:
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProfilePicFile(e.target.files[0])}
              />
            </label>
          </div>
          <button onClick={handleSave}>Save Changes</button>
          <button onClick={() => setIsEditing(false)}>Cancel</button>
        </div>
      )}
      {message && <p>{message}</p>}
    </div>
  );
};

export default Profile;
export { ProtectedRoute };
