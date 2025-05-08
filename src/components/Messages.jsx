import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import PropTypes from "prop-types";
import { useUser } from "../hooks/useUser";
import { baseUrl } from "../utils/api";
import "../styles/Messages.css";

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, refreshUser } = useUser();
  const navigate = useNavigate();

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get auth token from cookies
      const authToken = Cookies.get("authToken");

      if (!authToken) {
        console.error("No authentication token found");
        setLoading(false);
        setError("Authentication failed. Please log in again.");
        navigate("/login");
        return;
      }

      console.log(
        "Fetching conversations with token:",
        authToken ? "Token exists" : "No token"
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

      console.log("Conversations API response:", response.status);

      // If we get a successful response but no data, handle it gracefully
      if (!response.data) {
        console.warn("API returned no data");
        setConversations([]);
        return;
      }

      // Sort conversations by last message time (most recent first)
      const sortedConversations = response.data.sort((a, b) => {
        // If no last_message_time, put at the end
        if (!a.last_message_time) return 1;
        if (!b.last_message_time) return -1;

        // Sort by date descending (newest first)
        return new Date(b.last_message_time) - new Date(a.last_message_time);
      });

      setConversations(sortedConversations);

      // Reset any previous errors if successful
      if (error) setError(null);
    } catch (error) {
      console.error("Error fetching conversations:", error);

      // Extract detailed error information
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.error || error.message;

      if (statusCode === 401) {
        console.error("Unauthorized access, redirecting to login...");
        setError("Your session has expired. Please log in again.");

        // Clear cookies and user data
        Cookies.remove("authToken");
        Cookies.remove("refreshToken");

        if (refreshUser) {
          refreshUser(); // Update user context if refresh function exists
        }

        navigate("/login");
      } else if (statusCode === 404) {
        console.warn("No conversations found.");
        setConversations([]); // Set conversations to an empty array
      } else {
        setError(
          `Error loading conversations: ${errorMessage}. Please try again.`
        );

        // For server errors, don't clear user session, just show error
        if (statusCode >= 500) {
          console.error("Server error:", errorMessage);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, refreshUser]);

  useEffect(() => {
    // Check if user exists in context
    if (!user) {
      console.log("No user found, redirecting to login");
      navigate("/login");
      return;
    }

    fetchConversations();
  }, [user, navigate, fetchConversations]);

  const handleSelectConversation = (conversation) => {
    try {
      // Get fresh token directly from cookies
      const authToken = Cookies.get("authToken");

      if (!authToken) {
        console.error("No auth token found, redirecting to login...");
        setError("Authentication failed. Please log in again.");
        navigate("/login");
        return;
      }

      // Pass the auth token in the location state
      navigate(`/chat/${conversation.conversation_id}`, {
        state: { authToken },
      });
    } catch (error) {
      console.error("Error selecting conversation:", error);
      setError("Something went wrong. Please try again.");
    }
  };

  // Function to retry loading conversations
  const handleRetry = () => {
    setError(null);
    setLoading(true);
    fetchConversations();
  };

  if (loading) {
    return <div className="loading-spinner">Loading conversations...</div>;
  }

  return (
    <div className="messages-container">
      <h2>Your Conversations</h2>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={handleRetry} className="retry-button">
            Retry
          </button>
        </div>
      )}

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
                    <span
                      className={`conversation-preview ${
                        conversation.is_sender ? "sent" : "received"
                      }`}
                    >
                      {conversation.is_sender && (
                        <span className="sent-indicator">You: </span>
                      )}
                      {conversation.last_message.substring(0, 30)}
                      {conversation.last_message.length > 30 ? "..." : ""}
                    </span>
                  )}
                  {conversation.last_message_time && (
                    <span className="conversation-time">
                      {new Date(conversation.last_message_time).toLocaleString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }
                      )}
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
  onSelectConversation: PropTypes.func,
};

export default Messages;
