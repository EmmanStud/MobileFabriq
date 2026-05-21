# Services Documentation

## Authentication Service (`authService.js`)

This service handles all user authentication operations with a database abstraction layer.

### Features:
- **Database Abstraction**: Currently uses AsyncStorage, but can be easily swapped for a real database
- **User Management**: Create, find, and verify users
- **Validation Utilities**: Centralized validation functions for all form fields

### Database Migration

To switch from AsyncStorage to a real database (Firebase, MongoDB, etc.):

1. Replace the `userDB` object methods with your database calls
2. Keep the same function signatures
3. Update the return formats to match the expected structure

Example for Firebase:
```javascript
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export const userDB = {
  async create(user) {
    try {
      const docRef = await addDoc(collection(db, 'users'), user);
      return { success: true, user: { id: docRef.id, ...user } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  // ... other methods
};
```

## Email Service (`emailService.js`)

This service handles sending verification emails.

### Setup Options:

#### Option 1: EmailJS (Recommended for Quick Setup)
1. Sign up at https://www.emailjs.com/ (Free tier: 200 emails/month)
2. Create an email service (Gmail, Outlook, etc.)
3. Create an email template with variables: `{{to_email}}` and `{{verification_code}}`
4. Install: `npm install @emailjs/browser`
5. Update `emailService.js` with your credentials

#### Option 2: Backend API
1. Set up a backend endpoint (Node.js, Python, etc.)
2. Update `BACKEND_API_URL` in `emailService.js`
3. Ensure your API accepts: `{ email, code, subject }`

#### Option 3: Test Mode (Current)
- Logs verification codes to console
- Perfect for development and testing

### Current Status
- **Mode**: Test Mode (logs to console)
- **To Enable Real Emails**: Follow Option 1 or 2 above

