require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

/* ======================
   CORS (PRODUCTION FIXED)
====================== */
const allowedOrigins = [
  "http://localhost:3000",
  "https://ideavault-client-9dxc-mimsfsjha-md-antor-mias-projects.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow Postman / server-to-server
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ CORS BLOCKED:", origin);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })
);

// IMPORTANT: preflight support
app.options("*", cors());

app.use(express.json());

/* ======================
   MONGODB SETUP (VERCEL SAFE)
====================== */
const uri = process.env.DB_URI;

if (!uri) {
  throw new Error("❌ DB_URI is missing in environment variables");
}

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  global._mongoClientPromise = client.connect();
}

clientPromise = global._mongoClientPromise;

/* ======================
   DB HELPER
====================== */
async function getDB() {
  const client = await clientPromise;
  return client.db("idea_vault");
}

/* ======================
   ROOT
====================== */
app.get("/", (req, res) => {
  res.send("🚀 IdeaVault API is running...");
});

/* ======================
   IDEAS API
====================== */

// CREATE IDEA
app.post("/ideas", async (req, res) => {
  try {
    const db = await getDB();

    const result = await db.collection("ideas").insertOne({
      ...req.body,
      createdAt: new Date(),
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET ALL IDEAS
app.get("/ideas", async (req, res) => {
  try {
    const db = await getDB();

    const ideas = await db.collection("ideas").find().toArray();

    res.json({ success: true, data: ideas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET SINGLE IDEA
app.get("/ideas/:id", async (req, res) => {
  try {
    const db = await getDB();

    const idea = await db.collection("ideas").findOne({
      _id: new ObjectId(req.params.id),
    });

    res.json({ success: true, data: idea });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// MY IDEAS
app.get("/my-ideas/:userId", async (req, res) => {
  try {
    const db = await getDB();

    const ideas = await db
      .collection("ideas")
      .find({ userId: req.params.userId })
      .toArray();

    res.json({ success: true, data: ideas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE IDEA
app.patch("/ideas/:id", async (req, res) => {
  try {
    const db = await getDB();

    const result = await db.collection("ideas").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE IDEA
app.delete("/ideas/:id", async (req, res) => {
  try {
    const db = await getDB();

    await db.collection("ideas").deleteOne({
      _id: new ObjectId(req.params.id),
    });

    res.json({ success: true, message: "Idea deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ======================
   COMMENTS
====================== */

// ADD COMMENT
app.post("/ideas/:id/comments", async (req, res) => {
  try {
    const db = await getDB();

    const comment = {
      _id: new ObjectId(),
      ...req.body,
      createdAt: new Date(),
    };

    await db.collection("ideas").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $push: { comments: comment } }
    );

    res.json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ======================
   PROFILE
====================== */

// GET PROFILE
app.get("/profile/:id", async (req, res) => {
  try {
    const db = await getDB();

    const user = await db.collection("users").findOne({
      _id: new ObjectId(req.params.id),
    });

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ======================
   HOME (LIMIT 6)
====================== */

app.get("/idea", async (req, res) => {
  try {
    const db = await getDB();

    const ideas = await db.collection("ideas").find().limit(6).toArray();

    res.json({ success: true, data: ideas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ======================
   START SERVER
====================== */
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});