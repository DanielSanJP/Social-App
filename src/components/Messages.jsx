import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import { useUser } from "../contexts/UserContext";
import "../styles/Messages.css";

const Messages = ({ onSelectConversation }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const authToken = Cookies.get("authToken");

        if (!authToken) {
          console.error("No authentication token found");
          setLoading(false);
          return;
        }

        const response = await axios.get(
          "http://localhost:5000/api/messages/conversations",
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
        if (error.response && error.response.status === 404) {
          console.warn("No conversations found.");
          setConversations([]); // Set conversations to an empty array
        } else {
          console.error("Error fetching conversations:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if user is logged in
    if (user) {
      fetchConversations();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleSelectConversation = (conversation) => {
    if (onSelectConversation) {
      onSelectConversation(conversation);
    } else {
      // Default behavior if no onSelectConversation provided
      navigate(`/chat/${conversation.conversation_id}`);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading conversations...</div>;
  }

  return (
    <div className="messages-container">
      <h2>Your Conversations</h2>
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

const Chat = () => {
  const { conversationId } = useParams(); // Get conversationId from URL
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const { user } = useUser(); // Get current user from context

  useEffect(() => {
    if (conversationId) {
      const fetchMessages = async () => {
        try {
          const token = Cookies.get("authToken"); // Use cookies for authentication
          console.log("Authorization Token:", token); // Debugging

          const response = await axios.get(
            `http://localhost:5000/api/messages/${conversationId}/messages`,
            {
              withCredentials: true,
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );
          console.log("Fetched Messages:", response.data); // Debugging
          setMessages(response.data);
        } catch (error) {
          console.error("Error fetching messages:", error);
        }
      };

      fetchMessages();
    }
  }, [conversationId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return; // Don't send empty messages

    try {
      const token = Cookies.get("authToken"); // Use cookies for authentication
      console.log("Authorization Token:", token); // Debugging

      const response = await axios.post(
        `http://localhost:5000/api/messages/${conversationId}/messages`,
        { content: newMessage },
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Message Sent Response:", response.data); // Debugging
      setMessages((prevMessages) => [...prevMessages, response.data]);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
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

export { Messages, Chat };
export default Messages;
