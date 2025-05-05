import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom"; // Import useParams to get conversationId from URL
import axios from "axios";
import Cookies from "js-cookie"; // Import js-cookie
import { useUser } from "../contexts/UserContext"; // Import useUser to get current user

const Chat = () => {
  const { conversationId } = useParams(); // Get conversationId from URL
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const { user } = useUser(); // Get current user from context

  useEffect(() => {
    if (conversationId) {
      const fetchMessages = async () => {
        try {
          // Get token from cookie instead of localStorage
          const authToken = Cookies.get("authToken");

          if (!authToken) {
            console.error("Authentication token not found");
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
        }
      };

      fetchMessages();
    }
  }, [conversationId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return; // Don't send empty messages

    try {
      // Get token from cookie instead of localStorage
      const authToken = Cookies.get("authToken");

      if (!authToken) {
        console.error("Authentication token not found");
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
