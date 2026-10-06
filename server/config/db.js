// db.js
const mysql = require("mysql2/promise");
require("dotenv").config();

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

// Kiểm tra thử kết nối khi server khởi động
(async () => {
  try {
    const connection = await db.getConnection();
    console.log("Kết nối MySQL Pool thành công!");
    connection.release();
  } catch (err) {
    console.error("Kết nối MySQL thất bại:", err.message);
  }
})();

module.exports = db;
