import React, { useState, useEffect, useRef } from 'react'; 
import { AppState } from 'react-native'; 
import { NavigationContainer } from '@react-navigation/native'; 
import { createNativeStackNavigator } from '@react-navigation/native-stack'; 
import { validateAPIConfig, API_URL } from './services/apiConfig'; 
import { sessionService } from './services/sessionService'; 
import { mongodbService } from './services/mongodbService'; 
 
import SplashScreen from './screens/Splash'; 
import Home from './screens/Home'; 
import Collection from './screens/Collection'; 
import Rentals from './screens/Rentals'; 
import Bespoke from './screens/Bespoke'; 
import Appointments from './screens/Appointments'; 
import Profile from './screens/Profile'; 
import VerifyEmail from './screens/VerifyEmail'; 
import Notifications from './screens/Notifications'; 
import GownDesigner3D from './screens/GownDesigner3D'; 
 
const Stack = createNativeStackNavigator(); 
const POLL_INTERVAL_MS = 30000; 
 
export default function App() { 
  const [isLoaded, setIsLoaded] = useState(false); 
  const [unreadCount, setUnreadCount] = useState(0); 
  const [authToken, setAuthToken] = useState(null); 
  const pollIntervalRef = useRef(null); 
  const appStateRef = useRef(AppState.currentState); 
  const isLoadedRef = useRef(false); 
 
  // Safety net: force past splash after 5s no matter what 
  useEffect(() => { 
    const timeout = setTimeout(() => { 
      if (!isLoadedRef.current) { 
        console.warn('⚠️ Splash timeout fired — forcing isLoaded'); 
        isLoadedRef.current = true; 
        setIsLoaded(true); 
      } 
    }, 5000); 
    return () => clearTimeout(timeout); 
  }, []); 
 
  // Validate API config on startup 
  useEffect(() => { 
    validateAPIConfig().then((result) => { 
      if (!result.success) console.warn('⚠️ Backend unreachable at:', API_URL); 
    }); 
  }, []); 
 
  // Restore session token on startup (independent of splash) 
  useEffect(() => { 
    const checkSession = async () => { 
      try { 
        const session = await sessionService.getSession(); 
        if (session?.token && session?.isLoggedIn) { 
          setAuthToken(session.token); 
        } 
      } catch (err) { 
        console.warn('Session check error:', err); 
      } 
    }; 
    checkSession(); 
  }, []); 
 
  // Notification polling 
  const fetchUnreadCount = async (token) => { 
    if (!token) return; 
    try { 
      const notifications = await mongodbService.getMyNotifications(token); 
      const count = (Array.isArray(notifications) ? notifications : []).filter(n => !n.readAt).length; 
      setUnreadCount(count); 
    } catch (err) {} 
  }; 
 
  const startPolling = (token) => { 
    stopPolling(); 
    fetchUnreadCount(token); 
    pollIntervalRef.current = setInterval(() => fetchUnreadCount(token), POLL_INTERVAL_MS); 
  }; 
 
  const stopPolling = () => { 
    if (pollIntervalRef.current) { 
      clearInterval(pollIntervalRef.current); 
      pollIntervalRef.current = null; 
    } 
  }; 
 
  useEffect(() => { 
    const subscription = AppState.addEventListener('change', (nextState) => { 
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') { 
        if (authToken) fetchUnreadCount(authToken); 
      } 
      appStateRef.current = nextState; 
    }); 
    return () => subscription?.remove(); 
  }, [authToken]); 
 
  useEffect(() => { 
    if (authToken) { 
      startPolling(authToken); 
    } else { 
      stopPolling(); 
      setUnreadCount(0); 
    } 
    return () => stopPolling(); 
  }, [authToken]); 
 
  const handleSplashComplete = () => { 
    isLoadedRef.current = true; 
    setIsLoaded(true); 
  }; 
 
  const handleLogin = (token) => setAuthToken(token); 
  const handleLogout = () => { setAuthToken(null); setUnreadCount(0); }; 
  const handleNotificationRead = () => { if (authToken) fetchUnreadCount(authToken); }; 
 
  return ( 
    <NavigationContainer> 
      <Stack.Navigator screenOptions={{ headerShown: false }}> 
        {!isLoaded ? ( 
          <Stack.Screen name="Splash"> 
            {(props) => ( 
              <SplashScreen {...props} onFinish={handleSplashComplete} /> 
            )} 
          </Stack.Screen> 
        ) : ( 
          <> 
            <Stack.Screen name="Home"> 
              {(props) => ( 
                <Home {...props} onLogin={handleLogin} onLogout={handleLogout} unreadCount={unreadCount} /> 
              )} 
            </Stack.Screen> 
            <Stack.Screen name="Collection"> 
              {(props) => <Collection {...props} unreadCount={unreadCount} />} 
            </Stack.Screen> 
            <Stack.Screen name="Rentals"> 
              {(props) => <Rentals {...props} unreadCount={unreadCount} />} 
            </Stack.Screen> 
            <Stack.Screen name="Bespoke"> 
              {(props) => <Bespoke {...props} unreadCount={unreadCount} />} 
            </Stack.Screen> 
            <Stack.Screen name="Appointments"> 
              {(props) => <Appointments {...props} unreadCount={unreadCount} />} 
            </Stack.Screen> 
            <Stack.Screen name="Profile"> 
              {(props) => ( 
                <Profile {...props} onLogout={handleLogout} unreadCount={unreadCount} /> 
              )} 
            </Stack.Screen> 
            <Stack.Screen name="VerifyEmail" component={VerifyEmail} /> 
            <Stack.Screen name="Notifications"> 
              {(props) => ( 
                <Notifications {...props} onRead={handleNotificationRead} unreadCount={unreadCount} /> 
              )} 
            </Stack.Screen> 
            <Stack.Screen name="GownDesigner3D" component={GownDesigner3D} options={{ headerShown: false }} /> 
          </> 
        )} 
      </Stack.Navigator> 
    </NavigationContainer> 
  ); 
} 
