const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ObjectId } = require("mongodb");

dotenv.config();

const app = express();
app.use(express.json());

/* ======================
   CORS CONFIGURATION
====================== */
app.use(
  cors({
    origin: "*",
  }),
);

/* ======================
   MONGO DB & SERVERLESS CONNECTION
====================== */
const uri = process.env.DB_URI;

if (!uri) {
  throw new Error("DB_URI missing in Environment Variables");
}

const client = new MongoClient(uri);
let cachedDb = null;

async function getDB() {
  if (cachedDb) {
    return cachedDb;
  }
  await client.connect();
  cachedDb = client.db("idea_vault");
  console.log("MongoDB Connected Successfully");
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
   ROOT ROUTE
====================== */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 IdeaVault API Running Successfully",
  });
});

/* ======================
   IDEAS ROUTES
====================== */

// ১. GET ALL IDEAS
app.get("/ideas", async (req, res) => {
  try {
    const db = await getDB();
    const ideas = await db.collection("ideas").find().toArray();
    res.json({ success: true, data: ideas });
  } catch (error) {
    console.error("Error in GET /ideas:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ২. LIMIT 6 IDEAS
app.get("/ideas/limit", async (req, res) => {
  try {
    const db = await getDB();
    const ideas = await db.collection("ideas").find().limit(6).toArray();
    res.json({ success: true, data: ideas });
  } catch (error) {
    console.error("Error in GET /ideas/limit:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ৩. SINGLE IDEA
app.get("/ideas/:id", async (req, res) => {
  try {
    const db = await getDB();
    const id = toObjectId(req.params.id);

    if (!id) return res.status(400).json({ message: "Invalid ID Format" });

    const idea = await db.collection("ideas").findOne({ _id: id });
    if (!idea)
      return res
        .status(404)
        .json({ success: false, message: "Idea not found" });

    res.json({ success: true, data: idea });
  } catch (error) {
    console.error("Error in GET /ideas/:id:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ৪. CREATE IDEA
app.post("/ideas", async (req, res) => {
  try {
    const db = await getDB();
    const result = await db.collection("ideas").insertOne({
      ...req.body,
      createdAt: new Date(),
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error in POST /ideas:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ৫. UPDATE IDEA
app.patch("/ideas/:id", async (req, res) => {
  try {
    const db = await getDB();
    const id = toObjectId(req.params.id);

    if (!id) return res.status(400).json({ message: "Invalid ID Format" });

    const result = await db
      .collection("ideas")
      .updateOne({ _id: id }, { $set: req.body });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error in PATCH /ideas/:id:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ৬. DELETE IDEA
app.delete("/ideas/:id", async (req, res) => {
  try {
    const db = await getDB();
    const id = toObjectId(req.params.id);

    if (!id) return res.status(400).json({ message: "Invalid ID Format" });

    const result = await db.collection("ideas").deleteOne({ _id: id });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error in DELETE /ideas/:id:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ======================
   COMMENTS ROUTE
====================== */

// ১. CREATE COMMENT
app.post("/ideas/:id/comments", async (req, res) => {
  try {
    const db = await getDB();
    const id = toObjectId(req.params.id);

    if (!id) return res.status(400).json({ message: "Invalid ID Format" });

    const comment = {
      _id: new ObjectId(),
      userId: req.body.userId,
      userName: req.body.userName,
      text: req.body.text,
      createdAt: new Date(),
    };

    await db
      .collection("ideas")
      .updateOne({ _id: id }, { $push: { comments: comment } });

    res.json({ success: true, data: comment });
  } catch (error) {
    console.error("Error in POST /comments:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ২. UPDATE COMMENT
app.patch("/ideas/:id/comments/:commentId", async (req, res) => {
  try {
    const db = await getDB();
    const ideaId = toObjectId(req.params.id);
    const commentId = toObjectId(req.params.commentId);

    if (!ideaId || !commentId) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ID Format" });
    }

    const result = await db
      .collection("ideas")
      .updateOne(
        { _id: ideaId, "comments._id": commentId },
        { $set: { "comments.$.text": req.body.text } },
      );

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    res.json({ success: true, message: "Comment updated successfully" });
  } catch (error) {
    console.error("Error in PATCH /comments:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ৩. DELETE COMMENT
app.delete("/ideas/:id/comments/:commentId", async (req, res) => {
  try {
    const db = await getDB();
    const ideaId = toObjectId(req.params.id);
    const commentId = toObjectId(req.params.commentId);

    if (!ideaId || !commentId) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ID Format" });
    }

    const result = await db
      .collection("ideas")
      .updateOne({ _id: ideaId }, { $pull: { comments: { _id: commentId } } });

    res.json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error in DELETE /comments:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ======================
   MY IDEAS ROUTE
====================== */
app.get("/my-ideas/:userId", async (req, res) => {
  try {
    const db = await getDB();
    const ideas = await db
      .collection("ideas")
      .find({ userId: req.params.userId })
      .toArray();

    res.json({ success: true, data: ideas });
  } catch (error) {
    console.error("Error in GET /my-ideas:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ======================
   INTERACTIONS ROUTE
====================== */

// ১. GET USER INTERACTIONS (GET https://vercel.app)
app.get("/my-interactions/:userId", async (req, res) => {
  try {
    const db = await getDB();
    const userId = req.params.userId;

    const pipeline = [
      { $match: { "comments.userId": userId } },
      { $unwind: "$comments" },
      { $match: { "comments.userId": userId } },
      {
        $project: {
          _id: 0,
          // ObjectId গুলোকে ফ্রন্টএন্ডের জন্য স্ট্রিংয়ে কনভার্ট করা হয়েছে
          ideaId: { $toString: "$_id" },
          ideaTitle: "$title",
          ideaImage: "$image",
          commentId: { $toString: "$comments._id" },
          comment: "$comments.text", // 👈 ফ্রন্টএন্ডের সাথে মিলিয়ে 'comment' করা হলো
          createdAt: "$comments.createdAt",
        },
      },
    ];

    const interactions = await db
      .collection("ideas")
      .aggregate(pipeline)
      .toArray();
    res.json({ success: true, data: interactions });
  } catch (error) {
    console.error("Error in GET /my-interactions:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ======================
   SAVE / FAVORITE IDEAS ROUTE
====================== */

// ১. SAVE AN IDEA
app.post("/saved-ideas", async (req, res) => {
  try {
    const db = await getDB();
    const { userId, ideaId, ideaTitle, ideaImage } = req.body;

    if (!userId || !ideaId) {
      return res
        .status(400)
        .json({ success: false, message: "UserId and IdeaId are required" });
    }

    const existing = await db
      .collection("saved_ideas")
      .findOne({ userId, ideaId });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Idea already saved" });
    }

    const result = await db.collection("saved_ideas").insertOne({
      userId,
      ideaId,
      ideaTitle,
      ideaImage,
      savedAt: new Date(),
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error in POST /saved-ideas:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ১. GET ALL IDEAS WITH SEARCH & FILTER (100% Fixed and Safe for MongoDB BSON Dates)
app.get("/ideas", async (req, res) => {
  try {
    const db = await getDB();
    const { search, category, startDate, endDate } = req.query;

    let query = {};

    // ১. TITLE SEARCH (Case-insensitive using $regex)
    if (search && search.trim() !== "") {
      query.title = { $regex: search.trim(), $options: "i" };
    }

    // ২. CATEGORY FILTER (Strict match)
    if (category && category !== "") {
      query.category = category;
    }

    //
    if (startDate || endDate) {
      query.createdAt = {};
      
      if (startDate) {
       
        const start = new Date(startDate + "T00:00:00.000Z");
        if (!isNaN(start.getTime())) {
          query.createdAt.$gte = start;
        }
      }
      
      if (endDate) {
        
        const end = new Date(endDate + "T23:59:59.999Z");
        if (!isNaN(end.getTime())) {
          query.createdAt.$lte = end;
        }
      }
      
    }

    
    const ideas = await db
      .collection("ideas")
      .find(query)
      .sort({ _id: -1 })
      .toArray();

    res.json({ success: true, count: ideas.length, data: ideas });
  } catch (error) {
    console.error("Error in GET /ideas:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});



// ৩. REMOVE SAVED IDEA
app.delete("/saved-ideas/:userId/:ideaId", async (req, res) => {
  try {
    const db = await getDB();
    const { userId, ideaId } = req.params;

    const result = await db
      .collection("saved_ideas")
      .deleteOne({ userId, ideaId });
    res.json({
      success: true,
      message: "Idea removed from saved list",
      data: result,
    });
  } catch (error) {
    console.error("Error in DELETE /saved-ideas:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ======================
   PROFILE ROUTE
====================== */
app.get("/profile/:id", async (req, res) => {
  try {
    const db = await getDB();
    const id = toObjectId(req.params.id);

    if (!id) return res.status(400).json({ message: "Invalid ID Format" });

    const user = await db.collection("users").findOne({ _id: id });
    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Error in GET /profile:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ======================
   START SERVER
====================== */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
