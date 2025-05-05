import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom"; // Added useLocation and useNavigate
import axios from "axios";
import Cookies from "js-cookie"; // Import js-cookie
import { useUser } from "../contexts/UserContext"; // Import useUser to get current user

const Chat = () => {
  const { conversationId } = useParams(); // Get conversationId from URL
  const location = useLocation(); // Get location to access state
  const navigate = useNavigate(); // Add navigate for redirection
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const { user } = useUser(); // Get current user from context

  // Function to refresh auth token if needed
  const refreshAuthToken = async () => {
    try {
      console.log("Attempting to refresh auth token in Chat component...");
      const response = await axios.post(
        "http://localhost:5000/api/auth/refresh",
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

  useEffect(() => {
    if (conversationId) {
      const fetchMessages = async () => {
        try {
          // Try to get token from navigation state first, then from cookie
          let authToken = location.state?.authToken || Cookies.get("authToken");

          // Debug log all cookies
          console.log("All cookies in Chat:", Cookies.get());
          console.log("Auth token in Chat component:", authToken);
          console.log("Location state in Chat:", location.state);

          if (!authToken) {
            console.error("Authentication token not found");
            navigate("/login");
            return;
          }

          const response = await axios.get(
            `http://localhost:5000/api/messages/${conversationId}/messages`,
            {
              withCredentials: true, // Include cookies in the request
              headers: {
                Authorization: `Bearer ${authToken}`,
                "Content-Type": "application/json",
              },
            }
          );
          console.log("Fetched Messages:", response.data); // Debugging
          setMessages(response.data); // Set all messages in the chatbox
        } catch (error) {
          console.error("Error fetching messages:", error);

          // If unauthorized, try to refresh the token
          if (error.response && error.response.status === 401) {
            console.log("Token expired, attempting refresh...");
            const refreshed = await refreshAuthToken();
            if (refreshed) {
              // Try again with the new token
              const newAuthToken = Cookies.get("authToken");
              if (newAuthToken) {
                try {
                  const retryResponse = await axios.get(
                    `http://localhost:5000/api/messages/${conversationId}/messages`,
                    {
                      withCredentials: true,
                      headers: {
                        Authorization: `Bearer ${newAuthToken}`,
                        "Content-Type": "application/json",
                      },
                    }
                  );
                  setMessages(retryResponse.data);
                } catch (retryError) {
                  console.error(
                    "Retry failed after token refresh:",
                    retryError
                  );
                  navigate("/login");
                }
              } else {
                navigate("/login");
              }
            } else {
              navigate("/login");
            }
          }
        }
      };

      fetchMessages();
    }
  }, [conversationId, location.state, navigate]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return; // Don't send empty messages

    try {
      // Get token from location state first, then cookie as fallback
      const authToken = location.state?.authToken || Cookies.get("authToken");

      if (!authToken) {
        console.error("Authentication token not found");
        navigate("/login");
        return;
      }

      const response = await axios.post(
        `http://localhost:5000/api/messages/${conversationId}/messages`,
        { content: newMessage },
        {
          withCredentials: true, // Include cookies in the request
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Message Sent Response:", response.data);

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
      <h2>Chat</h2>
      <div className="messages">
        {messages.length === 0 && (
          <div className="no-messages">
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${
              message.sender_id === user?.id ? "sent" : "received"
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSendMessage} className="message-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default Chat;
