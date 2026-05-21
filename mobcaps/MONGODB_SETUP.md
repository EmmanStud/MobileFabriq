# MongoDB Setup Guide

Complete guide to set up MongoDB for your app.

**Choose your setup:**
- **MongoDB Compass (Local)**: See `MONGODB_COMPASS_SETUP.md` for local MongoDB setup
- **MongoDB Atlas (Cloud)**: Follow this guide for cloud MongoDB

## 🎯 Quick Start

1. **Create MongoDB Atlas account** (free)
2. **Create cluster** (free tier available)
3. **Set up backend API** (Node.js/Express)
4. **Connect your app**

---

## 📋 Step-by-Step Instructions

### Step 1: Create MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up with email or Google
3. Verify your email address

### Step 2: Create a Free Cluster

1. After login, click **Build a Database**
2. Choose **FREE** (M0) tier
3. Select:
   - **Cloud Provider**: AWS (or your preference)
   - **Region**: Choose closest to you
4. Click **Create**

⏱️ **Wait 3-5 minutes** for cluster to be created

### Step 3: Create Database User

1. Go to **Database Access** (left sidebar)
2. Click **Add New Database User**
3. Choose **Password** authentication
4. Enter:
   - **Username**: `mobcaps_user` (or your choice)
   - **Password**: Generate secure password (save it!)
5. Set privileges: **Read and write to any database**
6. Click **Add User**

💾 **Save your username and password!**

### Step 4: Get Connection String

1. Go to **Database** (left sidebar) > **Connect**
2. Choose **Connect your application**
3. Select **Node.js** and version **5.5 or later**
4. Copy the connection string

It looks like:
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

5. Replace:
   - `<username>` with your database username
   - `<password>` with your database password
   - Add database name: `...mongodb.net/mobcaps?...`

Final string:
```
mongodb+srv://mobcaps_user:yourpassword@cluster0.xxxxx.mongodb.net/mobcaps?retryWrites=true&w=majority
```

### Step 5: Set Up Backend API

#### 5.1 Create Backend Folder

```bash
# In your project root
mkdir backend
cd backend
```

#### 5.2 Copy Backend Files

Copy these files from `mobcaps/backend-example/`:
- `server.js`
- `package.json`
- `.env.example` (rename to `.env`)

#### 5.3 Install Dependencies

```bash
npm install
```

#### 5.4 Configure Environment

1. Open `.env` file
2. Paste your MongoDB connection string:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/mobcaps?retryWrites=true&w=majority
   PORT=3000
   ```

#### 5.5 Start Server

```bash
npm start
```

You should see:
```
✅ Connected to MongoDB
🚀 Server running on http://localhost:3000
📡 API endpoints available at http://localhost:3000/api
```

### Step 6: Configure Network Access

1. Go to **Network Access** in MongoDB Atlas
2. Click **Add IP Address**
3. For development: Click **Allow Access from Anywhere**
   - IP Address: `0.0.0.0/0`
   - Comment: "Development"
4. Click **Confirm**

⚠️ **For production**, only allow your server's IP address!

### Step 7: Update React Native App

#### 7.1 Update MongoDB Service

Open `mobcaps/services/mongodbService.js`:

```javascript
// For local development (if using emulator/simulator):
const MONGODB_API_URL = 'http://10.0.2.2:3000/api'; // Android emulator
// OR
const MONGODB_API_URL = 'http://localhost:3000/api'; // iOS simulator

// For production (deploy your backend):
const MONGODB_API_URL = 'https://your-api.com/api';
```

#### 7.2 Switch to MongoDB

Open `mobcaps/services/authService.js`:

**Replace this:**
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

const USERS_KEY = '@mobcaps_users';

export const userDB = {
  // ... AsyncStorage implementation
};
```

**With this:**
```javascript
import { mongodbService as userDB } from './mongodbService';

// Remove the AsyncStorage userDB object entirely
```

### Step 8: Test Everything

1. **Test Backend API:**
   ```bash
   curl http://localhost:3000/api/health
   ```
   Should return: `{"status":"OK","message":"MongoDB API is running"}`

2. **Test in App:**
   - Start your React Native app
   - Try signing up
   - Check MongoDB Atlas dashboard > **Collections** to see your data

---

## 🔧 Troubleshooting

### "MongoDB connection error"
- ✅ Check connection string is correct
- ✅ Verify username/password
- ✅ Check Network Access allows your IP
- ✅ Ensure cluster is running (not paused)

### "Network request failed" in app
- ✅ Backend server is running
- ✅ Use correct API URL:
  - Android emulator: `http://10.0.2.2:3000/api`
  - iOS simulator: `http://localhost:3000/api`
  - Physical device: Use your computer's IP (e.g., `http://192.168.1.100:3000/api`)

### "User already exists" error
- ✅ Check MongoDB Atlas > Collections > users
- ✅ Delete test data if needed

### Backend won't start
- ✅ Check `.env` file exists
- ✅ Verify MONGODB_URI is correct
- ✅ Run `npm install` again

---

## 📱 Using on Physical Device

If testing on a real phone:

1. **Find your computer's IP:**
   - Windows: `ipconfig` (look for IPv4)
   - Mac/Linux: `ifconfig` or `ip addr`

2. **Update API URL:**
   ```javascript
   const MONGODB_API_URL = 'http://YOUR_COMPUTER_IP:3000/api';
   // Example: 'http://192.168.1.100:3000/api'
   ```

3. **Ensure phone and computer are on same WiFi**

---

## 🚀 Production Deployment

### Deploy Backend API

Options:
- **Heroku**: Free tier available
- **Railway**: Easy deployment
- **Render**: Free tier
- **AWS/Google Cloud**: More control

### Update API URL

In `mongodbService.js`:
```javascript
const MONGODB_API_URL = 'https://your-deployed-api.com/api';
```

### Secure MongoDB

1. **Network Access**: Only allow your server's IP
2. **Database User**: Use strong password
3. **Enable Authentication**: Already enabled by default
4. **Use Environment Variables**: Never commit `.env` file

---

## 📊 MongoDB Atlas Dashboard

You can view your data:
1. Go to **Database** > **Browse Collections**
2. See all users stored in `users` collection
3. View, edit, or delete data

---

## ✅ Checklist

- [ ] MongoDB Atlas account created
- [ ] Cluster created and running
- [ ] Database user created
- [ ] Connection string obtained
- [ ] Backend API set up and running
- [ ] Network access configured
- [ ] App updated to use MongoDB service
- [ ] Tested signup/login
- [ ] Data visible in MongoDB Atlas

---

**Need help?** Check MongoDB Atlas documentation or the backend server logs!

