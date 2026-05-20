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
   ROOT ROUTE
====================== */
app.get("/", (req, res) => {
  res.send("IdeaVault server is running...");
});

/* ======================
   IDEA APIs
====================== */

// POST idea
app.post("/ideas", async (req, res) => {
  try {
    const idea = req.body;

    if (!idea) {
      return res.status(400).json({
        success: false,
        message: "No data provided",
      });
    }

    const result = await ideasCollection.insertOne(idea);

    res.status(201).json({
      success: true,
      message: "Idea saved successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET all ideas
app.get("/ideas", async (req, res) => {
  try {
    const ideas = await ideasCollection.find().toArray();

    res.json({
      success: true,
      data: ideas,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET 6 ideas (home page)
app.get("/idea", async (req, res) => {
  try {
    const pipeline = [{ $limit: 6 }];

    const ideas = await ideasCollection.aggregate(pipeline).toArray();

    res.json({
      success: true,
      data: ideas,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* ======================
   PROFILE APIs
====================== */

// PATCH → update profile
app.patch("/profile/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { name, email, image } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID",
      });
    }

    const updateDoc = {
      $set: {
        name,
        email,
        image,
        updatedAt: new Date(),
      },
    };

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      updateDoc
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET → single user profile
app.get("/profile/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID",
      });
    }

    const user = await usersCollection.findOne({
      _id: new ObjectId(id),
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});