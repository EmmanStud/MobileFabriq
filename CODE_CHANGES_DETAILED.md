# 📍 Exact Code Changes - Line Numbers & Locations

## File 1: backend-example/server.js

### Change 1: Add Debug Endpoints (Lines 120-230)
**Location**: After User Schema, before Health Check

```javascript
// Line 120: Insert these debug endpoints BEFORE the /api/health endpoint

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

// [Debug endpoints for appointments, custom orders, emails tests...]
// [Total: ~110 lines added]
```

### Change 2: Fix GET /api/rentals/user/:email (Around Line 491)
**BEFORE**:
```javascript
app.get('/api/rentals/user/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();  // ← NO DECODE
    const rentals = await Rental.find({ userEmail: email }).sort({ createdAt: -1 });
    res.json({ rentals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**AFTER**:
```javascript
app.get('/api/rentals/user/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();  // ← WITH DECODE ✓
    console.log(`📡 Fetching rentals for: ${email}`);
    const rentals = await Rental.find({ userEmail: email }).sort({ createdAt: -1 });
    console.log(`✓ Found ${rentals.length} rentals`);
    res.json({ rentals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Change 3: Fix GET /api/custom-orders/user/:email (Around Line 545)
**BEFORE**:
```javascript
app.get('/api/custom-orders/user/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();  // ← NO DECODE
    const customOrders = await CustomOrder.find({ userEmail: email }).sort({ createdAt: -1 });
    res.json({ customOrders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**AFTER**:
```javascript
app.get('/api/custom-orders/user/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();  // ← WITH DECODE ✓
    console.log(`📡 Fetching custom orders for: ${email}`);
    const customOrders = await CustomOrder.find({ userEmail: email }).sort({ createdAt: -1 });
    console.log(`✓ Found ${customOrders.length} custom orders`);
    res.json({ customOrders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Change 4: Fix GET /api/appointments/user/:email (Around Line 603)
**BEFORE**:
```javascript
app.get('/api/appointments/user/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();  // ← NO DECODE
    const appointments = await Appointment.find({ userEmail: email }).sort({ createdAt: -1 });
    res.json({ appointments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**AFTER**:
```javascript
app.get('/api/appointments/user/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();  // ← WITH DECODE ✓
    console.log(`📡 Fetching appointments for: ${email}`);
    const appointments = await Appointment.find({ userEmail: email }).sort({ createdAt: -1 });
    console.log(`✓ Found ${appointments.length} appointments`);
    res.json({ appointments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## File 2: screens/Rentals.jsx

### Change: handleSubmit() function (Around Line 197-260)

**BEFORE** (Lines 230-245):
```javascript
    // Try to save to backend, fallback to local if request fails
    try {
      const res = await mongodbService.createRental(newRental);
      if (res.success && res.rental) {
        const saved = { ...res.rental, id: res.rental._id || res.rental.id };
        setUserRentals(prev => [saved, ...prev]);  // ← ONLY LOCAL UPDATE
      } else {
        console.warn('Create rental failed, falling back to local:', res.error);
        const fallback = { ...newRental, id: 'R' + Date.now() };
        setUserRentals(prev => [fallback, ...prev]);
      }
    } catch (err) {
      console.error('Error creating rental:', err);
      const fallback = { ...newRental, id: 'R' + Date.now() };
      setUserRentals(prev => [fallback, ...prev]);
    }
```

**AFTER** (Lines 230-250):
```javascript
    // Try to save to backend, fallback to local if request fails
    try {
      const res = await mongodbService.createRental(newRental);
      if (res.success && res.rental) {
        // Force refresh from DB to ensure data is visible
        console.log('✅ Rental created, refreshing from database...');
        const freshRentals = await mongodbService.getRentalsByUser(userEmail);  // ← REFRESH FROM DB
        const normalized = freshRentals.map(r => ({ ...r, id: r._id || r.id }));
        setUserRentals(normalized);  // ← UPDATE WITH DB DATA
      } else {
        console.warn('Create rental failed, falling back to local:', res.error);
        const fallback = { ...newRental, id: 'R' + Date.now() };
        setUserRentals(prev => [fallback, ...prev]);
      }
    } catch (err) {
      console.error('Error creating rental:', err);
      const fallback = { ...newRental, id: 'R' + Date.now() };
      setUserRentals(prev => [fallback, ...prev]);
    }
```

**Key difference**: 
- ❌ Before: `setUserRentals(prev => [saved, ...prev])`  (local data only)
- ✅ After: Fetches fresh data from DB and updates with that

---

## File 3: screens/Appointments.jsx

### Change: handleSubmit() function (Around Line 207-225)

**BEFORE**:
```javascript
    // Try to save to backend, fallback to local if request fails
    try {
      const res = await mongodbService.createAppointment(newAppointment);
      if (res.success && res.appointment) {
        const saved = { ...res.appointment, id: res.appointment._id || res.appointment.id };
        setUserAppointments(prev => [saved, ...prev]);  // ← ONLY LOCAL UPDATE
      } else {
        console.warn('Create appointment failed, falling back to local:', res.error);
        const fallback = { ...newAppointment, id: 'A' + Date.now() };
        setUserAppointments(prev => [fallback, ...prev]);
      }
    } catch (err) {
      console.error('Error creating appointment:', err);
      const fallback = { ...newAppointment, id: 'A' + Date.now() };
      setUserAppointments(prev => [fallback, ...prev]);
    }
```

**AFTER**:
```javascript
    // Try to save to backend, fallback to local if request fails
    try {
      const res = await mongodbService.createAppointment(newAppointment);
      if (res.success && res.appointment) {
        // Force refresh from DB to ensure data is visible
        console.log('✅ Appointment created, refreshing from database...');
        const freshAppointments = await mongodbService.getAppointmentsByUser(userEmail);  // ← REFRESH
        const normalized = freshAppointments.map(apt => ({
          ...apt,
          id: apt._id || apt.id,
          type: apt.appointmentType,
          date: apt.appointmentDate,
          time: apt.appointmentTime
        }));
        setUserAppointments(normalized);  // ← UPDATE WITH DB DATA
      } else {
        console.warn('Create appointment failed, falling back to local:', res.error);
        const fallback = { ...newAppointment, id: 'A' + Date.now() };
        setUserAppointments(prev => [fallback, ...prev]);
      }
    } catch (err) {
      console.error('Error creating appointment:', err);
      const fallback = { ...newAppointment, id: 'A' + Date.now() };
      setUserAppointments(prev => [fallback, ...prev]);
    }
```

---

## File 4: screens/Bespoke.jsx

### Change: handleSubmit() function (Around Line 262-280)

**BEFORE**:
```javascript
    // Try to save to backend, fallback to local if request fails
    try {
      const res = await mongodbService.createCustomOrder(newOrder);
      if (res.success && res.customOrder) {
        const saved = { ...res.customOrder, id: res.customOrder._id || res.customOrder.id };
        setUserOrders(prev => [saved, ...prev]);  // ← ONLY LOCAL UPDATE
      } else {
        console.warn('Create custom order failed, falling back to local:', res.error);
        const fallback = { ...newOrder, id: 'CO' + Date.now() };
        setUserOrders(prev => [fallback, ...prev]);
      }
    } catch (err) {
      console.error('Error creating custom order:', err);
      const fallback = { ...newOrder, id: 'CO' + Date.now() };
      setUserOrders(prev => [fallback, ...prev]);
    }
```

**AFTER**:
```javascript
    // Try to save to backend, fallback to local if request fails
    try {
      const res = await mongodbService.createCustomOrder(newOrder);
      if (res.success && res.customOrder) {
        // Force refresh from DB to ensure data is visible
        console.log('✅ Custom order created, refreshing from database...');
        const freshOrders = await mongodbService.getCustomOrdersByUser(userEmail);  // ← REFRESH
        const normalized = freshOrders.map(order => ({ ...order, id: order._id || order.id }));
        setUserOrders(normalized);  // ← UPDATE WITH DB DATA
      } else {
        console.warn('Create custom order failed, falling back to local:', res.error);
        const fallback = { ...newOrder, id: 'CO' + Date.now() };
        setUserOrders(prev => [fallback, ...prev]);
      }
    } catch (err) {
      console.error('Error creating custom order:', err);
      const fallback = { ...newOrder, id: 'CO' + Date.now() };
      setUserOrders(prev => [fallback, ...prev]);
    }
```

---

## Summary of Changes 📋

| File | What | Where | Lines | Type |
|------|------|-------|-------|------|
| server.js | Add 5 debug endpoints | Before `/api/health` | ~120-230 | INSERT |
| server.js | Fix rentals GET | Line 491 | 2 | MODIFY |
| server.js | Fix custom orders GET | Line 545 | 2 | MODIFY |
| server.js | Fix appointments GET | Line 603 | 2 | MODIFY |
| Rentals.jsx | Add DB refresh | handleSubmit() | ~230-245 | MODIFY |
| Appointments.jsx | Add DB refresh | handleSubmit() | ~207-225 | MODIFY |
| Bespoke.jsx | Add DB refresh | handleSubmit() | ~262-280 | MODIFY |

**Total Changes**: 4 files, ~3 critical modifications, ~110 new debug lines

---

## Verification Checklist ✅

After making changes:

1. **Backend**:
   - [ ] No syntax errors in server.js
   - [ ] Backend starts: `npm start` (no errors)
   - [ ] Health check works: `http://localhost:5000/api/health`
   - [ ] Debug endpoints work: `http://localhost:5000/api/debug/emails`

2. **Frontend**:
   - [ ] No syntax errors in Rentals.jsx, Appointments.jsx, Bespoke.jsx
   - [ ] App compiles without errors
   - [ ] Can login successfully

3. **Functionality**:
   - [ ] Create rental → appears immediately in "My Rentals"
   - [ ] Create appointment → appears immediately in "My Appointments"
   - [ ] Create custom order → appears immediately in "My Orders"
   - [ ] Refresh page → data still visible
   - [ ] Console shows: ✓ Found X items

4. **No Regressions**:
   - [ ] Existing rentals still display
   - [ ] Existing appointments still display
   - [ ] Existing custom orders still display
   - [ ] Can still edit/delete items
   - [ ] Navigation still works

---

## Rollback Instructions (If Needed)

If changes cause issues, revert:

**server.js**:
1. Remove debug endpoints (Lines ~120-230)
2. Restore original GET handlers without `decodeURIComponent()`

**Rentals.jsx, Appointments.jsx, Bespoke.jsx**:
1. Restore original `setUserRentals(prev => [saved, ...prev])` pattern
2. Remove DB refresh calls

**Or**: Use Git to revert changes:
```bash
git checkout backend-example/server.js
git checkout screens/Rentals.jsx
git checkout screens/Appointments.jsx
git checkout screens/Bespoke.jsx
```

