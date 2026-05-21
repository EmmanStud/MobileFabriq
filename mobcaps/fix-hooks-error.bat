@echo off
echo Fixing React Hooks Error...
echo.

echo Step 1: Clearing npm cache...
call npm cache clean --force

echo.
echo Step 2: Removing node_modules...
if exist node_modules rmdir /s /q node_modules

echo.
echo Step 3: Reinstalling packages...
call npm install

echo.
echo Step 4: Starting Expo with cleared cache...
call npx expo start --clear

echo.
echo Done! Your app should now work without hooks errors.
pause

