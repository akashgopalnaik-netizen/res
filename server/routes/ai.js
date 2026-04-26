const express = require('express');
const { protect } = require('../middleware/auth');
const { ragChat, getEmbedding, generateSearchSummary, isReady } = require('../services/rag');
const { queryMenu, upsertMenuItem, isConnected, getCount, buildDocText } = require('../services/vectordb');
const MenuItem = require('../models/MenuItem');

const router = express.Router();

// @route   GET /api/ai/status
// @desc    Health check for AI services (Gemini + ChromaDB + index count)
// @access  Public
router.get('/status', async (req, res) => {
  let indexCount = 0;
  if (isConnected()) {
    try { indexCount = await getCount(); } catch (_) {}
  }

  res.json({
    success: true,
    data: {
      gemini: isReady(),
      chromadb: isConnected(),
      indexedItems: indexCount,
      message: isReady() && isConnected()
        ? `AI services fully operational — ${indexCount} menu items indexed`
        : 'Some AI services unavailable — check GEMINI_API_KEY and ChromaDB server'
    }
  });
});

// @route   POST /api/ai/chat
// @desc    RAG-powered restaurant assistant chat
// @access  Public
router.post('/chat', async (req, res) => {
  try {
    const { message, history = [], orderContext = '' } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    if (!isReady()) {
      return res.status(503).json({
        success: false,
        message: 'AI service unavailable. Please set GEMINI_API_KEY in server/.env'
      });
    }

    const reply = await ragChat(message.trim(), history, orderContext);

    res.json({
      success: true,
      data: { reply }
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      message: 'AI service error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/ai/search
// @desc    Semantic menu search using ChromaDB + Gemini
// @access  Public
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 5 } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Query is required' });
    }

    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Vector search unavailable. ChromaDB is not running.'
      });
    }

    if (!isReady()) {
      return res.status(503).json({
        success: false,
        message: 'Embedding service unavailable. Set GEMINI_API_KEY.'
      });
    }

    // Embed the search query
    const queryEmbedding = await getEmbedding(query.trim());

    // Search ChromaDB
    const results = await queryMenu(queryEmbedding, Math.min(limit, 10));

    // Filter by relevance threshold
    const relevant = results.filter(r => r.distance < 1.4);

    // Fetch full menu item details from MongoDB for relevant items
    const ids = relevant.map(r => r.id);
    const menuItems = await MenuItem.find({
      _id: { $in: ids },
      isAvailable: true
    });

    // Sort by original ChromaDB relevance order
    const sortedItems = ids
      .map(id => menuItems.find(m => m._id.toString() === id))
      .filter(Boolean);

    // Optional AI summary
    let summary = null;
    if (sortedItems.length > 0 && isReady()) {
      try {
        summary = await generateSearchSummary(query, relevant.slice(0, 3));
      } catch (_) { /* non-critical */ }
    }

    res.json({
      success: true,
      data: {
        query,
        menuItems: sortedItems,
        summary,
        totalFound: sortedItems.length
      }
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({ success: false, message: 'Search failed', error: error.message });
  }
});

// @route   POST /api/ai/index-menu
// @desc    (Re)index all menu items into ChromaDB — run after seeding or bulk updates
// @access  Private/Admin
router.post('/index-menu', protect, async (req, res) => {
  try {
    if (!isConnected()) {
      return res.status(503).json({ success: false, message: 'ChromaDB not connected' });
    }
    if (!isReady()) {
      return res.status(503).json({ success: false, message: 'Gemini not ready — set GEMINI_API_KEY' });
    }

    const menuItems = await MenuItem.find({});
    let indexed = 0;
    let failed = 0;
    const errors = [];

    for (const item of menuItems) {
      try {
        const docText = buildDocText(item);
        const embedding = await getEmbedding(docText);
        await upsertMenuItem(item, embedding);
        indexed++;
        // Avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        failed++;
        errors.push({ item: item.name, error: err.message });
      }
    }

    const count = await getCount();
    res.json({
      success: true,
      message: `Indexing complete: ${indexed} indexed, ${failed} failed`,
      data: { indexed, failed, totalInChroma: count, errors }
    });
  } catch (error) {
    console.error('Index menu error:', error);
    res.status(500).json({ success: false, message: 'Indexing failed', error: error.message });
  }
});

module.exports = router;
