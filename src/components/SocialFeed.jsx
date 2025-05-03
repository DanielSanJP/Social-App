import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { formatDistance } from "date-fns";

const SocialFeed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    console.log("Token retrieved:", token); // Debugging token retrieval

    // Redirect to login if no token is found
    if (!token) {
      console.error("No token found, redirecting to login...");
      navigate("/login");
      return;
    }

    const fetchPosts = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/posts", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log("Response status:", response.status);
        console.log("Response headers:", response.headers);

        if (!response.ok) {
          throw new Error("Failed to fetch posts");
        }

        const data = await response.json();
        console.log("Fetched posts data:", data);

        setPosts(data); // Directly set posts with the liked flag from the backend
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
    const token = localStorage.getItem("authToken");

    if (!token) {
      console.error("No token found, cannot toggle like.");
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/posts/${postId}/toggle-like`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
    <div>
      <h2>Social Feed</h2>
      {posts.length === 0 ? (
        <p>No posts available.</p>
      ) : (
        <div>
          {posts.map((post) => (
            <div
              key={post.id}
              style={{
                marginBottom: "20px",
                border: "1px solid #ccc",
                padding: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "20px",
                }}
              >
                <div
                  style={{
                    display: "inline-block",
                    position: "relative",
                    width: "80px",
                    height: "80px",
                    overflow: "hidden",
                    borderRadius: "50%", // Makes the container circular
                  }}
                >
                  <img
                    src={post.profile_pic_url}
                    alt="ProfilePIC"
                    style={{
                      width: "100%", // Ensures the image covers the container
                      height: "100%",
                      objectFit: "cover", // Ensures the image scales and crops to fit the circle
                    }}
                  />
                </div>
                <h3>{post.username}</h3>
              </div>
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt="Post"
                  style={{
                    maxWidth: "350px",
                    height: "auto",
                    marginBottom: "10px",
                  }}
                />
              )}
              <p>
                <strong>{post.username} </strong>
                {post.description}
              </p>
              <p>
                <small>
                  {formatDistance(new Date(post.created_at), new Date(), {
                    addSuffix: true,
                  })}
                </small>
              </p>
              <p>Likes: {post.likes}</p>
              <button
                onClick={() => handleToggleLike(post.id)}
                style={{
                  backgroundColor: post.liked ? "magenta" : "white", // Magenta if liked, white otherwise
                  color: post.liked ? "white" : "black", // Adjust text color for contrast
                  border: "1px solid #ccc",
                  padding: "5px 10px",
                  cursor: "pointer",
                }}
              >
                {post.liked ? "Liked" : "Like"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SocialFeed;
