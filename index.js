require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

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

// connect DB
async function run() {
  try {
    await client.connect();

    const db = client.db("idea_vault");
    ideasCollection = db.collection("ideas");

    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("DB connection error:", error);
  }
}

run();

// root route
app.get("/", (req, res) => {
  res.send("IdeaVault server is running...");
});

// POST → add idea to database
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

// GET → all ideas (bonus API)
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

// server start
app.listen(port, () => {
  console.log(` Server running on port ${port}`);
});