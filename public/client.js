const socket = io();

const loginScreen = document.getElementById("loginScreen");
const chatScreen = document.getElementById("chatScreen");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

const messagesEl = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const logoutBtn = document.getElementById("logoutBtn");
const statusText = document.getElementById("statusText");

let currentUser = localStorage.getItem("chatUser") || "";

function renderMessage(message) {
  const row = document.createElement("div");
  row.className = `message-row ${message.sender === currentUser ? "me" : "other"}`;

  row.innerHTML = `
    <div class="bubble">
      <div><strong>${message.sender}</strong></div>
      <div>${escapeHtml(message.text)}</div>
      <div class="meta">${message.time}</div>
    </div>
  `;

  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function loadMessages() {
  const res = await fetch("/messages");
  const data = await res.json();

  messagesEl.innerHTML = "";
  data.forEach(renderMessage);
}

function showChat() {
  loginScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");
}

function showLogin() {
  loginScreen.classList.remove("hidden");
  chatScreen.classList.add("hidden");
}

function notifyUser(message) {
  if (
    document.hidden &&
    Notification.permission === "granted" &&
    message.sender !== currentUser
  ) {
    new Notification("New message", {
      body: `${message.sender}: ${message.text}`
    });
  }
}

loginBtn.addEventListener("click", async () => {
  const username = usernameInput.value.trim().toLowerCase();
  const password = passwordInput.value.trim();

  loginError.textContent = "";

  const res = await fetch("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (!data.success) {
    loginError.textContent = data.message || "Login failed";
    return;
  }

  currentUser = data.username;
  localStorage.setItem("chatUser", currentUser);

  showChat();
  loadMessages();
  socket.emit("join", currentUser);

  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }
});

sendBtn.addEventListener("click", () => {
  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit("sendMessage", text);
  messageInput.value = "";
  messageInput.focus();
});

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendBtn.click();
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("chatUser");
  currentUser = "";
  location.reload();
});

socket.on("newMessage", (message) => {
  renderMessage(message);
  notifyUser(message);
});

socket.on("statusUpdate", (onlineUsers) => {
  const otherUser = currentUser === "ibrahim" ? "humaisui" : "ibrahim";
  const isOtherOnline = onlineUsers.includes(otherUser);

  statusText.textContent = isOtherOnline
    ? `${otherUser} is online`
    : `${otherUser} is offline`;
});

// Optional auto-login UI only
if (currentUser) {
  usernameInput.value = currentUser;
}