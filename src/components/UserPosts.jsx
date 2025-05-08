import { useEffect, useState } from "react";
import "../styles/UserPosts.css"; // Import CSS for styling
import { useParams, useNavigate } from "react-router-dom"; // Import useNavigate
import { baseUrl } from "../utils/api"; // Import baseUrl

const UserPosts = () => {
  const { userId } = useParams(); // Get the userId from the URL
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // Initialize navigate

  useEffect(() => {
    const fetchUserPosts = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/posts?userId=${userId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch user posts");
        }
        const data = await response.json();
        setPosts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserPosts();
  }, [userId]);

  if (loading) {
    return <p>Loading posts...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }

  if (posts.length === 0) {
    return <p>No posts to display.</p>;
  }

  return (
    <div className="user-posts-grid">
      {posts.map((post) => (
        <div
          key={post.id}
          className="post-item"
          onClick={() =>
            navigate(`/post/${post.id}`, {
              state: {
                ...post,
                user: {
                  username: post.username, // Ensure these fields are included
                  profile_pic_url: post.profile_pic_url,
                },
              },
            })
          }
        >
          <img
            src={post.image_url}
            alt={post.description}
            className="post-image"
          />
        </div>
      ))}
    </div>
  );
};

export default UserPosts;
