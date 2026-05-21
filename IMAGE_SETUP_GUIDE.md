# Image Setup Guide for Gowns

## Problem Fixed ✅
Previously, the app was trying to load placeholder images from `via.placeholder.com`, which requires internet and fails with `ERR_CONNECTION_CLOSED`.

**New Solution:** Color-coded placeholders based on gown color while you set up real images.

---

## Option 1: Use Cloud Storage (Recommended) ☁️

### Setup with Cloudinary or Firebase Storage:

1. **Upload gown images** to Cloudinary or Firebase Storage
2. **Get the public URL** for each image
3. **Update database records** with the image URL

### Example:
```javascript
// Update inventory item in MongoDB
{
  "_id": "123abc",
  "name": "Midnight Elegance",
  "color": "Black",
  "image": "https://res.cloudinary.com/your-cloud/image/upload/v123/midnight-elegance.jpg",
  ...other fields
}
```

---

## Option 2: Store Images Locally on Backend 💾

### Setup:

1. **Create uploads folder** in your backend:
   ```bash
   mkdir backend/uploads
   mkdir backend/uploads/gowns
   ```

2. **Update backend server.js** to serve static files:
   ```javascript
   // Add to server.js below other middleware
   app.use('/uploads', express.static('uploads'));
   ```

3. **Add file upload endpoint** (Node/Multer example):
   ```javascript
   const multer = require('multer');
   
   const storage = multer.diskStorage({
     destination: (req, file, cb) => {
       cb(null, 'uploads/gowns/');
     },
     filename: (req, file, cb) => {
       cb(null, Date.now() + '-' + file.originalname);
     }
   });
   
   const upload = multer({ storage });
   
   app.post('/api/inventory/:id/upload-image', upload.single('image'), async (req, res) => {
     if (!req.file) {
       return res.status(400).json({ error: 'No file provided' });
     }
     
     const imageUrl = `/uploads/gowns/${req.file.filename}`;
     
     await Inventory.findByIdAndUpdate(req.params.id, { 
       image: imageUrl 
     });
     
     res.json({ 
       success: true, 
       imageUrl: imageUrl 
     });
   });
   ```

4. **Update inventory records** in MongoDB:
   ```javascript
   {
     "_id": "123abc",
     "name": "Midnight Elegance",
     "image": "/uploads/gowns/1704067200000-midnight.jpg",
     ...
   }
   ```

5. **When running locally**, images will be at:
   ```
   http://192.168.1.6:5000/uploads/gowns/filename.jpg
   ```

---

## Option 3: Quick Fix - Batch Update Sample Data

Add sample images to your test database:

```javascript
// Add this to your backend seeding script
const sampleGowns = [
  {
    name: "Midnight Elegance",
    color: "Black",
    image: "https://images.unsplash.com/photo-1566356912260-e382f2030f1d?w=400&h=500",
  },
  {
    name: "Pearl Romance", 
    color: "White",
    image: "https://images.unsplash.com/photo-1515159265163-e8a41622a74e?w=400&h=500",
  },
  {
    name: "Golden Hour",
    color: "Gold",
    image: "https://images.unsplash.com/photo-1585145732889-cf9dfc6a7f8a?w=400&h=500",
  },
];
```

---

## Current Behavior 🎨

### When image URL is missing:
- **Grid View**: Displays solid color box with gown color name
- **Detail View**: Shows full-screen color with gown name
- **Color Palette**:
  - Black → Dark gray
  - White → Light gray
  - Gold/Champagne → Golden yellow
  - Blue → Sky blue
  - Red → Coral red
  - Pink → Magenta
  - Purple → Deep purple
  - Emerald/Green → Teal
  - Silver → Steel gray

---

## Testing

1. **Without Images** (Current): Placeholders show nicely
2. **With Images**: Simply update database `image` field with valid URL
3. **App reloads**: Images appear automatically

---

## Next Steps

Choose one option above and implement:
- ✅ Option 1 is fastest (use Unsplash/Pixabay URLs as temporary)
- ✅ Option 2 is most scalable (local backend storage)
- ✅ Option 3 works immediately for testing

Once images are stored with valid URLs in the database, they'll display automatically!
