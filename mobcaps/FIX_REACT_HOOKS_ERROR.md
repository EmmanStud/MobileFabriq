# Fix React Hooks Error

## The Problem
"Invalid hook call" error usually means:
1. Multiple React instances
2. React version mismatch
3. Cache issues

## Solution

### Step 1: Fix React Version
React Native 0.81.5 requires React 19.1.0. The package.json has been updated.

### Step 2: Clear All Caches

Run these commands in order:

```bash
# 1. Clear npm cache
npm cache clean --force

# 2. Delete node_modules and reinstall
rm -rf node_modules
npm install

# 3. Clear Expo cache
npx expo start --clear

# OR if using Expo CLI directly:
expo start --clear
```

### Step 3: For Windows PowerShell

```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules
Remove-Item -Recurse -Force node_modules

# Reinstall
npm install

# Start with cleared cache
npx expo start --clear
```

### Step 4: If Still Not Working

1. **Close all terminals**
2. **Delete these folders:**
   - `node_modules`
   - `.expo` (if exists)
3. **Reinstall:**
   ```bash
   npm install
   ```
4. **Start fresh:**
   ```bash
   npx expo start --clear
   ```

### Step 5: Check for Multiple React Instances

If error persists, check for duplicate React:

```bash
npm ls react
```

Should show only ONE React version. If you see multiple, there's a conflict.

## Quick Fix Commands (Copy & Paste)

**Windows:**
```powershell
cd C:\Users\Asus\Desktop\MobileFabriQ\mobcaps
npm cache clean --force
Remove-Item -Recurse -Force node_modules
npm install
npx expo start --clear
```

**Mac/Linux:**
```bash
cd mobcaps
npm cache clean --force
rm -rf node_modules
npm install
npx expo start --clear
```

## After Fixing

1. Restart your app
2. The hooks error should be gone
3. Your app should work normally

---

**The package.json has been fixed to use React 19.1.0 (required by React Native 0.81.5)**

