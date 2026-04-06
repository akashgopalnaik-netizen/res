// Shared mock data store
const DB = {
  users: [
    { id: 1, name: "Admin User", email: "admin@resto.com", password: "admin123", role: "admin" },
    { id: 2, name: "John Manager", email: "manager@resto.com", password: "manager123", role: "manager", restaurantId: 1 },
    { id: 3, name: "Jane Customer", email: "customer@resto.com", password: "customer123", role: "customer" }
  ],
  restaurants: [
    { id: 1, name: "The Grand Bistro", cuisine: "Italian", address: "123 Main St", status: "active", rating: 4.5, image: "🍝" },
    { id: 2, name: "Spice Garden", cuisine: "Indian", address: "456 Oak Ave", status: "active", rating: 4.2, image: "🍛" },
    { id: 3, name: "Sushi World", cuisine: "Japanese", address: "789 Pine Rd", status: "pending", rating: 0, image: "🍣" }
  ],
  menus: [
    { id: 1, restaurantId: 1, name: "Margherita Pizza", price: 12.99, category: "Main", available: true, image: "🍕" },
    { id: 2, restaurantId: 1, name: "Pasta Carbonara", price: 14.99, category: "Main", available: true, image: "🍝" },
    { id: 3, restaurantId: 1, name: "Tiramisu", price: 6.99, category: "Dessert", available: true, image: "🍰" },
    { id: 4, restaurantId: 2, name: "Butter Chicken", price: 13.99, category: "Main", available: true, image: "🍗" },
    { id: 5, restaurantId: 2, name: "Garlic Naan", price: 3.99, category: "Bread", available: true, image: "🫓" },
    { id: 6, restaurantId: 2, name: "Mango Lassi", price: 4.99, category: "Drinks", available: false, image: "🥭" }
  ],
  orders: [
    { id: 1, customerId: 3, restaurantId: 1, items: [{menuId:1, qty:2}, {menuId:3, qty:1}], status: "delivered", total: 32.97, date: "2026-03-28" },
    { id: 2, customerId: 3, restaurantId: 2, items: [{menuId:4, qty:1}, {menuId:5, qty:2}], status: "preparing", total: 21.97, date: "2026-03-31" }
  ],
  nextId: { users: 4, restaurants: 4, menus: 7, orders: 3 }
};

// Persist to localStorage
function saveDB() { localStorage.setItem("restoDB", JSON.stringify(DB)); }
function loadDB() {
  const saved = localStorage.getItem("restoDB");
  if (saved) Object.assign(DB, JSON.parse(saved));
}
loadDB();

// Auth helpers
function login(email, password) {
  const user = DB.users.find(u => u.email === email && u.password === password);
  if (user) { sessionStorage.setItem("currentUser", JSON.stringify(user)); return user; }
  return null;
}
function logout() { sessionStorage.removeItem("currentUser"); window.location.href = "../index.html"; }
function getCurrentUser() {
  const u = sessionStorage.getItem("currentUser");
  return u ? JSON.parse(u) : null;
}
function requireAuth(role) {
  const user = getCurrentUser();
  if (!user) { window.location.href = "../index.html"; return null; }
  if (role && user.role !== role) { window.location.href = "../index.html"; return null; }
  return user;
}

// Cart (customer)
function getCart() { return JSON.parse(localStorage.getItem("cart") || "[]"); }
function saveCart(cart) { localStorage.setItem("cart", JSON.stringify(cart)); }
function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(c => c.menuId === item.menuId);
  if (existing) existing.qty++;
  else cart.push({ ...item, qty: 1 });
  saveCart(cart);
}
function removeFromCart(menuId) {
  saveCart(getCart().filter(c => c.menuId !== menuId));
}
function clearCart() { localStorage.removeItem("cart"); }
