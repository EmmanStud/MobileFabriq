## "TypeError: Network request failed" - Troubleshooting Guide

### ✅ Issues Fixed

1. **Double `/api` path** - Fixed `/api/api/debug/clear-rentals` → `/api/debug/clear-rentals`
2. **Android HTTP traffic** - Added cleartext traffic configuration to `app.json`
3. **Better logging** - Added network request logging to `apiConfig.js`

---

### 🔍 Step-by-Step Troubleshooting

#### **Step 1: Verify Backend is Running**
```bash
# Test if backend is accessible from your computer
curl http://192.168.1.6:5000/api/health

# You should see:
# {"status":"ok"} or similar
```

**If you get "Connection refused" or timeout:**
- Ensure your backend server is running (`npm start` in backend folder)
- Verify it's listening on port 5000
- Check that you're using the correct IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

---

#### **Step 2: Check Device/Emulator Network Configuration**

**iOS Simulator:**
- ✅ Can reach your computer at `192.168.1.6`
- No special configuration needed

**Android Emulator:**
- ✅ Can reach your computer at `192.168.1.6` (NOT 10.0.2.2 for local network)
- ✅ HTTP support enabled in `app.json`

**Physical iOS Device:**
- ✅ Must be on same WiFi network as your computer
- Verify: Check device settings → Wi-Fi → Connected network

**Physical Android Device:**
- ✅ Must be on same WiFi network as your computer
- ✅ HTTP support enabled (configured in `app.json`)
- May need to disable VPN or proxy

---

#### **Step 3: Check Your IP Address**

If you changed networks, the IP might have changed:

```bash
# Windows: Run in Command Prompt
ipconfig

# Look for "IPv4 Address" under "Wireless LAN adapter Wi-Fi"
# Example: 192.168.1.6
```

**Update in `apiConfig.js`:**
```javascript
const LOCAL_IP = '192.168.1.6'; // Update if different
```

---

#### **Step 4: Test API Endpoint Manually**

From your computer:
```bash
# Test if API is responding
curl -X GET http://192.168.1.6:5000/api/health
curl -X POST http://192.168.1.6:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"hash123"}'
```

From your **phone** (if you have a terminal app):
- iOS: Use SSH or web browser
- Android: Use ADB or Chrome DevTools

---

#### **Step 5: Check Request/Response Format**

All API requests should have:
- ✅ `Content-Type: application/json` header
- ✅ HTTP method: GET, POST, PUT, DELETE (not HTTPS)
- ✅ Correct JSON body format

---

#### **Step 6: Review Console Logs**

Watch the Expo console for API errors:

```
📡 API Request: POST http://192.168.1.6:5000/api/users
✅ API Response: 201 Created
```

If you see `❌ API Error`, check the error message:
- `Request timeout` - Backend too slow or not working
- `Network request failed` - Can't reach IP/port
- `ECONNREFUSED` - Backend not running

---

### 🛠️ Common Issues & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| Network request failed | Can't reach backend | Check IP, verify backend is running, same network |
| Request timeout | Backend very slow | Increase timeout in `apiConfig.js` |
| Net::ERR_CLEARTEXT_NOT_PERMITTED | Android blocking HTTP | Already fixed in `app.json` |
| 404 Not Found | Wrong API endpoint | Check backend routes match frontend calls |
| 500 Server Error | Backend error | Check backend logs |
| CORS error | Backend CORS config | Backend should allow requests from phone IP |

---

### 📋 Files Modified

| File | Change |
|------|--------|
| `services/mongodbService.js` | Fixed `/api/api` → `/api` |
| `app.json` | Added cleartext traffic config |
| `services/apiConfig.js` | Added logging for debugging |

---

### 🧪 Testing Checklist

- [ ] Backend running on port 5000
- [ ] IP address in `apiConfig.js` is correct
- [ ] Phone/device on same WiFi network
- [ ] Test with `curl` from computer works
- [ ] Check console logs for errors
- [ ] Try signing up - should see API logs
- [ ] Try logging in - should work
- [ ] Check profile/rentals - should work

---

### 📞 Still Having Issues?

**Check these first:**
1. What's the exact error message in console logs?
2. What does `curl http://192.168.1.6:5000/api/health` return?
3. Is your phone on the same WiFi network?
4. Did you rebuild/restart the Expo app after changes?

**Post error details:**
- Console error message
- API endpoints that fail
- Device type (iOS/Android, simulator/physical)
- What you were trying to do

