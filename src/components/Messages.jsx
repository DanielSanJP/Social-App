import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom"; // Import useParams to get conversationId from URL
import axios from "axios";
import "../styles/Messages.css"; // Ensure styles are applied

const Messages = ({ onSelectConversation }) => {
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          alert("Your session has expired. Please log in again.");
          return;
        }

        console.log("Authorization Token:", token); // Debugging

        const response = await axios.get("/api/messages/conversations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("Fetched Conversations:", response.data); // Debugging
        setConversations(response.data);
      } catch (error) {
        if (error.response && error.response.status === 401) {
          alert("Your session has expired. Please log in again.");
          localStorage.removeItem("authToken");
        } else {
          console.error("Error fetching conversations:", error);
        }
      }
    };

    fetchConversations();
  }, []);

  return (
    <div className="messages-list">
      <h2>Conversations</h2>
      <ul>
        {conversations.map((conversation) => (
          <li
            key={conversation.conversation_id}
            onClick={() => onSelectConversation(conversation)}
            className="conversation-item"
          >
            <img
              src={
                conversation.users.profile_pic_url ||
                "https://via.placeholder.com/50"
              }
              alt={conversation.users.username || "User"}
              className="conversation-profile-pic"
            />
            <span className="conversation-username">
              {conversation.users.username || "Unknown User"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const Chat = () => {
  const { conversationId } = useParams(); // Get conversationId from URL
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (conversationId) {
      const fetchMessages = async () => {
        try {
          const token = localStorage.getItem("authToken"); // Use the correct key
          console.log("Authorization Token:", token); // Debugging

          const response = await axios.get(
            `/api/messages/${conversationId}/messages`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
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
    try {
      const token = localStorage.getItem("authToken"); // Use the correct key
      console.log("Authorization Token:", token); // Debugging

      const response = await axios.post(
        `/api/messages/${conversationId}/messages`,
        { content: newMessage },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("Message Sent Response:", response.data); // Debugging
      setMessages((prevMessages) => [...prevMessages, response.data[0]]);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="chat-box">
      <h2>Chat</h2>
      <div className="messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${
              message.sender_id === localStorage.getItem("userId")
                ? "sent"
                : "received"
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
export default Messages; // Add this line to make Messages the default export
