import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import { useUser } from "../contexts/UserContext";
import { useNavigation } from "../contexts/NavigationContext";
import { FaArrowLeft } from "react-icons/fa";
import { baseUrl } from "../utils/api"; // Import baseUrl
import "../styles/Chat.css";

const Chat = () => {
  const { conversationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const { user } = useUser();
  const { setIsNavVisible } = useNavigation();
  const [otherUser, setOtherUser] = useState(null);
  const messagesEndRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Update `isMobile` on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    setIsNavVisible(!isMobile);

    return () => {
      setIsNavVisible(true); // Restore visibility when leaving the component
    };
  }, [isMobile, setIsNavVisible]);

  // Function to refresh auth token if needed
  const refreshAuthToken = async () => {
    try {
      console.log("Attempting to refresh auth token in Chat component...");
      const response = await axios.post(
        `${baseUrl}/api/auth/refresh`,
        {},
        { withCredentials: true }
      );

      if (response.status === 200) {
        console.log("Auth token refreshed successfully in Chat component");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error refreshing token in Chat component:", error);
      return false;
    }
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Format date for displaying message timestamps
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Helper function for user initials
  const getInitials = (username) => {
    if (!username) return "?";
    return username.charAt(0).toUpperCase();
  };

  // Fetch user details based on ID
  const fetchUserDetails = async (userId, authToken) => {
    try {
      const userResponse = await axios.get(`${baseUrl}/api/users/${userId}`, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      return userResponse.data;
    } catch (error) {
      console.error("Error fetching user details:", error);
      return null;
    }
  };

  // Extract fetchMessages to a separate function that can be reused for initial load and refreshing
  const fetchMessages = useCallback(
    async (initial = false) => {
      if (initial) setLoading(true);
      else setRefreshing(true);

      setError(null);

      try {
        // Try to get token from navigation state first, then from cookie
        let authToken = location.state?.authToken || Cookies.get("authToken");

        if (!authToken) {
          console.error("Authentication token not found");
          navigate("/login");
          return;
        }

        if (initial) {
          console.log(
            `Fetching messages for conversation ID: ${conversationId}`
          );
        } else {
          console.log(
            `Refreshing messages for conversation ID: ${conversationId}`
          );
        }

        // Use the correct endpoint based on your server routes
        const messagesResponse = await axios.get(
          `${baseUrl}/api/messages/${conversationId}/messages`,
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (Array.isArray(messagesResponse.data)) {
          // Sort messages by created_at timestamp
          const sortedMessages = messagesResponse.data.sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at)
          );

          if (initial) {
            // On initial load, just set all messages
            setMessages(sortedMessages);
          } else {
            // When refreshing, only add new messages that we don't already have
            setMessages((currentMessages) => {
              // Create a set of existing message IDs for quick lookup
              const existingIds = new Set(currentMessages.map((msg) => msg.id));

              // Filter for only new messages
              const newMessages = sortedMessages.filter(
                (msg) => !existingIds.has(msg.id)
              );

              // If there are new messages, add them to the current messages
              if (newMessages.length > 0) {
                return [...currentMessages, ...newMessages];
              }

              // Otherwise return the current messages unchanged
              return currentMessages;
            });
          }

          // If we have messages and no other user info yet, fetch the other user details
          if (sortedMessages.length > 0 && user && !otherUser) {
            const firstMessage = sortedMessages[0];
            const otherUserId =
              firstMessage.sender_id === user.id
                ? firstMessage.receiver_id
                : firstMessage.sender_id;

            // Fetch other user details
            const otherUserData = await fetchUserDetails(
              otherUserId,
              authToken
            );
            if (otherUserData) {
              setOtherUser(otherUserData);
            }
          }
        } else {
          if (initial) {
            console.error(
              "Expected array of messages but got:",
              messagesResponse.data
            );
            setMessages([]);
          }
        }
      } catch (error) {
        console.error("Error fetching messages:", error);

        if (initial) {
          setError(
            `Failed to load messages: ${error.response?.status} ${error.response?.statusText}`
          );
        }

        // If unauthorized, try to refresh the token
        if (error.response && error.response.status === 401) {
          console.log("Token expired, attempting refresh...");
          const refreshed = await refreshAuthToken();
          if (refreshed) {
            const newAuthToken = Cookies.get("authToken");
            if (newAuthToken) {
              try {
                const retryResponse = await axios.get(
                  `${baseUrl}/api/messages/${conversationId}/messages`,
                  {
                    withCredentials: true,
                    headers: {
                      Authorization: `Bearer ${newAuthToken}`,
                      "Content-Type": "application/json",
                    },
                  }
                );
                if (Array.isArray(retryResponse.data)) {
                  if (initial) {
                    setMessages(retryResponse.data);
                    setError(null);
                  }
                }
              } catch (retryError) {
                console.error("Retry failed after token refresh:", retryError);
                if (initial) {
                  setError("Session expired. Please log in again.");
                  navigate("/login");
                }
              }
            } else {
              if (initial) navigate("/login");
            }
          } else {
            if (initial) navigate("/login");
          }
        }
      } finally {
        if (initial) setLoading(false);
        else setRefreshing(false);
      }
    },
    [conversationId, location.state, navigate, user, otherUser]
  );

  // Initial message fetch
  useEffect(() => {
    if (conversationId) {
      fetchMessages(true);

      // Set up the interval for refreshing messages
      intervalRef.current = setInterval(() => {
        fetchMessages(false);
      }, 3000); // Refresh every 3 seconds

      // Clean up interval when component unmounts
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [conversationId, fetchMessages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return; // Don't send empty messages

    try {
      const authToken = location.state?.authToken || Cookies.get("authToken");

      if (!authToken) {
        console.error("Authentication token not found");
        navigate("/login");
        return;
      }

      // Use the correct endpoint for sending messages
      const response = await axios.post(
        `${baseUrl}/api/messages/${conversationId}/messages`,
        { content: newMessage },
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data) {
        console.error("No message returned from the server.");
        return;
      }

      setMessages((prevMessages) => [...prevMessages, response.data]);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      // Handle unauthorized error
      if (error.response && error.response.status === 401) {
        const refreshed = await refreshAuthToken();
        if (!refreshed) {
          navigate("/login");
        }
      }
    }
  };

  return (
    <div className="chat-box">
      <div className="chat-header">
        {isMobile && (
          <button
            className="action-button"
            onClick={() => navigate("/messages")}
          >
            <FaArrowLeft />
          </button>
        )}
        {otherUser?.profile_pic_url && (
          <img
            src={otherUser.profile_pic_url}
            alt={otherUser.username}
            className="profile-pic"
          />
        )}
        <h3>{otherUser ? otherUser.username : "Chat"}</h3>
      </div>
      {error && <div className="error-message">{error}</div>}
      <div className="messages">
        {loading ? (
          <div className="loading-messages">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="no-messages">
            No messages yet. Start the conversation!
          </div>
        ) : (
          // Render messages with proper grouping
          messages.map((message, index) => {
            const isCurrentUser = message.sender_id === user?.id;
            const showAvatar =
              !isCurrentUser &&
              (index === 0 ||
                messages[index - 1].sender_id !== message.sender_id);

            return (
              <div
                key={message.id || index}
                className={`message ${isCurrentUser ? "sent" : "received"}`}
              >
                {showAvatar && !isCurrentUser && (
                  <div className="message-avatar">
                    {otherUser?.profile_pic_url ? (
                      <img
                        src={otherUser.profile_pic_url}
                        alt={otherUser.username}
                      />
                    ) : (
                      <div>{getInitials(otherUser?.username)}</div>
                    )}
                  </div>
                )}
                <div className={isCurrentUser ? undefined : "message-content"}>
                  {message.content}
                  <span className="message-timestamp">
                    {formatMessageTime(message.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
        {refreshing && (
          <div className="refresh-indicator">
            <span>•</span>
          </div>
        )}
      </div>
      <form onSubmit={handleSendMessage} className="message-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Message..."
        />
        <button type="submit" disabled={!newMessage.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
