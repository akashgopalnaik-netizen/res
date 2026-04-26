# 🍽️ Restaurant Management System — About

A full-stack, AI-powered restaurant management platform built as a monorepo with three apps: a **Customer Client**, an **Admin Panel**, and a **Backend API Server**.

---

## 🏗️ Tech Stack

### Backend (Server)
| Technology | Purpose |
|---|---|
| **Node.js + Express.js** | REST API server & middleware |
| **MongoDB + Mongoose** | Primary database & ODM |
| **Socket.io** | Real-time bidirectional communication |
| **JSON Web Tokens (JWT)** | Stateless authentication |
| **bcryptjs** | Password hashing |
| **Stripe** | Online payment processing & webhooks |
| **Google Gemini AI** (`@google/generative-ai`) | Large language model for RAG chat |
| **ChromaDB** | Vector database for semantic search |
| **Multer** | File/image uploads |
| **QRCode** | Order pickup token QR code generation |
| **Helmet** | HTTP security headers |
| **express-rate-limit** | API rate limiting |
| **express-validator** | Request validation |
| **compression** | Response gzip compression |
| **morgan** | HTTP request logging |
| **dotenv** | Environment variable management |

### Customer Client (Frontend)
| Technology | Purpose |
|---|---|
| **React 18** | UI framework |
| **Vite** | Build tool & dev server |
| **React Router DOM v6** | Client-side routing |
| **Zustand** | Global state management |
| **Axios** | HTTP client |
| **Socket.io-client** | Real-time order tracking |
| **@stripe/stripe-js** | Stripe payment UI integration |
| **qrcode.react** | QR code display for pickup tokens |
| **react-hot-toast** | Toast notifications |

### Admin Panel (Frontend)
| Technology | Purpose |
|---|---|
| **React 18** | UI framework |
| **Vite** | Build tool & dev server |
| **React Router DOM v6** | Client-side routing |
| **Zustand** | Global state management |
| **Axios** | HTTP client |
| **Socket.io-client** | Real-time kitchen & order updates |
| **Recharts** | Data visualization & analytics charts |
| **react-hot-toast** | Toast notifications |
| **qrcode.react** | Token scanning display |
| **@stripe/stripe-js** | Payment status integration |

### Infrastructure & Tooling
| Tool | Purpose |
|---|---|
| **npm Workspaces / Concurrently** | Monorepo management, run all apps together |
| **nodemon** | Auto-restart server during development |
| **ChromaDB (standalone)** | Local vector store for AI embeddings |

---

## ✨ Features

### 👤 Authentication & Users
- JWT-based login/register for customers and staff
- Role-based access control (`customer`, `staff`, `admin`)
- Secure password hashing with bcryptjs
- Protected routes on both client and admin

### 🍕 Menu Management
- Full CRUD for menu items (name, description, price, category, image)
- Image uploads via Multer
- Semantic AI-powered menu search using ChromaDB embeddings
- Menu items indexed into vector DB on seed/creation

### 🛒 Customer Ordering Flow
- Browse menu with categories and AI search
- Add to cart, adjust quantities
- Checkout with address and payment selection
- Real-time order status tracking (Pending → Preparing → Ready → Received)
- Order history page

### 💳 Payments
- **Stripe** card payments with webhook-based order confirmation
- **Cash on Delivery (COD)** payment option
- Raw body middleware for secure Stripe webhook signature verification
- Payment success page with order summary

### 🎟️ Token-Based Order Pickup
- Unique pickup token generated per order
- QR code displayed to customer on order ready
- Staff verifies token via admin panel to mark order as "Completed"
- Prevents unauthorized order collection

### 🧑‍🍳 Kitchen Display System (KDS)
- Dedicated real-time kitchen view for staff
- Orders pushed instantly via Socket.io on placement
- Visual status cards for each active order
- One-click status updates (Preparing / Ready)

### 🪑 Table Management
- CRUD for restaurant tables (table number, capacity, status)
- Table availability tracking (Available / Occupied / Reserved)

### 📅 Reservations
- Customer reservation booking (date, time, party size)
- Admin management of all reservations with status updates

### 📦 Inventory Management
- Stock tracking with quantity, unit, and reorder levels
- Low-stock alerts and status indicators
- Full CRUD from admin panel

### 🤖 AI Chat Assistant (RAG)
- Gemini-powered conversational assistant on the customer app
- Retrieval-Augmented Generation using ChromaDB for menu context
- Answers questions about dishes, ingredients, prices, availability
- Context-aware multi-turn conversation

### 📊 Analytics & Dashboard
- Admin dashboard with live statistics (orders, revenue, users)
- Recharts-powered charts: revenue trends, order volume, category breakdown
- Reports page for business insights

### 👥 Staff Management
- Admin panel to view, add, and manage staff accounts
- Role assignment and status management

### 🔔 Real-Time Notifications
- Socket.io events for new orders, status changes, kitchen updates
- Toast notifications across all panels

### 🔒 Security & Performance
- Helmet for HTTP security headers
- API rate limiting (express-rate-limit)
- CORS restricted to known client/admin origins
- Response compression (gzip)
- Input validation with express-validator

---

## 📁 Project Structure

```
res/
├── client/          # Customer-facing React app (Vite)
├── admin/           # Admin & staff React app (Vite)
├── server/          # Express.js REST API + Socket.io
│   ├── config/      # DB connection
│   ├── controllers/ # Route handler logic
│   ├── middleware/  # Auth, validation middleware
│   ├── models/      # Mongoose schemas (User, Order, MenuItem, Table, Reservation, Inventory)
│   ├── routes/      # API route definitions
│   ├── services/    # ChromaDB (vectordb.js) & Gemini RAG (rag.js)
│   ├── utils/       # Helper utilities
│   ├── seed.js      # Database seeder + vector DB population
│   └── server.js    # App entry point
├── about.md         # This file
├── README.md        # Setup & run instructions
└── QUICKSTART.md    # Quick start guide
```

---

## 🚀 Running the Project

```bash
# From the root /res directory
npm run dev          # Starts all three apps concurrently

# Start ChromaDB separately
chroma run --path ./server/chroma_data

# Seed the database
cd server && npm run seed
```

---

*Built with ❤️ — Full-Stack Restaurant Management System*
