require("dotenv").config();
const express = require("express");

const configApp = require("./config/configApp");
require("./config/db"); // nạp file để kết nối MySQL khi khởi động

const authRoutes = require("./routes/authRoutes");
const farmerRoutes = require("./routes/farmerRoutes");

const app = express();
const port = process.env.PORT || 3000;

// Cài đặt chung: cors, json, ảnh
configApp(app);

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
