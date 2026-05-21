# Password Reset Backend Route - Implementation Guide

## 🔴 The Problem: 404 Not Found

**Frontend Request:**
```
PUT /api/users/reset-password
```

**Error:**
```
404 Not Found – Cannot PUT /api/users/reset-password
```

**Root Cause:** The backend doesn't have this route defined.

---

## ✅ The Solution: Add Reset Password Route

### Route Details

| Property | Value |
|----------|-------|
| **HTTP Method** | `PUT` (not POST) |
| **Endpoint** | `/api/users/reset-password` |
| **Request Body** | `{ email, password }` |
| **Password Format** | SHA-256 hashed (from client) |
| **Response** | `{ success, message, user }` |

### Backend Implementation

**File: `backend-example/server.js`**

Add this route after the login route (around line 145):

```javascript
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
```

---

## 🔍 How It Works

### Request Flow

```
Frontend (passwordResetService.js)
    ↓
fetch(PUT /api/users/reset-password)
    ├─ email: "user@gmail.com"
    └─ password: "a1b2c3..." (SHA-256 hash)
    ↓
Backend (server.js - reset password route)
    ├─ Validate email and password not empty
    ├─ Find user by lowercase email
    ├─ Update password field with hashed value
    └─ Return user (password excluded)
    ↓
Response
    ├─ success: true
    ├─ message: "Password reset successfully"
    └─ user: { name, email, createdAt }
    ↓
Frontend shows success modal
```

### Request/Response Example

**Request:**
```javascript
PUT http://localhost:5000/api/users/reset-password

{
  "email": "user@gmail.com",
  "password": "7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c"
}
```

**Success Response (200 OK):**
```javascript
{
  "success": true,
  "message": "Password reset successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "user@gmail.com",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Error Response (404):**
```javascript
{
  "error": "User not found"
}
```

---

## 🔐 Security Notes

### ✅ What's Already Secure

1. **Password hashing on client**
   - Frontend hashes password using SHA-256 before sending
   - Backend never receives plaintext password

2. **Direct hash comparison**
   - Backend stores and compares hashes only
   - No double-hashing

3. **No password in response**
   - Response excludes password field
   - Only user metadata returned

### ✅ Additional Best Practices

1. **Email validation** - Route checks email exists before updating
2. **Input validation** - Route validates both email and password required
3. **Error handling** - Proper HTTP status codes (400, 404, 500)
4. **Lowercase emails** - Emails normalized to lowercase for consistency

---

## 📋 Implementation Checklist

- [x] Add `PUT /api/users/reset-password` route
- [x] Validate email and password in request body
- [x] Find user by lowercase email
- [x] Update password with hashed value
- [x] Return user without password field
- [x] Handle errors gracefully
- [ ] Test with frontend (next step)

---

## 🧪 Testing the Route

### Using cURL

```bash
curl -X PUT http://localhost:5000/api/users/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@gmail.com",
    "password": "7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c"
  }'
```

### Using Postman

1. **Method:** PUT
2. **URL:** `http://localhost:5000/api/users/reset-password`
3. **Headers:** `Content-Type: application/json`
4. **Body (JSON):**
```json
{
  "email": "user@gmail.com",
  "password": "7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c"
}
```

### Testing Frontend

1. Start backend: `npm start` (in `backend-example/`)
2. Open app in browser/device
3. Click "Forgot Password?"
4. Enter email, click "Send Code"
5. Enter received code, click "Verify Code"
6. Enter new password, click "Reset Password"
7. Should see success modal and auto-redirect to login
8. Log in with new password

---

## 🐛 Troubleshooting

### Still Getting 404?

1. **Restart backend server**
   ```bash
   cd backend-example
   npm start
   ```

2. **Check server is running**
   - Visit `http://localhost:5000/api/health`
   - Should see `{ status: "OK" }`

3. **Verify endpoint is correct**
   - Check `mongodbService.js` line 176
   - Should be: `/api/users/reset-password`

4. **Check MongoDB is connected**
   - Console should show: `✅ Connected to MongoDB`

### Password Not Updating?

1. **Check user exists**
   - Verify email in database matches request email
   - Frontend lowercases email, backend does too

2. **Check password format**
   - Should be SHA-256 hash string
   - Check browser console for actual value being sent

3. **Check MongoDB permissions**
   - User account must have write access to database

### Getting 400 Bad Request?

1. **Check request body**
   - Both `email` and `password` must be present
   - Neither can be empty

2. **Check Content-Type header**
   - Must be `application/json`

---

## 📁 Files Modified

| File | Change |
|------|--------|
| `backend-example/server.js` | Added PUT /api/users/reset-password route |
| `services/mongodbService.js` | Already calls this route (no change) |
| `screens/Home.jsx` | Already calls updatePassword (no change) |

---

## 🚀 Next Steps

1. ✅ Add route to backend (done)
2. ⏳ Restart backend server
3. ⏳ Test forgot password flow end-to-end
4. ⏳ Verify email can log in with new password

---

## 📚 Related Files

- **Frontend caller:** `services/passwordResetService.js` → `resetPassword()`
- **API caller:** `services/mongodbService.js` → `updatePassword()`
- **Route handler:** `backend-example/server.js` → `PUT /api/users/reset-password`

---

**Status:** ✅ Backend route implemented and ready for testing
