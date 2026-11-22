
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

app.use(
  express.static(path.join(__dirname, "..", "frontend"))
);

// Database health check
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "ok",
      database: "connected"
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      status: "error",
      database: "disconnected"
    });
  }
});

// API routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/requests", require("./routes/requests"));
app.use("/api/transactions", require("./routes/transactions"));
app.use("/api/reviews", require("./routes/reviews"));

// Frontend fallback
app.get("*", (_req, res) => {
  res.sendFile(
    path.join(__dirname, "..", "frontend", "index.html")
  );
});

const PORT = Number(process.env.PORT || 5000);

app.listen(PORT, () => {
  console.log(
    `Marketplace running at http://localhost:${PORT}`
  );
});
