const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = 5000;

// middleware
app.use(cors());
app.use(express.json());

// env
const uri = process.env.DB_URI;

// MongoDB client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let ideasCollection;
let usersCollection;

// connect DB
async function run() {
  try {
    await client.connect();

    const db = client.db("idea_vault");

    ideasCollection = db.collection("ideas");
    usersCollection = db.collection("user");

    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("DB connection error:", error);
  }
}

run();

/* ======================
   ROOT
====================== */
app.get("/", (req, res) => {
  res.send("IdeaVault server is running...");
});

/* ======================
   IDEAS API
====================== */

// CREATE IDEA
app.post("/ideas", async (req, res) => {
  try {
    const idea = req.body;

    const result = await ideasCollection.insertOne({
      ...idea,
      createdAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Idea created",
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET ALL IDEAS
app.get("/ideas", async (req, res) => {
  try {
    const ideas = await ideasCollection.find().toArray();

    res.json({
      success: true,
      data: ideas,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET SINGLE IDEA
app.get("/ideas/:id", async (req, res) => {
  try {
    const idea = await ideasCollection.findOne({
      _id: new ObjectId(req.params.id),
    });

    if (!idea) {
      return res.status(404).json({
        success: false,
        message: "Idea not found",
      });
    }

    res.json({
      success: true,
      data: idea,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ======================
   MY IDEAS (IMPORTANT)
====================== */
app.get("/my-ideas/:userId", async (req, res) => {
  try {
    const ideas = await ideasCollection
      .find({ userId: req.params.userId })
      .toArray();

    res.json({ success: true, data: ideas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ======================
   UPDATE IDEA
====================== */
app.patch("/ideas/:id", async (req, res) => {
  try {
    const result = await ideasCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body },
    );

    res.json({
      success: true,
      message: "Idea updated",
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ======================
   DELETE IDEA
====================== */
app.delete("/ideas/:id", async (req, res) => {
  try {
    await ideasCollection.deleteOne({
      _id: new ObjectId(req.params.id),
    });

    res.json({
      success: true,
      message: "Idea deleted",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/*======================
interaction
====================*/
app.get("/my-interactions/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const ideas = await ideasCollection
      .find({
        "comments.userId": userId,
      })
      .toArray();

    const interactions = [];

    ideas.forEach((idea) => {
      idea.comments?.forEach((comment) => {
        if (comment.userId === userId) {
          interactions.push({
            ideaId: idea._id,
            ideaTitle: idea.title,
            ideaImage: idea.image,
            comment: comment.text,
            createdAt: comment.createdAt,
          });
        }
      });
    });

    res.json({
      success: true,
      data: interactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* ======================
   COMMENTS SYSTEM
====================== */

// ADD COMMENT
app.post("/ideas/:id/comments", async (req, res) => {
  try {
    const comment = {
      _id: new ObjectId(),
      userId: req.body.userId,
      userName: req.body.userName,
      text: req.body.text,
      createdAt: new Date(),
    };

    await ideasCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $push: { comments: comment } },
    );

    res.json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE COMMENT
app.patch("/ideas/:ideaId/comments/:commentId", async (req, res) => {
  try {
    await ideasCollection.updateOne(
      {
        _id: new ObjectId(req.params.ideaId),
        "comments._id": new ObjectId(req.params.commentId),
      },
      {
        $set: {
          "comments.$.text": req.body.text,
        },
      },
    );

    res.json({ success: true, message: "Comment updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE COMMENT
app.delete("/ideas/:ideaId/comments/:commentId", async (req, res) => {
  try {
    await ideasCollection.updateOne(
      { _id: new ObjectId(req.params.ideaId) },
      {
        $pull: {
          comments: { _id: new ObjectId(req.params.commentId) },
        },
      },
    );

    res.json({ success: true, message: "Comment deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ======================
   PROFILE API
====================== */

// GET PROFILE
app.get("/profile/:id", async (req, res) => {
  try {
    const user = await usersCollection.findOne({
      _id: new ObjectId(req.params.id),
    });

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE PROFILE
app.patch("/profile/:id", async (req, res) => {
  try {
    await usersCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          ...req.body,
          updatedAt: new Date(),
        },
      },
    );

    res.json({
      success: true,
      message: "Profile updated",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ======================
   HOME (LIMIT 6 IDEAS)
====================== */
app.get("/idea", async (req, res) => {
  try {
    const ideas = await ideasCollection.find().limit(6).toArray();

    res.json({ success: true, data: ideas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ======================
   SERVER START
====================== */
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
