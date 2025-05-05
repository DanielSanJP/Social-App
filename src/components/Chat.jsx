import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom"; // Import useParams to get conversationId from URL
import axios from "axios";

const Chat = () => {
  const { conversationId } = useParams(); // Get conversationId from URL
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (conversationId) {
      const fetchMessages = async () => {
        try {
          const token = localStorage.getItem("authToken");
          if (!token) {
            alert("Your session has expired. Please log in again.");
            return;
          }

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
          if (error.response && error.response.status === 401) {
            alert("Your session has expired. Please log in again.");
            localStorage.removeItem("authToken");
          } else {
            console.error("Error fetching messages:", error);
          }
        }
      };

      fetchMessages();
    }
  }, [conversationId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("authToken");
      console.log("Authorization Token:", token);

      const response = await axios.post(
        `/api/messages/${conversationId}/messages`,
        { content: newMessage },
        {
          headers: { Authorization: `Bearer ${token}` },
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

export default Chat;
