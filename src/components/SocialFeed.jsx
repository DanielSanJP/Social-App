import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { formatDistance } from "date-fns";
import { FaHeart, FaRegHeart, FaRegComment, FaEllipsisH } from "react-icons/fa"; // Import heart icons
import "../styles/Feed.css"; // Import CSS for styling

const SocialFeed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/posts", {
          credentials: "include", // Include cookies in the request
        });

        if (!response.ok) {
          throw new Error("Failed to fetch posts");
        }

        const data = await response.json();

        // Ensure the `liked` status is fetched and set
        setPosts(data);
      } catch (err) {
        console.error("Error fetching posts:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [navigate]);

  const handleToggleLike = async (postId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/posts/${postId}/toggle-like`,
        {
          method: "PATCH",
          credentials: "include", // Include cookies in the request
        }
      );

      if (!response.ok) {
        throw new Error("Failed to toggle like");
      }

      const updatedPost = await response.json();

      // Update the likes count and liked status in the state
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? { ...post, likes: updatedPost.likes, liked: updatedPost.liked }
            : post
        )
      );
    } catch (err) {
      console.error("Error toggling like:", err.message);
    }
  };

  if (loading) {
    return <p>Loading posts...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }

  return (
    <div className="social-feed">
      {posts.length === 0 ? (
        <p>No posts available.</p>
      ) : (
        <div className="posts-container">
          {posts.map((post) => (
            <div className="post" key={post.id}>
              <div className="post-header">
                <div className="user-info">
                  <div className="profile-pic-container">
                    <img
                      className="profile-pic"
                      src={post.users?.profile_pic_url} // Access profile_pic_url from the nested users field
                      alt="ProfilePIC"
                    />
                  </div>
                  <h3 className="post-username">{post.users?.username}</h3>
                </div>
                <div className="post-options">
                  <button className="action-button">
                    <FaEllipsisH />
                  </button>
                </div>
              </div>
              {post.image_url && (
                <img
                  className="feed-post-image"
                  src={post.image_url}
                  alt="Post"
                />
              )}
              <div className="post-description">
                <div className="post-actions">
                  <button
                    className="action-button"
                    onClick={() => handleToggleLike(post.id)}
                    style={{
                      backgroundColor: "transparent", // Transparent background
                      border: "none", // Remove border
                      cursor: "pointer", // Pointer cursor for better UX
                    }}
                  >
                    {post.liked ? (
                      <FaHeart style={{ color: "#FF3040" }} />
                    ) : (
                      <FaRegHeart />
                    )}
                  </button>
                  <button className="action-button">
                    <FaRegComment />
                  </button>
                </div>
                <p>
                  <strong>{post.users?.username} </strong>
                  {post.description}
                </p>
                <p>
                  <small>
                    {formatDistance(new Date(post.created_at), new Date(), {
                      addSuffix: true,
                    })}
                  </small>
                </p>
                {/* <p>Likes: {post.likes}</p> */}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SocialFeed;
