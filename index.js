const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ObjectId } = require("mongodb");

dotenv.config();

const app = express();
app.use(express.json());


/* ======================
   MONGO DB
====================== */

const uri = process.env.DB_URI;

if (!uri) {
  throw new Error("DB_URI missing");
}

const client = new MongoClient(uri);

let db;

async function connectDB() {
  await client.connect();
  db = client.db("idea_vault");
  console.log("MongoDB Connected");
}

connectDB();

/* ======================
   HELPERS
====================== */

function getDB() {
  return db;
}

function toObjectId(id) {
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
    message: "🚀 IdeaVault API Running",
  });
});

/* ======================
   IDEAS ROUTES
====================== */

// GET ALL IDEAS
app.get("/ideas", async (req, res) => {
  try {
    const db = getDB();
    const ideas = await db.collection("ideas").find().toArray();
    res.json({ success: true, data: ideas });
  } catch {
    res.status(500).json({ success: false });
  }
});

// LIMIT 6 IDEAS
app.get("/ideas/limit", async (req, res) => {
  try {
    const db = getDB();
    const ideas = await db.collection("ideas").find().limit(6).toArray();
    res.json({ success: true, data: ideas });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false });
  }
});
// SINGLE IDEA
app.get("/ideas/:id", async (req, res) => {
  try {
    const db = getDB();
    const id = toObjectId(req.params.id);

    if (!id) return res.status(400).json({ message: "Invalid ID" });

    const idea = await db.collection("ideas").findOne({ _id: id });

    res.json({ success: true, data: idea });
  } catch {
    res.status(500).json({ success: false });
  }
});

// CREATE IDEA
app.post("/ideas", async (req, res) => {
  try {
    const db = getDB();

    const result = await db.collection("ideas").insertOne({
      ...req.body,
      createdAt: new Date(),
    });

    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({ success: false });
  }
});

// UPDATE IDEA
app.patch("/ideas/:id", async (req, res) => {
  try {
    const db = getDB();
    const id = toObjectId(req.params.id);

    if (!id) return res.status(400).json({ message: "Invalid ID" });

    const result = await db
      .collection("ideas")
      .updateOne({ _id: id }, { $set: req.body });

    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({ success: false });
  }
});

// DELETE IDEA
app.delete("/ideas/:id", async (req, res) => {
  try {
    const db = getDB();
    const id = toObjectId(req.params.id);

    if (!id) return res.status(400).json({ message: "Invalid ID" });

    const result = await db.collection("ideas").deleteOne({ _id: id });

    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({ success: false });
  }
});

/* ======================
   COMMENTS
====================== */

app.post("/ideas/:id/comments", async (req, res) => {
  try {
    const db = getDB();
    const id = toObjectId(req.params.id);

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
  } catch {
    res.status(500).json({ success: false });
  }
});

/* ======================
   MY IDEAS
====================== */

app.get("/my-ideas/:userId", async (req, res) => {
  try {
    const db = getDB();

    const ideas = await db
      .collection("ideas")
      .find({ userId: req.params.userId })
      .toArray();

    res.json({ success: true, data: ideas });
  } catch {
    res.status(500).json({ success: false });
  }
});

/* ======================
   PROFILE
====================== */

app.get("/profile/:id", async (req, res) => {
  try {
    const db = getDB();
    const id = toObjectId(req.params.id);

    if (!id) return res.status(400).json({ message: "Invalid ID" });

    const user = await db.collection("users").findOne({ _id: id });

    res.json({ success: true, data: user });
  } catch {
    res.status(500).json({ success: false });
  }
});

/* ======================
   START SERVER
====================== */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});