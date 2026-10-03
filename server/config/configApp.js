const express = require("express");
const cors = require("cors");
const path = require("path");

const configApp = (app) => {
  // Cho React gọi API
  app.use(cors());

  // Đọc JSON và dữ liệu form gửi lên
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Cho phép frontend truy cập ảnh: /uploads/farms/abc.jpg -> server/upload/farms/abc.jpg
  app.use("/uploads", express.static(path.join(__dirname, "../upload")));
};

module.exports = configApp;
