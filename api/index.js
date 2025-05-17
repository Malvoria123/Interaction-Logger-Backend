// Import required packages
const rateLimit = require("express-rate-limit");
const { RateLimiterRedis } = require("rate-limit-redis");
const redis = require("redis");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");

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

// CORS Options
const corsOptions = {
  origin: "https://malvoria123.github.io ",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-api-key"],
};

app.use(cors(corsOptions));

// Handle preflight OPTIONS requests manually (optional but explicit)
app.options("/api", (req, res) => {
  res.sendStatus(200);
});

// Body parser middleware
app.use(bodyParser.json());

// Redis client setup
const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

// Rate limiter using Redis
let limiter;

(async () => {
  await redisClient.connect().catch((err) => {
    console.error("Failed to connect to Redis:", err);
  });

  limiter = rateLimit({
    store: new RateLimiterRedis({
      client: redisClient,
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
      status: 429,
      message: "Too many requests from this IP. Please try again later.",
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  app.use(limiter);
})();

// API endpoint for logging interaction data
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

// Simple GET route for testing
app.get("/api", (req, res) => {
  res.status(200).json({
    status: 200,
    message: "This is the API endpoint. Use POST to log data.",
  });
});

// Export app for Vercel or serverless deployment
module.exports = app;