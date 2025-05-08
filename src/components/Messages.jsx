import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import PropTypes from "prop-types"; // Import PropTypes for validation
import { useUser } from "../hooks/useUser";
import { baseUrl } from "../utils/api"; // Import baseUrl
import "../styles/Messages.css";

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user exists in context
    if (!user) {
      navigate("/login");
      return;
    }

    const fetchConversations = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get auth token from cookies
        const authToken = Cookies.get("authToken");

        // Debug: Log cookies and auth token
        console.log("All cookies:", document.cookie);
        console.log("Auth token from cookies:", authToken);

        if (!authToken) {
          console.error("No authentication token found");
          setLoading(false);
          setError("Authentication failed. Please log in again.");
          navigate("/login");
          return;
        }

        console.log(
          "Auth Token in Messages.jsx fetchConversations:",
          authToken
        );

        const response = await axios.get(
          `${baseUrl}/api/messages/conversations`,
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        console.log("Fetched Conversations:", response.data);
        setConversations(response.data || []);
      } catch (error) {
        if (error.response && error.response.status === 401) {
          console.error("Unauthorized, redirecting to login...");
          setError("Your session has expired. Please log in again.");
          navigate("/login");
        } else if (error.response && error.response.status === 404) {
          console.warn("No conversations found.");
          setConversations([]); // Set conversations to an empty array
        } else {
          console.error("Error fetching conversations:", error);
          setError("Error loading conversations. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user, navigate]);

  const handleSelectConversation = (conversation) => {
    try {
      // Get fresh token directly from cookies
      const authToken = Cookies.get("authToken");

      if (!authToken) {
        console.error("No auth token found, redirecting to login...");
        navigate("/login");
        return;
      }

      // Debug log to check token before navigation
      console.log("Auth token before navigation:", authToken);
      console.log("Navigating to conversation:", conversation.conversation_id);

      // Pass the auth token in the location state
      navigate(`/chat/${conversation.conversation_id}`, {
        state: { authToken },
      });
    } catch (error) {
      console.error("Error selecting conversation:", error);
      navigate("/login");
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading conversations...</div>;
  }

  return (
    <div className="messages-container">
      <h2>Your Conversations</h2>
      {error && <div className="error-message">{error}</div>}
      <div className="messages-list">
        {conversations.length === 0 ? (
          <p className="no-conversations">
            No conversations found. Start a new chat!
          </p>
        ) : (
          <ul className="conversation-list">
            {conversations.map((conversation) => (
              <li
                key={conversation.conversation_id}
                onClick={() => handleSelectConversation(conversation)}
                className="conversation-item"
              >
                <img
                  src={
                    conversation.users?.profile_pic_url ||
                    "https://via.placeholder.com/50"
                  }
                  alt={conversation.users?.username || "User"}
                  className="conversation-profile-pic"
                />
                <div className="conversation-details">
                  <span className="conversation-username">
                    {conversation.users?.username || "Unknown User"}
                  </span>
                  {conversation.last_message && (
                    <span className="conversation-preview">
                      {conversation.last_message.substring(0, 30)}
                      {conversation.last_message.length > 30 ? "..." : ""}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

Messages.propTypes = {
  onSelectConversation: PropTypes.func, // Add prop validation
};

export default Messages;
