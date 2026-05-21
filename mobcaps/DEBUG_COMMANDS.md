## Network Debugging Commands & Tests

### 📋 Quick Test Commands

Run these from **Command Prompt** (Windows) or **Terminal** (Mac/Linux):

```bash
# 1. Test backend is running
curl http://192.168.1.6:5000/api/health

# 2. Test full user endpoint
curl http://192.168.1.6:5000/api/users

# 3. Test with detailed output
curl -v http://192.168.1.6:5000/api/health

# 4. Test POST request
curl -X POST http://192.168.1.6:5000/api/users \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test\",\"email\":\"test@example.com\",\"password\":\"hash123\"}"
```

**Expected responses:**
- ✅ `{"status":"ok"}` or similar - Backend is working
- ❌ `Connection refused` - Backend not running or wrong port
- ❌ `Connection timeout` - Wrong IP or backend is down

---

### 🔧 Diagnostic Checklist

**Before Testing App:**

- [ ] Backend server is running: `npm start` in backend folder
- [ ] Check your actual IP: `ipconfig` (Windows) / `ifconfig` (Mac)
- [ ] Update `apiConfig.js` with correct IP if different
- [ ] Test with `curl` first - must work on your computer
- [ ] Phone/device is on same WiFi network
- [ ] No VPN or proxy blocking HTTP

**While Testing App:**

- [ ] Open VS Code Terminal or Expo console
- [ ] Watch for `📡 API Request:` logs
- [ ] Watch for `✅ API Response:` or `❌ API Error:` logs
- [ ] Sign up and watch the logs flow
- [ ] Check what endpoint is being called
- [ ] Note the response status code (200, 404, 500, etc.)

---

### 🚀 Quick Fix Workflow

If you get "Network request failed":

1. **Stop everything:** Ctrl+C to stop backend and Expo
2. **Check IP:** `ipconfig` → Copy IPv4 Address
3. **Update config:** Update `apiConfig.js` LOCAL_IP with new IP
4. **Restart backend:** `npm start` in backend folder
5. **Restart app:** `npm start` in mobcaps folder
6. **Test curl:** `curl http://[YOUR_IP]:5000/api/health`
7. **Test app:** Try signing up, watch logs

---

### 📱 Platform-Specific Issues

**iOS Simulator:**
```bash
# This should work automatically
curl http://192.168.1.6:5000/api/health
```

**Android Emulator:**
```bash
# Should reach your computer's IP
curl http://192.168.1.6:5000/api/health

# Note: NOT 10.0.2.2 for local network (only for localhost redirect)
```

**Physical iPhone:**
- Must be on same WiFi as computer
- Same IP as emulator
- Check Wi-Fi settings confirm connected network

**Physical Android Device:**
- Must be on same WiFi as computer
- Same IP as emulator
- If still fails: Try disabling VPN, check firewall

---

### 🔐 Firewall Exceptions (If Still Failing)

**Windows Firewall:**
1. Go to: Settings → Privacy & Security → Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Find your backend/node app and click "Allow"

**Mac Firewall:**
1. Go to: System Preferences → Security & Privacy → Firewall Options
2. Check if your backend app needs permission

**Linux (ufw):**
```bash
# Allow port 5000
sudo ufw allow 5000
```

---

### 📊 API Response Status Codes

| Code | Meaning | Your Action |
|------|---------|-------------|
| 200-299 | Success! | Request went through |
| 301-399 | Redirect | May need to follow redirect |
| 400-499 | Client Error | Check request format (JSON, headers) |
| 500-599 | Server Error | Check backend server logs |
| Connection Refused | Backend not running | Start backend server |
| Timeout | Request too slow | Check network, buffer timeout |

---

### 💾 Sample Test Data

Use this to test signup endpoint:

```bash
curl -X POST http://192.168.1.6:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "testuser@example.com",
    "password": "a3d6f4c1b8e2f9d54c7a8b3e6f9c2d5e1a4b7c0d" 
  }'
```

Expected response:
```json
{
  "success": true,
  "user": {
    "id": "...",
    "name": "Test User",
    "email": "testuser@example.com"
  }
}
```

---

### 🆘 Last Resort Debugging

Add this to Home.jsx useEffect to diagnose at startup:

```javascript
import { validateAPIConfig } from '../services/apiConfig';

useEffect(() => {
  // Validate API on app start
  validateAPIConfig().then(result => {
    if (!result.success) {
      console.warn('⚠️ API might not be reachable. Check logs above.');
    }
  });
}, []);
```

Watch console logs when app starts - you'll see connectivity status immediately.

