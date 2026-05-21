import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

const app = express();

/* ======================
   SAFE CORS (NO CRASH)
====================== */

app.use(
  cors({
    origin: "*", // 🔥 FULL OPEN (for debugging + no CORS issue)
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: false,
  })
);

app.use(express.json());

/* ======================
   ENV CHECK
====================== */

const uri = process.env.DB_URI;

if (!uri) {
  throw new Error("❌ DB_URI missing in Vercel environment variables");
}

/* ======================
   MONGO CLIENT (SAFE)
====================== */

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
   HELPER (SAFE OBJECT ID)
====================== */

function safeObjectId(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

/* ======================
   ROOT
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

// GET ALL IDEAS
app.get("/ideas", async (req, res) => {
  try {
    const db = await getDB();

    const ideas = await db.collection("ideas").find().toArray();

    res.json({ success: true, data: ideas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET LIMIT 6
app.get("/idea", async (req, res) => {
  try {
    const db = await getDB();

    const ideas = await db.collection("ideas").find().limit(6).toArray();

    res.json({ success: true, data: ideas });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET SINGLE IDEA
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

// CREATE IDEA
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

// UPDATE IDEA
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

// DELETE IDEA
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
   EXPORT (VERCEL)
====================== */

export default app;