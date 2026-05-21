# Rentals Page - Quick Feature Reference

## 🎯 Key Features at a Glance

### Feature 1: Auto-Filled Customer Name
```
User Signs Up with name "John Doe"
    ↓
User navigates to Rentals
    ↓
Customer Name field auto-fills with "John Doe"
    ↓
User can see it's pre-filled (grayed out background)
```

### Feature 2: Smart Contact Number Input
```
Phone Format: +63 followed by 10 digits
Example: +63 9171234567

Implementation:
- Prefix +63 automatically added
- User types only the 10-digit number
- Maximum length set to 14 chars (+63 + space + 10 digits)
- Validation ensures exactly 10 digits before submit
- Placeholder shows: "+63 9xxxxxxxxx"
```

### Feature 3: Auto-Fill from Collection
When user clicks "Book Now" in Collection page:
```
Collection.jsx:
  ↓ Passes selectedGown & selectedBranch
Rentals.jsx:
  ↓ Receives via route params
Form auto-fills:
  - Gown Name and ID
  - Branch Location
  - User can still change both if needed
```

### Feature 4: Calendar Date Selection
```
Start Date:
- Default: Today (cannot select past dates)
- Click to open calendar picker
- Select desired start date

End Date:
- Default: Today
- Cannot select before start date
- Click to open calendar picker
- Calendar shows only valid dates as minimum

Format: YYYY-MM-DD (e.g., 2026-02-03)
```

### Feature 5: Rental Summary Auto-Calculation
```
User selects:
- Gown: Midnight Elegance (₱3500/day)
- Start: 2026-02-01
- End: 2026-02-03
- Duration: 3 days

Summary automatically calculates:
┌─────────────────────────────────┐
│ Gown: Midnight Elegance         │
│ Duration: 3 days                │
│ Daily Rate: ₱3,500              │
├─────────────────────────────────┤
│ Total Amount: ₱10,500           │
│ Downpayment (50%): ₱5,250       │
└─────────────────────────────────┘

Formula:
- Total = Duration × Daily Rate
- Downpayment = Total ÷ 2
```

### Feature 6: Unified Design
All pages now have:
- Same header (Hannah Vanessa logo + menu)
- Same footer (newsletter, links, social)
- Same hamburger menu design
- Consistent color scheme and typography

## 🧪 How to Test

### Test 1: Auto-Fill from Sign-up
1. Sign up with name "Hannah Vanessa"
2. Navigate to Rentals
3. Verify Customer Name shows "Hannah Vanessa"

### Test 2: Contact Number Format
1. Click Contact Number field
2. Type: 9171234567
3. Verify it shows as: +63 9171234567
4. Try typing more than 10 digits - should not allow

### Test 3: Book from Collection
1. Go to Collection page
2. Click "Book Now" on any gown
3. In Rentals page, verify:
   - Gown name is pre-selected
   - Branch location is pre-selected
   - Can manually change both

### Test 4: Date Validation
1. Select Start Date: 2026-02-10
2. Try to select End Date: 2026-02-09
3. Should show alert: "End date cannot be before start date"
4. Select End Date: 2026-02-12
5. Should work, calculates 2 days duration

### Test 5: Real-time Summary Update
1. Select Gown: Pearl Romance (₱8000/day)
2. Select dates 2-5 days apart
3. Watch summary update:
   - Daily Rate: ₱8,000
   - Total Amount: ₱24,000 (for 3 days)
   - Downpayment: ₱12,000

### Test 6: Form Submission
1. Fill all required fields (marked with *)
2. Click "Submit Rental Request"
3. Should show success alert
4. Switch to "My Rentals" tab
5. Your new rental should appear in the list

## 🔧 Technical Details

### State Management
```javascript
formData = {
  gownId: '',           // Auto-set from Collection
  gownName: '',         // Auto-set from Collection
  startDate: Date,      // Date object for picker
  endDate: Date,        // Date object for picker
  startDateString: '',  // YYYY-MM-DD format
  endDateString: '',    // YYYY-MM-DD format
  branch: '',           // Auto-set from Collection
  customerName: '',     // Auto-filled from session
  contactNumber: '',    // Formatted as +63 XXXXXXXXXX
  eventType: '',        // Optional, user input
}
```

### Key Functions
- `calculateDuration()` - Days between start and end dates
- `getSelectedGownPrice()` - Gets price from gownOptions
- `calculateTotalPrice()` - Duration × Price
- `calculateDownpayment()` - Total Price ÷ 2
- `handleContactNumberChange()` - Formats phone number
- `handleStartDateChange()` - Updates start date
- `handleEndDateChange()` - Updates end date with validation

## 📦 New Package Installed
```bash
npm install @react-native-community/datetimepicker
```

This provides:
- iOS: Spinner-style date picker
- Android: Calendar-style date picker
- Cross-platform consistency
