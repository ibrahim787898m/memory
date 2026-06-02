require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const ALLOWED_USERS = ["user1", "user2"];
const CHAT_PASSWORD = process.env.CHAT_PASSWORD;

const onlineUsers = new Set();

const DATA_DIR = path.join(__dirname, "data");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(MESSAGES_FILE)) {
  fs.writeFileSync(MESSAGES_FILE, "[]", "utf8");
}

function loadMessages() {
  try {
    const data = fs.readFileSync(MESSAGES_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.log("Error loading messages:", error);
    return [];
  }
}

function saveMessages(messages) {
  try {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), "utf8");
  } catch (error) {
    console.log("Error saving messages:", error);
  }
}

let messages = loadMessages();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!ALLOWED_USERS.includes(username)) {
    return res.status(401).json({
      success: false,
      message: "Invalid username"
    });
  }

  if (password !== CHAT_PASSWORD) {
    return res.status(401).json({
      success: false,
      message: "Wrong password"
    });
  }

  return res.json({
    success: true,
    username
  });
});

app.get("/messages", (req, res) => {
  res.json(messages);
});

io.on("connection", (socket) => {
  socket.on("join", (username) => {
    if (!ALLOWED_USERS.includes(username)) return;

    socket.username = username;
    onlineUsers.add(username);
    io.emit("statusUpdate", Array.from(onlineUsers));
  });

  socket.on("sendMessage", (text) => {
    if (!socket.username) return;

    const cleanText = String(text || "").trim();
    if (!cleanText) return;

    const message = {
      sender: socket.username,
      text: cleanText,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    };

    messages.push(message);

    if (messages.length > 1000) {
      messages.shift();
    }

    saveMessages(messages);
    io.emit("newMessage", message);
  });

  socket.on("disconnect", () => {
    if (socket.username) {
      onlineUsers.delete(socket.username);
      io.emit("statusUpdate", Array.from(onlineUsers));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});