/**
 * MongoDB Backend Server
 * Node.js + Express API
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3456;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



app.get('/proxy', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl || typeof targetUrl !== 'string') {
      return res.status(400).json({ error: 'Missing url query parameter' });
    }

    const response = await fetch(targetUrl);
    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch model: ${response.statusText}`);
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', response.headers.get('content-type') || 'model/gltf-binary');

    const arrayBuffer = await response.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/viewer', (req, res) => {
  const glbUrl = req.query.url || '';
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:100%; height:100%; background:#111; overflow:hidden; }
    @keyframes spin { to { transform:rotate(360deg); } }
  </style>
</head>
<body>

  <div id="loading" style="position:fixed;inset:0;z-index:99;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#111;gap:16px;">
    <div style="width:52px;height:52px;border:3px solid rgba(212,175,55,0.15);border-top-color:#D4AF37;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
    <div style="color:#D4AF37;font-size:14px;font-family:Georgia,serif;">Loading 3D Model</div>
    <div style="color:rgba(255,255,255,0.35);font-size:11px;">Drag to rotate · Pinch to zoom</div>
  </div>

  <div id="debug" style="position:fixed;bottom:0;left:0;right:0;z-index:999;background:rgba(0,0,0,0.85);color:#D4AF37;font-size:11px;font-family:monospace;padding:8px 12px;">Initializing...</div>

  <model-viewer
    id="mv"
    src="${glbUrl}"
    alt="3D Gown"
    auto-rotate
    camera-controls
    rotation-per-second="12deg"
    shadow-intensity="1.5"
    exposure="1.3"
    environment-image="neutral"
    interaction-prompt="none"
    style="width:100%;height:100%;background:#111;opacity:0;transition:opacity 0.5s;"
  ></model-viewer>

  <script src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>

  <script>
    var mv = document.getElementById('mv');
    var loading = document.getElementById('loading');
    var debug = document.getElementById('debug');
    var pendingColor = null;
    var modelReady = false;

    function log(msg) { debug.textContent = msg; }

    log('Script loaded. Waiting for model...');

    window.applyColor = function(hex) {
      log('applyColor called: ' + hex);
      if (modelReady) {
        doApply(hex);
      } else {
        pendingColor = hex;
        log('Queued: ' + hex + ' (model not ready yet)');
      }
    };

    function doApply(hex) {
      try {
        var mats = mv.model && mv.model.materials;
        if (!mats || mats.length === 0) { log('No materials!'); return; }

        var r = parseInt(hex.slice(1,3), 16) / 255;
        var g = parseInt(hex.slice(3,5), 16) / 255;
        var b = parseInt(hex.slice(5,7), 16) / 255;

        function lin(c) {
          return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        }

        var lr = lin(r);
        var lg = lin(g);
        var lb = lin(b);

        // Keywords that suggest BODY/SKIN materials — skip these
        var bodyKeywords = [
          'skin', 'body', 'neck', 'head', 'face', 'hand',
          'arm', 'flesh', 'hair', 'eye', 'teeth', 'mouth',
          'person', 'human', 'figure', 'avatar'
        ];

        // Keywords that suggest GARMENT materials — color these
        var garmentKeywords = [
          'dress', 'gown', 'fabric', 'cloth', 'material',
          'garment', 'skirt', 'bodice', 'sleeve', 'lace',
          'satin', 'silk', 'tulle', 'outfit', 'costume',
          'wear', 'textile', 'layer'
        ];

        var coloredCount = 0;

        for (var i = 0; i < mats.length; i++) {
          var mat = mats[i];
          var matName = (mat.name || '').toLowerCase();

          // Skip if name matches body keywords
          var isBody = bodyKeywords.some(function(kw) {
            return matName.indexOf(kw) !== -1;
          });
          if (isBody) {
            log('Skipped body material: ' + mat.name);
            continue;
          }

          // Check if explicitly a garment material
          var isGarment = garmentKeywords.some(function(kw) {
            return matName.indexOf(kw) !== -1;
          });

          // Get current base color to check if it looks like skin
          var pbr = mat.pbrMetallicRoughness;
          var currentColor = pbr.baseColorFactor;

          // Skin tone detection on material:
          // Skin materials have high R, moderate G, lower B
          var isSkinColored = false;
          if (currentColor && currentColor.length >= 3) {
            var cr = currentColor[0]; // already linear
            var cg = currentColor[1];
            var cb = currentColor[2];
            // Skin: R > G > B, and R-B difference significant
            isSkinColored = (
              cr > cg &&
              cr > cb &&
              (cr - cb) > 0.08 &&
              cr > 0.12 &&
              cr < 0.95 && // not pure white
              cg > 0.05
            );
          }

          // Skip if it looks like skin AND has no garment keyword
          if (isSkinColored && !isGarment) {
            log('Skipped skin-colored material: ' + mat.name);
            continue;
          }

          // Apply color — blend with slight fabric texture preservation
          // Instead of flat color, mix 85% chosen color + 15% original
          // This keeps some material depth/texture visible
          var blendFactor = 0.85;
          var origFactor = 1 - blendFactor;

          var finalR = lr * blendFactor + (currentColor ? currentColor[0] * origFactor : 0);
          var finalG = lg * blendFactor + (currentColor ? currentColor[1] * origFactor : 0);
          var finalB = lb * blendFactor + (currentColor ? currentColor[2] * origFactor : 0);

          pbr.setBaseColorFactor([finalR, finalG, finalB, 1.0]);

          // Fabric-like material properties
          pbr.setMetallicFactor(0.0);    // fabric is not metallic
          pbr.setRoughnessFactor(0.88);  // fabric is slightly rough

          coloredCount++;
        }

        log('Done! ' + hex + ' on ' + coloredCount + '/' + mats.length + ' materials');
      } catch(e) {
        log('Error: ' + e.message);
      }
    }

    mv.addEventListener('load', function() {
      modelReady = true;
      loading.style.display = 'none';
      mv.style.opacity = '1';
      var c = mv.model && mv.model.materials ? mv.model.materials.length : 0;
      log('Model ready! ' + c + ' materials');
      if (pendingColor) {
        setTimeout(function(){ doApply(pendingColor); pendingColor=null; }, 300);
      }
    });

    mv.addEventListener('error', function(e) {
      loading.style.display = 'none';
      mv.style.opacity = '1';
      log('Model error!');
    });

    setTimeout(function(){
      loading.style.display='none';
      mv.style.opacity='1';
    }, 20000);
  </script>

</body>
</html>`);
});

/* =======================
   MongoDB Connection
======================= */
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'FabriQ';

mongoose
  .connect(MONGODB_URI, { dbName: MONGODB_DB_NAME })
  .then(() => {
    console.log('📊 MongoDB connected:', mongoose.connection.name);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1); // Exit on connection failure
  });

/* =======================
   User Schema (customer_accounts collection)
======================= */
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: { type: String, required: true }, // bcrypt hash
  phoneNumber: String,
  preferredBranch: String,
  address: String,
  status: { type: String, default: 'pending' },
  signupVerificationCodeHash: { type: String, default: null },
  signupVerificationExpiresAt: { type: Date, default: null },
  signupVerificationSentAt: { type: Date, default: null },
  resetPasswordCodeHash: { type: String, default: null },
  resetPasswordCodeExpiresAt: { type: Date, default: null },
  resetPasswordCodeSentAt: { type: Date, default: null },
  tokenVersion: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  // Only hash password if it is not already a bcrypt hash
  if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$') && !this.password.startsWith('$2y$')) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  this.updatedAt = new Date();
  next();
});

const User = mongoose.model('User', userSchema, 'customer_accounts');
const CustomerAccount = User;

const validatePassword = (password) => {
  if (!password || password.trim() === '') {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'MINIMUM 8 CHARACTERS REQUIRED';
  }
  if (!/[A-Z]/.test(password)) {
    return 'MUST INCLUDE UPPERCASE LETTER';
  }
  if (!/[a-z]/.test(password)) {
    return 'MUST INCLUDE LOWERCASE LETTER';
  }
  if (!/[0-9]/.test(password)) {
    return 'MUST INCLUDE A NUMBER';
  }
  if (!/[!@#$%^&*]/.test(password)) {
    return 'MUST INCLUDE A SPECIAL CHARACTER';
  }
  return '';
};

/* =======================
   Rental Schema
======================= */
const rentalSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, lowercase: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: false },
  customerId: { type: mongoose.Schema.Types.ObjectId, required: false },
  customerName: { type: String },
  customerEmail: { type: String, lowercase: true },
  contactNumber: { type: String },
  email: { type: String, lowercase: true },
  productId: { type: mongoose.Schema.Types.ObjectId, required: false },
  gownName: { type: String, required: true },
  sku: { type: String },
  startDate: { type: String, required: true }, // YYYY-MM-DD
  endDate: { type: String, required: true },
  eventType: { type: String },
  status: { type: String, default: 'pending' },
  totalPrice: { type: Number, required: true },
  downpayment: { type: Number, required: true },
  branch: { type: String },
  referenceId: { type: String },
  paymentReceiptUrl: { type: String },
  paymentSubmittedAt: { type: Date },
  paymentAmountPaid: { type: Number },
  paymentReferenceNumber: { type: String },
  paymentReceiptFilename: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const Rental = mongoose.model('Rental', rentalSchema, 'rental_details');

/* =======================
   Custom Order Schema
======================= */
const customOrderSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, lowercase: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: false },
  gownType: { type: String, required: true },
  customerName: { type: String, required: true },
  email: { type: String, required: true },
  contact: { type: String, required: true },
  description: { type: String },
  budget: { type: String },
  // Optional scheduling fields for bespoke/custom-order bookings
  appointmentDate: { type: String }, // YYYY-MM-DD
  appointmentTime: { type: String },
  status: { type: String, default: 'inquiry' },
  createdAt: { type: Date, default: Date.now },
});

/* =======================
   Appointment Schema
======================= */
const appointmentSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, lowercase: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: false },
  appointmentType: { type: String, required: true },
  customerName: { type: String, required: true },
  email: { type: String, required: true },
  contact: { type: String, required: true },
  appointmentDate: { type: String, required: true },
  appointmentTime: { type: String, required: true },
  branch: { type: String },
  notes: { type: String },
  status: { type: String, default: 'scheduled' },
  createdAt: { type: Date, default: Date.now },
});

// Create compound unique index for appointment slots to prevent double-booking
appointmentSchema.index(
  { appointmentDate: 1, appointmentTime: 1, appointmentType: 1, branch: 1 },
  { unique: true, name: 'appointment_slot_unique' }
);

// For custom orders, only enforce uniqueness when appointmentDate/appointmentTime exist
customOrderSchema.index(
  { appointmentDate: 1, appointmentTime: 1, branch: 1 },
  {
    unique: true,
    partialFilterExpression: { appointmentDate: { $exists: true }, appointmentTime: { $exists: true } },
    name: 'customorder_slot_unique',
  }
);

const CustomOrder = mongoose.model('CustomOrder', customOrderSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);

/* =======================
   Inventory Schema
======================= */
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
  image: { type: String }, // Cloud storage image URL
  rating: { type: Number, default: 4.5 },
  stock: { type: Number, default: 1 },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Inventory = mongoose.model('Inventory', inventorySchema, 'product_details');
const ProductDetail = Inventory;

/* =======================
   Skin Analysis Schema
======================= */
const skinAnalysisSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerAccount',
    required: true,
  },
  customerName: { type: String, required: true },
  email: { type: String, required: true },
  skinTone: {
    type: String,
    enum: ['fair', 'light', 'medium', 'tan', 'deep'],
    required: true,
  },
  undertone: {
    type: String,
    enum: ['warm', 'cool', 'neutral'],
    required: true,
  },
  skinHex: { type: String, required: true },
  skinRgb: {
    r: { type: Number },
    g: { type: Number },
    b: { type: Number },
  },
  recommendedColors: [{ type: String }],
  recommendedGownIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductDetail',
  }],
  appliedToOrder: { type: Boolean, default: false },
  selectedColor: { type: String, default: null },
  insightText: { type: String, default: null },
  branch: { type: String, default: null },
  scannedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

skinAnalysisSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const SkinAnalysis = mongoose.model('SkinAnalysis', skinAnalysisSchema, 'color_anal');


function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header.' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Attach user info to request
    req.user = { id: payload.id, email: payload.email, role: payload.role || 'customer' };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// Ensure indexes exist (createIndexes is safe and idempotent)
(async () => {
  try {
    await Promise.all([
      Appointment.createIndexes(),
      CustomOrder.createIndexes(),
    ]);
    console.log('✅ Appointment and CustomOrder indexes ensured');
  } catch (err) {
    console.error('❌ Error creating indexes:', err);
  }
})();

/* =======================
   Image URL Normalizer
======================= */

/**
 * Converts any image value into a fully qualified absolute URL.
 * Handles:
 *   - null / undefined / empty  → null
 *   - Already absolute (https://…) → passthrough
 *   - localhost URLs → rewritten to the request's own host
 *   - Relative paths (/uploads/…) → prefixed with server origin
 */
/**
 * Helper to build absolute URL for files
 * Accepts request + file path
 */
function buildFileUrl(req, filePath) {
  if (!filePath) return null;
  const protocol = req.protocol;
  const host = req.get('host');
  const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
  return `${protocol}://${host}/${cleanPath}`;
}

/**
 * Normalizes an image URL to be fully qualified.
 * Handles:
 *   - External URLs (e.g. Unsplash) → returned as-is
 *   - Relative paths (/uploads/…) → prefixed with server origin using buildFileUrl
 */
function normalizeImageUrl(image, req) {
  if (!image || typeof image !== 'string' || !image.trim()) return null;

  const trimmed = image.trim();

  // Already a fully-qualified URL
  if (/^https?:\/\//i.test(trimmed)) {
    // /uploads/ URLs may have been saved with a stale IP — always rewrite
    // to the current server so the client reaches the right host.
    if (/\/uploads\//i.test(trimmed)) {
      const urlPath = trimmed.replace(/^https?:\/\/[^/]+/, '');
      return buildFileUrl(req, urlPath);
    }
    // localhost or 127.0.0.1 → rewrite to current server origin
    if (/localhost|127\.0\.0\.1/i.test(trimmed)) {
      const urlPath = trimmed.replace(/^https?:\/\/[^/]+/, '');
      return buildFileUrl(req, urlPath);
    }
    // External URL (e.g. Unsplash) — return as-is
    return trimmed;
  }

  // Relative path (e.g. /uploads/photo.jpg) or bare filename
  const pathPrefix = trimmed.startsWith('/uploads/') ? '' : (trimmed.startsWith('/') ? '' : '/uploads/');
  return buildFileUrl(req, `${pathPrefix}${trimmed}`);
}

/* =======================
   Routes
======================= */

/**
 * Debug Endpoints - Check what's in the database
 */

// Debug: Get ALL rentals (no filter)
app.get('/api/debug/all-rentals', async (req, res) => {
  try {
    const rentals = await Rental.find().sort({ createdAt: -1 });
    res.json({ 
      count: rentals.length, 
      rentals: rentals.map(r => ({
        id: r._id,
        userEmail: r.userEmail,
        gownName: r.gownName,
        startDate: r.startDate,
        endDate: r.endDate,
        status: r.status,
        totalPrice: r.totalPrice,
        referenceId: r.referenceId,
        paymentReceiptUrl: normalizeImageUrl(r.paymentReceiptUrl, req),
        createdAt: r.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Debug: Get ALL appointments (no filter)
app.get('/api/debug/all-appointments', async (req, res) => {
  try {
    const apts = await Appointment.find().sort({ createdAt: -1 });
    res.json({ 
      count: apts.length, 
      appointments: apts.map(a => ({
        id: a._id,
        userEmail: a.userEmail,
        appointmentType: a.appointmentType,
        appointmentDate: a.appointmentDate,
        appointmentTime: a.appointmentTime,
        status: a.status,
        createdAt: a.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Debug: Get ALL custom orders (no filter)
app.get('/api/debug/all-custom-orders', async (req, res) => {
  try {
    const orders = await CustomOrder.find().sort({ createdAt: -1 });
    res.json({ 
      count: orders.length, 
      customOrders: orders.map(o => ({
        id: o._id,
        userEmail: o.userEmail,
        gownType: o.gownType,
        customerName: o.customerName,
        status: o.status,
        createdAt: o.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Debug: Check what emails are in database
app.get('/api/debug/emails', async (req, res) => {
  try {
    const rentalEmails = await Rental.distinct('userEmail');
    const aptEmails = await Appointment.distinct('userEmail');
    const orderEmails = await CustomOrder.distinct('userEmail');
    
    res.json({ 
      totalEmails: {
        rentals: rentalEmails.length,
        appointments: aptEmails.length,
        customOrders: orderEmails.length
      },
      rentalEmails,
      appointmentEmails: aptEmails,
      customOrderEmails: orderEmails
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Debug: Test query with specific email (test all variations)
app.get('/api/debug/rentals/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const emailLowercase = email.toLowerCase();
    const emailDecoded = decodeURIComponent(email);
    const emailDecodedLowercase = decodeURIComponent(email).toLowerCase();
    
    const results = {
      queryAttempts: [
        { query: `"${email}"`, count: await Rental.countDocuments({ userEmail: email }) },
        { query: `"${emailLowercase}"`, count: await Rental.countDocuments({ userEmail: emailLowercase }) },
        { query: `"${emailDecoded}"`, count: await Rental.countDocuments({ userEmail: emailDecoded }) },
        { query: `"${emailDecodedLowercase}"`, count: await Rental.countDocuments({ userEmail: emailDecodedLowercase }) },
      ],
      sampleRentalsInDb: await Rental.find().limit(5).select('userEmail gownName'),
      successfulQuery: await Rental.find({ userEmail: emailDecodedLowercase })
    };
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Health Check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'MongoDB API is running',
  });
});

/**
 * Get user by email (no password)
 */
app.get('/api/users/email/:email', async (req, res) => {
  try {
    const user = await User.findOne({
      email: req.params.email.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user.toObject();
    res.json({ user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create User (Signup)
 * Password is already hashed from client
 */
app.post('/api/users', async (req, res) => {
  try {
    console.log('SIGNUP REQUEST:', req.body);
    const { firstName, lastName, email, password, phoneNumber, contactNumber, signupVerificationCode } = req.body;

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const user = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phoneNumber: phoneNumber || contactNumber || '',
      password, // plain password will be hashed by pre('save')
      status: 'pending_verification',
    });

    const code = String(signupVerificationCode || generateSixDigitCode()).trim();
    console.log('VERIFICATION CODE GENERATED');
    const codeHash = hashCode(code);
    user.signupVerificationCodeHash = codeHash;
    user.signupVerificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.signupVerificationSentAt = new Date();

    await user.save();
    console.log('Sending verification email to:', user.email);
    console.log('Verification code (DEV ONLY):', code);
    await sendEmail({
      to: user.email,
      subject: 'Verify your account',
      text: `Your verification code is: ${code}`,
    });
    console.log('EMAIL SENT SUCCESS');

    const { password: _, ...userWithoutPassword } = user.toObject();
    res.status(201).json({
      success: true,
      requiresVerification: true,
      email: user.email,
      message: 'Verification code sent to email.',
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verify Signup Code
 */
app.post('/api/auth/verify-signup', async (req, res) => {
  try {
    const { email, code } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    const inputCode = String(code || '').trim();
    if (!normalizedEmail || !inputCode) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.signupVerificationCodeHash || !user.signupVerificationExpiresAt) {
      return res.status(400).json({ error: 'No active signup verification code' });
    }
    if (new Date(user.signupVerificationExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Verification code expired' });
    }

    const codeHash = hashCode(inputCode);
    if (codeHash !== user.signupVerificationCodeHash) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    user.status = 'active';
    user.signupVerificationCodeHash = null;
    user.signupVerificationExpiresAt = null;
    user.signupVerificationSentAt = null;
    await user.save();
    return res.json({ success: true, message: 'Signup verified successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Resend Signup Verification
 */
app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email, code: providedCode } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status === 'active') {
      return res.status(400).json({ error: 'Account is already verified' });
    }

    const code = String(providedCode || generateSixDigitCode()).trim();
    user.signupVerificationCodeHash = hashCode(code);
    user.signupVerificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.signupVerificationSentAt = new Date();
    await user.save();

    console.log('Sending verification email to:', user.email);
    console.log('Verification code (DEV ONLY):', code);
    await sendEmail({
      to: user.email,
      subject: 'Verify your account',
      text: `Your verification code is: ${code}`,
    });
    return res.json({ success: true, message: 'Verification code resent' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Login / Verify Credentials
 * Client sends plain password
 * Backend compares via bcrypt
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body; // password = plain password from client

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    // Use bcrypt to compare plain password with stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Please verify your email first',
      });
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role || 'customer',
        tokenVersion: Number(user.tokenVersion || 0),
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user.toObject();
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Forgot Password - Send reset code
 */
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const code = generateSixDigitCode();
    user.resetPasswordCodeHash = hashCode(code);
    user.resetPasswordCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.resetPasswordCodeSentAt = new Date();
    await user.save();

    console.log('Sending verification email to:', user.email);
    console.log('Verification code (DEV ONLY):', code);
    await sendEmail({
      to: user.email,
      subject: 'Reset your password',
      text: `Your password reset code is: ${code}`,
    });
    return res.json({ success: true, message: 'Password reset code sent' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Verify Password Reset Code
 */
app.post('/api/auth/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    const inputCode = String(code || '').trim();
    if (!normalizedEmail || !inputCode) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.resetPasswordCodeHash || !user.resetPasswordCodeExpiresAt) {
      return res.status(400).json({ error: 'No active reset code' });
    }
    if (new Date(user.resetPasswordCodeExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Reset code expired' });
    }
    if (hashCode(inputCode) !== user.resetPasswordCodeHash) {
      return res.status(400).json({ error: 'Invalid reset code' });
    }
    return res.json({ success: true, message: 'Reset code verified' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Reset Password
 * Client sends plain newPassword (and optional confirmPassword)
 * Backend updates user password via save() so bcrypt pre-save hook runs
 */
app.put('/api/users/reset-password', async (req, res) => {
  try {
    const { email, newPassword, confirmPassword, code } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const password = (newPassword || '').trim();
    const confirm = (confirmPassword || '').trim();

    // Validate inputs
    if (!normalizedEmail || !password) {
      return res.status(400).json({
        error: 'Email and new password are required',
      });
    }

    if (confirmPassword !== undefined && password !== confirm) {
      return res.status(400).json({
        error: 'Passwords do not match',
      });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({
        error: passwordError,
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.log(`[DEBUG] Reset password: user not found for ${normalizedEmail}`);
      return res.status(404).json({ error: 'User not found' });
    }

    // If a reset-code flow is active for this account, verify the submitted code.
    if (user.resetPasswordCodeHash && user.resetPasswordCodeExpiresAt) {
      if (!code) {
        return res.status(400).json({ error: 'Reset code is required' });
      }
      if (new Date(user.resetPasswordCodeExpiresAt).getTime() < Date.now()) {
        return res.status(400).json({ error: 'Reset code expired' });
      }
      const submittedCodeHash = hashCode(String(code).trim());
      if (submittedCodeHash !== user.resetPasswordCodeHash) {
        return res.status(400).json({ error: 'Invalid reset code' });
      }
    }

    console.log(`[DEBUG] Reset password: user found for ${normalizedEmail}`);
    user.password = password;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.resetPasswordCodeHash = null;
    user.resetPasswordCodeExpiresAt = null;
    user.resetPasswordCodeSentAt = null;
    await user.save();

    console.log(`[DEBUG] Password updated successfully for ${normalizedEmail}`);

    const { password: _, ...userWithoutPassword } = user.toObject();
    res.json({
      success: true,
      message: 'Password reset successfully',
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * Update User Profile
 * Updates name, email, phone, and address
 * Client provides current email to find user
 */
app.put('/api/users/:email/profile', async (req, res) => {
  try {
    const { name, phone, address, newEmail } = req.body;
    const currentEmail = req.params.email.toLowerCase();

    console.log(`[DEBUG] PUT /api/users/:email/profile called`);
    console.log(`  - Current Email (param): ${currentEmail}`);
    console.log(`  - Request Body:`, req.body);

    // Validate inputs
    if (!name && !phone && !address && !newEmail) {
      console.log(`  - Error: No fields provided for update`);
      return res.status(400).json({
        error: 'At least one field must be provided for update',
      });
    }

    // Find user by current email
    const user = await User.findOne({ email: currentEmail });
    if (!user) {
      console.log(`  - Error: User not found with email: ${currentEmail}`);
      return res.status(404).json({
        error: 'User not found',
      });
    }

    console.log(`  - User found: ${user.name} (${user.email})`);

    // Check if new email is already taken (if email is being changed)
    if (newEmail && newEmail.toLowerCase() !== currentEmail) {
      const existingUser = await User.findOne({ email: newEmail.toLowerCase() });
      if (existingUser) {
        console.log(`  - Error: New email already in use: ${newEmail}`);
        return res.status(400).json({
          error: 'Email already in use',
        });
      }
    }

    // Update user profile
    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.address = address || user.address;
    if (newEmail && newEmail.toLowerCase() !== currentEmail) {
      user.email = newEmail.toLowerCase();
    }

    await user.save();

    console.log(`  - Profile updated successfully`);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user.toObject();
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error(`  - Server error: ${error.message}`);
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * Change Password
 * Verifies old password using bcrypt and updates to new password (hashed with bcrypt)
 * Client sends both old and new passwords as plain text
 */
app.post('/api/users/:email/change-password', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const email = req.params.email.toLowerCase();

    // Validate inputs
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        error: 'Old password and new password are required',
      });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({
        error: 'New password must be different from old password',
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // Verify old password using bcrypt
    const isOldPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordCorrect) {
      console.log(`  - Error: Old password does not match`);
      return res.status(401).json({
        error: 'Old password is incorrect',
      });
    }

    console.log(`  - Password verified successfully`);

    // Hash new password with bcrypt and update
    user.password = await bcrypt.hash(newPassword, 10);
    user.updatedAt = new Date();
    await user.save();

    console.log(`  - Password changed successfully`);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user.toObject();
    res.json({
      success: true,
      message: 'Password changed successfully',
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error(`  - Server error: ${error.message}`);
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * Verify Old Password
 * Checks if the provided password matches the stored bcrypt hash
 * Used for real-time validation before password change
 * Client sends plain password, backend uses bcrypt to verify
 */
app.post('/api/users/:email/verify-password', async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.params.email.toLowerCase();

    console.log(`[DEBUG] POST /api/users/:email/verify-password called`);
    console.log(`  - Email (param): ${email}`);
    console.log(`  - Password (length): ${password ? password.length : 'EMPTY'}`);

    // Validate input
    if (!password) {
      console.log(`  - Error: Password not provided`);
      return res.status(400).json({
        error: 'Password is required',
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`  - Error: User not found with email: ${email}`);
      return res.status(404).json({
        error: 'User not found',
      });
    }

    console.log(`  - User found: ${user.firstName} ${user.lastName} (${user.email})`);

    // Verify password using bcrypt
    const isCorrect = await bcrypt.compare(password, user.password);
    console.log(`  - Password match: ${isCorrect}`);

    res.json({
      success: true,
      isCorrect: isCorrect,
      message: isCorrect ? 'Password is correct' : 'Password is incorrect',
    });
  } catch (error) {
    console.error(`  - Server error: ${error.message}`);
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * Get all inventory items (public endpoint)
 * Returns all items for display in the mobile app collection
 */
app.get('/api/inventory/public', async (req, res) => {
  try {
    console.log('📦 Fetching inventory items...');
    const items = await Inventory.find({ status: { $ne: 'discontinued' } }).sort({ createdAt: -1 });
    console.log(`✅ Found ${items.length} inventory items`);
    
    res.json({
      items: items.map(item => ({
        id: item._id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        color: item.color,
        size: item.size,
        price: item.price,
        branch: item.branch,
        status: item.status,
        lastRented: item.lastRented,
        description: item.description,
        image: normalizeImageUrl(item.image, req),
        rating: item.rating,
        stock: item.stock,
        deletedAt: item.deletedAt || null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    });
  } catch (error) {
    console.error('❌ Error fetching inventory:', error);
    res.status(500).json({
      error: 'Failed to fetch inventory',
      details: error.message,
    });
  }
});

/**
 * Get single inventory item by ID
 */
app.get('/api/inventory/:id', async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({
      success: true,
      item: {
        id: item._id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        color: item.color,
        size: item.size,
        price: item.price,
        branch: item.branch,
        status: item.status,
        lastRented: item.lastRented,
        description: item.description,
        image: normalizeImageUrl(item.image, req),
        rating: item.rating,
        stock: item.stock,
        deletedAt: item.deletedAt || null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* =======================
   Skin Analysis Routes
======================= */

app.post('/api/skin-analysis/save', authenticateToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const customer = await CustomerAccount.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    const {
      skinTone,
      undertone,
      skinHex,
      skinRgb,
      recommendedColors,
      recommendedGownIds,
      insightText,
      branch,
    } = req.body;

    const analysis = new SkinAnalysis({
      customerId,
      customerName: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      skinTone,
      undertone,
      skinHex,
      skinRgb: skinRgb || {},
      recommendedColors: recommendedColors || [],
      recommendedGownIds: recommendedGownIds || [],
      insightText: insightText || null,
      branch: branch || null,
    });

    await analysis.save();

    return res.status(201).json({
      message: 'Skin analysis saved.',
      analysisId: analysis._id,
    });
  } catch (err) {
    console.error('saveSkinAnalysis error:', err);
    return res.status(500).json({ message: 'Failed to save skin analysis.' });
  }
});

app.put('/api/skin-analysis/:analysisId/applied', authenticateToken, async (req, res) => {
  try {
    const { analysisId } = req.params;
    const { selectedColor } = req.body;

    const analysis = await SkinAnalysis.findById(analysisId);
    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found.' });
    }

    if (String(analysis.customerId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    analysis.appliedToOrder = true;
    analysis.selectedColor = selectedColor || null;
    await analysis.save();

    return res.json({ message: 'Analysis updated.' });
  } catch (err) {
    console.error('updateSkinAnalysisApplied error:', err);
    return res.status(500).json({ message: 'Failed to update analysis.' });
  }
});

/* =======================
   Start Server
======================= */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🌐 Network accessible at http://0.0.0.0:${PORT}`);
  console.log(`📡 API base URL: http://localhost:${PORT}/api`);
  console.log(`📱 Mobile app URL: http://192.168.1.6:${PORT}/api (replace with your IP)`);
});

/**
 * Create Rental
 * Associates rental with user's email (and optional userId)
 */
app.post('/api/rentals', authenticateToken, async (req, res) => {
  try {
    console.log('REQ BODY:', req.body);
    const {
      gownId,
      startDate,
      endDate,
      branch,
      eventType,
    } = req.body;

    if (!gownId || !startDate || !endDate || !branch || !eventType) {
      return res.status(400).json({ error: 'Missing required rental fields' });
    }

    console.log('REQ.USER:', req.user);
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authenticated user not found in request' });
    }

    const customer = await CustomerAccount.findById(req.user.id);
    console.log('CUSTOMER:', customer);
    if (!customer) {
      return res.status(404).json({ error: 'Customer account not found' });
    }

    const product = await ProductDetail.findById(gownId);
    console.log('PRODUCT:', product);
    if (!product) {
      return res.status(404).json({ error: 'Product not found for rental' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      return res.status(400).json({ error: 'Invalid rental date range' });
    }
    const totalPrice = Number(product.price || 0) * durationDays;
    const downpayment = Math.floor(totalPrice / 2);

    const customerFullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    const customerContactNumber = String(
      customer.contactNumber || customer.phoneNumber || ''
    ).trim();
    if (!customerContactNumber) {
      return res.status(400).json({
        error: 'Contact number is required in customer profile before creating a rental',
      });
    }

    const rental = new Rental({
      userEmail: customer.email.toLowerCase(),
      userId: customer._id,
      customerId: customer._id,
      customerName: customerFullName || customer.email,
      customerEmail: customer.email,
      contactNumber: customerContactNumber,
      email: customer.email,
      productId: product._id,
      gownName: product.name,
      sku: product.sku,
      startDate,
      endDate,
      eventType,
      status: 'pending',
      totalPrice,
      downpayment,
      branch,
    });

    await rental.save();

    res.status(201).json({
      success: true,
      rental: {
        ...rental.toObject(),
        customerName: rental.customerName,
        customerEmail: rental.customerEmail,
        contactNumber: rental.contactNumber,
        sku: rental.sku,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Upload Rental Payment Receipt
 * POST /api/rentals/:id/payment
 */
app.post('/api/rentals/:id/payment', authenticateToken, upload.single('receipt'), async (req, res) => {
  try {
    const { id } = req.params;
    const { referenceId } = req.body;

    if (!referenceId) {
      return res.status(400).json({ success: false, error: 'Reference ID is required' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Receipt file is required' });
    }

    const rental = await Rental.findById(id);
    if (!rental) {
      return res.status(404).json({ success: false, error: 'Rental not found' });
    }

    // Upload to Cloudinary so the image is accessible from anywhere (including web admin) 
    let receiptUrl = `/uploads/receipts/${req.file.filename}`; // fallback 
    try {
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'fabriq/rental-receipts',
        resource_type: 'image',
      });
      receiptUrl = result.secure_url;
      // Clean up local temp file 
      const fs = require('fs/promises');
      await fs.unlink(req.file.path).catch(() => { });
    } catch (cloudErr) {
      console.warn('Cloudinary upload failed, falling back to local URL:', cloudErr.message);
      receiptUrl = normalizeImageUrl(`/uploads/receipts/${req.file.filename}`, req);
    }

    // Calculate payment amount (total minus downpayment) 
    const paymentAmount = Math.max(0, Number(rental.totalPrice || 0) - Number(rental.downpayment || 0));

    // Save all fields the web admin dashboard requires 
    rental.paymentSubmittedAt = new Date();
    rental.paymentAmountPaid = paymentAmount;
    rental.paymentReferenceNumber = String(referenceId).trim().toUpperCase();
    rental.paymentReceiptFilename = req.file.filename;
    rental.paymentReceiptUrl = receiptUrl;
    rental.status = 'paid_for_confirmation';

    await rental.save();

    console.log('✅ Payment receipt uploaded for rental:', id);
    res.json({
      success: true,
      message: 'Receipt uploaded successfully',
      rental: {
        ...rental.toObject(),
        paymentReceiptUrl: receiptUrl,
      },
    });
  } catch (error) {
    console.error('❌ Payment upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/rentals/:id/status
 * Admin: update rental status (accept / reject)
 */
app.patch('/api/rentals/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const allowed = ['for_payment', 'paid_for_confirmation', 'for_pickup', 'active', 'cancelled', 'completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const rental = await Rental.findById(id);
    if (!rental) {
      return res.status(404).json({ success: false, message: 'Rental not found.' });
    }

    const allowedTransitions = {
      pending: ['for_payment', 'cancelled'],
      for_payment: ['paid_for_confirmation', 'cancelled'],
      paid_for_confirmation: ['for_pickup', 'cancelled'],
      for_pickup: ['active', 'cancelled'],
      active: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    const next = allowedTransitions[rental.status] || [];
    if (!next.includes(status)) {
      return res.status(400).json({
        message: `Cannot move rental from ${rental.status} to ${status}.`,
      });
    }

    if (status === 'cancelled' && ['pending', 'for_payment', 'paid_for_confirmation'].includes(rental.status)) {
      if (!reason || !reason.trim()) {
        return res.status(400).json({ message: 'Rejection reason is required.' });
      }
      rental.rejectionReason = reason.trim();
      rental.rejectedAt = new Date();
    }

    rental.status = status;
    await rental.save();

    console.log(`✅ Rental ${id} status updated to: ${status}`);
    return res.json({
      success: true,
      rental: {
        ...rental.toObject(),
        paymentReceiptUrl: normalizeImageUrl(rental.paymentReceiptUrl, req),
      },
    });
  } catch (error) {
    console.error('❌ Status update error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update rental status.' });
  }
});

/**
 * Get rentals for a user by email
 */
app.get('/api/rentals/user/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();
    console.log(`📡 Fetching rentals for: ${email}`);
    const rentalsRaw = await Rental.find({ userEmail: email }).sort({ createdAt: -1 });
    
    // Normalize image URLs
     const rentals = rentalsRaw.map(rental => ({
       ...rental.toObject(),
       paymentReceiptUrl: normalizeImageUrl(rental.paymentReceiptUrl, req)
     }));

     console.log(`✓ Found ${rentals.length} rentals`);
    res.json({ rentals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all rentals (for filtering availability across collection)
 */
app.get('/api/rentals', async (req, res) => {
  try {
    const rentalsRaw = await Rental.find().sort({ createdAt: -1 });
    console.log(`📡 Fetching all rentals. Found: ${rentalsRaw.length}`);
    
    // Normalize image URLs for admin dashboard (include full domain)
     const rentals = rentalsRaw.map(rental => ({
       ...rental.toObject(),
       paymentReceiptUrl: normalizeImageUrl(rental.paymentReceiptUrl, req)
     }));
     
     res.json(rentals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
app.delete('/api/debug/clear-rentals', async (req, res) => {
  try {
    const result = await Rental.deleteMany({});
    console.log(`🗑️ Cleared ${result.deletedCount} rentals from database`);
    res.json({ success: true, message: `Deleted ${result.deletedCount} rentals`, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create Custom Order
 */
app.post('/api/custom-orders', async (req, res) => {
  try {
    const {
      userEmail,
      userId,
      gownType,
      customerName,
      email,
      contact,
      description,
      budget,
      appointmentDate,
      appointmentTime,
      status,
    } = req.body;

    if (!userEmail || !gownType || !customerName || !email || !contact) {
      return res.status(400).json({ error: 'Missing required custom order fields' });
    }

    // If this custom order includes a requested appointment slot, check availability
    if (appointmentDate && appointmentTime) {
      const conflictInAppointments = await Appointment.findOne({ appointmentDate, appointmentTime, branch: req.body.branch });
      const conflictInCustomOrders = await CustomOrder.findOne({ appointmentDate, appointmentTime, branch: req.body.branch });
      if (conflictInAppointments || conflictInCustomOrders) {
        return res.status(409).json({ error: 'Time slot already taken' });
      }
    }

    const customOrder = new CustomOrder({
      userEmail: userEmail.toLowerCase(),
      userId,
      gownType,
      customerName,
      email,
      contact,
      description,
      budget,
      appointmentDate,
      appointmentTime,
      status: status || 'inquiry',
    });

    try {
      await customOrder.save();
      res.status(201).json({ success: true, customOrder });
    } catch (saveErr) {
      if (saveErr && saveErr.code === 11000) {
        return res.status(409).json({ error: 'Time slot already taken' });
      }
      throw saveErr;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get custom orders for a user by email
 */
app.get('/api/custom-orders/user/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();
    console.log(`📡 Fetching custom orders for: ${email}`);
    const customOrders = await CustomOrder.find({ userEmail: email }).sort({ createdAt: -1 });
    console.log(`✓ Found ${customOrders.length} custom orders`);
    res.json({ customOrders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create Appointment
 */
// Availability check across appointments and custom orders
app.get('/api/availability', async (req, res) => {
  try {
    const { date, appointmentType, branch } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Query parameter `date` is required (YYYY-MM-DD)' });
    }

    const aptFilter = { appointmentDate: date };
    if (appointmentType) aptFilter.appointmentType = appointmentType;
    if (branch) aptFilter.branch = branch;

    const ordersFilter = { appointmentDate: date };
    if (branch) ordersFilter.branch = branch;

    const [apts, orders] = await Promise.all([
      Appointment.find(aptFilter).select('appointmentTime appointmentType branch -_id'),
      CustomOrder.find(ordersFilter).select('appointmentTime branch -_id'),
    ]);

    const takenTimes = [];
    apts.forEach((a) => takenTimes.push({ time: a.appointmentTime, source: 'appointment', appointmentType: a.appointmentType, branch: a.branch }));
    orders.forEach((o) => takenTimes.push({ time: o.appointmentTime, source: 'customOrder', branch: o.branch }));

    res.json({ date, takenTimes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const {
      userEmail,
      userId,
      appointmentType,
      customerName,
      email,
      contact,
      appointmentDate,
      appointmentTime,
      branch,
      notes,
      status,
    } = req.body;

    if (!userEmail || !appointmentType || !customerName || !email || !contact || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ error: 'Missing required appointment fields' });
    }

    // Check if the requested slot is already taken (across appointments and bespoke/custom orders)
    const conflictInAppointments = await Appointment.findOne({ appointmentDate, appointmentTime, appointmentType, branch });
    const conflictInCustomOrders = await CustomOrder.findOne({ appointmentDate, appointmentTime, branch });
    if (conflictInAppointments || conflictInCustomOrders) {
      return res.status(409).json({ error: 'Time slot already taken' });
    }

    const appointment = new Appointment({
      userEmail: userEmail.toLowerCase(),
      userId,
      appointmentType,
      customerName,
      email,
      contact,
      appointmentDate,
      appointmentTime,
      branch,
      notes,
      status: status || 'scheduled',
    });

    try {
      await appointment.save();
      res.status(201).json({ success: true, appointment });
    } catch (saveErr) {
      if (saveErr && saveErr.code === 11000) {
        return res.status(409).json({ error: 'Time slot already taken' });
      }
      throw saveErr;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get appointments for a user by email
 */
app.get('/api/appointments/user/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();
    console.log(`📡 Fetching appointments for: ${email}`);
    const appointments = await Appointment.find({ userEmail: email }).sort({ createdAt: -1 });
    console.log(`✓ Found ${appointments.length} appointments`);
    res.json({ appointments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});