# Rentals Page - Visual Field Reference

## 📱 Form Layout (New Rental Tab)

```
┌─────────────────────────────────────────┐
│         HANNAH VANESSA     [☰]          │ ← Site Header
├─────────────────────────────────────────┤
│ Rentals                                 │ ← Page Header
│ Manage your gown rentals and reserv...  │
├─────────────────────────────────────────┤
│ NEW RENTAL  │  MY RENTALS              │ ← Tabs
├─────────────────────────────────────────┤
│  BOOK A RENTAL                          │
│                                         │
│  CUSTOMER NAME *                        │
│  ┌─────────────────────────────────┐   │
│  │ John Doe (auto-filled)          │   │ ← Grayed out
│  └─────────────────────────────────┘   │
│                                         │
│  CONTACT NUMBER *                       │
│  +63 followed by 10 digits              │ ← Helper text
│  ┌─────────────────────────────────┐   │
│  │ +63 917            ← User types  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  GOWN SELECTION *                       │
│  ┌────────────┐ ┌────────────┐ ┌─...─┐ │
│  │ Midnight   │ │  Pearl     │ │ ... │ │
│  │ Elegance   │ │  Romance   │ │     │ │ ← Scrollable
│  │ ₱3500/day  │ │ ₱8000/day  │ │     │ │
│  └────────────┘ └────────────┘ └─...─┘ │
│                                         │
│  START DATE *            END DATE *    │
│  [📅 2026-02-03]        [📅 2026-02-05] │ ← Calendar icon
│                                         │
│  BRANCH LOCATION *       EVENT TYPE     │
│  ┌──────────────────┐  ┌─────────────┐ │
│  │ Taguig Main ▼   │  │ Wedding     │ │
│  │ BGC Branch       │  │ Optional    │ │
│  │ Makati Branch    │  │             │ │
│  └──────────────────┘  └─────────────┘ │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ RENTAL SUMMARY                  │   │
│  │ Gown: Midnight Elegance         │   │
│  │ Duration: 2 days                │   │
│  │ Daily Rate: ₱3,500              │   │
│  ├─────────────────────────────────┤   │
│  │ Total Amount: ₱7,000            │   │
│  │ Downpayment (50%): ₱3,500       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [  SUBMIT RENTAL REQUEST  >  ]        │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔄 Field Interactions

### 1️⃣ Customer Name Field
```
┌──────────────────────────────────┐
│ CUSTOMER NAME *                  │
├──────────────────────────────────┤
│                                  │
│ How it gets filled:              │
│                                  │
│ 1. User signs up with name       │
│    └─> Stored in sessionService  │
│                                  │
│ 2. User navigates to Rentals     │
│    └─> useEffect checks session  │
│    └─> Auto-fills from user.name │
│                                  │
│ 3. Field shows with gray bg      │
│    └─> Indicates it's pre-filled │
│    └─> User can edit if needed   │
│                                  │
│ Example:                         │
│ ┌──────────────────────────────┐ │
│ │ Hannah Vanessa               │ │ ← Read-only style
│ └──────────────────────────────┘ │
│                                  │
└──────────────────────────────────┘
```

### 2️⃣ Contact Number Field
```
┌──────────────────────────────────┐
│ CONTACT NUMBER *                 │
│ +63 followed by 10 digits        │
├──────────────────────────────────┤
│                                  │
│ Input Flow:                      │
│                                  │
│ User types: 9171234567 (10 digits)
│                ↓                 │
│ Function removes non-digits      │
│                ↓                 │
│ Takes first 10 digits only       │
│                ↓                 │
│ Prepends "+63 "                  │
│                ↓                 │
│ Result: +63 9171234567           │
│                                  │
│ Prevents:                        │
│ ✗ More than 10 digits            │
│ ✗ Special characters (auto-strip)│
│ ✗ Submission without 10 digits   │
│                                  │
│ Example:                         │
│ ┌──────────────────────────────┐ │
│ │ +63 9171234567               │ │
│ └──────────────────────────────┘ │
│                                  │
│ maxLength={14}  (secure limit)   │
│                                  │
└──────────────────────────────────┘
```

### 3️⃣ Gown Selection Field
```
┌──────────────────────────────────┐
│ GOWN SELECTION *                 │
├──────────────────────────────────┤
│                                  │
│ How it gets selected:            │
│                                  │
│ FROM COLLECTION PAGE:            │
│ 1. User clicks "Book Now"        │
│ 2. Passes selectedGown via params│
│ 3. Rentals receives it           │
│ 4. useEffect auto-fills:         │
│    - gownId                      │
│    - gownName                    │
│                                  │
│ OR MANUAL SELECTION:             │
│ 1. User clicks any gown card     │
│ 2. Card highlights (black bg)    │
│ 3. gownId and gownName update    │
│                                  │
│ Each Card Shows:                 │
│ ┌────────────────────────────┐   │
│ │ Midnight Elegance          │   │
│ │ ₱3500/day                  │   │
│ └────────────────────────────┘   │
│          ↓ Click              │
│ ┌────────────────────────────┐   │
│ │ Midnight Elegance  (BLACK) │   │ ← Selected
│ │ ₱3500/day    (GOLD TEXT)   │   │
│ └────────────────────────────┘   │
│                                  │
│ Available Gowns:                 │
│ • Midnight Elegance - ₱3500/day  │
│ • Pearl Romance - ₱8000/day      │
│ • Golden Hour - ₱4200/day        │
│ • Crimson Dreams - ₱5500/day     │
│                                  │
└──────────────────────────────────┘
```

### 4️⃣ & 5️⃣ Date Fields (Start & End)
```
┌──────────────────────────────────┐
│ START DATE *      END DATE *     │
├──────────────────────────────────┤
│                                  │
│ Initial State:                   │
│ Both default to TODAY            │
│ ┌─────────────┐ ┌─────────────┐ │
│ │📅 2026-02-03│ │📅 2026-02-03│ │
│ └─────────────┘ └─────────────┘ │
│                                  │
│ START DATE Constraints:          │
│ • Cannot select dates before     │
│   today                          │
│ • minimumDate = today            │
│ • Opens calendar picker on click │
│ • Updates YYYY-MM-DD format      │
│                                  │
│ END DATE Constraints:            │
│ • Cannot select before START     │
│   date                           │
│ • minimumDate = startDate        │
│ • Shows error if violated        │
│ • Opens calendar picker on click │
│ • Updates YYYY-MM-DD format      │
│                                  │
│ User Flow:                       │
│ 1. Click START DATE field        │
│ 2. Calendar picker opens         │
│ 3. Select date (e.g., Feb 10)    │
│    ┌─────────────┐               │
│    │📅 2026-02-10│ ← Selected    │
│    └─────────────┘               │
│ 4. Click END DATE field          │
│ 5. Calendar only shows dates ≥   │
│    Feb 10                        │
│ 6. Select date (e.g., Feb 12)    │
│    ┌─────────────┐               │
│    │📅 2026-02-12│ ← Selected    │
│    └─────────────┘               │
│ 7. Duration auto-updates to 2    │
│                                  │
│ Invalid Selection:               │
│ Select END: Feb 9 (before Feb 10)│
│       ↓                          │
│ Alert: "End date cannot be       │
│        before start date"        │
│       ↓                          │
│ END DATE not updated             │
│                                  │
└──────────────────────────────────┘
```

### 6️⃣ Branch Location Field
```
┌──────────────────────────────────┐
│ BRANCH LOCATION *                │
├──────────────────────────────────┤
│                                  │
│ How it gets selected:            │
│                                  │
│ FROM COLLECTION PAGE:            │
│ 1. User clicks "Book Now"        │
│ 2. Passes selectedBranch         │
│ 3. Rentals receives it           │
│ 4. useEffect auto-selects        │
│                                  │
│ OR MANUAL SELECTION:             │
│ 1. Click dropdown                │
│ 2. Shows all branch options      │
│ 3. Select one                    │
│ 4. Highlighted in black          │
│                                  │
│ Dropdown View:                   │
│ ┌──────────────────────────────┐ │
│ │ Taguig Main - Cadena de Amor │ │
│ │ BGC Branch                   │ │ ← Selected
│ │ Makati Branch                │ │
│ │ Quezon City                  │ │
│ └──────────────────────────────┘ │
│                                  │
└──────────────────────────────────┘
```

---

## 🧮 Summary Card Auto-Calculation

```
User selects:
├─ Gown: Pearl Romance (₱8000/day)
├─ Start: 2026-02-10
└─ End: 2026-02-13

Calculate Duration:
└─ days = (Feb 13 - Feb 10) = 3 days

Get Price:
└─ price = ₱8000/day

Calculate Total:
└─ total = 3 × ₱8000 = ₱24,000

Calculate Downpayment:
└─ downpayment = ₱24,000 ÷ 2 = ₱12,000

Display Summary:
┌────────────────────────────────┐
│ RENTAL SUMMARY                 │
├────────────────────────────────┤
│ Gown: Pearl Romance            │
│ Duration: 3 days               │
│ Daily Rate: ₱8,000             │
├────────────────────────────────┤
│ Total Amount: ₱24,000          │
│ Downpayment (50%): ₱12,000     │
└────────────────────────────────┘

Real-Time Updates:
If user changes End Date to Feb 12:
├─ Duration recalculates: 2 days
├─ Total recalculates: ₱16,000
└─ Downpayment recalculates: ₱8,000
    ↓ (Instant, no delay)
```

---

## ✅ Form Validation

### Before Submission

```
Required Fields Check:
├─ ✓ Customer Name (not empty)
├─ ✓ Contact Number (exactly 10 digits)
├─ ✓ Gown Selection (not empty)
├─ ✓ Start Date (not empty)
└─ ✓ End Date (not empty)

If ANY required field is missing:
└─ Alert: "Please fill in all required fields"
└─ Form NOT submitted
└─ User must complete the form

If Contact Number < 10 digits:
└─ Alert: "Contact number must be 10 digits"
└─ Form NOT submitted

If ALL validations pass:
└─ Create rental record
└─ Add to userRentals
└─ Show success alert
└─ Auto-switch to "My Rentals" tab
└─ Display new rental in list
```

---

## 🎯 Tab Switching

### NEW RENTAL Tab (Default)
```
Shows:
├─ Form to book new rental
├─ All input fields
├─ Gown selection
├─ Date pickers
└─ Submit button
```

### MY RENTALS Tab
```
Shows:
├─ List of past/current rentals
├─ Status badges (Active, Pending)
├─ Dates, location, ID
├─ Total and paid amounts
└─ Empty state if no rentals

When user submits:
└─ Rental auto-appears here
└─ Tab switches automatically
```

---

## 📊 Data Validation Flow

```
User Input → Validation → Action
     ↓           ↓           ↓

Contact#     <10 or >10    Show error, don't accept
"9171234567"  digits?       ✗ Blocked

Contact#     Exactly 10    Format with +63 prefix
"9171234567"  digits?       ✓ "+63 9171234567"

End Date      Before        Show alert
"Feb 9"       start date?   ✗ Blocked

End Date      On/after      Accept selection
"Feb 12"      start date?   ✓ "2026-02-12"

All fields    Any missing?  Show alert
submitted                   ✗ Submission blocked

All fields    All present?  Create record
submitted                   ✓ Success alert
```

---

## 🎨 Visual States

### Unselected Gown
```
┌────────────────────┐
│ Midnight Elegance  │ ← White bg
│ ₱3500/day          │ ← Brown text
└────────────────────┘
```

### Selected Gown
```
┌────────────────────┐
│ Midnight Elegance  │ ← Black bg
│ ₱3500/day          │ ← Gold text
└────────────────────┘
```

### Unselected Branch
```
┌──────────────────────────────┐
│ Taguig Main - Cadena de Amor │ ← Brown text
└──────────────────────────────┘
```

### Selected Branch
```
┌──────────────────────────────┐
│ Taguig Main - Cadena de Amor │ ← White text
└──────────────────────────────┘
(Black background)
```

---

That's your complete visual guide! 🎉
