import { useEffect, useState } from "react"; // Removed unused 'React' import
import { useUser } from "../hooks/useUser";
import { useParams, useNavigate } from "react-router-dom";
import Cookies from "js-cookie"; // Replace cookie with js-cookie
import { baseUrl } from "../utils/api"; // Import baseUrl
import "../styles/Profile.css"; // Import your CSS file for styling
import UserPosts from "./UserPosts"; // Import UserPosts component
import PropTypes from "prop-types";

function ProtectedRoute({ children }) {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user !== undefined) {
      setIsLoading(false);
    }
  }, [user]);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

const Profile = () => {
  const { userId } = useParams(); // Get userId from URL params
  const { user, updateUser } = useUser();
  const [profileData, setProfileData] = useState(null);
  const [username, setUsername] = useState("");
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const navigate = useNavigate(); // Initialize useNavigate
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);

  useEffect(() => {
    if (userId === user?.id) {
      setProfileData({
        ...user,
        profile_pic_url: user?.profilePicture || user?.profile_pic_url, // Handle both naming conventions
      });
      setUsername(user?.username || "");
    } else {
      // Fetch the profile data for the other user
      const fetchProfile = async () => {
        try {
          const response = await fetch(`${baseUrl}/api/users/${userId}`);
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

  useEffect(() => {
    const fetchFollowData = async () => {
      try {
        const [followersResponse, followingResponse] = await Promise.all([
          fetch(`${baseUrl}/api/follows/${userId}/followers`),
          fetch(`${baseUrl}/api/follows/${userId}/following`),
        ]);

        const followersData = await followersResponse.json();
        const followingData = await followingResponse.json();

        // Set the counts
        setFollowersCount(followersData.count || 0);
        setFollowingCount(followingData.count || 0);

        // Store the actual lists
        setFollowersList(followersData.followers || []);
        setFollowingList(followingData.following || []);

        // Check if the current user follows this profile
        const token = Cookies.get("authToken");
        if (token && user?.id) {
          const isFollowingResponse = await fetch(
            `${baseUrl}/api/follows/check/${userId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const isFollowingData = await isFollowingResponse.json();
          setIsFollowing(isFollowingData.isFollowing);
        }
      } catch (error) {
        console.error("Error fetching follow data:", error);
        setFollowersCount(0);
        setFollowingCount(0);
        setFollowersList([]);
        setFollowingList([]);
      }
    };

    fetchFollowData();
  }, [userId, user]);

  const handleSave = async () => {
    const formData = new FormData();
    formData.append("username", username);

    if (profilePicFile) {
      formData.append("file", profilePicFile);
    }

    try {
      const token = Cookies.get("authToken");
      if (!token) {
        console.error("No token found in cookies");
        setMessage("Authentication error. Please log in again.");
        return;
      }

      setMessage("Updating profile...");

      const response = await fetch(`${baseUrl}/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      // Update the global user context with both profile_pic_url fields
      updateUser({
        ...data.user,
        profilePicture: data.user.profile_pic_url, // Add this mapping
      });

      // Update local state with new profile data
      setProfileData({
        ...profileData,
        username: data.user.username || username,
        profile_pic_url: data.user.profile_pic_url,
      });

      setUsername(data.user.username || "");

      // Clear the file input
      setProfilePicFile(null);

      setMessage("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage(`Failed to update profile: ${error.message}`);
    }
  };

  const handleStartChat = async () => {
    try {
      const token = Cookies.get("authToken");

      if (!token) {
        setMessage("You must be logged in to start a conversation.");
        return;
      }

      setMessage("Creating conversation...");

      // Only send recipientId as the backend will set created_by itself
      const response = await fetch(`${baseUrl}/api/messages/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          recipientId: userId,
        }),
      });

      // Check if the response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error(
          "Server returned non-JSON response:",
          await response.text()
        );
        throw new Error(
          "Server returned non-JSON response. API might be unavailable."
        );
      }

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 500) {
          console.error("Server error details:", data);

          // Check for RLS policy violations
          if (data.error && data.error.includes("row-level security")) {
            throw new Error("Permission error. Our team has been notified.");
          }

          throw new Error(`Server error: ${data.error || response.status}`);
        } else if (response.status === 401) {
          throw new Error("Your session has expired. Please log in again.");
        } else {
          throw new Error(data.error || `Server error: ${response.status}`);
        }
      }

      setMessage("");
      navigate(`/chat/${data.conversationId}`);
    } catch (error) {
      console.error("Error starting chat:", error);

      // Handle specific known errors with user-friendly messages
      if (
        error.message.includes("row-level security") ||
        error.message.includes("violates row-level security policy")
      ) {
        setMessage(
          "Sorry, there was a permissions issue. Our team has been notified and is working on it."
        );
      } else if (error.message.includes("session has expired")) {
        setMessage("Your session has expired. Please log in again.");
        // Optionally redirect to login after a delay
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setMessage(`Failed to start conversation: ${error.message}`);
      }
    }
  };

  const handleFollow = async () => {
    try {
      const token = Cookies.get("authToken");
      if (!token) {
        return;
      }

      const response = await fetch(`${baseUrl}/api/follows`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ followingId: userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to follow user.");
      }

      setIsFollowing(true);
      setFollowersCount((prev) => prev + 1);
    } catch (error) {
      console.error("Error following user:", error);
    }
  };

  const handleUnfollow = async () => {
    try {
      const token = Cookies.get("authToken");
      if (!token) {
        return;
      }

      const response = await fetch(`${baseUrl}/api/follows/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to unfollow user.");
      }

      setIsFollowing(false);
      setFollowersCount((prev) => prev - 1);
    } catch (error) {
      console.error("Error unfollowing user:", error);
    }
  };

  if (!profileData) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <div className="profile-header">
        <img
          src={profileData.profile_pic_url || "https://via.placeholder.com/150"}
          alt={`${profileData.username || "User"}`}
          style={{ width: "150px", height: "150px", borderRadius: "50%" }}
        />
        <div className="profile-details">
          <h3>{profileData.username}</h3>

          {userId === user?.id ? (
            <button className="edit-button" onClick={() => setIsEditing(true)}>
              Edit Profile
            </button>
          ) : (
            <>
              <button onClick={handleStartChat}>Message</button>
              {isFollowing ? (
                <button onClick={handleUnfollow}>Unfollow</button>
              ) : (
                <button onClick={handleFollow}>Follow</button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="follow-stats">
        <button
          className="action-button"
          onClick={() => setShowFollowersModal(true)}
          style={{ cursor: "pointer" }}
        >
          <strong>{followersCount}</strong> Followers
        </button>
        <button
          className="action-button"
          onClick={() => setShowFollowingModal(true)}
          style={{ cursor: "pointer" }}
        >
          <strong>{followingCount}</strong> Following
        </button>
      </div>

      {/* Followers Modal */}
      {showFollowersModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowFollowersModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Followers</h3>
              <button onClick={() => setShowFollowersModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {followersList.length > 0 ? (
                <ul className="users-list">
                  {followersList.map((follower) => (
                    <li
                      key={follower.follower_id}
                      onClick={() => {
                        setShowFollowersModal(false);
                        navigate(`/profile/${follower.follower_id}`);
                      }}
                    >
                      <img
                        src={
                          follower.users?.profile_pic_url ||
                          "https://via.placeholder.com/40"
                        }
                        alt={follower.users?.username}
                        className="user-avatar"
                      />
                      <span>{follower.users?.username}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No followers yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowFollowingModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Following</h3>
              <button onClick={() => setShowFollowingModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {followingList.length > 0 ? (
                <ul className="users-list">
                  {followingList.map((following) => (
                    <li
                      key={following.following_id}
                      onClick={() => {
                        setShowFollowingModal(false);
                        navigate(`/profile/${following.following_id}`);
                      }}
                    >
                      <img
                        src={
                          following.users?.profile_pic_url ||
                          "https://via.placeholder.com/40"
                        }
                        alt={following.users?.username}
                        className="user-avatar"
                      />
                      <span>{following.users?.username}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Not following anyone yet.</p>
              )}
            </div>
          </div>
        </div>
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
          <div className="popup-buttons">
            <button className="edit-button" onClick={handleSave}>
              Save Changes
            </button>
            <button className="edit-button" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {message && <p>{message}</p>}

      {/* Render UserPosts */}
      <UserPosts />
    </div>
  );
};

export default Profile;
export { ProtectedRoute };
