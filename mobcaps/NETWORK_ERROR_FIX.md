## "Network request failed" - Immediate Fixes

**You just received this error:**
```
ERROR  Error finding user: [TypeError: Network request failed]
```

This means the app **cannot reach your backend API**. Here's how to fix it:

---

### 🔧 Quick Fix (3 Steps)

**Step 1: Verify Backend is Running**
```bash
# Your backend is listening on port 5000 ✅
# But check it's actually responding:
curl http://192.168.1.6:5000/api/health
```

**Step 2: Check Your IP**
The app is trying to reach: `http://192.168.1.6:5000/api`

Is that your actual computer IP?
```bash
# Check your current IP:
ipconfig
```

**Step 3: Restart Everything**
1. Stop backend: Press `Ctrl+C` in backend terminal
2. Stop Expo app: Press `Ctrl+C` in Expo terminal  
3. Restart backend: `npm start` (in backend folder)
4. Restart app: `npm start` (in mobcaps folder)
5. Try again

---

### 📱 Make Sure:

- [ ] Backend running (you should see logs printing)
- [ ] Phone/device on **same WiFi network** as computer
- [ ] IP in `apiConfig.js` matches real IP (run `ipconfig`)
- [ ] Timeout increased to 15 seconds (already done ✅)
- [ ] Better error logs added (already done ✅)

---

### 🧪 Test Connection

Add this to **[Home.jsx](screens/Home.jsx)** temporarily:

```javascript
import { validateAPIConfig } from '../services/apiConfig';

// Add in useEffect:
useEffect(() => {
  console.log('🧪 Testing API connection on startup...');
  validateAPIConfig();
}, []);
```

Watch console when app starts - you'll see:
- ✅ If connected: `✅ Backend API is reachable!`
- ❌ If failed: `❌ Cannot reach backend API`

---

### 💡 Common Causes:

| Issue | Fix |
|-------|-----|
| Backend stopped | Restart backend: `npm start` |
| Wrong IP | Update `apiConfig.js` LOCAL_IP |
| Different WiFi network | Check both on same network |
| Firewall blocking | Windows Firewall → Allow exceptions |
| Phone VPN/Proxy | Disable and try again |
| Timeout too short | Already increased to 15s ✅ |

---

### ✅ Recent Improvements Applied:

1. **Increased timeout** from 10s → 15s
2. **Better error logging** - shows what URL failed and why
3. **More helpful messages** - suggests how to debug
4. **Async safety** - proper error handling in all fetch calls

---

### 🆘 If Still Failing:

Check console for the **full error message**. It will show:
- What URL failed
- Why it failed (timeout, connection refused, etc)
- Helpful debugging tips

Tell me the exact error and I'll help debug further!
