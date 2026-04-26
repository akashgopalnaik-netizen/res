// Seed script to populate database with initial data
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = require('./config/db');
const User = require('./models/User');
const MenuItem = require('./models/MenuItem');
const Table = require('./models/Table');
const { InventoryItem, Supplier } = require('./models/Inventory');
const { initChroma, upsertMenuItem, getCount, buildDocText } = require('./services/vectordb');
const { initGemini, getEmbedding } = require('./services/rag');

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    await MenuItem.deleteMany({});
    await Table.deleteMany({});
    await InventoryItem.deleteMany({});
    await Supplier.deleteMany({});

    console.log('Cleared existing data...');

    // Create Admin User (password will be hashed by pre-save hook)
    await User.create({
      name: 'Admin User',
      email: 'admin@foodhub.com',
      password: 'admin123',
      role: 'admin',
      phone: '+1 (555) 000-0000',
      isVerified: true,
      isActive: true
    });

    // Create Manager
    await User.create({
      name: 'John Manager',
      email: 'manager@foodhub.com',
      password: 'manager123',
      role: 'manager',
      phone: '+1 (555) 000-0001',
      isVerified: true,
      isActive: true
    });

    // Create Staff
    await User.create({
      name: 'Jane Staff',
      email: 'staff@foodhub.com',
      password: 'staff123',
      role: 'staff',
      phone: '+1 (555) 000-0002',
      isVerified: true,
      isActive: true
    });

    // Create Demo Customer
    await User.create({
      name: 'Demo Customer',
      email: 'customer@example.com',
      password: 'customer123',
      role: 'customer',
      phone: '+1 (555) 000-0003',
      isVerified: true,
      isActive: true,
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001'
      }
    });

    console.log('Created users...');

    // Create Menu Items
    const menuItems = [
      // Appetizers
      {
        name: 'Crispy Calamari',
        description: 'Golden fried calamari served with marinara sauce and lemon wedges',
        category: 'appetizer',
        price: 12.99,
        cost: 4.50,
        isVeg: false,
        isSpicy: false,
        isFeatured: true,
        preparationTime: 12,
        ingredients: ['calamari', 'flour', 'marinara', 'lemon'],
        allergens: ['seafood', 'gluten']
      },
      {
        name: 'Bruschetta',
        description: 'Toasted bread topped with fresh tomatoes, basil, garlic, and olive oil',
        category: 'appetizer',
        price: 8.99,
        cost: 2.50,
        isVeg: true,
        isSpicy: false,
        isFeatured: false,
        preparationTime: 8,
        ingredients: ['bread', 'tomatoes', 'basil', 'garlic', 'olive oil'],
        allergens: ['gluten']
      },
      {
        name: 'Buffalo Wings',
        description: 'Spicy buffalo wings served with blue cheese dressing and celery',
        category: 'appetizer',
        price: 11.99,
        cost: 4.00,
        isVeg: false,
        isSpicy: true,
        isFeatured: true,
        preparationTime: 15,
        ingredients: ['chicken wings', 'buffalo sauce', 'blue cheese', 'celery'],
        allergens: ['dairy']
      },
      // Main Courses
      {
        name: 'Grilled Ribeye Steak',
        description: '12oz ribeye steak grilled to perfection with seasonal vegetables',
        category: 'main',
        price: 34.99,
        cost: 12.00,
        isVeg: false,
        isSpicy: false,
        isFeatured: true,
        preparationTime: 25,
        ingredients: ['ribeye', 'vegetables', 'herbs'],
        allergens: []
      },
      {
        name: 'Salmon Teriyaki',
        description: 'Fresh Atlantic salmon with teriyaki glaze, served with rice and vegetables',
        category: 'main',
        price: 24.99,
        cost: 8.00,
        isVeg: false,
        isSpicy: false,
        isFeatured: true,
        preparationTime: 20,
        ingredients: ['salmon', 'teriyaki sauce', 'rice', 'vegetables'],
        allergens: ['fish', 'soy']
      },
      {
        name: 'Mushroom Risotto',
        description: 'Creamy arborio rice with wild mushrooms, parmesan, and truffle oil',
        category: 'main',
        price: 18.99,
        cost: 5.00,
        isVeg: true,
        isSpicy: false,
        isFeatured: false,
        preparationTime: 22,
        ingredients: ['arborio rice', 'mushrooms', 'parmesan', 'truffle oil'],
        allergens: ['dairy']
      },
      {
        name: 'Chicken Parmesan',
        description: 'Breaded chicken breast with marinara and mozzarella, served with pasta',
        category: 'main',
        price: 19.99,
        cost: 6.00,
        isVeg: false,
        isSpicy: false,
        isFeatured: true,
        preparationTime: 20,
        ingredients: ['chicken', 'marinara', 'mozzarella', 'pasta'],
        allergens: ['gluten', 'dairy']
      },
      // Desserts
      {
        name: 'Tiramisu',
        description: 'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone',
        category: 'dessert',
        price: 8.99,
        cost: 2.50,
        isVeg: true,
        isSpicy: false,
        isFeatured: true,
        preparationTime: 5,
        ingredients: ['ladyfingers', 'espresso', 'mascarpone', 'cocoa'],
        allergens: ['gluten', 'dairy', 'eggs']
      },
      {
        name: 'Chocolate Lava Cake',
        description: 'Warm chocolate cake with molten center, served with vanilla ice cream',
        category: 'dessert',
        price: 9.99,
        cost: 3.00,
        isVeg: true,
        isSpicy: false,
        isFeatured: true,
        preparationTime: 12,
        ingredients: ['chocolate', 'flour', 'eggs', 'ice cream'],
        allergens: ['gluten', 'dairy', 'eggs']
      },
      // Beverages
      {
        name: 'Fresh Mojito',
        description: 'Refreshing mint and lime cocktail with rum and soda',
        category: 'beverage',
        price: 9.99,
        cost: 2.00,
        isVeg: true,
        isSpicy: false,
        isFeatured: false,
        preparationTime: 5,
        ingredients: ['mint', 'lime', 'rum', 'soda'],
        allergens: []
      },
      {
        name: 'Mango Smoothie',
        description: 'Fresh mango blended with yogurt and honey',
        category: 'beverage',
        price: 6.99,
        cost: 1.50,
        isVeg: true,
        isSpicy: false,
        isFeatured: false,
        preparationTime: 5,
        ingredients: ['mango', 'yogurt', 'honey'],
        allergens: ['dairy']
      }
    ];

    const createdMenuItems = await MenuItem.insertMany(menuItems);
    console.log('Created menu items...');

    // Create Tables
    const tables = [
      { tableNumber: 1, name: 'Window Table 1', section: 'indoor', capacity: 4, status: 'available' },
      { tableNumber: 2, name: 'Window Table 2', section: 'indoor', capacity: 4, status: 'available' },
      { tableNumber: 3, name: 'Center Table 1', section: 'indoor', capacity: 6, status: 'available' },
      { tableNumber: 4, name: 'Center Table 2', section: 'indoor', capacity: 6, status: 'available' },
      { tableNumber: 5, name: 'Booth 1', section: 'indoor', capacity: 4, status: 'available', features: ['booth'] },
      { tableNumber: 6, name: 'Booth 2', section: 'indoor', capacity: 6, status: 'available', features: ['booth'] },
      { tableNumber: 7, name: 'Patio Table 1', section: 'patio', capacity: 4, status: 'available' },
      { tableNumber: 8, name: 'Patio Table 2', section: 'patio', capacity: 4, status: 'available' },
      { tableNumber: 9, name: 'VIP Table', section: 'vip', capacity: 8, status: 'available', features: ['private', 'wheelchair-accessible'] },
      { tableNumber: 10, name: 'Bar Counter 1', section: 'bar', capacity: 2, status: 'available' },
      { tableNumber: 11, name: 'Bar Counter 2', section: 'bar', capacity: 2, status: 'available' },
      { tableNumber: 12, name: 'Outdoor Large', section: 'outdoor', capacity: 10, status: 'available' }
    ];

    await Table.insertMany(tables);
    console.log('Created tables...');

    // Create Suppliers
    const suppliers = [
      {
        name: 'Fresh Foods Distributors',
        contactPerson: 'Mike Johnson',
        email: 'mike@freshfoods.com',
        phone: '+1 (555) 100-0001',
        address: { street: '100 Food Lane', city: 'New York', state: 'NY', zipCode: '10001' },
        leadTimeDays: 2,
        rating: 4.5
      },
      {
        name: 'Premium Meats Co',
        contactPerson: 'Sarah Williams',
        email: 'sarah@premiummeats.com',
        phone: '+1 (555) 100-0002',
        address: { street: '200 Meat Market St', city: 'New York', state: 'NY', zipCode: '10002' },
        leadTimeDays: 1,
        rating: 4.8
      },
      {
        name: 'Ocean Fresh Seafood',
        contactPerson: 'David Chen',
        email: 'david@oceanfresh.com',
        phone: '+1 (555) 100-0003',
        address: { street: '300 Harbor Blvd', city: 'New York', state: 'NY', zipCode: '10003' },
        leadTimeDays: 1,
        rating: 4.7
      }
    ];

    const createdSuppliers = await Supplier.insertMany(suppliers);
    console.log('Created suppliers...');

    // Create Inventory Items
    const inventoryItems = [
      { name: 'Chicken Breast', sku: 'MEAT-001', category: 'meat', unit: 'kg', currentStock: 25, minimumStock: 10, costPerUnit: 8.50, supplier: createdSuppliers[1]._id, supplierName: 'Premium Meats Co' },
      { name: 'Ribeye Steak', sku: 'MEAT-002', category: 'meat', unit: 'kg', currentStock: 15, minimumStock: 5, costPerUnit: 25.00, supplier: createdSuppliers[1]._id, supplierName: 'Premium Meats Co' },
      { name: 'Atlantic Salmon', sku: 'FISH-001', category: 'meat', unit: 'kg', currentStock: 12, minimumStock: 5, costPerUnit: 18.00, supplier: createdSuppliers[2]._id, supplierName: 'Ocean Fresh Seafood' },
      { name: 'Calamari', sku: 'FISH-002', category: 'meat', unit: 'kg', currentStock: 8, minimumStock: 5, costPerUnit: 15.00, supplier: createdSuppliers[2]._id, supplierName: 'Ocean Fresh Seafood' },
      { name: 'Arborio Rice', sku: 'DRY-001', category: 'dry-goods', unit: 'kg', currentStock: 20, minimumStock: 10, costPerUnit: 4.50, supplier: createdSuppliers[0]._id, supplierName: 'Fresh Foods Distributors' },
      { name: 'Parmesan Cheese', sku: 'DAIRY-001', category: 'dairy', unit: 'kg', currentStock: 5, minimumStock: 3, costPerUnit: 22.00, supplier: createdSuppliers[0]._id, supplierName: 'Fresh Foods Distributors' },
      { name: 'Fresh Tomatoes', sku: 'PROD-001', category: 'produce', unit: 'kg', currentStock: 15, minimumStock: 10, costPerUnit: 3.50, supplier: createdSuppliers[0]._id, supplierName: 'Fresh Foods Distributors' },
      { name: 'Fresh Mushrooms', sku: 'PROD-002', category: 'produce', unit: 'kg', currentStock: 8, minimumStock: 5, costPerUnit: 8.00, supplier: createdSuppliers[0]._id, supplierName: 'Fresh Foods Distributors' },
      { name: 'Heavy Cream', sku: 'DAIRY-002', category: 'dairy', unit: 'l', currentStock: 10, minimumStock: 5, costPerUnit: 4.00, supplier: createdSuppliers[0]._id, supplierName: 'Fresh Foods Distributors' },
      { name: 'Chocolate', sku: 'DRY-002', category: 'dry-goods', unit: 'kg', currentStock: 6, minimumStock: 3, costPerUnit: 12.00, supplier: createdSuppliers[0]._id, supplierName: 'Fresh Foods Distributors' }
    ];

    await InventoryItem.insertMany(inventoryItems);
    console.log('Created inventory items...');

    // ── Auto-index menu into ChromaDB ─────────────────────────────────────────
    console.log('\n🔄 Attempting to index menu into ChromaDB...');
    const chromaReady = await initChroma();
    const geminiReady = initGemini();

    if (chromaReady && geminiReady) {
      let indexed = 0;
      let failed = 0;
      for (const item of createdMenuItems) {
        try {
          const docText = buildDocText(item);
          const embedding = await getEmbedding(docText);
          await upsertMenuItem(item, embedding);
          indexed++;
          process.stdout.write(`   Indexed ${indexed}/${createdMenuItems.length}: ${item.name}\r`);
          await new Promise(r => setTimeout(r, 250)); // respect rate limits
        } catch (err) {
          failed++;
          console.warn(`\n   ⚠️  Failed to index "${item.name}": ${err.message}`);
        }
      }
      const total = await getCount();
      console.log(`\n✅ ChromaDB indexing done — ${indexed} indexed, ${failed} failed (${total} total in collection)`);
    } else {
      console.log('⚠️  ChromaDB or Gemini not available — skipping auto-index.');
      console.log('   To index later: POST /api/ai/index-menu (admin token required)');
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\nLogin credentials:');
    console.log('  Admin:    admin@foodhub.com    / admin123');
    console.log('  Manager:  manager@foodhub.com  / manager123');
    console.log('  Staff:    staff@foodhub.com    / staff123');
    console.log('  Customer: customer@example.com / customer123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
