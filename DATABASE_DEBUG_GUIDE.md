# Database Data Visibility Issue - Diagnosis & Solutions

## Problem Statement
When users create appointments, rentals, or custom orders, the data is saved but **NOT displaying** in the "My Rentals", "My Appointments", or "My Orders" sections.

## Root Cause Analysis

### Issue #1: Email Case Sensitivity
- **Frontend**: Sends `userEmail` from session (may be stored in original case)
- **Backend**: Schema has `lowercase: true` for `userEmail` field
- **Database**: Stores email as lowercase
- **Fetch**: Queries with `userEmail` field matching (lowercase)
- **Result**: If session stores email inconsistently, fetch may fail

### Issue #2: Missing Refresh After Creation
- **Current Flow**: Create rental → Show modal → Form resets
- **Problem**: `setUserRentals()` adds item locally but doesn't always refresh from DB
- **Result**: Items visible until page refresh, then disappear

### Issue #3: Field Name Mismatches
| Operation | Expected Fields | Actual Fields |
|-----------|-----------------|---------------|
| Create Rental | gownName, startDate, endDate, totalPrice, downpayment, userEmail | ✓ All match |
| Create Appointment | appointmentType, appointmentDate, appointmentTime, userEmail | ✓ All match |
| Create Custom Order | gownType, userEmail | ✓ All match |

### Issue #4: Encoding Problems
- **Frontend**: Uses `encodeURIComponent(email)` in mongodbService
- **Backend**: Receives encoded email but doesn't decode
- **Result**: Query looks for `user%40email.com` instead of `user@email.com`

## Debug Steps

### Step 1: Add Debug Endpoints to Backend
Add these endpoints to `server.js`:

```javascript
// Debug: Get ALL data (no filter)
app.get('/api/debug/all-rentals', async (req, res) => {
  const rentals = await Rental.find().sort({ createdAt: -1 });
  res.json({ count: rentals.length, rentals });
});

app.get('/api/debug/all-appointments', async (req, res) => {
  const apts = await Appointment.find().sort({ createdAt: -1 });
  res.json({ count: apts.length, apts });
});

app.get('/api/debug/all-custom-orders', async (req, res) => {
  const orders = await CustomOrder.find().sort({ createdAt: -1 });
  res.json({ count: orders.length, orders });
});

// Debug: Check what emails are in database
app.get('/api/debug/emails', async (req, res) => {
  const rentalEmails = await Rental.find().select('userEmail').distinct('userEmail');
  const aptEmails = await Appointment.find().select('userEmail').distinct('userEmail');
  const orderEmails = await CustomOrder.find().select('userEmail').distinct('userEmail');
  res.json({ rentals: rentalEmails, appointments: aptEmails, customOrders: orderEmails });
});

// Debug: Test query with specific email
app.get('/api/debug/rentals/:email', async (req, res) => {
  const email = req.params.email;
  const emailLowercase = email.toLowerCase();
  const emailDecoded = decodeURIComponent(email);
  const emailDecodedLowercase = decodeURIComponent(email).toLowerCase();
  
  const results = {
    queryAttempts: [
      { query: email, count: await Rental.countDocuments({ userEmail: email }) },
      { query: emailLowercase, count: await Rental.countDocuments({ userEmail: emailLowercase }) },
      { query: emailDecoded, count: await Rental.countDocuments({ userEmail: emailDecoded }) },
      { query: emailDecodedLowercase, count: await Rental.countDocuments({ userEmail: emailDecodedLowercase }) },
    ],
    allRentalsInDb: await Rental.find().select('userEmail').limit(10),
  };
  res.json(results);
});
```

### Step 2: Check Database with Debug Endpoints
1. Open browser/Postman: `http://localhost:5000/api/debug/all-rentals`
   - See what's actually in database
   
2. Check emails: `http://localhost:5000/api/debug/emails`
   - See all distinct userEmail values
   
3. Test query: `http://localhost:5000/api/debug/rentals/your@email.com`
   - See which email format matches

### Step 3: Monitor API Calls
In browser console:
1. Create a rental
2. Check Network tab for:
   - POST to `/api/rentals` - should succeed
   - GET to `/api/rentals/user/...` - should return the item

### Step 4: Check Session Storage
Add to frontend after login:
```javascript
const session = await sessionService.getSession();
console.log('Session email:', session.email);
console.log('Current user:', await sessionService.getCurrentUser());
```

## Solutions

### Solution #1: Fix Email Encoding
**File**: `services/mongodbService.js`

Change this:
```javascript
const url = this._buildUrl(`/rentals/user/${encodeURIComponent(email)}`);
```

To this:
```javascript
const url = this._buildUrl(`/rentals/user/${email.toLowerCase()}`);
```

And in backend, add decoding:
```javascript
app.get('/api/rentals/user/:email', async (req, res) => {
  const email = decodeURIComponent(req.params.email).toLowerCase();
  const rentals = await Rental.find({ userEmail: email }).sort({ createdAt: -1 });
  res.json({ rentals });
});
```

### Solution #2: Force Refresh After Creation
**File**: `screens/Rentals.jsx`

After successful creation, fetch fresh data:
```javascript
const res = await mongodbService.createRental(newRental);
if (res.success && res.rental) {
  // Force refresh from DB
  const fresh = await mongodbService.getRentalsByUser(userEmail);
  setUserRentals(fresh.map(r => ({ ...r, id: r._id || r.id })));
}
```

### Solution #3: Ensure Consistent Email Case
**File**: `backend-example/server.js`

In every creation endpoint:
```javascript
const rental = new Rental({
  userEmail: userEmail.toLowerCase(), // Always lowercase
  ...
});
```

And in every fetch endpoint:
```javascript
const email = req.params.email.toLowerCase(); // Always lowercase
const rentals = await Rental.find({ userEmail: email });
```

## Testing Checklist

- [ ] Backend starts without errors
- [ ] `/api/debug/emails` shows your test email
- [ ] Create a rental → Check `/api/debug/all-rentals` shows it
- [ ] Create rental → Immediately check `/api/rentals/user/{email}` shows it
- [ ] Refresh page → Data still shows (persisted properly)
- [ ] Create appointment → Shows in My Appointments tab
- [ ] Create custom order → Shows in My Orders tab
- [ ] Browser console has no errors
- [ ] No error 404s in Network tab for data fetches

## Quick Fixes Priority
1. **High**: Add debug endpoints to identify exact issue
2. **High**: Ensure email case consistency everywhere
3. **High**: Fix URL encoding/decoding
4. **Medium**: Force refresh after creation
5. **Low**: Add timeout handling
