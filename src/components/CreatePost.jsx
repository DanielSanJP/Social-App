import React, { useState } from "react";
import "../styles/CreatePost.css";

const CreatePost = ({ userId }) => {
  const [image, setImage] = useState(null);
  const [description, setDescription] = useState("");
  const [error, setError] = useState(null);

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!image || !description) {
      setError("Please provide both an image and a description.");
      return;
    }

    const formData = new FormData();
    formData.append("image", image);
    formData.append("description", description);
    formData.append("user_id", userId);

    const token = localStorage.getItem("authToken"); // Retrieve the token from localStorage

    try {
      const response = await fetch("http://localhost:5000/api/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to create post");
      }

      alert("Post created successfully!");
      setImage(null);
      setDescription("");
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="create-post">
      <h2>Create a Post</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input type="file" accept="image/*" onChange={handleImageChange} />
        <textarea
          placeholder="Write a description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        ></textarea>
        <button type="submit">Post</button>
      </form>
    </div>
  );
};

export default CreatePost;
