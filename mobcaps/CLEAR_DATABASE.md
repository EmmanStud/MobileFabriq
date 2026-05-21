# Clear Local Database & Switch to MongoDB

Guide to clear AsyncStorage data and switch to MongoDB Compass.

## 🗑️ Step 1: Clear Existing Local Data

### Option A: Using the Clear Utility (Recommended)

1. Open your app's console/terminal
2. In your app code, temporarily add this to clear data:

```javascript
// Add this temporarily to Home.jsx or create a test file
import { clearAllLocalData } from './services/clearDatabase';

// Run once to clear all data
clearAllLocalData().then(() => {
  console.log('✅ All local data cleared!');
});
```

### Option B: Clear Manually via Code

Add this button temporarily to your Home screen to clear data:

```javascript
// In Home.jsx, add this button temporarily
import { clearAllLocalData } from '../services/clearDatabase';

// Add a button in your UI (temporarily)
<TouchableOpacity onPress={async () => {
  await clearAllLocalData();
  Alert.alert('Success', 'All local data cleared!');
}}>
  <Text>Clear Database</Text>
</TouchableOpacity>
```

### Option C: Clear via React Native Debugger

If using React Native Debugger or Expo Dev Tools:

1. Open DevTools
2. Go to AsyncStorage section
3. Delete these keys:
   - `@mobcaps_users`
   - `@mobcaps_session`
   - `@mobcaps_current_user`

## 🗄️ Step 2: Set Up MongoDB Compass

### 2.1 Ensure MongoDB is Running

**Windows:**
- Open **Services** (Win + R, type `services.msc`)
- Find **MongoDB** service
- Make sure it's **Running**
- If not, right-click > **Start**

**Mac:**
```bash
brew services list
# Should show mongodb-community as "started"
```

**Linux:**
```bash
sudo systemctl status mongod
# Should show "active (running)"
```

### 2.2 Open MongoDB Compass

1. Open **MongoDB Compass**
2. Connect to: `mongodb://localhost:27017`
3. Click **Connect**

### 2.3 Create Database (Optional)

The database will be created automatically, but you can create it manually:

1. In Compass, click **CREATE DATABASE**
2. Database name: `mobcaps`
3. Collection name: `users`
4. Click **Create Database**

## 🚀 Step 3: Set Up Backend API

### 3.1 Navigate to Backend Folder

```bash
cd mobcaps/backend-example
```

### 3.2 Install Dependencies

```bash
npm install
```

### 3.3 Create .env File

Create a file named `.env` in the `backend-example` folder:

```env
MONGODB_URI=mongodb://localhost:27017/mobcaps
PORT=3000
```

### 3.4 Start Backend Server

```bash
npm start
```

You should see:
```
✅ Connected to MongoDB
🚀 Server running on http://localhost:3000
📡 API endpoints available at http://localhost:3000/api
```

### 3.5 Test Backend

Open browser and go to:
```
http://localhost:3000/api/health
```

Should return:
```json
{"status":"OK","message":"MongoDB API is running"}
```

## 📱 Step 4: Update App Configuration

### 4.1 Update MongoDB Service URL

Open `mobcaps/services/mongodbService.js`:

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
   - Mac/Linux: `ifconfig`
2. Update:
```javascript
const MONGODB_API_URL = 'http://YOUR_IP:3000/api';
// Example: 'http://192.168.1.100:3000/api'
```

### 4.2 Verify Code is Updated

The code is already updated to use MongoDB! Check `authService.js` - it now uses `mongodbService` instead of AsyncStorage.

## ✅ Step 5: Test Everything

1. **Clear old data** (if not done yet)
2. **Start backend server** (`npm start` in backend-example)
3. **Restart your app**
4. **Try signing up** with a new account
5. **Check MongoDB Compass**:
   - Open `mobcaps` database
   - Open `users` collection
   - You should see your new user!

## 🐛 Troubleshooting

### "Network request failed"

**Check:**
- ✅ Backend server is running (`npm start` in backend-example)
- ✅ MongoDB service is running
- ✅ Correct API URL for your device:
  - iOS: `http://localhost:3000/api`
  - Android: `http://10.0.2.2:3000/api`
  - Physical: `http://YOUR_IP:3000/api`

### "MongoDB connection error" in backend

**Check:**
- ✅ MongoDB service is running
- ✅ Connection string: `mongodb://localhost:27017/mobcaps`
- ✅ No typo in `.env` file

### Can't see data in Compass

**Check:**
- ✅ Database name: `mobcaps`
- ✅ Collection name: `users`
- ✅ Refresh Compass (click refresh button)
- ✅ Check backend logs for errors

### Old users still showing

**Solution:**
- Clear AsyncStorage data using the utility
- Or manually delete the keys in DevTools
- Restart app

## 🎉 Success!

Once everything is set up:
- ✅ All data stored in MongoDB Compass
- ✅ View users in Compass GUI
- ✅ No more local storage
- ✅ Data persists across app reinstalls

---

**Need help?** Check backend server logs for detailed error messages!

