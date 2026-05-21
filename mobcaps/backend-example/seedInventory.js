/**
 * Seed Inventory Script
 * Populates the inventory collection with detailed gown data
 * Matches web version structure (ProductDetail model)
 */

const mongoose = require('mongoose');
require('dotenv').config();

const inventorySchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  color: { type: String },
  size: [String],
  price: { type: Number, required: true },
  branch: { type: String, default: 'Main Branch' },
  status: { type: String, default: 'available' },
  lastRented: { type: Date },
  description: { type: String },
  image: { type: String },
  rating: { type: Number, default: 4.5 },
  stock: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Inventory = mongoose.model('Inventory', inventorySchema, 'product_details');

const gowns = [
  {
    sku: 'G001',
    name: 'Midnight Elegance',
    category: 'Evening Gown',
    color: 'Navy Blue',
    size: ['S', 'M', 'L'],
    price: 3500,
    branch: 'Taguig Main',
    status: 'available',
    lastRented: null,
    description: 'A stunning navy blue evening gown with an elegant silhouette, perfect for formal occasions and galas. Features intricate beading along the neckline and a flowing skirt that moves gracefully.',
    image: 'https://images.unsplash.com/photo-1763336016192-c7b62602e993?w=800',
    rating: 4.8,
    stock: 1
  },
  {
    sku: 'G002',
    name: 'Pearl Romance',
    category: 'Wedding Dress',
    color: 'Ivory',
    size: ['XS', 'S', 'M'],
    price: 8000,
    branch: 'BGC Branch',
    status: 'available',
    lastRented: null,
    description: 'A breathtaking ivory wedding dress crafted for the modern bride. Features delicate lace overlays, a sweetheart neckline, and a cathedral-length train for a timeless, romantic look.',
    image: 'https://images.unsplash.com/photo-1631386749697-ca71a14f89c9?w=800',
    rating: 5.0,
    stock: 1
  },
  {
    sku: 'G003',
    name: 'Rose Garden',
    category: 'Cocktail Dress',
    color: 'Blush Pink',
    size: ['M', 'L'],
    price: 2800,
    branch: 'Taguig Main',
    status: 'rented',
    lastRented: new Date('2026-02-01'),
    description: 'A delightful blush pink cocktail dress with floral-inspired details and a flattering A-line cut. Ideal for semi-formal events, garden parties, and evening celebrations.',
    image: 'https://images.unsplash.com/photo-1765229279330-7f906ef241a5?w=800',
    rating: 4.5,
    stock: 1
  },
  {
    sku: 'G004',
    name: 'Golden Hour',
    category: 'Evening Gown',
    color: 'Gold',
    size: ['S', 'M', 'L', 'XL'],
    price: 4200,
    branch: 'Makati Branch',
    status: 'available',
    lastRented: null,
    description: 'A radiant gold evening gown that catches the light beautifully, making every entrance unforgettable. Featuring a plunging neckline, ruched bodice, and a dramatic floor-length silhouette.',
    image: 'https://images.unsplash.com/photo-1675294292093-5f6f5bb8836f?w=800',
    rating: 4.9,
    stock: 1
  },
  {
    sku: 'G005',
    name: 'Crimson Dreams',
    category: 'Ball Gown',
    color: 'Deep Red',
    size: ['M', 'L'],
    price: 5500,
    branch: 'Taguig Main',
    status: 'available',
    lastRented: null,
    description: 'A dramatic deep red ball gown with a full skirt and rich velvet texture, perfect for grand occasions and formal balls. The structured bodice and voluminous skirt create a truly regal appearance.',
    image: 'https://images.unsplash.com/photo-1763336016192-c7b62602e993?w=800',
    rating: 4.7,
    stock: 1
  },
  {
    sku: 'G006',
    name: 'Silver Serenade',
    category: 'Evening Gown',
    color: 'Silver',
    size: ['S', 'M'],
    price: 3800,
    branch: 'BGC Branch',
    status: 'reserved',
    lastRented: null,
    description: 'An enchanting silver evening gown with subtle shimmer that complements any formal setting. The bias-cut design hugs the body beautifully while the metallic fabric creates a luminous, ethereal effect.',
    image: 'https://images.unsplash.com/photo-1631386749697-ca71a14f89c9?w=800',
    rating: 4.6,
    stock: 1
  }
];

async function seedInventory() {
  try {
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    let inserted = 0;
    let skipped = 0;

    for (const gown of gowns) {
      const existing = await Inventory.findOne({ sku: gown.sku });
      if (existing) {
        console.log(`  ⏭️  Skipped (already exists): ${gown.sku} - ${gown.name}`);
        skipped++;
      } else {
        await Inventory.create(gown);
        console.log(`  ✅ Inserted: ${gown.sku} - ${gown.name}`);
        inserted++;
      }
    }

    console.log(`\n📊 Done. ${inserted} gown(s) inserted, ${skipped} skipped.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seedInventory();
