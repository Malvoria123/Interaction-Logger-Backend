// Import required packages
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const rateLimit = require("express-rate-limit");

// Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    process.exit(1); // Exit if Firebase setup fails
  }
}

// Firestore instance
const db = admin.firestore();

// Express app setup
const app = express();

// Maintenance
// Comment out when not needed
// app.use((req, res, next) => {
//   return res.status(503).send("Server is under maintenance. Please try again later.");
// });

// CORS headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://malvoria123.github.io");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, x-api-key");
  if (req.method === "OPTIONS") {
    return res.status(200).end(); // Don't use sendStatus on Vercel/Railway
  }
  next();
});

// Handle preflight OPTIONS requests
app.options("/api", (req, res) => {
  res.sendStatus(200);
});

// Body parser middleware
app.use(bodyParser.json());

// In-Memory Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1, // limit each IP to small requests per windowMs
  message: {
    status: 429,
    message: "Too many requests from this IP. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// API POST Endpoint
app.post("/api", async (req, res) => {
  const clientApiKey = req.headers["x-api-key"];

  if (!clientApiKey || clientApiKey !== process.env.API_KEY) {
    return res.status(403).json({ status: 403, message: "Forbidden: Invalid API Key" });
  }

  const { type, data } = req.body;

  if (!type || !data) {
    return res.status(400).json({ status: 400, message: "Invalid log data." });
  }

  try {
    await db.collection("interaction_logs").add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      type,
      ...data,
    });

    return res.status(200).json({ status: 200, message: "Logged successfully." });
  } catch (err) {
    console.error("Logging failed:", err);
    return res.status(500).json({ status: 500, message: "Server error." });
  }
});

// Simple GET Endpoint
app.get("/api", (req, res) => {
  res.status(200).json({
    status: 200,
    message: "This is the API endpoint. Use POST to log data.",
  });
});

// Export app for Railway
module.exports = app;

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
