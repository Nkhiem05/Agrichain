const express = require("express");
const cors = require("cors");
const path = require("path");

const db = require("./config/db");

const authRoutes = require("./routes/authRoutes");

const farmerRoutes = require("./routes/farmerRoutes");

const app = express();

const port = 3000;

// Cho React gọi API
app.use(cors());

// Đọc JSON
app.use(express.json());

// Cho phép frontend truy cập ảnh
app.use("/uploads", express.static(path.join(__dirname, "./upload")));

// Test backend
app.get("/", (req, res) => {
  res.send("Backend Agrichain đang hoạt động!");
});

// Login
app.use("/api", authRoutes);

// Nông dân
app.use("/api/farmer", farmerRoutes);

app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});
