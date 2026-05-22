🗄️ IdeaVault Server – Startup Idea Sharing Platform API

🔗 Live Client: https://ideavault-client-eight.vercel.app/
🖥️ Client Repository: https://github.com/mdantormia1779-dev/ideavault-client
🗄️ Server Repository: https://github.com/mdantormia1779-dev/ideavault-server

📌 Project Overview

IdeaVault Server is the backend API for a startup idea sharing platform where users can share ideas, interact through comments, and validate concepts collaboratively.

The server handles authentication, idea management, comments, and user interactions using a secure and scalable REST API built with Node.js, Express, and MongoDB.

✨ Key Features
🔐 JWT Authentication (Email/Password + Google Login support)
👤 User profile management system
💡 Full CRUD operations for startup ideas
💬 Comment system (Add, Edit, Delete)
🔎 Search ideas using case-insensitive $regex
🧩 Category filtering system
📅 Date range filtering using $gte and $lte
📊 Trending ideas support (based on engagement logic)
🛡️ Protected routes with JWT middleware
⚡ Secure REST API architecture
❌ Custom error handling (no default alerts)
🧰 Tech Stack
Node.js
Express.js
MongoDB (Native Driver / Mongoose)
JWT (JSON Web Token)
CORS
dotenv
📁 API Endpoints
🔐 Authentication Routes
POST /auth/register → Register new user
POST /auth/login → Login user
GET /auth/me → Get logged-in user (JWT required)
💡 Idea Routes
GET /ideas → Get all ideas (search, filter supported)
GET /ideas/:id → Get single idea details
POST /ideas → Create new idea (Private)
PUT /ideas/:id → Update idea (Private, owner only)
DELETE /ideas/:id → Delete idea (Private, owner only)
💬 Comment Routes
GET /comments/:ideaId → Get all comments for an idea
POST /comments → Add comment (Private)
PUT /comments/:id → Edit comment (Owner only)
DELETE /comments/:id → Delete comment (Owner only)
👤 User Routes
GET /users/:id → Get user profile
PUT /users/:id → Update user profile (Private)
🔐 Authentication System
JWT token generated during login/register
Token stored in client-side (localStorage)
Sent in request header:
Authorization: Bearer <token>
Middleware verifies token for protected routes
Prevents unauthorized access
🔎 Search & Filter System
Search by Title
$regex: searchText, $options: "i"
Filter by Category
category: "Tech | AI | Health | Education"
Date Range Filter (Optional)
createdAt: {
  $gte: startDate,
  $lte: endDate
}
🧠 Database Structure
Users Collection
{
  name,
  email,
  password,
  photoURL,
  createdAt
}
Ideas Collection
{
  title,
  shortDescription,
  description,
  category,
  tags,
  imageURL,
  budget,
  targetAudience,
  problemStatement,
  solution,
  userEmail,
  createdAt
}
Comments Collection
{
  ideaId,
  userEmail,
  userName,
  comment,
  createdAt
}
🛡️ Security Features
JWT authentication middleware
Protected routes for CRUD operations
Owner-based authorization (update/delete)
Input validation for required fields
Secure CORS configuration
Error handling without default alerts
⚙️ Environment Variables

Create a .env file:

PORT=5000
DB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
▶️ Run Project Locally
1️⃣ Install dependencies
npm install
2️⃣ Start server
npm run dev
3️⃣ Server runs on:
http://localhost:5000
📦 Deployment
Backend hosted on Render / Railway / VPS
Environment variables configured in hosting platform
CORS enabled for Vercel frontend communication
📄 Assignment Requirements Checklist

✔ Minimum 8 meaningful GitHub commits (Server-side)
✔ RESTful API design implemented
✔ JWT authentication system
✔ Protected routes secured
✔ CRUD operations for ideas & comments
✔ Search + filter functionality implemented
✔ Clean modular backend structure
✔ Proper error handling (no default alerts)

👨‍💻 Developer

Md Antor Mia
