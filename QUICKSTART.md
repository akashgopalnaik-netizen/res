# Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- MongoDB running locally or MongoDB Atlas URI
- Python 3.8+ (for ChromaDB vector database)
- A Google Gemini API key — get one free at https://aistudio.google.com/app/apikey

## Installation (First Time)

```bash
# Install all dependencies
npm run install:all
```

## Start the Application

```bash
# Start all servers (backend + customer app + admin dashboard)
npm run dev
```

This will start:
- **Backend API**: http://localhost:5000
- **Customer App**: http://localhost:5173
- **Admin Dashboard**: http://localhost:5174

## Login Credentials

### Admin Dashboard
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@foodhub.com | admin123 |
| Manager | manager@foodhub.com | manager123 |
| Staff | staff@foodhub.com | staff123 |

### Customer App
| Role | Email | Password |
|------|-------|----------|
| Customer | customer@example.com | customer123 |

## Re-seed Database

If you need to reset the database:

```bash
cd server
npm run seed
```

The seed script will automatically attempt to index all menu items into ChromaDB (if it's running).
If ChromaDB isn't running yet, seed normally then click **Re-index Menu** in the Admin Dashboard → AI / RAG Status card.

## AI / RAG Setup (Gemini + ChromaDB)

The restaurant AI assistant uses **Retrieval-Augmented Generation (RAG)**:
- **Gemini** (`text-embedding-004` + `gemini-1.5-flash`) — embeds menu text and generates answers
- **ChromaDB** — vector database that stores and searches menu embeddings

### Step 1 — Install ChromaDB
```bash
pip install chromadb
```

### Step 2 — Add your Gemini API key
Edit `server/.env`:
```
GEMINI_API_KEY=your_real_key_here
```

### Step 3 — Start ChromaDB (keep this terminal open)
```bash
# From the project root:
start-chromadb.bat        # Windows
# OR manually:
chroma run --path server/chroma_data
```

### Step 4 — Seed + auto-index
```bash
cd server && npm run seed
```
You'll see: `✅ ChromaDB indexing done — 11 indexed, 0 failed`

### Step 5 — Verify
```
GET http://localhost:5000/api/ai/status
→ { gemini: true, chromadb: true, indexedItems: 11 }
```

Now the **🤖 AI chat widget** and **AI Search** on the Menu page are fully active.

## API Health Check

Visit http://localhost:5000/api/health to verify the backend is running.

## Features to Try

### Customer App (http://localhost:5173)
1. Browse the menu by category
2. Use **AI Search** 🤖 — toggle on and type natural language like *"light vegetarian starter"*
3. Add items to cart
4. Create an account or login
5. Place an order (dine-in, takeout, or delivery)
6. Track your order in real-time
7. Make a table reservation
8. Chat with the **AI Menu Assistant** (floating 🤖 button) — ask about dishes, allergens, and combos

### Admin Dashboard (http://localhost:5174)
1. Login with admin credentials
2. View dashboard — check the **🤖 AI / RAG Status** card (Gemini ✅, ChromaDB ✅, items indexed)
3. Click **Re-index Menu** after adding/editing menu items to keep RAG up to date
4. Manage orders (confirm, prepare, complete)
5. Check the Kitchen Display System
6. Add/edit menu items
7. Manage table assignments
8. View and confirm reservations
9. Track inventory and report wastage
10. Manage staff accounts
11. View revenue reports and analytics

## Troubleshooting

### MongoDB Connection Error
Make sure MongoDB is running:
```bash
# Windows (if MongoDB is installed as service)
net start MongoDB

# macOS (with Homebrew)
brew services start mongodb-community

# Or use MongoDB Atlas cloud database
```

### Port Already in Use
If a port is already in use, change it in the respective config:
- Backend: `server/.env` → `PORT`
- Client: `client/vite.config.js` → `server.port`
- Admin: `admin/vite.config.js` → `server.port`

### Stripe Payment Not Working
The app works in test mode. For real payments:
1. Get test keys from https://dashboard.stripe.com/test/apikeys
2. Update `server/.env` with your keys
3. Use test card: 4242 4242 4242 4242

## Next Steps

1. Customize the menu items in the database
2. Add your restaurant branding (logo, colors)
3. Configure real payment gateway credentials
4. Set up email/SMS notifications
5. Deploy to production (see README.md)

### AI Troubleshooting

| Problem | Fix |
|---------|-----|
| `AI service unavailable` | Check `GEMINI_API_KEY` in `server/.env` |
| `ChromaDB not connected` | Run `start-chromadb.bat` first, then restart server |
| Chat gives wrong menu info | Click **Re-index Menu** in Admin Dashboard |
| `indexedItems: 0` after seed | ChromaDB wasn't running during seed — re-index from Admin |
