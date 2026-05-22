const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ObjectId } = require("mongodb");
const { auth } = require("./auth"); // 👈 তোমার better-auth file

dotenv.config();

const app = express();
app.use(express.json());

/* ======================
   CORS CONFIG
====================== */
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://your-frontend.vercel.app",
    ],
    credentials: true,
  })
);

/* ======================
   MONGO CONNECTION
====================== */
const uri = process.env.DB_URI;

if (!uri) {
  throw new Error("DB_URI missing in Environment Variables");
}

const client = new MongoClient(uri);
let cachedDb = null;

async function getDB() {
  if (cachedDb) return cachedDb;

  await client.connect();
  cachedDb = client.db("idea_vault");

  console.log("MongoDB Connected");
  return cachedDb;
}

/* ======================
   HELPERS
====================== */
function toObjectId(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

/* ======================
   AUTH MIDDLEWARE
====================== */
const requireAuth = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    req.user = session.user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Auth failed",
    });
  }
};

/* ======================
   ROOT
====================== */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "IdeaVault API Running 🚀",
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
    res.status(500).json({ success: false, error: err.message });
  }
});

// LIMIT 6
app.get("/ideas/limit", async (req, res) => {
  try {
    const db = await getDB();
    const ideas = await db.collection("ideas").find().limit(6).toArray();

    res.json({ success: true, data: ideas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SINGLE IDEA
app.get("/ideas/:id", async (req, res) => {
  try {
    const db = await getDB();
    const id = toObjectId(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const idea = await db.collection("ideas").findOne({ _id: id });

    if (!idea) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({ success: true, data: idea });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ======================
   CREATE IDEA (SECURE)
====================== */
app.post("/ideas", requireAuth, async (req, res) => {
  try {
    const db = await getDB();

    const {
      title,
      shortDesc,
      description,
      category,
      tags,
      image,
      budget,
      audience,
      problem,
      solution,
    } = req.body;

    if (!title || !shortDesc || !description || !audience) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const newIdea = {
      title,
      shortDesc,
      description,
      category: category || "General",
      tags: tags || "",
      image: image || "",
      budget: budget || "",
      audience,
      problem: problem || "",
      solution: solution || "",

      userId: new ObjectId(req.user.id),
      userEmail: req.user.email,

      createdAt: new Date(),
    };

    const result = await db.collection("ideas").insertOne(newIdea);

    res.status(201).json({
      success: true,
      data: { _id: result.insertedId, ...newIdea },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ======================
   UPDATE IDEA (OWNER ONLY)
====================== */
app.patch("/ideas/:id", requireAuth, async (req, res) => {
  try {
    const db = await getDB();
    const id = toObjectId(req.params.id);

    const idea = await db.collection("ideas").findOne({ _id: id });

    if (!idea) {
      return res.status(404).json({ message: "Not found" });
    }

    if (idea.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await db.collection("ideas").updateOne(
      { _id: id },
      { $set: { ...req.body, updatedAt: new Date() } }
    );

    res.json({ success: true, message: "Updated" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ======================
   DELETE IDEA (OWNER ONLY)
====================== */
app.delete("/ideas/:id", requireAuth, async (req, res) => {
  try {
    const db = await getDB();
    const id = toObjectId(req.params.id);

    const idea = await db.collection("ideas").findOne({ _id: id });

    if (!idea) {
      return res.status(404).json({ message: "Not found" });
    }

    if (idea.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await db.collection("ideas").deleteOne({ _id: id });

    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ======================
   MY IDEAS
====================== */
app.get("/my-ideas", requireAuth, async (req, res) => {
  try {
    const db = await getDB();

    const ideas = await db
      .collection("ideas")
      .find({ userId: new ObjectId(req.user.id) })
      .toArray();

    res.json({ success: true, data: ideas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ======================
   COMMENTS (SECURE)
====================== */
app.post("/ideas/:id/comments", requireAuth, async (req, res) => {
  try {
    const db = await getDB();
    const id = toObjectId(req.params.id);

    const comment = {
      _id: new ObjectId(),
      userId: req.user.id,
      userName: req.user.name,
      text: req.body.text,
      createdAt: new Date(),
    };

    await db.collection("ideas").updateOne(
      { _id: id },
      { $push: { comments: comment } }
    );

    res.json({ success: true, data: comment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ======================
   SERVER START
====================== */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});