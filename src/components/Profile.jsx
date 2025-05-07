import React, { useEffect, useState } from "react";
import { useUser } from "../contexts/UserContext";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import Cookies from "js-cookie"; // Replace cookie with js-cookie
import "../styles/Profile.css"; // Import your CSS file for styling
import UserPosts from "./UserPosts"; // Import UserPosts component

function ProtectedRoute({ children }) {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading user data (adjust this logic based on your app)
    if (user !== undefined) {
      setIsLoading(false);
    }
  }, [user]);

  if (isLoading) {
    return <p>Loading...</p>; // Show a loading state while user data is being fetched
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

  useEffect(() => {
    const fetchFollowData = async () => {
      try {
        const [followersResponse, followingResponse] = await Promise.all([
          fetch(`http://localhost:5000/api/follows/${userId}/followers`),
          fetch(`http://localhost:5000/api/follows/${userId}/following`),
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
            `http://localhost:5000/api/follows/check/${userId}`,
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
      formData.append("profile_pic_file", profilePicFile);
    }

    try {
      const token = Cookies.get("authToken");
      if (!token) {
        console.error("No token found in cookies");
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
      const token = Cookies.get("authToken");

      if (!token) {
        console.error("No token found in cookies");
        return;
      }

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

      if (!response.ok) {
        throw new Error(data.error || "Failed to start chat.");
      }

      navigate(`/chat/${data.conversationId}`);
    } catch (error) {
      console.error("Error starting chat:", error);
    }
  };

  const handleFollow = async () => {
    try {
      const token = Cookies.get("authToken");
      if (!token) {
        return;
      }

      const response = await fetch("http://localhost:5000/api/follows", {
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

      const response = await fetch(
        `http://localhost:5000/api/follows/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

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
      <h1>{profileData.username}</h1>
      <img
        src={profileData.profile_pic_url || "https://via.placeholder.com/150"}
        alt={`${profileData.username || "User"}`}
        style={{ width: "150px", height: "150px", borderRadius: "50%" }}
      />
      <div className="follow-stats">
        <p
          onClick={() => setShowFollowersModal(true)}
          style={{ cursor: "pointer" }}
        >
          <strong>{followersCount}</strong> Followers
        </p>
        <p
          onClick={() => setShowFollowingModal(true)}
          style={{ cursor: "pointer" }}
        >
          <strong>{followingCount}</strong> Following
        </p>
      </div>
      {userId === user?.id ? (
        <button onClick={() => setIsEditing(true)}>Edit Profile</button>
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
          <button onClick={handleSave}>Save Changes</button>
          <button onClick={() => setIsEditing(false)}>Cancel</button>
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
