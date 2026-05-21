import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

const app = express();

/* ======================
   CORS FIX (IMPORTANT)
====================== */
const allowedOrigins = [
  "http://localhost:3000",
  "https://ideavault-client-9dxc-mimsfsjha-md-antor-mias-projects.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());

/* ======================
   MONGODB CONNECTION FIX
====================== */
const uri = process.env.DB_URI;

if (!uri) {
  throw new Error("DB_URI is missing in environment variables");
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

async function getDB() {
  const client = await clientPromise;
  return client.db("idea_vault");
}

/* ======================
   HEALTH CHECK
====================== */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 IdeaVault API is running",
  });
});

/* ======================
   IDEAS API
====================== */

// GET ALL IDEAS
app.get("/ideas", async (req, res) => {
  try {
    const db = await getDB();
    const ideas = await db.collection("ideas").find().toArray();

    res.json({ success: true, data: ideas });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
    res.status(500).json({ success: false, message: err.message });
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
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE IDEA
app.delete("/ideas/:id", async (req, res) => {
  try {
    const db = await getDB();

    const result = await db.collection("ideas").deleteOne({
      _id: new ObjectId(req.params.id),
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ======================
   COMMENTS
====================== */

app.post("/ideas/:id/comments", async (req, res) => {
  try {
    const db = await getDB();

    const comment = {
      _id: new ObjectId(),
      userId: req.body.userId,
      userName: req.body.userName,
      text: req.body.text,
      createdAt: new Date(),
    };

    await db.collection("ideas").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $push: { comments: comment } }
    );

    res.json({ success: true, data: comment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ======================
   PROFILE
====================== */

app.get("/profile/:id", async (req, res) => {
  try {
    const db = await getDB();

    const user = await db.collection("users").findOne({
      _id: new ObjectId(req.params.id),
    });

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ======================
   EXPORT FOR VERCEL
====================== */
export default app;