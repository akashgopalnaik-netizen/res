const { GoogleGenerativeAI } = require('@google/generative-ai');
const { queryMenu } = require('./vectordb');

let genAI = null;
let embeddingModel = null;
let chatModel = null;

function initGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.warn('⚠️  GEMINI_API_KEY not set — AI features disabled');
    return false;
  }
  genAI = new GoogleGenerativeAI(apiKey);
  embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  chatModel = genAI.getGenerativeModel({ model: 'gemini-pro-latest' });
  console.log('✅ Gemini AI initialized');
  return true;
}

/**
 * Generate an embedding vector for a piece of text using Gemini.
 * @param {string} text
 * @returns {number[]} 768-dim embedding
 */
async function getEmbedding(text) {
  if (!embeddingModel) throw new Error('Gemini not initialized — set GEMINI_API_KEY');
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

/**
 * RAG-powered chat: retrieve relevant menu context then generate an answer.
 * @param {string} userMessage   - Customer's question
 * @param {Array}  history       - Previous messages [{role, text}]
 * @param {string} [orderContext] - Optional summary of the user's recent orders
 * @returns {string} AI answer
 */
async function ragChat(userMessage, history = [], orderContext = '') {
  if (!chatModel) throw new Error('Gemini not initialized — set GEMINI_API_KEY');

  // Step 1: Embed the user question and retrieve relevant menu context
  let menuContext = '';
  try {
    const queryEmbedding = await getEmbedding(userMessage);
    const results = await queryMenu(queryEmbedding, 6);

    if (results.length > 0) {
      const relevant = results
        .filter(r => r.distance < 1.5)
        .map(r => r.document)
        .join('\n---\n');
      menuContext = relevant;
    }
  } catch (err) {
    console.warn('RAG retrieval warning:', err.message);
  }

  // Step 2: Build enriched system prompt
  const systemPrompt = `You are a friendly, knowledgeable AI dining assistant for our restaurant called FoodHub.
You help customers with menu questions, dietary information, personalized recommendations, allergen details, and ordering guidance.
Be warm, concise, and helpful. If you don't know something, say so politely rather than guessing.

${menuContext
    ? `📋 RELEVANT MENU CONTEXT (use this to answer accurately):\n${menuContext}\n`
    : 'ℹ️ Note: Menu vector database is not connected — provide general helpful responses.'}

${orderContext
    ? `🛒 CUSTOMER'S RECENT ORDER HISTORY:\n${orderContext}\n`
    : ''}

Response Guidelines:
- Always mention exact prices when recommending items (e.g. "Crispy Calamari at ₹12.99")
- Highlight dietary info: vegetarian 🌱, spicy 🌶️, allergens ⚠️
- Suggest complementary items or meal combos when appropriate
- For ordering questions, guide them to add items to cart on our website
- Keep answers under 150 words unless a detailed comparison is asked for
- Use emojis sparingly for a friendly but professional tone`;

  // Step 3: Build conversation history for multi-turn chat
  const historyContent = history.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }]
  }));

  const chat = chatModel.startChat({
    history: [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: "Got it! I'm FoodHub's AI assistant, ready to help with menu questions, dietary info, and recommendations. How can I help you today?" }] },
      ...historyContent
    ],
    generationConfig: {
      maxOutputTokens: 600,
      temperature: 0.7,
      topP: 0.9
    }
  });

  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}

/**
 * Generate a menu-aware search summary for a semantic query.
 * @param {string} query   - User search phrase
 * @param {Array}  results - ChromaDB result objects
 * @returns {string} Formatted answer
 */
async function generateSearchSummary(query, results) {
  if (!chatModel || results.length === 0) return null;

  const itemList = results
    .map(r => r.document)
    .join('\n---\n');

  const prompt = `A customer searched our restaurant menu for: "${query}"

Here are the matching menu items found:
${itemList}

Write a brief, friendly 1-2 sentence summary of what was found. 
Mention item names and prices. Be concise and encouraging. Use a warm tone.`;

  const result = await chatModel.generateContent(prompt);
  return result.response.text();
}

function isReady() {
  return chatModel !== null && embeddingModel !== null;
}

module.exports = { initGemini, getEmbedding, ragChat, generateSearchSummary, isReady };
