import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { 
  View, Text, ScrollView, TouchableOpacity, Image, 
  StyleSheet, SafeAreaView, Modal, TextInput, FlatList, Dimensions
} from 'react-native';
import { 
  Menu, X, ArrowRight, ShoppingBag, Calendar, 
  Ruler, Heart, User, Sparkles, Instagram, Mail, Facebook, Eye, EyeOff, ChevronLeft, ChevronRight
} from 'lucide-react-native';

// Services
import { userDB, validators, passwordChecklist, sanitizeNameInput } from '../services/authService';
import { sessionService } from '../services/sessionService';
import { API_URL } from '../services/apiConfig';
import { passwordResetService, resetValidators } from '../services/passwordResetService';
import { notificationAPI } from '../services/notificationAPI';
import { registerForPushNotificationsAsync } from '../services/pushNotificationService';

// Components
import HamburgerMenu from '../components/HamburgerMenu';
import Header from '../components/Header';

// Hooks
import { useResendTimer } from '../hooks/useResendTimer';
import { useNotifications } from '../hooks/useNotifications';

// Local Assets
import Home1Image from '../assets/Home1Image.png'; 
import Home2Image from '../assets/Home2Image.png';

// Featured Collections for Split Hero
const heroCollections = [
  {
    id: 1,
    title: 'Bridal',
    subtitle: 'Eternal Elegance',
    image: Home1Image,
    description: 'Timeless wedding gowns for your special day'
  },
  {
    id: 2,
    title: 'Evening',
    subtitle: 'Sophisticated Grace',
    image: Home2Image,
    description: 'Elegant evening wear for formal occasions'
  },
  {
    id: 3,
    title: 'Ball Gown',
    subtitle: 'Royal Grandeur',
    image: Home1Image,
    description: 'Dramatic silhouettes for grand celebrations'
  },
  {
    id: 4,
    title: 'Cocktail',
    subtitle: 'Modern Charm',
    image: Home2Image,
    description: 'Chic designs for cocktail parties'
  }
];

// Top Gowns for Carousel
const topGowns = [
  {
    id: 1,
    name: 'Celestial Dream',
    category: 'Bridal Collection',
    price: '₱8,000',
    image: Home1Image
  },
  {
    id: 2,
    name: 'Midnight Noir',
    category: 'Evening Gown',
    price: '₱5,500',
    image: Home2Image
  },
  {
    id: 3,
    name: 'Rose Couture',
    category: 'Ball Gown',
    price: '₱6,200',
    image: Home1Image
  }
];



export default function Home({ navigation, route, onLogin, onLogout, unreadCount = 0 }) {

  // Carousel States
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlide, setHeroSlide] = useState(0);
  const [showInitialBranding, setShowInitialBranding] = useState(true);
  
  // UI State
  const [menuVisible, setMenuVisible] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [authMode, setAuthMode] = useState(null); // 'login', 'signup', 'verify', or null
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  
  // Form State
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ 
    firstName: '', 
    lastName: '',
    contactNumber: '',
    email: '', 
    password: '', 
    confirmPassword: '',
    code: '' 
  });
  const [forgotPasswordForm, setForgotPasswordForm] = useState({
    email: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
    step: 'email' // 'email', 'code', 'reset'
  });
  
  // Validation & Status
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [successModal, setSuccessModal] = useState(false);
  
  // Phone Verification State
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [phoneVerifSending, setPhoneVerifSending] = useState(false);
  const [phoneVerifSubmitting, setPhoneVerifSubmitting] = useState(false);
  
  // Password Masking
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);

  // Resend countdown timers
  const signupTimer = useResendTimer(60);
  const forgotPasswordTimer = useResendTimer(60);

  // Password checklist for signup UI
  const signupChecklist = passwordChecklist(signupForm.password);

  // Password checklist for forgot password UI
  const forgotPasswordChecklist = passwordChecklist(forgotPasswordForm.newPassword);

  // Contact number validation reused from bespoke flow behavior.
  const validateContactNumber = (value) => {
    const phoneRegex = /^09\d{9}$/;
    return phoneRegex.test(value || '');
  };

  const handleSignupContactNumberChange = (value) => {
    const digitsOnly = (value || '').replace(/\D/g, '').slice(0, 11);
    setSignupForm((prev) => ({ ...prev, contactNumber: digitsOnly }));

    let error = '';
    if (!digitsOnly) {
      error = 'CONTACT NUMBER IS REQUIRED';
    } else if (!validateContactNumber(digitsOnly)) {
      error = 'PLEASE ENTER A VALID PH MOBILE NUMBER (e.g. 09171234567)';
    }
    setErrors((prev) => ({ ...prev, contactNumber: error }));
  };

  // Carousel handlers
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % topGowns.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + topGowns.length) % topGowns.length);
  };

  // Initial branding animation - show once then hide
  useEffect(() => {
    const initializeBranding = async () => {
      try {
        const hasSeenBranding = await AsyncStorage.getItem('hasSeenBranding');
        
        if (hasSeenBranding) {
          setShowInitialBranding(false);
        } else {
          const timer = setTimeout(async () => {
            setShowInitialBranding(false);
            await AsyncStorage.setItem('hasSeenBranding', 'true');
          }, 3500);
          
          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error('Error initializing branding:', error);
        setShowInitialBranding(false);
      }
    };
    
    initializeBranding();
  }, []);

  // Hero carousel auto-rotation
  useEffect(() => {
    const heroInterval = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % heroCollections.length);
    }, 6000);
    return () => clearInterval(heroInterval);
  }, []);

  // Featured gowns carousel auto-rotation
  useEffect(() => {
    const gownsInterval = setInterval(nextSlide, 5000);
    return () => clearInterval(gownsInterval);
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const session = await sessionService.getSession();
      console.log('INITIAL SESSION:', session);
      if (session && session.isLoggedIn) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    };
    checkSession();
  }, []);

  // Open login modal when navigated here with openAuth param
  useEffect(() => {
    if (route && route.params && route.params.openAuth) {
      setAuthMode('login');
      // clear param so it doesn't reopen repeatedly
      navigation.setParams({ openAuth: false });
    }
  }, [route && route.params && route.params.openAuth]);

  // Field validation handler
  const handleFieldValidation = (fieldName, value, formType) => {
    let error = '';
    
    if (formType === 'login') {
      if (fieldName === 'email') {
        error = validators.email(value);
      } else if (fieldName === 'password') {
        error = validators.password(value, false);
      }
    } else if (formType === 'signup') {
      if (fieldName === 'firstName') {
        error = validators.firstName(value);
      } else if (fieldName === 'lastName') {
        error = validators.lastName(value);
      } else if (fieldName === 'contactNumber') {
        if (!value) error = 'CONTACT NUMBER IS REQUIRED';
        else if (!validateContactNumber(value)) error = 'PLEASE ENTER A VALID PH MOBILE NUMBER (e.g. 09171234567)';
      } else if (fieldName === 'email') {
        error = validators.email(value);
      } else if (fieldName === 'password') {
        error = validators.password(value, true);
      } else if (fieldName === 'confirmPassword') {
        error = validators.confirmPassword(value, signupForm.password);
      }
    }
    
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  // Handle login
  const handleLogin = async () => {
    setErrors({});
    console.log('🚀 STARTING LOGIN PROCESS');

    // Validate all fields
    const emailError = validators.email(loginForm.email);
    const passwordError = validators.password(loginForm.password, false);

    if (emailError || passwordError) {
      console.log('❌ VALIDATION FAILED:', { emailError, passwordError });
      setErrors({ email: emailError, password: passwordError });
      return;
    }

    console.log('✅ VALIDATION PASSED');
    setIsLoading(true);

    try {
      console.log('🔐 CALLING BACKEND API...');

      // Send plain password - backend uses bcrypt for verification
      console.log('🔐 Sending plain password to backend for bcrypt verification');

      const result = await userDB.verifyCredentials(
        loginForm.email.trim(),
        loginForm.password  // Send plain password, not hashed
      );

      console.log('📊 BACKEND RESPONSE RECEIVED:', result);

      if (result.success) {
        console.log('✅ LOGIN SUCCESSFUL');
        console.log('🎫 TOKEN:', result.token ? result.token.substring(0, 20) + '...' : 'NO TOKEN');
        console.log('👤 USER:', result.user);

        // Save session with JWT token for authenticated API calls
        await sessionService.saveSession(result.user, result.token || null);
        setIsLoggedIn(true);
        setAuthMode(null);
        setLoginForm({ email: '', password: '' });
        setErrors({});
        console.log('💾 SESSION SAVED, USER LOGGED IN');

        // REGISTER DEVICE FOR PUSH NOTIFICATIONS
        if (result.token) {
          try {
            const pushToken = await registerForPushNotificationsAsync();
            if (pushToken) {
              await notificationAPI.registerDeviceToken(result.token, pushToken);
              console.log('📱 Device registered for push notifications');
            }
          } catch (pushErr) {
            console.warn('⚠️ Push notification registration skipped:', pushErr.message);
          }
        }
      } else {
        console.log('❌ LOGIN FAILED:', result.error);
        setErrors({ credentials: result.error });
      }
    } catch (error) {
      console.error('❌ UNEXPECTED LOGIN ERROR:', error);
      setErrors({ general: 'AN ERROR OCCURRED. PLEASE TRY AGAIN.' });
    } finally {
      setIsLoading(false);
      console.log('🏁 LOGIN PROCESS COMPLETE');
    }
  };

  const handleSendPhoneOtp = async () => {
    setPhoneVerifSending(true);
    setErrors({});
    try {
      // Phone number must be in +63XXXXXXXXXX format for backend
      const phoneNumber = '+63' + signupForm.contactNumber.slice(1);

      const response = await fetch(`${API_URL}/auth/signup/phone/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: signupForm.firstName.trim(),
          lastName: signupForm.lastName.trim(),
          email: signupForm.email.trim().toLowerCase(),
          password: signupForm.password,
          phoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ general: data.message || 'Could not send SMS code.' });
        return;
      }

      // SMS sent — show phone OTP panel
      setAuthMode('verifyPhone');
      setAuthMessage('SMS CODE SENT TO ' + signupForm.contactNumber);

    } catch (err) {
      setErrors({ general: 'Connection error. Please try again.' });
    } finally {
      setPhoneVerifSending(false);
    }
  };

  const handleVerifyPhone = async () => {
    setErrors({});

    if (!phoneOtpCode.trim() || phoneOtpCode.trim().length !== 6) {
      setErrors({ phoneCode: 'PLEASE ENTER THE 6-DIGIT CODE SENT TO YOUR PHONE' });
      return;
    }

    setPhoneVerifSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/signup/phone/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signupForm.email.trim().toLowerCase(),
          code: phoneOtpCode.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ phoneCode: data.message || 'INVALID CODE. PLEASE TRY AGAIN.' });
        return;
      }

      // Phone verified ✅ — now call POST /auth/signup to send email verification
      setPhoneOtpCode('');
      setErrors({});
      await handleSignup(); // this calls POST /auth/signup which now succeeds since phoneVerified=true

    } catch (err) {
      setErrors({ general: 'Connection error. Please try again.' });
    } finally {
      setPhoneVerifSubmitting(false);
    }
  };

  // Handle signup
  const handleSignup = async () => {
    setErrors({});
    
    // Validate all fields
    const firstNameError = validators.firstName(signupForm.firstName);
    const lastNameError = validators.lastName(signupForm.lastName);
    const contactNumberError = !signupForm.contactNumber
      ? 'CONTACT NUMBER IS REQUIRED'
      : !validateContactNumber(signupForm.contactNumber)
        ? 'CONTACT NUMBER MUST BE 11 DIGITS AND START WITH 09'
        : '';
    const emailError = validators.email(signupForm.email);
    const passwordError = validators.password(signupForm.password, true);
    const confirmPasswordError = validators.confirmPassword(
      signupForm.confirmPassword, 
      signupForm.password
    );
    
    // Real-time checklist enforcement: prevent submission until password meets all requirements
    const checklist = passwordChecklist(signupForm.password);
    const checklistOk = Object.values(checklist).every(Boolean);

    if (firstNameError || lastNameError || contactNumberError || emailError || passwordError || confirmPasswordError || !checklistOk) {
      setErrors({
        firstName: firstNameError,
        lastName: lastNameError,
        contactNumber: contactNumberError,
        email: emailError,
        password: passwordError,
        confirmPassword: confirmPasswordError,
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const email = signupForm.email.trim().toLowerCase();

      const requestBody = {
        firstName: signupForm.firstName.trim(),
        lastName: signupForm.lastName.trim(),
        email: email,
        password: signupForm.password,
        phoneNumber: signupForm.contactNumber.trim(),
      };

      console.log('📤 Sending signup request:', requestBody);

      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();
      console.log('📥 Signup response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.message || "Sign up failed");
      }

      setAuthMode('verify');
      signupTimer.startTimer();
      setAuthMessage(responseData.message || 'VERIFICATION CODE SENT TO YOUR EMAIL');
    } catch (error) {
      console.error('Signup error:', error);
      setErrors({ general: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Legacy in-modal verification flow (kept for compatibility).
  const handleVerification = async () => {
    setErrors({});
    
    const codeError = validators.verificationCode(signupForm.code);
    if (codeError) {
      setErrors({ code: codeError });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/auth/signup/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signupForm.email.trim().toLowerCase(),
          code: signupForm.code.trim(),
        }),
      });
      const data = await response.json();

      if (response.ok) {
        setAuthMessage('EMAIL VERIFIED SUCCESSFULLY');
        
        // Save session and navigate in
        await sessionService.saveSession(data.user, data.token);

        // REGISTER DEVICE FOR PUSH NOTIFICATIONS
        if (data.token) {
          try {
            const pushToken = await registerForPushNotificationsAsync();
            if (pushToken) {
              await notificationAPI.registerDeviceToken(data.token, pushToken);
              console.log('📱 Device registered for push notifications (after verification)');
            }
          } catch (pushErr) {
            console.warn('⚠️ Push notification registration skipped:', pushErr.message);
          }
        }

        // Bug Fix: Initialize customer details document after verification
        try {
          console.log('🔄 Initializing customer profile details...');
          const profileResponse = await fetch(`${API_URL}/customers/profile`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.token}`
            },
            body: JSON.stringify({
              firstName: data.user.firstName,
              lastName: data.user.lastName,
              phoneNumber: data.user.phoneNumber || '',
              address: '',
              preferredBranch: 'Taguig Main - Cadena de Amor'
            }),
          });
          if (!profileResponse.ok) {
            const profileErr = await profileResponse.json();
            console.warn('⚠️ Profile initialization warning:', profileErr.message);
          } else {
            console.log('✅ Customer profile initialized successfully');
          }
        } catch (initErr) {
          console.warn('⚠️ Background profile initialization failed:', initErr);
        }

        setIsLoggedIn(true);
        setAuthMode(null);
        setSignupForm({ firstName: '', lastName: '', contactNumber: '', email: '', password: '', confirmPassword: '', code: '' });
        setAuthMessage('');
        setErrors({});
      } else {
        setErrors({ code: data.message || 'INVALID VERIFICATION CODE. PLEASE TRY AGAIN' });
      }
    } catch (error) {
      console.error('Verification error:', error);
      setErrors({ general: error.message || 'AN ERROR OCCURRED. PLEASE TRY AGAIN.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Main action handler
  const handleAction = async () => {
    if (authMode === 'login') {
      await handleLogin();
    } else if (authMode === 'signup') {
      await handleSendPhoneOtp(); // Step 1: send SMS OTP first
    } else if (authMode === 'verifyPhone') {
      await handleVerifyPhone(); // Step 2: verify SMS OTP → triggers handleSignup → Step 3
    } else if (authMode === 'verify') {
      await handleVerification(); // Step 4: verify email OTP
    } else if (authMode === 'forgotPassword') {
      await handleForgotPasswordAction();
    }
  };

  // ===== FORGOT PASSWORD HANDLERS =====

  // Handle forgot password request (step 1: email)
  const handleForgotPasswordEmail = async () => {
    setErrors({});
    const emailError = resetValidators.email(forgotPasswordForm.email);
    
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    setIsLoading(true);
    try {
      const result = await passwordResetService.generateResetCode(forgotPasswordForm.email);
      
      if (result.success) {
        // ✅ Email is already sent by generateResetCode() - no need to send again
        setAuthMessage('CHECK YOUR EMAIL FOR THE RESET CODE');
        forgotPasswordTimer.startTimer();
        
        // Move to next step
        setTimeout(() => {
          setForgotPasswordForm(prev => ({ ...prev, step: 'code' }));
          setAuthMessage('');
        }, 1500);
      } else {
        setErrors({ email: result.error });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setErrors({ general: error.message || 'AN ERROR OCCURRED. PLEASE TRY AGAIN.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle code verification (step 2: verify code)
  const handleForgotPasswordCode = async () => {
    setErrors({});
    const codeError = resetValidators.resetCode(forgotPasswordForm.code);
    
    if (codeError) {
      setErrors({ code: codeError });
      return;
    }

    setIsLoading(true);
    try {
      const result = await passwordResetService.verifyResetCode(forgotPasswordForm.email, forgotPasswordForm.code);
      
      if (result.success) {
        setAuthMessage('CODE VERIFIED. ENTER YOUR NEW PASSWORD');
        
        setTimeout(() => {
          setForgotPasswordForm(prev => ({ ...prev, step: 'reset' }));
          setAuthMessage('');
        }, 1500);
      } else {
        setErrors({ code: result.error });
      }
    } catch (error) {
      console.error('Code verification error:', error);
      setErrors({ general: error.message || 'AN ERROR OCCURRED. PLEASE TRY AGAIN.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password reset (step 3: reset password)
  const handleForgotPasswordReset = async () => {
    setErrors({});
    
    const passwordError = resetValidators.newPassword(forgotPasswordForm.newPassword);
    const confirmError = resetValidators.confirmPassword(forgotPasswordForm.confirmPassword, forgotPasswordForm.newPassword);
    
    // Real-time checklist enforcement: prevent submission until password meets all requirements
    const checklist = passwordChecklist(forgotPasswordForm.newPassword);
    const checklistOk = Object.values(checklist).every(Boolean);

    if (passwordError || confirmError || !checklistOk) {
      setErrors({ newPassword: passwordError, confirmPassword: confirmError });
      return;
    }

    setIsLoading(true);
    try {
      const result = await passwordResetService.resetPassword(
        forgotPasswordForm.email,
        forgotPasswordForm.newPassword,
        forgotPasswordForm.code
      );
      
      if (result.success) {
        setSuccessModal(true);
        
        // Reset all forms
        setTimeout(() => {
          setForgotPasswordForm({ email: '', code: '', newPassword: '', confirmPassword: '', step: 'email' });
          setAuthMode('login');
          setSuccessModal(false);
          setErrors({});
        }, 3000);
      } else {
        setErrors({ general: result.error });
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setErrors({ general: error.message || 'AN ERROR OCCURRED. PLEASE TRY AGAIN.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Resend code for Sign Up verification
  const handleResendSignupCode = async () => {
    setErrors({});
    setIsLoading(true);
    try {
      // Bug Fix: Resend code uses the signup endpoint with the same payload
      const requestBody = {
        firstName: signupForm.firstName.trim(),
        lastName: signupForm.lastName.trim(),
        email: signupForm.email.trim().toLowerCase(),
        password: signupForm.password,
        phoneNumber: signupForm.contactNumber.trim(),
      };

      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      if (response.ok) {
        signupTimer.startTimer();
        setAuthMessage(data.message || 'NEW CODE SENT TO YOUR EMAIL');
        setTimeout(() => setAuthMessage(''), 3000);
      } else {
        setErrors({ code: data.message || 'FAILED TO RESEND CODE. PLEASE TRY AGAIN.' });
      }
    } catch (error) {
      console.error('Resend signup code error:', error);
      setErrors({ code: 'AN ERROR OCCURRED. PLEASE TRY AGAIN.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Resend code for Forgot Password verification
  const handleResendForgotCode = async () => {
    setErrors({});
    setIsLoading(true);
    try {
      const result = await passwordResetService.generateResetCode(forgotPasswordForm.email);
      if (result.success) {
        forgotPasswordTimer.startTimer();
        setAuthMessage('NEW CODE SENT TO YOUR EMAIL');
        setTimeout(() => setAuthMessage(''), 3000);
      } else {
        setErrors({ code: result.error });
      }
    } catch (error) {
      console.error('Resend forgot code error:', error);
      setErrors({ code: 'AN ERROR OCCURRED. PLEASE TRY AGAIN.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Main forgot password action router
  const handleForgotPasswordAction = async () => {
    if (forgotPasswordForm.step === 'email') {
      await handleForgotPasswordEmail();
    } else if (forgotPasswordForm.step === 'code') {
      await handleForgotPasswordCode();
    } else if (forgotPasswordForm.step === 'reset') {
      await handleForgotPasswordReset();
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      const session = await sessionService.getSession();
      if (session?.token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`,
          },
        });
      }
    } catch (error) {
      console.warn('Backend logout failed (non-blocking):', error);
    } finally {
      await sessionService.clearSession();
      setIsLoggedIn(false);
      setMenuVisible(false);
      console.log('LOGOUT: Session cleared, user set to guest mode');
    }
  };

  // AUTH GUARD: Checks status before allowing navigation
  const handleAuthAction = (target) => {
    if (!isLoggedIn) {
      setAuthMode('login'); 
    } else {
      navigation.navigate(target);
    }
  };

  // Helper to render the Service Cards (Restored full design)
  const ServiceCard = ({ icon: Icon, title, description, target, isProtected }) => (
    <TouchableOpacity 
      style={styles.serviceBox} 
      onPress={() => isProtected ? handleAuthAction(target) : navigation.navigate(target)}
      activeOpacity={0.7}
    >
      <View style={styles.iconCircle}>
        <Icon size={22} color="#6B5D4F" strokeWidth={1.5} />
      </View>
      <Text style={styles.serviceTitle}>{title}</Text>
      <Text style={styles.serviceDesc}>{description}</Text>
      <View style={styles.learnMoreRow}>
        <Text style={styles.learnMoreText}>LEARN MORE</Text>
        <ArrowRight size={14} color="#6B5D4F" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        navigation={navigation} 
        onMenuPress={() => setMenuVisible(true)} 
        isLoggedIn={isLoggedIn} 
        unreadCount={unreadCount || 0} 
        onBellPress={() => navigation.navigate('Notifications')} 
      /> 

      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* SECTION 1: HERO */}
        <View style={styles.section}>
          <Text style={styles.tagline}>ELEGANT  •  BESPOKE  •  TIMELESS</Text>
          <Text style={styles.mainTitle}>Where{"\n"}Craftsmanship{"\n"}Meets Dreams</Text>
          <Text style={styles.description}>
            Experience the art of bespoke tailoring at Hannah Vanessa Boutique. 
            From exquisite gown rentals to custom creations, we bring your vision to life.
          </Text>
          <TouchableOpacity style={styles.blackBtn} onPress={() => navigation.navigate('Collection')}>
            <Text style={styles.blackBtnText}>Explore Collection</Text>
            <ArrowRight color="#fff" size={18} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => handleAuthAction('Bespoke')}>
            <Text style={styles.outlineBtnText}>Start Custom Order</Text>
          </TouchableOpacity>
          <View style={styles.imageWrapper}>
            <Image source={Home1Image} style={styles.heroImage} />
            <View style={styles.clientBadge}>
              <Text style={styles.badgeSub}>Trusted by clients since 1993</Text>
              <Text style={styles.badgeMain}>5000+ Happy Clients</Text>
            </View>
          </View>
        </View>

        {/* SECTION 2: THE COLLECTION */}
        <View style={[styles.section, styles.whiteBg]}>
          <Text style={styles.tagline}>THE COLLECTION</Text>
          <Text style={styles.sectionTitle}>Curated Excellence</Text>
          <Text style={styles.description}>
            Our collection features handpicked gowns from renowned designers, each piece selected for its exceptional craftsmanship.
          </Text>
          <TouchableOpacity style={styles.textLinkBtn} onPress={() => navigation.navigate('Collection')}>
            <Text style={styles.textLink}>VIEW ALL GOWNS</Text>
            <ArrowRight color="#1a1a1a" size={16} />
          </TouchableOpacity>
          <Image source={Home2Image} style={styles.collectionImage} />
        </View>

        {/* SECTION 3: OUR SERVICES */}
        <View style={styles.servicesSection}>
          <Text style={styles.servicesHeader}>Our Services</Text>
          <Text style={styles.servicesSub}>
            From ready-to-wear collections to fully customized pieces, we provide a seamless experience.
          </Text>

          <ServiceCard icon={Sparkles} title="Browse Catalog" target="Collection" isProtected={false} description="Explore our curated collection of elegant gowns." />
          <ServiceCard icon={Heart} title="Rent a Gown" target="Rentals" isProtected={true} description="Book your perfect dress for any special occasion." />
          <ServiceCard icon={Ruler} title="Custom Orders" target="Bespoke" isProtected={true} description="Create a bespoke piece tailored just for you." />
          <ServiceCard icon={Calendar} title="Book Appointment" target="Appointments" isProtected={true} description="Schedule fittings and consultations." />
        </View>

        {/* SECTION 4: STATS COUNTER */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>500+</Text>
              <Text style={styles.statLabel}>GOWNS AVAILABLE</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>1,200+</Text>
              <Text style={styles.statLabel}>HAPPY CLIENTS</Text>
            </View>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>5+</Text>
              <Text style={styles.statLabel}>BRANCHES</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>15+</Text>
              <Text style={styles.statLabel}>YEARS EXPERIENCE</Text>
            </View>
          </View>
        </View>

        {/* SECTION 5: FINAL CTA */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Begin Your Journey{"\n"}With Us</Text>
          <TouchableOpacity style={styles.blackBtn} onPress={() => handleAuthAction('Appointments')}>
            <Text style={styles.blackBtnText}>Schedule Consultation</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.navigate('Collection')}>
            <Text style={styles.outlineBtnText}>View Collections</Text>
          </TouchableOpacity>
        </View>

            {/* FOOTER */}
            <View style={styles.footerContainer}>
              {/* Newsletter Section */}
              <Text style={styles.footerJoinTitle}>Join the List</Text>
              <Text style={styles.footerJoinSub}>
                Sign up for new collections, offers, and more!
              </Text>
              
              <View style={styles.newsletterRow}>
                <TextInput 
                  style={styles.emailInput}
                  placeholder="Your Email"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                />
                <TouchableOpacity style={styles.emailSubmitBtn}>
                  <ArrowRight color="#6B5D4F" size={16} />
                </TouchableOpacity>
              </View>

              {/* Links Grid - One Row */}
              <View style={styles.footerLinksGrid}>
                <View style={styles.footerColumn}>
                  <Text style={styles.columnHeader}>SHOP</Text>
                  <Text style={styles.footerLink}>Wedding Gowns</Text>
                  <Text style={styles.footerLink}>Evening Dresses</Text>
                  <Text style={styles.footerLink}>Ball Gowns</Text>
                </View>

                <View style={styles.footerColumn}>
                  <Text style={styles.columnHeader}>SERVICES</Text>
                  <Text style={styles.footerLink}>Gown Rental</Text>
                  <Text style={styles.footerLink}>Custom Orders</Text>
                  <Text style={styles.footerLink}>Appointments</Text>
                </View>
              </View>

              <View style={styles.footerLinksGrid}>
                <View style={styles.footerColumn}>
                  <Text style={styles.columnHeader}>COMPANY</Text>
                  <Text style={styles.footerLink}>About Us</Text>
                  <Text style={styles.footerLink}>Our Story</Text>
                  <Text style={styles.footerLink}>Contact</Text>
                </View>

                <View style={styles.footerColumn}>
                  <Text style={styles.columnHeader}>FOLLOW</Text>
                  <View style={styles.socialRow}>
                    <Instagram color="#FFF" size={16} />
                    <Facebook color="#FFF" size={16} />
                    <Mail color="#FFF" size={16} />
                  </View>
                </View>
              </View>

              <View style={styles.footerDivider} />
              
              <Text style={styles.copyrightText}>
                © 2026 Hannah Vanessa Boutique
              </Text>
              <View style={styles.legalRow}>
                <Text style={styles.legalText}>Privacy Policy</Text>
                <Text style={styles.legalText}>•</Text>
                <Text style={styles.legalText}>Terms of Service</Text>
              </View>
            </View>
      </ScrollView>

      {/* STANDARDIZED HAMBURGER MENU */}
      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        onNavigate={(routeName) => navigation.navigate(routeName)}
        onAuthAction={handleAuthAction}
        currentRoute={route?.name}
        styles={styles}
      />

      {/* AUTH MODAL */}
      <Modal visible={authMode !== null} animationType="fade" transparent={true}>
  <View style={styles.authOverlay}>
    <View style={styles.authCard}>
      <TouchableOpacity style={styles.authClose} onPress={() => {
        setAuthMode(null); 
        setErrors({});
        setLoginForm({ email: '', password: '' });
        setSignupForm({ firstName: '', lastName: '', contactNumber: '', email: '', password: '', confirmPassword: '', code: '' });
        setAuthMessage('');
        setForgotPasswordForm({ email: '', code: '', newPassword: '', confirmPassword: '', step: 'email' });
        setPhoneOtpCode('');
        setPhoneVerifSending(false);
        setPhoneVerifSubmitting(false);
      }}>
        <X color="#333" size={20} />
      </TouchableOpacity>

      <Text style={styles.authTitle}>
        {authMode === 'verifyPhone' ? 'Verify Phone Number'
          : authMode === 'verify' ? 'Verify Email'
          : authMode === 'signup' ? 'Create Account'
          : 'Welcome Back'}
      </Text>
      <Text style={styles.authSub}>
        {authMode === 'verifyPhone'
          ? `Enter the 6-digit SMS code sent to ${signupForm.contactNumber}`
          : authMode === 'verify'
          ? `Enter the verification code sent to ${signupForm.email}`
          : authMode === 'signup'
          ? 'Create your account to get started'
          : 'Sign in to continue your journey with us'}
      </Text>

      <View style={styles.authForm}>
        {/* FIRST NAME AND LAST NAME FIELDS (Only for Signup) */}
        {authMode === 'signup' && (
          <>
            <View style={styles.nameRow}>
              <View style={[styles.inputGroup, styles.nameCol]}>
                <Text style={styles.inputLabel}>FIRST NAME</Text>
                <TextInput
                  style={[styles.authInput, errors.firstName && styles.inputErrorBorder]}
                  onChangeText={(val) => { 
                    // Sanitize input in real-time - allow only letters and spaces
                    const sanitized = sanitizeNameInput(val);
                    setSignupForm({ ...signupForm, firstName: sanitized }); 
                    handleFieldValidation('firstName', sanitized, 'signup');
                  }}
                  value={signupForm.firstName}
                  placeholder="John"
                  placeholderTextColor="#888888"
                />
                {errors.firstName && <Text style={styles.warningText}>{errors.firstName}</Text>}
              </View>

              <View style={[styles.inputGroup, styles.nameCol]}>
                <Text style={styles.inputLabel}>LAST NAME</Text>
                <TextInput
                  style={[styles.authInput, errors.lastName && styles.inputErrorBorder]}
                  onChangeText={(val) => { 
                    // Sanitize input in real-time - allow only letters and spaces
                    const sanitized = sanitizeNameInput(val);
                    setSignupForm({ ...signupForm, lastName: sanitized }); 
                    handleFieldValidation('lastName', sanitized, 'signup');
                  }}
                  value={signupForm.lastName}
                  placeholder="Doe"
                  placeholderTextColor="#888888"
                />
                {errors.lastName && <Text style={styles.warningText}>{errors.lastName}</Text>}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONTACT NUMBER</Text>
              <TextInput
                style={[styles.authInput, errors.contactNumber && styles.inputErrorBorder]}
                onChangeText={handleSignupContactNumberChange}
                value={signupForm.contactNumber}
                placeholder="09XXXXXXXXX"
                placeholderTextColor="#888888"
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={11}
              />
              {errors.contactNumber && <Text style={styles.warningText}>{errors.contactNumber}</Text>}
            </View>
          </>
        )}

        {authMode !== 'verify' && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <TextInput
                style={[styles.authInput, errors.email && styles.inputErrorBorder]}
                onChangeText={(val) => {
                  if (authMode === 'signup') { 
                    setSignupForm({ ...signupForm, email: val }); 
                    handleFieldValidation('email', val, 'signup');
                  }
                  else { 
                    setLoginForm({ ...loginForm, email: val }); 
                    handleFieldValidation('email', val, 'login');
                  }
                }}
                value={authMode === 'signup' ? signupForm.email : loginForm.email}
                placeholder="example@gmail.com"
                placeholderTextColor="#888888"
                autoCapitalize="none"
              />
              {errors.email && <Text style={styles.warningText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.authInput, errors.password && styles.inputErrorBorder, { flex: 1 }]}
                  onChangeText={(val) => {
                    if (authMode === 'signup') { 
                      const updatedForm = { ...signupForm, password: val };
                      setSignupForm(updatedForm);
                      handleFieldValidation('password', val, 'signup');
                      // Re-validate confirmPassword with new password value
                      if (updatedForm.confirmPassword) {
                        const confirmError = validators.confirmPassword(updatedForm.confirmPassword, val);
                        setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
                      }
                    }
                    else { 
                      setLoginForm({ ...loginForm, password: val }); 
                      handleFieldValidation('password', val, 'login');
                    }
                  }}
                  value={authMode === 'signup' ? signupForm.password : loginForm.password}
                  placeholder="••••••••"
                  placeholderTextColor="#888888"
                  secureTextEntry={authMode === 'signup' ? !showSignupPassword : !showLoginPassword}
                />
                <TouchableOpacity 
                  onPress={() => authMode === 'signup' ? setShowSignupPassword(!showSignupPassword) : setShowLoginPassword(!showLoginPassword)}
                  style={styles.eyeIcon}
                >
                  {authMode === 'signup' ? (
                    showSignupPassword ? <EyeOff size={20} color="#999" /> : <Eye size={20} color="#999" />
                  ) : (
                    showLoginPassword ? <EyeOff size={20} color="#999" /> : <Eye size={20} color="#999" />
                  )}
                </TouchableOpacity>
              </View>
              {authMode === 'signup' ? (
                <View style={styles.passwordChecklistContainer}>
                  <View style={styles.checklistItem}>
                    <Text style={signupChecklist.length ? styles.checkPassed : styles.checkFailed}>{signupChecklist.length ? '✓' : '✗'}</Text>
                    <Text style={styles.checklistText}>Minimum 8 characters</Text>
                  </View>
                  <View style={styles.checklistItem}>
                    <Text style={signupChecklist.uppercase ? styles.checkPassed : styles.checkFailed}>{signupChecklist.uppercase ? '✓' : '✗'}</Text>
                    <Text style={styles.checklistText}>At least one uppercase letter</Text>
                  </View>
                  <View style={styles.checklistItem}>
                    <Text style={signupChecklist.lowercase ? styles.checkPassed : styles.checkFailed}>{signupChecklist.lowercase ? '✓' : '✗'}</Text>
                    <Text style={styles.checklistText}>At least one lowercase letter</Text>
                  </View>
                  <View style={styles.checklistItem}>
                    <Text style={signupChecklist.number ? styles.checkPassed : styles.checkFailed}>{signupChecklist.number ? '✓' : '✗'}</Text>
                    <Text style={styles.checklistText}>At least one number</Text>
                  </View>
                  <View style={styles.checklistItem}>
                    <Text style={signupChecklist.special ? styles.checkPassed : styles.checkFailed}>{signupChecklist.special ? '✓' : '✗'}</Text>
                    <Text style={styles.checklistText}>At least one special character</Text>
                  </View>
                </View>
              ) : (
                errors.password && <Text style={styles.warningText}>{errors.password}</Text>
              )}
            </View>
            {errors.credentials && authMode === 'login' && <Text style={styles.warningText}>{errors.credentials}</Text>}
          </>
        )}

        {authMode === 'signup' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={[styles.authInput, errors.confirmPassword && styles.inputErrorBorder, { flex: 1 }]}
                onChangeText={(val) => { 
                  setSignupForm({ ...signupForm, confirmPassword: val }); 
                  handleFieldValidation('confirmPassword', val, 'signup');
                }}
                value={signupForm.confirmPassword}
                placeholder="••••••••"
                placeholderTextColor="#888888"
                secureTextEntry={!showSignupConfirmPassword}
              />
              <TouchableOpacity 
                onPress={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                style={styles.eyeIcon}
              >
                {showSignupConfirmPassword ? <EyeOff size={20} color="#999" /> : <Eye size={20} color="#999" />}
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.warningText}>{errors.confirmPassword}</Text>}
          </View>
        )}

        {/* ── PHONE OTP PANEL ── */}
        {authMode === 'verifyPhone' && (
          <View style={styles.inputGroup}>

            {/* Step indicator */}
            <View style={styles.signupStepRow}>
              <View style={styles.signupStepDone}>
                <Text style={styles.signupStepDoneText}>✓</Text>
              </View>
              <View style={styles.signupStepConnectorDone} />
              <View style={styles.signupStepActive}>
                <Text style={styles.signupStepActiveText}>2</Text>
              </View>
              <View style={styles.signupStepConnectorInactive} />
              <View style={styles.signupStepInactive}>
                <Text style={styles.signupStepInactiveText}>3</Text>
              </View>
            </View>
            <View style={styles.signupStepLabelRow}>
              <Text style={styles.signupStepLabelDone}>Details</Text>
              <Text style={styles.signupStepLabelActive}>Phone</Text>
              <Text style={styles.signupStepLabelInactive}>Email</Text>
            </View>

            <Text style={styles.verifySub}>
              We sent a 6-digit SMS code to{'\n'}
              <Text style={{ fontWeight: '700', color: '#1a1a1a' }}>
                +63 {signupForm.contactNumber.slice(1)}
              </Text>
            </Text>

            <TextInput
              style={[
                styles.authInput,
                errors.phoneCode && styles.inputErrorBorder,
                { textAlign: 'center', fontSize: 22, letterSpacing: 10, fontWeight: '700' }
              ]}
              placeholder="000000"
              placeholderTextColor="#ccc"
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={(val) => {
                setPhoneOtpCode(val);
                if (val) setErrors(prev => ({ ...prev, phoneCode: '' }));
              }}
              value={phoneOtpCode}
            />

            {errors.phoneCode && (
              <Text style={styles.warningText}>{errors.phoneCode}</Text>
            )}
            {authMessage && (
              <Text style={[styles.warningText, { color: '#28a745' }]}>{authMessage}</Text>
            )}

            <View style={styles.resendRow}>
              <TouchableOpacity
                onPress={handleSendPhoneOtp}
                disabled={phoneVerifSending}
              >
                <Text style={styles.resendLink}>
                  {phoneVerifSending ? 'Sending...' : 'Resend SMS Code'}
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        )}

        {authMode === 'verify' && (
          <View style={styles.inputGroup}>
            <Text style={styles.verifySub}>We sent a code to {signupForm.email}</Text>
            <TextInput
              style={[styles.authInput, errors.code && styles.inputErrorBorder]}
              placeholder="000000"
              placeholderTextColor="#888888"
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={(val) => { 
                setSignupForm({ ...signupForm, code: val }); 
                if (val) {
                  setErrors(prev => ({ ...prev, code: '' }));
                }
              }}
              value={signupForm.code}
            />
            {errors.code && <Text style={styles.warningText}>{errors.code}</Text>}
            {authMessage && <Text style={[styles.warningText, { color: '#28a745' }]}>{authMessage}</Text>}
            <View style={styles.resendRow}>
              {signupTimer.isActive ? (
                <Text style={styles.resendTimerText}>Resend code in {signupTimer.timeLeft}s</Text>
              ) : (
                <TouchableOpacity onPress={handleResendSignupCode} disabled={isLoading}>
                  <Text style={styles.resendLink}>Resend Code</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* FORGOT PASSWORD FIELDS */}
        {authMode === 'forgotPassword' && forgotPasswordForm.step === 'email' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <TextInput
              style={[styles.authInput, errors.email && styles.inputErrorBorder]}
              onChangeText={(val) => {
                setForgotPasswordForm({ ...forgotPasswordForm, email: val });
              }}
              value={forgotPasswordForm.email}
              placeholder="example@gmail.com"
              placeholderTextColor="#888888"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.warningText}>{errors.email}</Text>}
          </View>
        )}

        {authMode === 'forgotPassword' && forgotPasswordForm.step === 'code' && (
          <View style={styles.inputGroup}>
            <Text style={styles.verifySub}>We sent a code to {forgotPasswordForm.email}</Text>
            <TextInput
              style={[styles.authInput, errors.code && styles.inputErrorBorder]}
              placeholder="000000"
              placeholderTextColor="#888888"
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={(val) => { 
                setForgotPasswordForm({ ...forgotPasswordForm, code: val }); 
                if (val) {
                  setErrors(prev => ({ ...prev, code: '' }));
                }
              }}
              value={forgotPasswordForm.code}
            />
            {errors.code && <Text style={styles.warningText}>{errors.code}</Text>}
            {authMessage && <Text style={[styles.warningText, { color: '#28a745' }]}>{authMessage}</Text>}
          </View>
        )}

        {authMode === 'forgotPassword' && forgotPasswordForm.step === 'reset' && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NEW PASSWORD</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.authInput, errors.newPassword && styles.inputErrorBorder, { flex: 1 }]}
                  onChangeText={(val) => {
                    setForgotPasswordForm({ ...forgotPasswordForm, newPassword: val });
                  }}
                  value={forgotPasswordForm.newPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#888888"
                  secureTextEntry={!showForgotNewPassword}
                />
                <TouchableOpacity 
                  onPress={() => setShowForgotNewPassword(!showForgotNewPassword)}
                  style={styles.eyeIcon}
                >
                  {showForgotNewPassword ? <EyeOff size={20} color="#999" /> : <Eye size={20} color="#999" />}
                </TouchableOpacity>
              </View>
              {/* Password checklist for forgot password */}
              <View style={styles.passwordChecklistContainer}>
                <View style={styles.checklistItem}>
                  <Text style={forgotPasswordChecklist.length ? styles.checkPassed : styles.checkFailed}>{forgotPasswordChecklist.length ? '✓' : '✗'}</Text>
                  <Text style={styles.checklistText}>Minimum 8 characters</Text>
                </View>
                <View style={styles.checklistItem}>
                  <Text style={forgotPasswordChecklist.uppercase ? styles.checkPassed : styles.checkFailed}>{forgotPasswordChecklist.uppercase ? '✓' : '✗'}</Text>
                  <Text style={styles.checklistText}>At least one uppercase letter</Text>
                </View>
                <View style={styles.checklistItem}>
                  <Text style={forgotPasswordChecklist.lowercase ? styles.checkPassed : styles.checkFailed}>{forgotPasswordChecklist.lowercase ? '✓' : '✗'}</Text>
                  <Text style={styles.checklistText}>At least one lowercase letter</Text>
                </View>
                <View style={styles.checklistItem}>
                  <Text style={forgotPasswordChecklist.number ? styles.checkPassed : styles.checkFailed}>{forgotPasswordChecklist.number ? '✓' : '✗'}</Text>
                  <Text style={styles.checklistText}>At least one number</Text>
                </View>
                <View style={styles.checklistItem}>
                  <Text style={forgotPasswordChecklist.special ? styles.checkPassed : styles.checkFailed}>{forgotPasswordChecklist.special ? '✓' : '✗'}</Text>
                  <Text style={styles.checklistText}>At least one special character</Text>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.authInput, errors.confirmPassword && styles.inputErrorBorder, { flex: 1 }]}
                  onChangeText={(val) => {
                    setForgotPasswordForm({ ...forgotPasswordForm, confirmPassword: val });
                  }}
                  value={forgotPasswordForm.confirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#888888"
                  secureTextEntry={!showForgotConfirmPassword}
                />
                <TouchableOpacity 
                  onPress={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  {showForgotConfirmPassword ? <EyeOff size={20} color="#999" /> : <Eye size={20} color="#999" />}
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && <Text style={styles.warningText}>{errors.confirmPassword}</Text>}
            </View>
          </>
        )}

        {errors.general && <Text style={styles.warningText}>{errors.general}</Text>}
        
        <TouchableOpacity
          style={[styles.authSubmitBtn, (isLoading || phoneVerifSending || phoneVerifSubmitting) && styles.authSubmitBtnDisabled]}
          onPress={handleAction}
          disabled={isLoading || phoneVerifSending || phoneVerifSubmitting}
        >
          <Text style={styles.authSubmitText}>
            {isLoading || phoneVerifSending || phoneVerifSubmitting
              ? 'PLEASE WAIT...'
              : authMode === 'verifyPhone' ? 'VERIFY PHONE'
              : authMode === 'verify' ? 'VERIFY EMAIL'
              : authMode === 'signup' ? 'SEND VERIFICATION CODE'
              : 'SIGN IN'}
          </Text>
        </TouchableOpacity>

        {/* TOGGLE LINKS */}
        {authMode === 'login' && (
          <>
            <TouchableOpacity
              style={styles.toggleAuth}
              onPress={() => setAuthMode('signup')}
            >
              <Text style={styles.toggleText}>Don't have an account? Sign Up</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPasswordLink}
              onPress={() => {
                setAuthMode(null);
                setShowForgotPasswordModal(true);
                setForgotPasswordForm({ email: '', code: '', newPassword: '', confirmPassword: '', step: 'email' });
                setErrors({});
              }}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </>
        )}

        {authMode === 'signup' && (
          <TouchableOpacity
            style={styles.toggleAuth}
            onPress={() => setAuthMode('login')}
          >
            <Text style={styles.toggleText}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  </View>
</Modal>

{/* FORGOT PASSWORD MODAL (SEPARATE FROM LOGIN) */}
<Modal visible={showForgotPasswordModal} animationType="fade" transparent={true}>
  <View style={styles.authOverlay}>
    <View style={styles.authCard}>
      <TouchableOpacity style={styles.authClose} onPress={() => {
        setShowForgotPasswordModal(false);
        setForgotPasswordForm({ email: '', code: '', newPassword: '', confirmPassword: '', step: 'email' });
        setErrors({});
        setAuthMessage('');
      }}>
        <X color="#333" size={20} />
      </TouchableOpacity>

      <Text style={styles.authTitle}>Forgot Password</Text>
      <Text style={styles.authSub}>
        {forgotPasswordForm.step === 'email' ? 'Enter your email to receive a verification code' :
         forgotPasswordForm.step === 'code' ? 'Enter the verification code sent to your email' :
         'Create a new password for your account'}
      </Text>

      {/* STEP INDICATOR */}
      <View style={styles.stepIndicator}>
        <View style={[styles.stepDot, forgotPasswordForm.step === 'email' && styles.stepDotActive]} />
        <View style={[styles.stepDot, forgotPasswordForm.step === 'code' && styles.stepDotActive]} />
        <View style={[styles.stepDot, forgotPasswordForm.step === 'reset' && styles.stepDotActive]} />
      </View>

      <View style={styles.authForm}>
        {/* STEP 1: EMAIL */}
        {forgotPasswordForm.step === 'email' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <TextInput
              style={[styles.authInput, errors.email && styles.inputErrorBorder]}
              onChangeText={(val) => {
                setForgotPasswordForm({ ...forgotPasswordForm, email: val });
                if (val) setErrors(prev => ({ ...prev, email: '' }));
              }}
              value={forgotPasswordForm.email}
              placeholder="example@gmail.com"
              placeholderTextColor="#888888"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.warningText}>{errors.email}</Text>}
          </View>
        )}

        {/* STEP 2: CODE */}
        {forgotPasswordForm.step === 'code' && (
          <View style={styles.inputGroup}>
            <Text style={styles.verifySub}>We sent a code to {forgotPasswordForm.email}</Text>
            <TextInput
              style={[styles.authInput, errors.code && styles.inputErrorBorder]}
              placeholder="000000"
              placeholderTextColor="#888888"
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={(val) => {
                setForgotPasswordForm({ ...forgotPasswordForm, code: val });
                if (val) setErrors(prev => ({ ...prev, code: '' }));
              }}
              value={forgotPasswordForm.code}
            />
            {errors.code && <Text style={styles.warningText}>{errors.code}</Text>}
            {authMessage && <Text style={[styles.warningText, { color: '#28a745' }]}>{authMessage}</Text>}
            <View style={styles.resendRow}>
              {forgotPasswordTimer.isActive ? (
                <Text style={styles.resendTimerText}>Resend code in {forgotPasswordTimer.timeLeft}s</Text>
              ) : (
                <TouchableOpacity onPress={handleResendForgotCode} disabled={isLoading}>
                  <Text style={styles.resendLink}>Resend Code</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* STEP 3: NEW PASSWORD */}
        {forgotPasswordForm.step === 'reset' && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NEW PASSWORD</Text>
              <TextInput
                style={[styles.authInput, errors.newPassword && styles.inputErrorBorder]}
                onChangeText={(val) => {
                  setForgotPasswordForm({ ...forgotPasswordForm, newPassword: val });
                  // Real-time validation (no visual checklist)
                  const error = resetValidators.newPassword(val);
                  setErrors(prev => ({ ...prev, newPassword: error }));
                }}
                value={forgotPasswordForm.newPassword}
                placeholder="••••••••"
                placeholderTextColor="#888888"
                secureTextEntry
              />
              {errors.newPassword && <Text style={styles.warningText}>{errors.newPassword}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
              <TextInput
                style={[styles.authInput, errors.confirmPassword && styles.inputErrorBorder]}
                onChangeText={(val) => {
                  setForgotPasswordForm({ ...forgotPasswordForm, confirmPassword: val });
                  // Real-time validation - check if matches new password
                  const error = resetValidators.confirmPassword(val, forgotPasswordForm.newPassword);
                  setErrors(prev => ({ ...prev, confirmPassword: error }));
                }}
                value={forgotPasswordForm.confirmPassword}
                placeholder="••••••••"
                placeholderTextColor="#888888"
                secureTextEntry
              />
              {errors.confirmPassword && <Text style={styles.warningText}>{errors.confirmPassword}</Text>}
            </View>
          </>
        )}

        {errors.general && <Text style={styles.warningText}>{errors.general}</Text>}

        <TouchableOpacity
          style={[styles.authSubmitBtn, isLoading && styles.authSubmitBtnDisabled]}
          onPress={() => handleForgotPasswordAction()}
          disabled={isLoading}
        >
          <Text style={styles.authSubmitText}>
            {isLoading ? 'PLEASE WAIT...' :
             forgotPasswordForm.step === 'email' ? 'SEND CODE' :
             forgotPasswordForm.step === 'code' ? 'VERIFY CODE' :
             'RESET PASSWORD'}
          </Text>
        </TouchableOpacity>

        {/* BACK TO LOGIN LINK */}
        <TouchableOpacity
          style={styles.toggleAuth}
          onPress={() => {
            setShowForgotPasswordModal(false);
            setAuthMode('login');
            setForgotPasswordForm({ email: '', code: '', newPassword: '', confirmPassword: '', step: 'email' });
            setErrors({});
          }}
        >
          <Text style={styles.toggleText}>← Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

{/* SUCCESS MODAL - PASSWORD RESET */}
<Modal visible={successModal} transparent animationType="fade">
  <View style={styles.successOverlay}>
    <View style={styles.successModalBox}>
      <Text style={styles.successTitle}>✓ Success!</Text>
      <Text style={styles.successMessage}>Your password has been reset successfully.</Text>
      <Text style={styles.successSubtext}>You can now log in with your new password.</Text>
    </View>
  </View>
</Modal>

    </SafeAreaView>
  );
}

// STYLES RESTORED COMPLETELY
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F0' },
  logo: { fontSize: 22, fontFamily: 'serif', color: '#1a1a1a' },
  section: { paddingHorizontal: 25, marginTop: 40 },
  whiteBg: { backgroundColor: '#FFFFFF', paddingVertical: 50, marginTop: 80 },
  tagline: { fontSize: 10, letterSpacing: 2, color: '#6B5D4F', marginBottom: 15, textTransform: 'uppercase' },
  mainTitle: { fontSize: 44, fontFamily: 'serif', lineHeight: 50, color: '#1a1a1a' },
  sectionTitle: { fontSize: 32, fontFamily: 'serif', color: '#1a1a1a', marginBottom: 20 },
  description: { fontSize: 15, color: '#6B5D4F', lineHeight: 24, marginBottom: 20 },
  blackBtn: { backgroundColor: '#1a1a1a', flexDirection: 'row', padding: 18, justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 10 },
  blackBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  outlineBtn: { borderWidth: 1, borderColor: '#1a1a1a', padding: 18, justifyContent: 'center', alignItems: 'center' },
  outlineBtnText: { color: '#1a1a1a', fontSize: 14 },
  textLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 30 },
  textLink: { fontSize: 12, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  imageWrapper: { marginTop: 40, position: 'relative' },
  heroImage: { width: '100%', height: 450 },
  collectionImage: { width: '100%', height: 350, marginTop: 20 },
  clientBadge: { position: 'absolute', bottom: -10, left: -10, backgroundColor: '#FFF', padding: 20, elevation: 5 },
  badgeSub: { fontSize: 10, color: '#6B5D4F' },
  badgeMain: { fontSize: 18, fontFamily: 'serif', marginTop: 5 },
  servicesSection: { padding: 25, backgroundColor: '#FAF7F0' },
  servicesHeader: { fontSize: 32, fontFamily: 'serif', textAlign: 'center', color: '#1a1a1a', marginBottom: 15 },
  servicesSub: { fontSize: 15, color: '#6B5D4F', textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  serviceBox: { backgroundColor: '#FFFFFF', padding: 30, marginBottom: 20, borderRadius: 2 },
  iconCircle: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#FAF7F0', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  serviceTitle: { fontSize: 20, fontFamily: 'serif', color: '#1a1a1a', marginBottom: 10 },
  serviceDesc: { fontSize: 14, color: '#6B5D4F', lineHeight: 20, marginBottom: 20 },
  learnMoreRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  learnMoreText: { fontSize: 11, fontWeight: 'bold', color: '#1a1a1a', letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', paddingTop: 50 },
  dropdownBox: { width: '90%', backgroundColor: '#FAF7F0', borderRadius: 2, paddingBottom: 30, elevation: 20 },
  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E8E4D9' },
  menuLogo: { fontSize: 20, fontFamily: 'serif', color: '#1a1a1a' },
  navItemsList: { paddingTop: 20, paddingHorizontal: 25 },
  navRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, gap: 15 },
  navText: { fontSize: 12, letterSpacing: 2, color: '#6B5D4F', fontWeight: '500' },
  logoutRow: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#E8E4D9', paddingTop: 15 },
  logoutText: { color: '#D9534F' },
  statsSection: { backgroundColor: '#1a1a1a', paddingVertical: 60, paddingHorizontal: 20 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 40 },
  statItem: { alignItems: 'center', width: '45%' },
  statNumber: { fontSize: 42, fontFamily: 'serif', color: '#FFFFFF', marginBottom: 10 },
  statLabel: { fontSize: 10, color: '#A0A0A0', letterSpacing: 2, textAlign: 'center' },
  ctaSection: { backgroundColor: '#FAF7F0', paddingVertical: 80, paddingHorizontal: 30, alignItems: 'center' },
  ctaTitle: { fontSize: 34, fontFamily: 'serif', textAlign: 'center', color: '#1a1a1a', lineHeight: 42, marginBottom: 20 },
footerContainer: {
  backgroundColor: '#6B5D4F',
  padding: 20,
  paddingTop: 25,
},
footerJoinTitle: {
  fontSize: 18,
  fontFamily: 'serif',
  color: '#FFF',
  marginBottom: 6,
},
footerJoinSub: {
  fontSize: 12,
  color: 'rgba(255,255,255,0.8)',
  lineHeight: 16,
  marginBottom: 16,
},
newsletterRow: {
  flexDirection: 'row',
  height: 42,
  marginBottom: 18,
  gap: 8,
},
emailInput: {
  flex: 1,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.3)',
  paddingHorizontal: 12,
  color: '#FFF',
  backgroundColor: 'rgba(0,0,0,0.05)',
  fontSize: 12,
},
emailSubmitBtn: {
  width: 50,
  backgroundColor: '#FFF',
  justifyContent: 'center',
  alignItems: 'center',
},
footerLinksGrid: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 12,
},
footerColumn: {
  width: '48%',
},
columnHeader: {
  fontSize: 10,
  fontWeight: 'bold',
  color: 'rgba(255,255,255,0.6)',
  letterSpacing: 1,
  marginBottom: 8,
},
footerLink: {
  fontSize: 11,
  color: '#FFF',
  marginBottom: 6,
  lineHeight: 16,
},
socialRow: {
  flexDirection: 'row',
  marginTop: 6,
  gap: 12,
},
footerDivider: {
  height: 1,
  backgroundColor: 'rgba(255,255,255,0.1)',
  marginVertical: 12,
},
copyrightText: {
  fontSize: 9,
  color: 'rgba(255,255,255,0.5)',
  textAlign: 'center',
  marginBottom: 6,
},
legalRow: {
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 15,
  marginBottom: 10,
},
legalText: {
  fontSize: 9,
  color: 'rgba(255,255,255,0.5)',
},
  authOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  authCard: { width: '85%', backgroundColor: '#FAF7F0', padding: 30, borderRadius: 2 },
  authClose: { position: 'absolute', top: 20, right: 20, width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  authTitle: { fontSize: 28, fontFamily: 'serif', textAlign: 'center', color: '#1a1a1a', marginTop: 20 },
  authSub: { fontSize: 12, color: '#6B5D4F', textAlign: 'center', marginVertical: 10 },
  authForm: { marginTop: 25 },
  nameRow: { flexDirection: 'row', gap: 10 },
  nameCol: { flex: 1 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 10, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  authInput: { height: 45, borderWidth: 1, borderColor: '#D1CDC7', paddingHorizontal: 15, backgroundColor: '#FFF', paddingRight: 45 },
  passwordInputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1CDC7', backgroundColor: '#FFF' },
  eyeIcon: { position: 'absolute', right: 15, padding: 5, justifyContent: 'center', alignItems: 'center' },
  passwordChecklistContainer: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#F8F8F8', borderRadius: 6 },
  checklistItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  checklistText: { fontSize: 12, color: '#444' },
  checkPassed: { color: '#10B981', fontWeight: '700', width: 20 },
  checkFailed: { color: '#DC2626', fontWeight: '700', width: 20 },
  authSubmitBtn: { backgroundColor: '#1a1a1a', height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  authSubmitBtnDisabled: { backgroundColor: '#888', opacity: 0.6 },
  authSubmitText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  toggleAuth: { marginTop: 20, alignItems: 'center' },
  toggleText: { fontSize: 11, color: '#6B5D4F', textDecorationLine: 'underline' },
  forgotPasswordLink: { marginTop: 10, alignItems: 'center' },
  forgotPasswordText: { fontSize: 10, color: '#D9534F', fontWeight: '600', textDecorationLine: 'underline' },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginVertical: 20 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E8E4D9', borderWidth: 2, borderColor: '#D9D4CA' },
  stepDotActive: { backgroundColor: '#6B5D4F', borderColor: '#6B5D4F' },
  signupStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  signupStepDone: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#D4AF37',
    justifyContent: 'center', alignItems: 'center',
  },
  signupStepDoneText: {
    color: '#fff', fontSize: 13, fontWeight: '700',
  },
  signupStepActive: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center', alignItems: 'center',
  },
  signupStepActiveText: {
    color: '#fff', fontSize: 13, fontWeight: '700',
  },
  signupStepInactive: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E8DCC8',
    justifyContent: 'center', alignItems: 'center',
  },
  signupStepInactiveText: {
    color: '#6B5D4F', fontSize: 13,
  },
  signupStepConnectorDone: {
    width: 36, height: 2, backgroundColor: '#D4AF37',
  },
  signupStepConnectorInactive: {
    width: 36, height: 2, backgroundColor: '#E8DCC8',
  },
  signupStepLabelRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    marginBottom: 20,
  },
  signupStepLabelDone: {
    fontSize: 10, color: '#D4AF37',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  signupStepLabelActive: {
    fontSize: 10, color: '#1a1a1a', fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  signupStepLabelInactive: {
    fontSize: 10, color: '#6B5D4F',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  warningText: {
  color: '#D9534F', 
  fontSize: 10, 
  marginTop: 4, 
  fontWeight: '600',
  textTransform: 'uppercase'
},
inputErrorBorder: {
  borderColor: '#D9534F',
},
verifySub: {
  fontSize: 12,
  color: '#6B5D4F',
  textAlign: 'center',
  marginBottom: 15,
},
resendRow: {
  marginTop: 14,
  alignItems: 'center',
},
resendTimerText: {
  fontSize: 11,
  color: '#9B8F85',
  letterSpacing: 0.3,
},
resendLink: {
  fontSize: 11,
  color: '#6B5D4F',
  fontWeight: '700',
  textDecorationLine: 'underline',
  letterSpacing: 0.3,
},
successOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  justifyContent: 'center',
  alignItems: 'center',
},
successModalBox: {
  backgroundColor: '#FFFFFF',
  paddingHorizontal: 40,
  paddingVertical: 50,
  borderRadius: 8,
  alignItems: 'center',
  width: '85%',
  elevation: 10,
},
successTitle: {
  fontSize: 28,
  fontFamily: 'serif',
  fontWeight: 'bold',
  color: '#10b981',
  marginBottom: 15,
},
successMessage: {
  fontSize: 16,
  color: '#1a1a1a',
  textAlign: 'center',
  marginBottom: 8,
  fontWeight: '500',
},
successSubtext: {
  fontSize: 13,
  color: '#6B5D4F',
  textAlign: 'center',
},
successSplash: {
  position: 'absolute',
  top: '40%',
  alignSelf: 'center',
  backgroundColor: '#1a1a1a',
  padding: 25,
  borderRadius: 2,
  zIndex: 1000,
},
  // (removed visual checklist styles)
});
