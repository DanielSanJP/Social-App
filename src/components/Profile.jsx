import React, { useEffect, useState } from "react";
import { useUser } from "../contexts/UserContext";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import Cookies from "js-cookie"; // Replace cookie with js-cookie

function ProtectedRoute({ children }) {
  const { user } = useUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

const Profile = () => {
  const { userId } = useParams(); // Get userId from URL params
  const { user, updateUser } = useUser();
  const [profileData, setProfileData] = useState(null);
  const [username, setUsername] = useState("");
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    if (userId === user?.id) {
      setProfileData(user);
      setUsername(user?.username || "");
    } else {
      // Fetch the profile data for the other user
      const fetchProfile = async () => {
        try {
          const response = await fetch(
            `http://localhost:5000/api/users/${userId}`
          );
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "Failed to fetch profile.");
          }
          setProfileData(data);
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      };
      fetchProfile();
    }
  }, [userId, user]);

  const handleSave = async () => {
    const formData = new FormData();
    formData.append("username", username);

    if (profilePicFile) {
      formData.append("profile_pic_file", profilePicFile);
    }

    try {
      const token = Cookies.get("authToken");
      if (!token) {
        console.error("No token found in cookies");
        navigate("/login");
        return;
      }

      const response = await fetch(
        `http://localhost:5000/api/users/${user.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include", // Include cookies in the request
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      updateUser(data.user);
      setMessage("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage("Failed to update profile.");
    }

    setIsEditing(false);
  };

  const handleStartChat = async () => {
    try {
      console.log("Document cookies (debug):", document.cookie); // Debugging cookies

      // Use js-cookie instead of cookie.parse
      const token = Cookies.get("authToken");

      if (!token) {
        console.error("No token found in cookies, redirecting to login...");
        navigate("/login");
        return;
      }

      console.log("Authorization Token:", token); // Debugging

      // Create or fetch a conversation with the user
      const response = await fetch(
        "http://localhost:5000/api/messages/conversations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include", // Include cookies in the request
          body: JSON.stringify({ recipientId: userId }), // Pass the recipient's userId
        }
      );

      const data = await response.json();
      console.log("Start Chat Response:", data); // Debugging

      if (!response.ok) {
        throw new Error(data.error || "Failed to start chat.");
      }

      // Navigate to the chat page for the conversation
      navigate(`/chat/${data.conversationId}`);
    } catch (error) {
      console.error("Error starting chat:", error);
    }
  };

  if (!profileData) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <h1>{profileData.username}</h1>
      <img
        src={profileData.profile_pic_url || "https://via.placeholder.com/150"}
        alt={`${profileData.username || "User"}`}
        style={{ width: "150px", height: "150px", borderRadius: "50%" }}
      />
      {userId === user?.id ? (
        <button onClick={() => setIsEditing(true)}>Edit Profile</button>
      ) : (
        <button onClick={handleStartChat}>Message</button> // Add Message button
      )}

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
