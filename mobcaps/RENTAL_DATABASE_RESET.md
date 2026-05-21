# Rental Module Database Reset Guide

## Overview
This guide provides instructions to reset the rental-related database data to prepare for a clean rental implementation.

## Prerequisites
- MongoDB running locally or MongoDB Atlas connection
- MongoDB shell (mongo/mongosh) or MongoDB Compass

## Clear Rental Data

### Option 1: Using MongoDB Shell (mongosh)

```bash
# Connect to your MongoDB instance
mongosh

# Select the database
use mobcaps

# Clear all rental records
db.rentals.deleteMany({})

# Clear all custom orders (if needed)
db.customorders.deleteMany({})

# Verify the data is cleared
db.rentals.countDocuments({})
db.customorders.countDocuments({})
```

### Option 2: Using MongoDB Compass

1. Open MongoDB Compass
2. Connect to your MongoDB instance
3. Navigate to the `mobcaps` database
4. In the `rentals` collection, select all documents and delete them
5. (Optional) Repeat for `customorders` collection if needed

### Option 3: Using Backend API (Recommended for Testing)

You can expose a debug endpoint in your backend to clear rentals:

```javascript
// Add this to backend-example/server.js
app.delete('/api/debug/clear-rentals', async (req, res) => {
  try {
    const result = await Rental.deleteMany({});
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

Then call via curl:
```bash
curl -X DELETE http://localhost:5000/api/debug/clear-rentals
```

## Current Collection Dress Status

The collection now has 4 dresses:

1. **Midnight Elegance** (Evening Gown) - `status: 'available'`
2. **Pearl Romance** (Wedding Dress) - `status: 'available'`
3. **Rose Garden** (Cocktail Dress) - `status: 'available'` (Was 'rented', now available)
4. **Golden Hour** (Evening Gown) - `status: 'available'`

All dresses are now available for rent.

## Rental Status Flow

- **New Rental**: `status: 'pending'` → Displayed as **"Rented"** in UI
- **Never shown in Collection**: Dresses with `status: 'rented'` are filtered out from the Collection page
- **Availability**: Only `status: 'available'` dresses appear in Collection

## Verification

After reset, verify:

1. **MongoDB** - Check rentals collection is empty:
   ```javascript
   db.rentals.countDocuments({})  // Should return: 0
   ```

2. **Collection Page** - All 4 dresses should appear (none filtered out)

3. **Rentals Page** - "My Rentals" should show "No rentals yet"

## Re-adding Sample Data (Optional)

To re-add sample rentals for testing:

```javascript
db.rentals.insertOne({
  userEmail: "test@example.com",
  gownName: "Midnight Elegance",
  startDate: "2026-02-15",
  endDate: "2026-02-17",
  status: "pending",
  totalPrice: 7000,
  downpayment: 1500,
  branch: "Taguig Main",
  createdAt: new Date()
})
```

## Notes

- Resetting the database will remove all user rental history
- Only do this when you want a complete fresh start
- User accounts and appointments are NOT affected by this reset
- The mock gown data in Collection.jsx is not stored in the database
