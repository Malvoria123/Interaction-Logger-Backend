require('dotenv').config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigin = "https://malvoria123.github.io/User-Interaction-Logging-System/";

app.use(cors({
  origin: allowedOrigin,
}));
app.use(bodyParser.json());

// Initialize Firebase Admin SDK
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// POST endpoint to receive interaction logs
app.post("/log", async (req, res) => {
  const clientApiKey = req.headers['x-api-key'];
  if (clientApiKey !== process.env.API_KEY) {
    return res.status(403).send("Forbidden: Invalid API Key");
  }

  try {
    const { type, data } = req.body;

    if (!type || !data) {
      return res.status(400).send("Invalid log data.");
    }

    const docRef = db.collection("interaction_logs").doc();
    await docRef.set({
      type,
      ...data,
    });

    res.status(200).send("Logged successfully.");
  } catch (err) {
    console.error("Logging failed:", err);
    res.status(500).send("Server error.");
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
