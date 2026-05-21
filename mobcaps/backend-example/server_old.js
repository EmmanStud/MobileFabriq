/**
 * MongoDB Backend Server
 * Node.js + Express API
 * 
 * Password Strategy:
 * - Passwords are HASHED on the CLIENT using SHA-256
 * - Backend STORES and COMPARES hashes ONLY
 * - NO double hashing
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

/* =======================
   Middleware
======================= */
app.use(cors());
app.use(express.json());

/* =======================
   MongoDB Connection
======================= */
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/mobcaps';

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });

/* =======================
   User Schema
======================= */
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  phone: { type: String },
  address: { type: String },
  password: { type: String, required: true }, // SHA-256 hash
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

/* =======================
   Rental Schema
======================= */
const rentalSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, lowercase: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: false },
  gownName: { type: String, required: true },
  startDate: { type: String, required: true }, // YYYY-MM-DD
  endDate: { type: String, required: true },
  status: { type: String, default: 'pending' },
  totalPrice: { type: Number, required: true },
  downpayment: { type: Number, required: true },
  branch: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const Rental = mongoose.model('Rental', rentalSchema);

/* =======================
   Gown Schema
======================= */
const gownSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  color: { type: String, required: true },
  size: [{ type: String }],
  price: { type: Number, required: true },
  status: { type: String, enum: ['available', 'rented'], default: 'available' },
  branch: { type: String, required: true },
  image: { type: String }, // URL or path to image
  rating: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const Gown = mongoose.model('Gown', gownSchema);

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
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = new User({
      name,
      email: email.toLowerCase(),
      password, // already hashed
    });

    await user.save();

    const { password: _, ...userWithoutPassword } = user.toObject();
    res.status(201).json({ user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Login / Verify Credentials
 * Client sends SHA-256 hash
 * Backend compares directly
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body; // password = hashed string

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user || password !== user.password) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    const { password: _, ...userWithoutPassword } = user.toObject();
    res.json({ user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Reset Password
 * Client sends hashed password (SHA-256)
 * Backend updates user password directly
 */
app.put('/api/users/reset-password', async (req, res) => {
  try {
    const { email, password } = req.body; // password = hashed string from client

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    // Find and update user
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { password }, // Update with hashed password
      { new: true } // Return updated user
    );

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // Return user without password
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
 * Verifies old password (hashed) and updates to new password (hashed)
 * Client sends both old and new passwords as SHA-256 hashes
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

    // Verify old password
    if (oldPassword !== user.password) {
      console.log(`  - Error: Old password does not match stored password`);
      console.log(`  - Sent hash length: ${oldPassword.length}`);
      console.log(`  - Stored hash length: ${user.password.length}`);
      console.log(`  - Sent: ${oldPassword}`);
      console.log(`  - Stored: ${user.password}`);
      return res.status(401).json({
        error: 'Old password is incorrect',
      });
    }

    console.log(`  - Password verified successfully`);

    // Update to new password
    user.password = newPassword;
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
 * Checks if the provided password hash matches the stored password
 * Used for real-time validation before password change
 * Client sends hashed password, backend compares directly
 */
app.post('/api/users/:email/verify-password', async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.params.email.toLowerCase();

    console.log(`[DEBUG] POST /api/users/:email/verify-password called`);
    console.log(`  - Email (param): ${email}`);
    console.log(`  - Password Hash (first 20 chars): ${password ? password.substring(0, 20) + '...' : 'EMPTY'}`);

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

    console.log(`  - User found: ${user.name} (${user.email})`);

    // Verify password
    const isCorrect = password === user.password;
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
 * Initialize Gowns Collection
 * Creates initial gown data if the collection is empty
 */
app.post('/api/gowns/initialize', async (req, res) => {
  try {
    const existingGowns = await Gown.countDocuments();
    if (existingGowns > 0) {
      return res.json({ message: 'Gowns already initialized', count: existingGowns });
    }

    const initialGowns = [
      {
        name: 'Midnight Elegance',
        category: 'Evening Gown',
        color: 'Navy Blue',
        size: ['S', 'M', 'L'],
        price: 3500,
        status: 'available',
        branch: 'Taguig Main',
        rating: 4.8,
      },
      {
        name: 'Pearl Romance',
        category: 'Wedding Dress',
        color: 'Ivory',
        size: ['XS', 'S', 'M'],
        price: 8000,
        status: 'available',
        branch: 'BGC Branch',
        rating: 5.0,
      },
      {
        name: 'Rose Garden',
        category: 'Cocktail Dress',
        color: 'Blush Pink',
        size: ['M', 'L'],
        price: 2800,
        status: 'available',
        branch: 'Taguig Main',
        rating: 4.5,
      },
      {
        name: 'Golden Hour',
        category: 'Evening Gown',
        color: 'Gold',
        size: ['S', 'M', 'L', 'XL'],
        price: 4200,
        status: 'available',
        branch: 'Makati Branch',
        rating: 4.9,
      },
    ];

    const insertedGowns = await Gown.insertMany(initialGowns);
    res.status(201).json({ 
      success: true, 
      message: 'Gowns initialized successfully',
      count: insertedGowns.length,
      gowns: insertedGowns
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all gowns
 */
app.get('/api/gowns', async (req, res) => {
  try {
    const gowns = await Gown.find().sort({ createdAt: -1 });
    console.log(`📡 Fetching all gowns. Found: ${gowns.length}`);
    res.json(gowns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* =======================
   Start Server
======================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📡 API base URL: http://localhost:${PORT}/api`);
});