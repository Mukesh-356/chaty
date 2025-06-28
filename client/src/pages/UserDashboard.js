import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../Styles/UserDashboard.css"; // ✅ Import correct CSS path

const UserDashboard = () => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("All");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [file, setFile] = useState(null);
  const [initialRouterIP, setInitialRouterIP] = useState("");

  const username = localStorage.getItem("username");
  const socketRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRouterIP = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/network/info");
        setInitialRouterIP(res.data.routerIP);
      } catch {
        alert("❌ Unable to detect router IP. Logging out...");
        handleLogout();
      }
    };

    socketRef.current = io("http://localhost:5000");
    socketRef.current.emit("user-joined", username);

    socketRef.current.on("update-user-list", setOnlineUsers);
    socketRef.current.on("receive-message", (data) => setChat((prev) => [...prev, data]));
    socketRef.current.on("user-typing", (typingName) => {
      if (typingName !== username) setTypingUser(typingName);
    });
    socketRef.current.on("user-stop-typing", () => setTypingUser(null));

    axios.get("http://localhost:5000/api/messages").then((res) => {
      if (res.data.success) setChat(res.data.messages);
    });

    fetchRouterIP();
    return () => socketRef.current.disconnect();
  }, [username]);

  const handleTyping = (e) => {
    setMessage(e.target.value);
    socketRef.current.emit("typing", username);
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      socketRef.current.emit("stop-typing");
    }, 1000);
  };

  const getFileIcon = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    if (["pdf"].includes(ext)) return "📄";
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "📷";
    if (["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext)) return "📝";
    if (["zip", "rar", "7z"].includes(ext)) return "🗜️";
    return "📁";
  };

  const sendMessage = async () => {
    if (!message.trim() && !file) return;

    const res = await axios.get("http://localhost:5000/api/network/info");
    if (res.data.routerIP !== initialRouterIP) {
      alert("❌ You are not connected to allowed WiFi.");
      return;
    }

    const to = selectedUser === "All" ? null : selectedUser;

    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("username", username);
      try {
        const res = await axios.post("http://localhost:5000/api/user/upload", formData);
        socketRef.current.emit("chat-message", {
          username,
          text: res.data.filename,
          isFile: true,
          fileUrl: res.data.url,
          to,
        });
        setFile(null);
        setMessage("");
        return;
      } catch {
        alert("❌ File upload failed");
        return;
      }
    }

    if (message.trim()) {
      socketRef.current.emit("chat-message", {
        username,
        text: message,
        to,
      });
      setMessage("");
      socketRef.current.emit("stop-typing");
    }
  };

  const handleLogout = async () => {
    await axios.post("http://localhost:5000/api/user/logout", { username });
    localStorage.removeItem("username");
    navigate("/");
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h3>🟢 Online Users</h3>
        <ul>
          {onlineUsers.map((user, index) => (
            <li
              key={index}
              className={selectedUser === user ? "selected" : ""}
              onClick={() => setSelectedUser(user)}
              style={{ color: user === username ? "blue" : "black" }}
            >
              {user === username ? "You" : user}
            </li>
          ))}
        </ul>
        <button
          onClick={() => setSelectedUser("All")}
          className={selectedUser === "All" ? "group-active" : "group-button"}
        >
          Group Chat
        </button>
      </div>

      <div className="chat-box">
        <div className="chat-header">
          <h2>💬 WiFiChat Connect</h2>
          <button className="logout" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>

        <div className="chat-messages">
          {chat.map((msg, index) => {
            const isSelf = msg.username === username;
            return (
              <div key={index} className={`chat-bubble ${isSelf ? "sent" : "received"}`}>
                <div className="bubble-content">
                  {!isSelf && <span className="bubble-name">{msg.username}</span>}
                  {msg.isFile ? (
                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                      {getFileIcon(msg.text)} {msg.text}
                    </a>
                  ) : (
                    msg.text
                  )}
                  {msg.to && (
                    <span className="to-tag">
                      (to {msg.to === username ? "You" : msg.to})
                    </span>
                  )}
                  <span className="tick">
                    {msg.status === "✅✅" ? "✅✅" : "✓"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {typingUser && (
          <div className="typing-indicator">✍️ {typingUser} is typing...</div>
        )}

        <div className="chat-input-area">
          <input
            type="text"
            placeholder={`Message ${selectedUser === "All" ? "everyone" : selectedUser}...`}
            value={message}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
          {file && <span className="filename">📎 {file.name}</span>}
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
