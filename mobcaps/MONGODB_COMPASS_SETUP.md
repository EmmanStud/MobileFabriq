# MongoDB Compass Setup Guide

Complete guide for using **MongoDB Compass** (local MongoDB) with your app.

## 🎯 What is MongoDB Compass?

MongoDB Compass is a GUI tool for MongoDB. If you're using Compass, you have MongoDB running **locally** on your computer.

---

## ✅ Prerequisites

1. **MongoDB installed** on your computer
2. **MongoDB Compass** installed and running
3. **MongoDB service running** (check in Services/Task Manager)

---

## 📋 Step-by-Step Setup

### Step 1: Verify MongoDB is Running

#### Windows:
1. Open **Services** (Win + R, type `services.msc`)
2. Look for **MongoDB** service
3. Ensure it's **Running**
4. If not running, right-click > **Start**

#### Mac:
```bash
brew services list
# Look for mongodb-community, should show "started"
```

#### Linux:
```bash
sudo systemctl status mongod
# Should show "active (running)"
```

### Step 2: Open MongoDB Compass

1. Open **MongoDB Compass**
2. Connect to: `mongodb://localhost:27017`
3. Click **Connect**

You should see your databases (or empty if first time).

### Step 3: Create Database (Optional)

1. In Compass, click **CREATE DATABASE**
2. Database name: `mobcaps`
3. Collection name: `users`
4. Click **Create Database**

Or the database will be created automatically when you first save data.

### Step 4: Set Up Backend API

#### 4.1 Navigate to Backend Folder

```bash
cd mobcaps/backend-example
```

#### 4.2 Install Dependencies

```bash
npm install
```

#### 4.3 Create .env File

Create a file named `.env` in the `backend-example` folder:

```env
MONGODB_URI=mongodb://localhost:27017/mobcaps
PORT=3000
```

**Important**: 
- Use `localhost` (not `127.0.0.1`)
- Port `27017` is MongoDB default
- Database name: `mobcaps`

#### 4.4 Start Backend Server

```bash
npm start
```

You should see:
```
✅ Connected to MongoDB
🚀 Server running on http://localhost:3000
📡 API endpoints available at http://localhost:3000/api
```

If you see an error, check:
- MongoDB service is running
- Connection string is correct
- No firewall blocking port 27017

### Step 5: Test Backend API

Open browser or use curl:
```
http://localhost:3000/api/health
```

Should return:
```json
{
  "status": "OK",
  "message": "MongoDB API is running"
}
```

### Step 6: Update React Native App

#### 6.1 Update MongoDB Service

Open `mobcaps/services/mongodbService.js`:

```javascript
// For local development (MongoDB Compass):
const MONGODB_API_URL = 'http://localhost:3000/api'; // iOS Simulator
// OR
const MONGODB_API_URL = 'http://10.0.2.2:3000/api'; // Android Emulator
```

**For Physical Device:**
```javascript
// Find your computer's IP address:
// Windows: ipconfig (look for IPv4)
// Mac/Linux: ifconfig
const MONGODB_API_URL = 'http://YOUR_COMPUTER_IP:3000/api';
// Example: 'http://192.168.1.100:3000/api'
```

#### 6.2 Switch to MongoDB in App

Open `mobcaps/services/authService.js`:

**Replace this:**
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

const USERS_KEY = '@mobcaps_users';

export const userDB = {
  // ... AsyncStorage code
};
```

**With this:**
```javascript
import { mongodbService as userDB } from './mongodbService';

// Remove the entire AsyncStorage userDB object
```

### Step 7: Test in App

1. **Start your React Native app**
2. **Try signing up** with a new account
3. **Check MongoDB Compass**:
   - Open Compass
   - Click on `mobcaps` database
   - Click on `users` collection
   - You should see your new user document!

---

## 🔍 Viewing Data in Compass

After creating users, you can:

1. **View all users**: 
   - Open `mobcaps` database
   - Click `users` collection
   - See all user documents

2. **Edit data**:
   - Click on any document
   - Edit fields directly
   - Click **Update**

3. **Delete data**:
   - Click on document
   - Click **Delete**

4. **Query data**:
   - Use the filter bar at top
   - Example: `{ "email": "user@gmail.com" }`

---

## 🐛 Troubleshooting

### "MongoDB connection error" in backend

**Check:**
- ✅ MongoDB service is running
- ✅ Connection string: `mongodb://localhost:27017/mobcaps`
- ✅ No typo in `.env` file
- ✅ MongoDB is installed correctly

**Fix:**
```bash
# Windows: Start MongoDB service
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### "Network request failed" in app

**For iOS Simulator:**
```javascript
const MONGODB_API_URL = 'http://localhost:3000/api';
```

**For Android Emulator:**
```javascript
const MONGODB_API_URL = 'http://10.0.2.2:3000/api';
```

**For Physical Device:**
1. Find your computer's IP:
   - Windows: `ipconfig` → IPv4 Address
   - Mac/Linux: `ifconfig` or `ip addr`
2. Update API URL:
   ```javascript
   const MONGODB_API_URL = 'http://YOUR_IP:3000/api';
   ```
3. Ensure phone and computer are on **same WiFi**

### Backend won't start

**Check:**
- ✅ `npm install` completed successfully
- ✅ `.env` file exists in `backend-example` folder
- ✅ Port 3000 is not already in use
- ✅ MongoDB is running

**Fix port conflict:**
```javascript
// In .env, change to different port:
PORT=3001
```

### Can't see data in Compass

**Check:**
- ✅ Database name is `mobcaps`
- ✅ Collection name is `users`
- ✅ Refresh Compass (click refresh button)
- ✅ Check backend logs for errors

---

## 📱 Testing on Physical Device

### Step 1: Find Your Computer's IP

**Windows:**
```cmd
ipconfig
```
Look for **IPv4 Address** (e.g., `192.168.1.100`)

**Mac/Linux:**
```bash
ifconfig
# or
ip addr
```
Look for `inet` address (e.g., `192.168.1.100`)

### Step 2: Update API URL

In `mongodbService.js`:
```javascript
const MONGODB_API_URL = 'http://192.168.1.100:3000/api'; // Your IP
```

### Step 3: Ensure Same Network

- Phone and computer must be on **same WiFi network**
- Some networks block device-to-device communication
- Try mobile hotspot if needed

### Step 4: Test Connection

1. On phone browser, try: `http://YOUR_IP:3000/api/health`
2. Should return JSON response
3. If it works, app will work too!

---

## 🚀 Production Deployment

For production, you have two options:

### Option 1: Keep Local MongoDB
- Deploy backend to server
- Install MongoDB on server
- Update API URL to server address

### Option 2: Use MongoDB Atlas (Cloud)
- Free tier available
- No server setup needed
- Update connection string in `.env`

---

## ✅ Checklist

- [ ] MongoDB installed and running
- [ ] MongoDB Compass connected to localhost
- [ ] Backend API installed (`npm install`)
- [ ] `.env` file created with correct connection string
- [ ] Backend server running (`npm start`)
- [ ] Health check works (`/api/health`)
- [ ] App updated to use MongoDB service
- [ ] API URL configured correctly
- [ ] Tested signup in app
- [ ] Data visible in Compass

---

## 💡 Tips

1. **Keep Compass open** while developing to see data in real-time
2. **Use Compass filters** to find specific users
3. **Backup data**: Export collections from Compass if needed
4. **Clear test data**: Delete documents in Compass for testing

---

## 📚 Next Steps

1. ✅ Set up backend API
2. ✅ Connect app to MongoDB
3. ✅ Test signup/login
4. 📧 Set up EmailJS for real emails (optional)
5. 🚀 Deploy to production (when ready)

---

**Need help?** Check backend server logs for detailed error messages!

