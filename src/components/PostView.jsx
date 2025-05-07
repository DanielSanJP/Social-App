import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../contexts/UserContext"; // Assuming you have a UserContext
import "../styles/PostView.css"; // Import CSS for styling

const PostView = () => {
  const { state: post } = useLocation(); // Get post data from navigation state
  const navigate = useNavigate();
  const { user: loggedInUser } = useUser(); // Get logged-in user from context
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(post.description);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/users/${post.user_id}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }
        const userData = await response.json();
        setUser(userData);
      } catch (err) {
        console.error(err.message);
      }
    };

    fetchUser();
  }, [post.user_id]);

  const handleSave = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/posts/${post.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to update post");
      }
      setIsEditing(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/posts/${post.id}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to delete post");
      }
      navigate(-1); // Go back to the previous page
    } catch (err) {
      alert(err.message);
    }
  };

  if (!user) {
    return <p>Loading user data...</p>;
  }

  const isOwner = loggedInUser?.id === post.user_id; // Check if logged-in user is the owner

  return (
    <div className="post-view">
      <button onClick={() => navigate(-1)} className="close-button">
        Close
      </button>
      <div className="post-view-header">
        <img
          src={user.profile_pic_url || "/default-profile.png"}
          alt={user.username || "Unknown User"}
          className="profile-picture"
        />
        <span className="username">{user.username || "Unknown User"}</span>
      </div>
      <img src={post.image_url} alt={description} className="post-image" />
      {isEditing ? (
        <div className="edit-form">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="description-input"
          />
          <div className="edit-buttons">
            <button onClick={handleSave} className="save-button">
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="cancel-button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="post-description">
          <p>{description}</p>
        </div>
      )}
      {isOwner && ( // Only show these buttons if the logged-in user is the owner
        <div className="post-view-buttons">
          <button
            onClick={() => setIsEditing(true)}
            className="post-view-edit-button"
          >
            Edit
          </button>
          <button onClick={handleDelete} className="delete-button">
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default PostView;
