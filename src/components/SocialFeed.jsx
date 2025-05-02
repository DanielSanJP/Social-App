import React, { useEffect, useState } from "react";
import { formatDistance } from "date-fns";

const SocialFeed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch posts from the backend
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const token = localStorage.getItem("authToken"); // Retrieve token from localStorage
        const response = await fetch("http://localhost:5000/api/posts", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log("Response status:", response.status); // Log response status
        console.log("Response headers:", response.headers); // Log response headers

        if (!response.ok) {
          throw new Error("Failed to fetch posts");
        }

        const data = await response.json();
        console.log("Fetched posts data:", data); // Log the fetched data
        setPosts(data);
      } catch (err) {
        console.error("Error fetching posts:", err.message); // Log the error
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleLike = async (postId) => {
    console.log("Liking post with ID:", postId); // Debugging
    try {
      const response = await fetch(
        `http://localhost:5000/api/posts/${postId}/like`,
        {
          method: "PATCH",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to like post");
      }
      const updatedPost = await response.json();

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId ? { ...post, likes: updatedPost.post.likes } : post
        )
      );
      console.log("Post liked successfully:", updatedPost.post); // Debugging
    } catch (err) {
      console.error("Error liking post:", err.message);
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
              <h3></h3>
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
              <button onClick={() => handleLike(post.id)}>Like</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SocialFeed;
