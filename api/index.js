const rateLimit = require('express-rate-limit');
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();


const app = express();


app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://malvoria123.github.io");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, x-api-key");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});


app.use(bodyParser.json());

const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
});

const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many requests from this IP. Please try again later.",
});


app.post("/api", async (req, res) => {
  const clientApiKey = req.headers['x-api-key'];
  if (clientApiKey !== process.env.API_KEY) {
    return res.status(403).send("Forbidden: Invalid API Key");
  }

  try {
    const { type, data } = req.body;

    if (!type || !data) {
      return res.status(400).send("Invalid log data.");
    }

    await db.collection("interaction_logs").add({
      type,
      ...data,
    });

    res.status(200).send("Logged successfully.");
  } catch (err) {
    console.error("Logging failed:", err);
    res.status(500).send("Server error.");
  }
});

app.get("/api", (req, res) => {
  res.send("This is the API endpoint. Use POST to log data.");
});

module.exports = app;