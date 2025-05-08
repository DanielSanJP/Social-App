import React, { useState } from "react";
import "../styles/CreatePost.css";
import Cookies from "js-cookie"; // Import the js-cookie library
import { baseUrl } from "../utils/api"; // Import baseUrl

const CreatePost = ({ userId }) => {
  const [image, setImage] = useState(null);
  const [description, setDescription] = useState("");
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous messages
    setError(null);
    setSuccessMessage(null);

    if (!image || !description) {
      setError("Please provide both an image and a description.");
      return;
    }

    const formData = new FormData();
    formData.append("image", image);
    formData.append("description", description);
    formData.append("user_id", userId);

    // Get the token from cookies instead of localStorage
    const token = Cookies.get("authToken");

    if (!token) {
      setError("Authentication token not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/api/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include", // Include cookies in the request
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to create post");
      }

      // Show success message in a paragraph instead of an alert
      setSuccessMessage("Post created successfully!");
      // Reset form
      setImage(null);
      setDescription("");
      // Reset the file input by clearing its value
      document.querySelector('input[type="file"]').value = "";
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="create-post">
      <h2>Create a Post</h2>
      {error && <p className="error">{error}</p>}
      {successMessage && <p className="success-message">{successMessage}</p>}
      <form className="create-post-form" onSubmit={handleSubmit}>
        <input
          className="image-input"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
        />
        <textarea
          className="description-input"
          rows={4}
          cols={50}
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
