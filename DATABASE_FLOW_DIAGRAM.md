# Database Data Flow Diagram

## Before (❌ BROKEN - Data not showing)

```
User Creates Rental
        ↓
   POST /api/rentals
        ↓
Backend saves to DB
        ↓
   Returns: success: true
        ↓
Frontend shows modal
        ↓
User switches to "My Rentals" tab
        ↓
GET /api/rentals/user/:email
        ↓
⚠️ Email encoding mismatch (user%40email.com vs user@email.com)
        ↓
❌ Query fails or returns empty
        ↓
✗ Rental NOT visible
        ↓
User has to refresh page to see it
```

---

## After (✅ FIXED - Data shows immediately)

```
User Creates Rental
        ↓
   POST /api/rentals
   ├─ userEmail: user@email.com
   ├─ gownName: "Midnight Elegance"
   └─ totalPrice: 3500
        ↓
Backend saves to DB
        ↓
MongoDB stores (lowercased):
   { userEmail: "user@email.com", ... }
        ↓
Returns: success: true, rental: {...}
        ↓
Frontend immediately calls:
   GET /api/rentals/user/user%40email.com
        ↓
Backend DECODES:
   decodeURIComponent("user%40email.com")
   → "user@email.com"
   → .toLowerCase()
   → "user@email.com"
        ↓
Backend queries DB:
   Rental.find({ userEmail: "user@email.com" })
        ↓
✅ Finds the newly created rental!
        ↓
Returns array with new rental
        ↓
Frontend updates state:
   setUserRentals([newRental, ...existing])
        ↓
React re-renders "My Rentals" tab
        ↓
✅ Rental visible immediately!
        ↓
User can see: "Midnight Elegance"
              "Feb 10 - Feb 12, 2026"
              "Taguig Main - Cadena de Amor"
```

---

## Database Schema & Query Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     MongoDB Database                             │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  rentalSchema                                            │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │ userEmail: {                                       │  │   │
│  │  │   type: String,                                   │  │   │
│  │  │   required: true,                                │  │   │
│  │  │   lowercase: true    ← AUTO-LOWERCASES           │  │   │
│  │  │ }                                                 │  │   │
│  │  │ gownName: String                                  │  │   │
│  │  │ startDate: String (YYYY-MM-DD)                    │  │   │
│  │  │ endDate: String (YYYY-MM-DD)                      │  │   │
│  │  │ status: String (pending/confirmed/etc)            │  │   │
│  │  │ totalPrice: Number                                │  │   │
│  │  │ downpayment: Number                               │  │   │
│  │  │ branch: String                                    │  │   │
│  │  │ createdAt: Date                                   │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Sample Data:                                            │   │
│  │  [                                                       │   │
│  │    {                                                     │   │
│  │      _id: ObjectId(...),                                │   │
│  │      userEmail: "mary@example.com",                     │   │
│  │      gownName: "Midnight Elegance",                     │   │
│  │      startDate: "2026-02-10",                           │   │
│  │      endDate: "2026-02-12",                             │   │
│  │      totalPrice: 3500,                                  │   │
│  │      downpayment: 1000,                                 │   │
│  │      status: "pending",                                 │   │
│  │      branch: "Taguig Main",                             │   │
│  │      createdAt: 2026-02-05T15:30:00.000Z                │   │
│  │    }                                                     │   │
│  │  ]                                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│              Query Examples & Results                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ✅ CORRECT:                                                      │
│    Rental.find({ userEmail: "mary@example.com" })               │
│    → Returns [{ rental1, rental2, ... }]                         │
│                                                                   │
│ ✅ ALSO CORRECT (lowercase):                                    │
│    Rental.find({ userEmail: "MARY@EXAMPLE.COM" })               │
│    → MongoDB converts to lowercase automatically                 │
│    → Returns [{ rental1, rental2, ... }]                         │
│                                                                   │
│ ❌ WRONG (URL encoded):                                         │
│    Rental.find({ userEmail: "mary%40example.com" })             │
│    → %40 is NOT @, doesn't match                                │
│    → Returns []                                                  │
│    → User sees NO rentals                                        │
│                                                                   │
│ ✅ FIXED (with decoding):                                       │
│    const email = decodeURIComponent("mary%40example.com")        │
│    // → "mary@example.com"                                       │
│    Rental.find({ userEmail: email.toLowerCase() })              │
│    → Returns [{ rental1, rental2, ... }]                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Request/Response Flow

### Create Rental (POST)
```
CLIENT REQUEST:
┌─────────────────────────────────────────┐
│ POST /api/rentals                       │
│ Content-Type: application/json          │
│                                         │
│ {                                       │
│   "userEmail": "mary@example.com",      │
│   "gownName": "Midnight Elegance",      │
│   "startDate": "2026-02-10",            │
│   "endDate": "2026-02-12",              │
│   "totalPrice": 3500,                   │
│   "downpayment": 1000,                  │
│   "status": "pending",                  │
│   "branch": "Taguig Main"               │
│ }                                       │
└─────────────────────────────────────────┘
           ↓ (POST to backend)
┌─────────────────────────────────────────┐
│        BACKEND PROCESSING               │
│ 1. Receive JSON                         │
│ 2. Validate required fields             │
│ 3. Create Rental object                 │
│ 4. Save to MongoDB                      │
│ 5. Return saved rental                  │
└─────────────────────────────────────────┘
           ↓ (Response)
SERVER RESPONSE:
┌─────────────────────────────────────────┐
│ 201 Created                             │
│ Content-Type: application/json          │
│                                         │
│ {                                       │
│   "success": true,                      │
│   "rental": {                           │
│     "_id": "507f1f77bcf86cd799439011",  │
│     "userEmail": "mary@example.com",    │
│     "gownName": "Midnight Elegance",    │
│     "startDate": "2026-02-10",          │
│     "endDate": "2026-02-12",            │
│     "totalPrice": 3500,                 │
│     "downpayment": 1000,                │
│     "status": "pending",                │
│     "branch": "Taguig Main",            │
│     "createdAt": "2026-02-05T15:30Z"    │
│   }                                     │
│ }                                       │
└─────────────────────────────────────────┘
           ↓ (Frontend processes response)
Frontend immediately fetches fresh data
```

### Fetch User Rentals (GET) - THE FIX
```
CLIENT REQUEST:
┌─────────────────────────────────────────┐
│ GET /api/rentals/user/mary%40example.com│
│ (email is URL-encoded)                  │
└─────────────────────────────────────────┘
           ↓ (GET to backend)
┌─────────────────────────────────────────┐
│      BACKEND (WITH FIX)                 │
│                                         │
│ const email = decodeURIComponent(       │
│   req.params.email                      │
│ ).toLowerCase()                         │
│ // email = "mary@example.com"           │
│                                         │
│ const rentals =                         │
│   Rental.find({ userEmail: email })     │
│   .sort({ createdAt: -1 })              │
│                                         │
│ console.log("Rentals found:", rentals)  │
│                                         │
│ res.json({ rentals })                   │
└─────────────────────────────────────────┘
           ↓ (Response with rentals)
SERVER RESPONSE:
┌─────────────────────────────────────────┐
│ 200 OK                                  │
│ Content-Type: application/json          │
│                                         │
│ {                                       │
│   "rentals": [                          │
│     {                                   │
│       "_id": "507f1f77bcf86cd799439011",│
│       "userEmail": "mary@example.com",  │
│       "gownName": "Midnight Elegance",  │
│       "startDate": "2026-02-10",        │
│       "endDate": "2026-02-12",          │
│       "totalPrice": 3500,               │
│       "downpayment": 1000,              │
│       "status": "pending",              │
│       "branch": "Taguig Main",          │
│       "createdAt": "2026-02-05T15:30Z"  │
│     }                                   │
│   ]                                     │
│ }                                       │
└─────────────────────────────────────────┘
           ↓ (Frontend updates state)
✅ React re-renders
✅ User sees rental in list!
```

---

## State Management Flow (React)

```
┌─ Initial State ─────────────────────────┐
│ userRentals: []                         │
│ (empty until user logs in)              │
└─────────────────────────────────────────┘
        ↓ (User logs in, useEffect triggers)
┌─ Session Loaded ────────────────────────┐
│ userEmail: "mary@example.com"           │
│ Calls: fetchUserRentals(userEmail)      │
└─────────────────────────────────────────┘
        ↓ (API returns existing rentals)
┌─ State Updated ─────────────────────────┐
│ userRentals: [                          │
│   { id: "R1", gownName: "Pearl..." },   │
│   { id: "R2", gownName: "Golden..." }   │
│ ]                                       │
│ activeTab: 'existing'                   │
└─────────────────────────────────────────┘
        ↓ (User switches to 'new' tab, fills form)
┌─ Form Filled ───────────────────────────┐
│ formData: {                             │
│   gownId: "1",                          │
│   gownName: "Midnight Elegance",        │
│   startDate: "2026-02-10",              │
│   endDate: "2026-02-12",                │
│   ...                                   │
│ }                                       │
│ activeTab: 'new'                        │
└─────────────────────────────────────────┘
        ↓ (User submits form)
┌─ Form Submitted ────────────────────────┐
│ POST /api/rentals with formData         │
└─────────────────────────────────────────┘
        ↓ (Backend returns success)
┌─ FORCE REFRESH FROM DB (NEW FIX!) ─────┐
│ GET /api/rentals/user/:email            │
│ Returns fresh list from DB              │
└─────────────────────────────────────────┘
        ↓ (Fresh data received)
┌─ State Updated (IMMEDIATELY) ──────────┐
│ userRentals: [                          │
│   { id: "NEW", gownName: "Midnight..." },│ ← NEW!
│   { id: "R1", gownName: "Pearl..." },   │
│   { id: "R2", gownName: "Golden..." }   │
│ ]                                       │
│ ✅ NEW rental is first in list!         │
└─────────────────────────────────────────┘
        ↓ (React re-renders)
┌─ UI Updated ────────────────────────────┐
│ User sees: ✅ Success modal             │
│            ✅ Item appears in list      │
│ After 2s: Switch to 'existing' tab      │
│ User can see their rental immediately!  │
└─────────────────────────────────────────┘
```

---

## Summary

The fix ensures:
1. ✅ Email is correctly decoded on backend
2. ✅ Email is lowercase before database query
3. ✅ Fresh data is fetched immediately after creation
4. ✅ User sees their data without page refresh
5. ✅ Data persists in database (survives page refresh)

