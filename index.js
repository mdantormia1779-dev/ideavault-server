import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

dotenv.config();

const app = express();

/* ======================
   CORS CONFIG (FIXED)
====================== */

const allowedOrigins = [
  "https://ideavault-client-tawny.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow tools like Postman
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("❌ Not allowed by CORS: " + origin));
    },
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

/* ======================
   MONGO DB
====================== */

const uri = process.env.DB_URI;

if (!uri) {
  throw new Error("❌ DB_URI missing in environment variables");
}

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: false,
      deprecationErrors: false,
    },
  });

  global._mongoClientPromise = client.connect();
}

clientPromise = global._mongoClientPromise;

async function getDB() {
  const client = await clientPromise;
  return client.db("idea_vault");
}

/* ======================
   HELPERS
====================== */

function safeObjectId(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

/* ======================
   ROOT TEST
====================== */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 IdeaVault API is running",
  });
});

/* ======================
   IDEAS ROUTES
====================== */

// GET ALL
app.get("/ideas", async (req, res) => {
  try {
    const db = await getDB();
    const ideas = await db.collection("ideas").find().toArray();
    res.json({ success: true, data: ideas });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// LIMIT 6
app.get("/idea", async (req, res) => {
  try {
    const db = await getDB();
    const ideas = await db.collection("ideas").find().limit(6).toArray();
    res.json({ success: true, data: ideas });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// SINGLE
app.get("/ideas/:id", async (req, res) => {
  try {
    const db = await getDB();

    const id = safeObjectId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid ID" });

    const idea = await db.collection("ideas").findOne({ _id: id });

    res.json({ success: true, data: idea });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// CREATE
app.post("/ideas", async (req, res) => {
  try {
    const db = await getDB();

    const result = await db.collection("ideas").insertOne({
      ...req.body,
      createdAt: new Date(),
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// UPDATE
app.patch("/ideas/:id", async (req, res) => {
  try {
    const db = await getDB();

    const id = safeObjectId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid ID" });

    const result = await db
      .collection("ideas")
      .updateOne({ _id: id }, { $set: req.body });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE
app.delete("/ideas/:id", async (req, res) => {
  try {
    const db = await getDB();

    const id = safeObjectId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid ID" });

    const result = await db.collection("ideas").deleteOne({ _id: id });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ======================
   COMMENTS
====================== */

app.post("/ideas/:id/comments", async (req, res) => {
  try {
    const db = await getDB();

    const id = safeObjectId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid ID" });

    const comment = {
      _id: new ObjectId(),
      userId: req.body.userId,
      userName: req.body.userName,
      text: req.body.text,
      createdAt: new Date(),
    };

    await db.collection("ideas").updateOne(
      { _id: id },
      { $push: { comments: comment } }
    );

    res.json({ success: true, data: comment });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ======================
   MY IDEAS
====================== */

app.get("/my-ideas/:userId", async (req, res) => {
  try {
    const db = await getDB();

    const ideas = await db
      .collection("ideas")
      .find({ userId: req.params.userId })
      .toArray();

    res.json({ success: true, data: ideas });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ======================
   PROFILE
====================== */

app.get("/profile/:id", async (req, res) => {
  try {
    const db = await getDB();

    const id = safeObjectId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid ID" });

    const user = await db.collection("users").findOne({ _id: id });

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ======================
   START SERVER (LOCAL ONLY)
====================== */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});

/* ======================
   VERCEL EXPORT
====================== */

export default app;