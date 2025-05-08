import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistance } from "date-fns";
import { FaHeart, FaRegHeart, FaRegComment, FaEllipsisH } from "react-icons/fa";
import { baseUrl } from "../utils/api";
import Cookies from "js-cookie";
import { useUser } from "../hooks/useUser";
import "../styles/Feed.css";

const SocialFeed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useUser();

  useEffect(() => {
    // Check if user exists in context
    if (!user) {
      console.log("No user found, redirecting to login");
      navigate("/login");
      return;
    }

    const fetchPosts = async () => {
      try {
        setLoading(true);

        // Get auth token from cookies
        const authToken = Cookies.get("authToken");

        if (!authToken) {
          console.error("No authentication token found");
          setError("Authentication failed. Please log in again.");
          navigate("/login");
          return;
        }

        const response = await fetch(`${baseUrl}/api/posts`, {
          credentials: "include", // Include cookies in the request
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            console.error("Unauthorized, redirecting to login...");
            navigate("/login");
            throw new Error("Your session has expired. Please log in again.");
          }
          throw new Error("Failed to fetch posts");
        }

        const data = await response.json();
        setPosts(data);

        // Reset any error if the fetch is successful
        setError(null);
      } catch (err) {
        console.error("Error fetching posts:", err.message);
        setError(err.message || "Failed to fetch posts");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [navigate, user]);

  const handleToggleLike = async (postId) => {
    try {
      // Get auth token from cookies
      const authToken = Cookies.get("authToken");

      if (!authToken) {
        console.error("No authentication token found");
        setError("Authentication failed. Please log in again.");
        navigate("/login");
        return;
      }

      const response = await fetch(
        `${baseUrl}/api/posts/${postId}/toggle-like`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          console.error("Unauthorized, redirecting to login...");
          navigate("/login");
          throw new Error("Your session has expired. Please log in again.");
        }
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
      setError(err.message);
    }
  };

  // Function to retry loading posts
  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // The useEffect will trigger again because we're changing the loading state
  };

  if (loading) {
    return <div className="loading-spinner">Loading posts...</div>;
  }

  return (
    <div className="social-feed">
      {error && (
        <div className="error-message">
          {error}
          <button onClick={handleRetry} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {posts.length === 0 && !error ? (
        <p className="no-posts">No posts available.</p>
      ) : (
        <div className="posts-container">
          {posts.map((post) => (
            <div className="post" key={post.id}>
              <div className="post-header">
                <div className="user-info">
                  <div className="profile-pic-container">
                    <img
                      className="profile-pic"
                      src={
                        post.users?.profile_pic_url ||
                        "https://via.placeholder.com/40"
                      }
                      alt="Profile"
                    />
                  </div>
                  <h3 className="post-username">
                    {post.users?.username || "Unknown User"}
                  </h3>
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
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
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
                  <strong>{post.users?.username || "Unknown User"} </strong>
                  {post.description}
                </p>
                <p>
                  <small>
                    {formatDistance(new Date(post.created_at), new Date(), {
                      addSuffix: true,
                    })}
                  </small>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SocialFeed;
