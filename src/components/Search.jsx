import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { baseUrl } from "../utils/api"; // Import baseUrl
import "../styles/Search.css"; // Import CSS for styling

const Search = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const navigate = useNavigate(); // Add useNavigate

  const handleSearch = async (searchQuery) => {
    if (searchQuery.trim() === "") {
      setResults([]);
      return;
    }

    console.log("Search Query Sent:", searchQuery); // Log the query

    try {
      const response = await axios.get(`${baseUrl}/api/users/search`, {
        params: { query: searchQuery },
      });
      console.log("Search Response Received:", response.data); // Log the response
      setResults(Array.isArray(response.data) ? response.data : []); // Ensure it's an array
    } catch (err) {
      console.error("Error fetching search results:", err);
      setResults([]); // Reset results on error
    }
  };

  const handleInputChange = (e) => {
    const searchQuery = e.target.value;
    setQuery(searchQuery);
    handleSearch(searchQuery); // Trigger search on input change
  };

  const handleUserClick = (userId) => {
    navigate(`/profile/${userId}`); // Navigate to the user's profile
  };

  return (
    <div className="searchbar">
      <input
        type="text"
        placeholder="Search users..."
        value={query}
        onChange={handleInputChange} // Trigger search on input change
      />
      <div className="search-results">
        {Array.isArray(results) &&
          results.map((user) => (
            <div
              className="search-result-item"
              key={user.id}
              onClick={() => handleUserClick(user.id)} // Add click handler
            >
              <img
                src={user.profile_pic_url} // Use the correct field name
                alt={`${user.username}'s profile`}
              />
              <span>{user.username}</span>
            </div>
          ))}
      </div>
    </div>
  );
};

export default Search;
