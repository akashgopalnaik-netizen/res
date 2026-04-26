const { ChromaClient } = require('chromadb');

let client = null;
let menuCollection = null;

const COLLECTION_NAME = 'menu_items';

/**
 * Initialize ChromaDB client and ensure the menu_items collection exists.
 * Gracefully no-ops if ChromaDB is not running so the rest of the app boots fine.
 */
async function initChroma() {
  try {
    const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
    const url = new URL(chromaUrl);

    client = new ChromaClient({
      host: url.hostname,
      port: parseInt(url.port) || 8000,
      ssl: url.protocol === 'https:'
    });

    // heartbeat to confirm connection
    await client.heartbeat();

    menuCollection = await client.getOrCreateCollection({
      name: COLLECTION_NAME,
      // We provide embeddings ourselves (via Gemini), so use a no-op function
      embeddingFunction: {
        generate: async (texts) => texts.map(() => [])
      },
      metadata: { description: 'Restaurant menu items for semantic search' }
    });

    console.log(`✅ ChromaDB connected — collection "${COLLECTION_NAME}" ready`);
    return true;
  } catch (err) {
    console.warn('⚠️  ChromaDB not available:', err.message);
    console.warn('   Start ChromaDB with: chroma run --path ./chroma_data');
    client = null;
    menuCollection = null;
    return false;
  }
}

/**
 * Build a rich descriptive text string for a menu item to be embedded.
 * Uses the actual MenuItem model fields: isVeg, isSpicy, allergens.
 */
function buildDocText(item) {
  const dietary = [];
  if (item.isVeg) dietary.push('vegetarian');
  if (!item.isVeg) dietary.push('non-vegetarian');
  if (item.isSpicy) dietary.push('spicy');
  const allergenList = (item.allergens || []).join(', ');
  const available = item.isAvailable ? 'available' : 'unavailable';

  return [
    `Name: ${item.name}`,
    `Category: ${item.category}`,
    `Description: ${item.description || ''}`,
    `Price: ₹${item.price}`,
    `Dietary: ${dietary.join(', ') || 'none'}`,
    `Allergens: ${allergenList || 'none'}`,
    `Ingredients: ${(item.ingredients || []).join(', ') || 'none'}`,
    `Status: ${available}`,
    `Featured: ${item.isFeatured ? 'yes' : 'no'}`,
    `Prep time: ${item.preparationTime || 15} minutes`
  ].join('. ');
}

/**
 * Upsert a menu item into ChromaDB.
 * @param {Object} item - Mongoose MenuItem document
 * @param {number[]} embedding - Float32 embedding vector from Gemini
 */
async function upsertMenuItem(item, embedding) {
  if (!menuCollection) return;

  const docText = buildDocText(item);

  await menuCollection.upsert({
    ids: [item._id.toString()],
    embeddings: [embedding],
    documents: [docText],
    metadatas: [{
      name: item.name,
      category: item.category,
      price: item.price,
      isAvailable: item.isAvailable ? 'true' : 'false',
      isFeatured: item.isFeatured ? 'true' : 'false',
      isVeg: item.isVeg ? 'true' : 'false',
      isSpicy: item.isSpicy ? 'true' : 'false',
      allergens: (item.allergens || []).join(', '),
      rating: item.ratings?.average || 0
    }]
  });
}

/**
 * Delete a menu item from ChromaDB.
 */
async function deleteMenuItem(itemId) {
  if (!menuCollection) return;
  try {
    await menuCollection.delete({ ids: [itemId.toString()] });
  } catch (_) { /* ignore if not found */ }
}

/**
 * Query ChromaDB for menu items similar to the query embedding.
 * @param {number[]} queryEmbedding
 * @param {number} nResults
 * @returns {Array} array of { id, document, metadata, distance }
 */
async function queryMenu(queryEmbedding, nResults = 5) {
  if (!menuCollection) return [];

  const results = await menuCollection.query({
    queryEmbeddings: [queryEmbedding],
    nResults,
    include: ['documents', 'metadatas', 'distances']
  });

  const ids = results.ids[0] || [];
  const docs = results.documents[0] || [];
  const metas = results.metadatas[0] || [];
  const dists = results.distances[0] || [];

  return ids.map((id, i) => ({
    id,
    document: docs[i],
    metadata: metas[i],
    distance: dists[i]
  }));
}

/**
 * Check if ChromaDB is connected.
 */
function isConnected() {
  return menuCollection !== null;
}

/**
 * Get total count of indexed items.
 */
async function getCount() {
  if (!menuCollection) return 0;
  return await menuCollection.count();
}

/** Expose buildDocText for the seed script and index-menu route */
module.exports = { initChroma, upsertMenuItem, deleteMenuItem, queryMenu, isConnected, getCount, buildDocText };
