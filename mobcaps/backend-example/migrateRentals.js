/**
 * Migration Script: Move documents from 'rentals' → 'rental_details'
 * 
 * Usage: node migrateRentals.js
 * 
 * Safe to run multiple times — skips duplicates by checking _id.
 */
const { MongoClient } = require('mongodb');

// Use the same connection string as server.js
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mobilefabriq:mobilefabriq@cluster0.ypnfkvo.mongodb.net/FabriQ?retryWrites=true&w=majority&appName=Cluster0';

async function migrate() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db('FabriQ');

    const source = db.collection('rentals');
    const target = db.collection('rental_details');

    const sourceCount = await source.countDocuments();
    console.log(`Found ${sourceCount} document(s) in 'rentals' collection.`);

    if (sourceCount === 0) {
      console.log('Nothing to migrate.');
      return;
    }

    const docs = await source.find({}).toArray();
    let inserted = 0;
    let skipped = 0;

    for (const doc of docs) {
      const exists = await target.findOne({ _id: doc._id });
      if (exists) {
        skipped++;
      } else {
        await target.insertOne(doc);
        inserted++;
      }
    }

    console.log(`Migration complete: ${inserted} inserted, ${skipped} skipped (already existed).`);
    console.log(`\nYou can now optionally drop the old 'rentals' collection:`);
    console.log(`  db.rentals.drop()`);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

migrate();
