const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ObjectId } = require("mongodb");

dotenv.config();

const app = express();
app.use(express.json());

/* ======================
   CORS
====================== */
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://ideavault-client-eight.vercel.app",
    ],
    credentials: true,
  })
);

/* ======================
   ENV CHECK
====================== */
const uri = process.env.DB_URI;

if (!uri) {
  throw new Error("❌ DB_URI missing in .env file");
}

/* ======================
   MONGO CONNECTION (CLEAN)
====================== */
const client = new MongoClient(uri, {
  maxPoolSize: 10,
});

let dbInstance = null;

async function getDB() {
  if (dbInstance) return dbInstance;

  try {
    console.log("⏳ Connecting to MongoDB...");

    await client.connect();

    dbInstance = client.db("idea_vault");

    console.log("✅ MongoDB Connected Successfully");

    return dbInstance;
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    throw err;
  }
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
   ROOT TEST
====================== */
app.get("/", async (req, res) => {
  try {
    await getDB();
    res.json({
      success: true,
      message: "IdeaVault API + DB Working 🚀",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "DB connection failed",
    });
  }
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

    if (!id) return res.status(400).json({ message: "Invalid ID" });

    const idea = await db.collection("ideas").findOne({ _id: id });

    if (!idea) return res.status(404).json({ message: "Not found" });

    res.json({ success: true, data: idea });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE IDEA
app.post("/ideas", async (req, res) => {
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
      userId,
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
      userId: userId || null,
      createdAt: new Date(),
    };

    const result = await db.collection("ideas").insertOne(newIdea);

    res.status(201).json({
      success: true,
      data: { _id: result.insertedId, ...newIdea },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE IDEA
app.patch("/ideas/:id", async (req, res) => {
  try {
    const db = await getDB();
    const id = toObjectId(req.params.id);

    if (!id) return res.status(400).json({ message: "Invalid ID" });

    const result = await db
      .collection("ideas")
      .updateOne({ _id: id }, { $set: req.body });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE IDEA
app.delete("/ideas/:id", async (req, res) => {
  try {
    const db = await getDB();
    const id = toObjectId(req.params.id);

    if (!id) return res.status(400).json({ message: "Invalid ID" });

    const result = await db.collection("ideas").deleteOne({ _id: id });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ======================
   COMMENTS
====================== */

// ADD COMMENT
app.post("/ideas/:id/comments", async (req, res) => {
  try {
    const db = await getDB();
    const id = toObjectId(req.params.id);

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
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ======================
   DELETE COMMENT
====================== */

app.delete("/ideas/:ideaId/comments/:commentId", async (req, res) => {
  try {
    const db = await getDB();

    const ideaId = toObjectId(req.params.ideaId);
    const commentId = req.params.commentId;

    if (!ideaId) {
      return res.status(400).json({
        success: false,
        message: "Invalid idea ID",
      });
    }

    const result = await db.collection("ideas").updateOne(
      { _id: ideaId },
      {
        $pull: {
          comments: { _id: new ObjectId(commentId) }
        }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Comment not found or already deleted",
      });
    }

    res.json({
      success: true,
      message: "Comment deleted successfully",
      data: result,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// update comment
app.patch("/ideas/:ideaId/comments/:commentId", async (req, res) => {
  try {
    const db = await getDB();

    const ideaId = toObjectId(req.params.ideaId);
    const commentId = req.params.commentId;

    if (!ideaId) {
      return res.status(400).json({
        success: false,
        message: "Invalid idea ID",
      });
    }

    const result = await db.collection("ideas").updateOne(
      {
        _id: ideaId,
        "comments._id": new ObjectId(commentId),
      },
      {
        $set: {
          "comments.$.text": req.body.text,
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Comment not found or not updated",
      });
    }

    // updated comment return
    const updatedIdea = await db
      .collection("ideas")
      .findOne({ _id: ideaId });

    const updatedComment = updatedIdea.comments.find(
      (c) => c._id.toString() === commentId
    );

    res.json({
      success: true,
      data: updatedComment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
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
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ======================
   MY INTERACTIONS
   (ALL COMMENTS BY USER)
====================== */

app.get("/my-interactions/:userId", async (req, res) => {
  try {
    const db = await getDB();

    const userId = req.params.userId;

    // সব ideas থেকে comments খুঁজবে যেগুলো user করেছে
    const ideas = await db.collection("ideas").find({
      "comments.userId": userId,
    }).toArray();

    let interactions = [];

    ideas.forEach((idea) => {
      (idea.comments || []).forEach((c) => {
        if (c.userId === userId) {
          interactions.push({
            ideaId: idea._id.toString(),
            ideaTitle: idea.title,
            ideaImage: idea.image,
            comment: c.text,
            createdAt: c.createdAt,
          });
        }
      });
    });

    res.json({
      success: true,
      data: interactions,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});
/* ======================
   USER PROFILE API
====================== */

app.get("/profile/:userId", async (req, res) => {
  try {
    const db = await getDB();

    const userId = new ObjectId(req.params.userId);

    const user = await db.collection("users").findOne({
      _id: userId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.patch("/profile/:userId", async (req, res) => {
  try {
    const db = await getDB();

    const userId = new ObjectId(req.params.userId);

    const result = await db.collection("user").updateOne(
      { _id: userId },
      {
        $set: {
          name: req.body.name,
          image: req.body.image,
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updatedUser = await db.collection("user").findOne({
      _id: userId,
    });

    res.json({
      success: true,
      data: updatedUser,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* ======================
   SERVER START
====================== */
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // 🔥 force DB connect on startup
  try {
    await getDB();
  } catch (err) {
    console.log("❌ MongoDB connection failed on startup");
  }
});