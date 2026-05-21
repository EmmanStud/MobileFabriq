import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  TextInput,
  Platform,
  Image,
  ActivityIndicator,
  FlatList,
  PanResponder,
  Animated,
  Alert,
} from 'react-native';
import { Palette, Upload, Ruler, ChevronRight, CheckCircle2, Menu, X, ShoppingBag, Instagram, Facebook, Mail, ArrowRight, Calendar, Camera as CameraIcon, Sparkles, RotateCw, ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react-native';
import Svg, { Path, Line, Circle, Defs, LinearGradient, RadialGradient, Stop, G } from 'react-native-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
//import * as FaceDetector from 'expo-face-detector';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { sessionService } from '../services/sessionService';
import { mongodbService } from '../services/mongodbService';
import { API_URL, API_CONFIG } from '../services/apiConfig';
import HamburgerMenu from '../components/HamburgerMenu';
import Header from '../components/Header';
import { showAlert } from '../services/platformService';

// Reusable color and fabric options
const colorOptions = [
  'Ivory',
  'White',
  'Blush Pink',
  'Navy Blue',
  'Gold',
  'Silver',
  'Rose Gold',
  'Black',
  'Champagne',
  'Sage Green',
  'Custom/Other',
];

const fabricOptions = [
  'Silk',
  'Satin',
  'Lace',
  'Tulle',
  'Organza',
  'Chiffon',
  'Taffeta',
  'Crepe',
  'Velvet',
  'Blend/Other',
];

const formatPeso = (amount) => '₱' + (amount || 0).toLocaleString('en-PH');

// Status steps for progress tracking
// Note: Mock data removed; orders now managed via state and form submission

const statusSteps = [
  { key: 'inquiry', label: 'Inquiry' },
  { key: 'design-approval', label: 'Design Approval' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'fitting', label: 'Fitting' },
  { key: 'completed', label: 'Completed' },
];
// Note: 'rejected' is shown separately as a badge, not a step

const COLOR_HEX_MAP = {
  'Peach': '#FFCBA4',
  'Champagne': '#F7E7CE',
  'Coral': '#FF7F7F',
  'Warm Gold': '#D4AF37',
  'Ivory': '#FFFFF0',
  'Blush': '#FFB6C1',
  'Rose Gold': '#B76E79',
  'Lavender': '#C9A0DC',
  'Ice Blue': '#D6ECFA',
  'Soft Pink': '#FFD1DC',
  'Mint': '#98FF98',
  'Pearl': '#F0EAD6',
  'Lilac': '#C8A2C8',
  'Baby Blue': '#89CFF0',
  'Soft White': '#FAF9F6',
  'Dusty Rose': '#DCAE96',
  'Sage': '#B2AC88',
  'Cream': '#FFFDD0',
  'Mauve': '#E0B0FF',
  'Nude': '#F2D2BD',
  'Gold': '#D4AF37',
  'Warm Beige': '#F5DEB3',
  'Caramel': '#C68642',
  'Butter Yellow': '#FFFD74',
  'Apricot': '#FBCEB1',
  'Periwinkle': '#CCCCFF',
  'Soft Teal': '#70C1B3',
  'Dusty Lavender': '#BFA9BE',
  'Sky Blue': '#87CEEB',
  'Rose': '#FF007F',
  'Powder Blue': '#B0E0E6',
  'Blush Pink': '#FFB6C1',
  'Sage Green': '#77815C',
  'Warm Taupe': '#C4A882',
  'Soft Coral': '#F88379',
  'Warm Red': '#C23B22',
  'Burnt Orange': '#CC5500',
  'Olive': '#808000',
  'Copper': '#B87333',
  'Terracotta': '#E2725B',
  'Mustard': '#FFDB58',
  'Emerald': '#50C878',
  'Royal Blue': '#4169E1',
  'Berry': '#9B2335',
  'Plum': '#8E4585',
  'Teal': '#008080',
  'Deep Lavender': '#967BB6',
  'Navy': '#000080',
  'Warm Mauve': '#D8A9A9',
  'Camel': '#C19A6B',
  'Mocha': '#A0785A',
  'Warm Orange': '#FF8C00',
  'Deep Gold': '#B8860B',
  'Rust': '#B7410E',
  'Chocolate Brown': '#7B3F00',
  'Amber': '#FFBF00',
  'Curry': '#CEAB26',
  'Brick Red': '#CB4154',
  'Deep Teal': '#00555A',
  'Cobalt Blue': '#0047AB',
  'Magenta': '#FF00FF',
  'Deep Plum': '#580F41',
  'Indigo': '#4B0082',
  'Jewel Teal': '#00878A',
  'Violet': '#EE82EE',
  'Warm Burgundy': '#800020',
  'Deep Rose': '#C21E56',
  'Bronze': '#CD7F32',
  'Cognac': '#9A463D',
  'Warm Brown': '#964B00',
  'Bright Orange': '#FF4500',
  'Red': '#FF0000',
  'Warm Yellow': '#FFD700',
  'Flame': '#E25822',
  'Electric Blue': '#7DF9FF',
  'Hot Pink': '#FF69B4',
  'Bright Purple': '#9400D3',
  'White': '#FFFFFF',
  'Fuchsia': '#FF00FF',
  'Cobalt': '#0047AB',
  'Bright White': '#FFFFFF',
  'Royal Purple': '#7851A9',
};

export default function Bespoke({ navigation, route, unreadCount = 0 }) {
  const [activeTab, setActiveTab] = useState('new');
  const [menuVisible, setMenuVisible] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showEventDatePicker, setShowEventDatePicker] = useState(false);
  const [webCalendarState, setWebCalendarState] = useState({ active: null, display: null });
  const [currentUser, setCurrentUser] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showFabricDropdown, setShowFabricDropdown] = useState(false);
  const [userOrders, setUserOrders] = useState([]);
  const [authToken, setAuthToken] = useState(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [lastAnalysisId, setLastAnalysisId] = useState(null);

  // Camera State
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [skinAnalysis, setSkinAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [allGowns, setAllGowns] = useState([]);
  const [recommendedGowns, setRecommendedGowns] = useState([]);
  const cameraRef = React.useRef(null);
  const scrollRef = React.useRef(null);
  const recommendationRef = React.useRef(null);
  const autoRotateRef = React.useRef(null);
  const animationRef = React.useRef(null);

  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (cameraVisible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanLineAnim.setValue(0);
    }
  }, [cameraVisible]);

  const [show3DViewer, setShow3DViewer] = useState(false);
  const [rotation3D, setRotation3D] = useState({ x: 0, y: 0 });
  const [zoom3D, setZoom3D] = useState(1);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [lastTouchPos, setLastTouchPos] = useState({ x: 0, y: 0 });
  const [isDragging3D, setIsDragging3D] = useState(false);
  const [sparkleVisible, setSparkleVisible] = useState(true);
  const [design3DData, setDesign3DData] = useState(null);

  const scoreGown = (gown, recommendedColors) => {
    let score = 0;
    if (!gown || !recommendedColors) return 0;

    const colorsToMatch = recommendedColors.map(c => c.toLowerCase());
    const gownColor = (gown.color || '').toLowerCase();

    // 1. Color Match (+10)
    if (colorsToMatch.some(color => gownColor.includes(color) || color.includes(gownColor))) {
      score += 10;
    }

    // 2. Category Match (+5)
    // Map fabric preference or special requests to categories if possible
    const specialRequests = (formData.specialRequests || '').toLowerCase();
    if (gown.category) {
      const category = gown.category.toLowerCase();
      if (specialRequests.includes(category)) {
        score += 5;
      }
    }

    // 3. Popularity/Featured (+2)
    if (gown.rating && gown.rating >= 4.5) {
      score += 2;
    }

    return score;
  };

  const filterRecommendedGowns = (gowns, recommendedColors) => {
    if (!gowns || gowns.length === 0) return [];
    if (!recommendedColors || recommendedColors.length === 0) return gowns.slice(0, 8);

    const colorsLower = recommendedColors.map(c => c.toLowerCase());

    // Score each gown
    const scored = gowns.map(gown => {
      const gownColor = (gown.color || '').toLowerCase();
      const gownName = (gown.name || '').toLowerCase();
      const gownCategory = (gown.category || '').toLowerCase();

      let score = 0;

      // Exact color match = highest score
      if (colorsLower.some(c => gownColor === c)) score += 100;
      // Partial color match
      else if (colorsLower.some(c => gownColor.includes(c) || c.includes(gownColor))) score += 60;
      // Color mentioned in name
      else if (colorsLower.some(c => gownName.includes(c))) score += 30;

      // Bonus for formal categories (more relevant for events)
      if (['ball gown', 'evening', 'formal', 'wedding'].some(cat => gownCategory.includes(cat))) {
        score += 10;
      }

      // Calculate match percentage for display
      const matchPct = Math.min(99, score > 0 ? 60 + Math.floor(score / 3) : 0);

      return { ...gown, score, matchPct };
    });

    // Sort by score descending
    const sorted = scored.sort((a, b) => b.score - a.score);

    // Take top matches — minimum 6, maximum 12
    const topMatches = sorted.filter(g => g.score > 0).slice(0, 12);

    // If less than 6 matches, fill with remaining gowns (lower score ones)
    if (topMatches.length < 6) {
      const remaining = sorted.filter(g => g.score === 0).slice(0, 6 - topMatches.length);
      remaining.forEach(g => { g.matchPct = Math.floor(Math.random() * 20) + 30; });
      return [...topMatches, ...remaining];
    }

    return topMatches;
  };

  const applyAIRecommendation = () => {
    if (!skinAnalysis || !skinAnalysis.recommendedColors) return;
    
    // Auto-fill preferred colors
    const colors = skinAnalysis.recommendedColors.join(', ');
    setFormData(prev => ({ ...prev, preferredColors: colors }));
    
    // Scroll to recommendations
    if (recommendationRef.current) {
      recommendationRef.current.measure((x, y, width, height, pageX, pageY) => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ y: pageY - 100, animated: true });
        }
      });
    }

    // Track applied recommendation in DB
    if (lastAnalysisId) {
      (async () => {
        try {
          const token = await sessionService.getSession().then(s => s?.token);
          if (token) {
            const response = await fetch(
              `${API_CONFIG.BASE_URL}/skin-analysis/${lastAnalysisId}/applied`,
              {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  selectedColor: formData.preferredColors || null,
                }),
              }
            );

            if (!response.ok) {
              const errText = await response.text();
              console.error('updateSkinAnalysisApplied failed:', response.status, errText);
            } else {
              console.log('[AI] Analysis marked as applied in color_anal:', lastAnalysisId);
            }
          }
        } catch (err) {
          console.error('updateSkinAnalysisApplied error:', err);
        }
      })();
    }

    showAlert('Recommendation Applied', 'Preferred colors updated and AI-matched gowns highlighted.');
  };

  const saveSkinAnalysisToDb = async (analysis, gowns) => {
    try {
      const token = await sessionService.getSession().then(s => s?.token);
      if (!token || !analysis) return;

      const body = {
        skinTone: analysis.tone,
        undertone: analysis.undertone,
        skinHex: analysis.hex,
        skinRgb: analysis.rgb,
        recommendedColors: analysis.recommendedColors || [],
        recommendedGownIds: gowns
          .map(g => g._id || g.id)
          .filter(id => id && typeof id === 'string' && id.length === 24)
          .slice(0, 12),
        insightText: analysis.insight || null,
        branch: formData.branch || null,
      };

      const response = await fetch(
        `${API_CONFIG.BASE_URL}/skin-analysis/save`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error('saveSkinAnalysisToDb failed:', response.status, errText);
        return;
      }
      const data = await response.json();
      setLastAnalysisId(data.analysisId);
      console.log('[AI] Skin analysis saved to color_anal:', data.analysisId);
    } catch (err) {
      console.error('saveSkinAnalysisToDb error:', err);
    }
  };

  const analyzeSkinTone = async (imageUri) => {
    try {
      setIsAnalyzing(true);

      // Manipulate the image to sample the cheek area
      // Cheek region = center-left area of a selfie (roughly 35-50% from left, 45-65% from top)
      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { resize: { width: 100, height: 100 } },
          { crop: { originX: 25, originY: 40, width: 30, height: 20 } },
        ],
        { format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!manipResult.base64) {
        throw new Error('Could not process image');
      }

      const base64Data = manipResult.base64;
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      const startOffset = Math.floor(bytes.length * 0.3);
      const step = Math.max(1, Math.floor(bytes.length / 50));

      for (let i = startOffset; i < bytes.length - 3; i += step) {
        const val = bytes[i];
        if (val > 40 && val < 250) {
          rSum += val;
          gSum += bytes[i + 1] || val;
          bSum += bytes[i + 2] || val;
          count++;
        }
      }

      let r = count > 0 ? Math.round(rSum / count) : 180;
      let g = count > 0 ? Math.round(gSum / count) : 140;
      let b = count > 0 ? Math.round(bSum / count) : 110;

      r = Math.min(255, Math.max(60, r));
      g = Math.min(220, Math.max(40, g));
      b = Math.min(200, Math.max(20, b));

      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      let tone;
      if (luminance > 200) tone = 'fair';
      else if (luminance > 170) tone = 'light';
      else if (luminance > 130) tone = 'medium';
      else if (luminance > 100) tone = 'tan';
      else tone = 'deep';

      const rbDiff = r - b;
      const rgDiff = r - g;
      let undertone;
      if (rbDiff > 30 && rgDiff < 40) undertone = 'warm';
      else if (rbDiff < 10) undertone = 'cool';
      else undertone = 'neutral';

      const derivedHex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      const recommendedColors = getRecommendedColors(tone, undertone);

      setSkinAnalysis({
        tone,
        undertone,
        rgb: { r, g, b },
        hex: derivedHex,
        recommendedColors,
        insight: getAIInsight(tone, undertone),
      });

      const filtered = filterRecommendedGowns(allGowns, recommendedColors);
      setRecommendedGowns(filtered);

      // Save to DB silently
      const analysisObj = {
        tone, undertone,
        rgb: { r, g, b },
        hex: derivedHex,
        recommendedColors,
        insight: getAIInsight(tone, undertone),
      };
      saveSkinAnalysisToDb(analysisObj, filtered);

    } catch (err) {
      console.error('analyzeSkinTone error:', err);
      Alert.alert('Analysis Failed', 'Could not analyze skin tone. Please try again with better lighting.');
    } finally {
      setIsAnalyzing(false);
    }
  }; 


  const getRecommendedColors = (tone, undertone) => {
    const map = {
      'fair-warm':      ['Peach', 'Champagne', 'Coral', 'Warm Gold', 'Ivory', 'Blush', 'Rose Gold'],
      'fair-cool':      ['Lavender', 'Ice Blue', 'Soft Pink', 'Mint', 'Pearl', 'Lilac', 'Baby Blue'],
      'fair-neutral':   ['Soft White', 'Blush', 'Dusty Rose', 'Sage', 'Cream', 'Mauve', 'Nude'],
      'light-warm':     ['Gold', 'Peach', 'Warm Beige', 'Coral', 'Caramel', 'Butter Yellow', 'Apricot'],
      'light-cool':     ['Periwinkle', 'Soft Teal', 'Dusty Lavender', 'Sky Blue', 'Rose', 'Lilac', 'Powder Blue'],
      'light-neutral':  ['Blush Pink', 'Sage Green', 'Warm Taupe', 'Nude', 'Champagne', 'Soft Coral', 'Ivory'],
      'medium-warm':    ['Warm Red', 'Burnt Orange', 'Gold', 'Olive', 'Copper', 'Terracotta', 'Mustard'],
      'medium-cool':    ['Emerald', 'Royal Blue', 'Berry', 'Plum', 'Teal', 'Deep Lavender', 'Navy'],
      'medium-neutral': ['Dusty Rose', 'Warm Mauve', 'Sage', 'Camel', 'Mocha', 'Soft Teal', 'Blush'],
      'tan-warm':       ['Warm Orange', 'Deep Gold', 'Rust', 'Chocolate Brown', 'Amber', 'Curry', 'Brick Red'],
      'tan-cool':       ['Deep Teal', 'Cobalt Blue', 'Magenta', 'Deep Plum', 'Indigo', 'Jewel Teal', 'Violet'],
      'tan-neutral':    ['Warm Burgundy', 'Caramel', 'Deep Rose', 'Bronze', 'Nude', 'Cognac', 'Warm Brown'],
      'deep-warm':      ['Bright Orange', 'Gold', 'Red', 'Warm Yellow', 'Coral', 'Copper', 'Flame'],
      'deep-cool':      ['Electric Blue', 'Hot Pink', 'Bright Purple', 'Emerald', 'White', 'Fuchsia', 'Cobalt'],
      'deep-neutral':   ['Bright White', 'Red', 'Royal Purple', 'Deep Teal', 'Magenta', 'Champagne', 'Gold'],
    };
    const key = `${tone}-${undertone}`;
    return map[key] || map['medium-neutral'];
  };

  const getAIInsight = (tone, undertone) => {
    const insights = {
      'fair-warm':      'Your fair skin with warm undertones radiates beautifully in peachy, golden hues. Avoid stark cool whites — they can wash you out.',
      'fair-cool':      'Your fair complexion with cool undertones glows in soft lavenders and icy blues. Avoid yellows and oranges that clash with your natural hue.',
      'fair-neutral':   'Your fair neutral skin is incredibly versatile. Soft, muted tones like dusty rose and sage complement you effortlessly.',
      'light-warm':     'Your light warm complexion comes alive in golden and coral shades. Earth tones like caramel and warm beige are your best friends.',
      'light-cool':     'Your light cool skin shines in soft blues and rosy tones. Periwinkle and powder blue bring out your natural clarity.',
      'light-neutral':  'With your balanced neutral undertones, you can wear a wide range. Blush pinks and champagne tones are universally flattering on you.',
      'medium-warm':    'Your medium warm skin has a beautiful golden depth. Rich, warm tones like terracotta, copper, and olive make you glow.',
      'medium-cool':    'Your medium cool complexion is stunning in jewel tones. Emerald, royal blue, and plum create a striking, elegant contrast.',
      'medium-neutral': 'Your medium neutral skin is beautifully balanced. Dusty rose, sage, and mauve all complement your even complexion.',
      'tan-warm':       'Your tan warm skin has a gorgeous sun-kissed depth. Deep golds, rusts, and warm oranges enhance your natural richness.',
      'tan-cool':       'Your tan cool complexion is bold and beautiful. Deep teals, cobalts, and jewel tones create an impressive, vibrant look.',
      'tan-neutral':    'Your tan neutral skin looks radiant in warm burgundies and bronzes. Your versatile tone carries both warm and cool shades beautifully.',
      'deep-warm':      'Your deep warm skin is rich and luminous. Bright, warm tones like flame, coral, and gold create a breathtaking contrast.',
      'deep-cool':      'Your deep cool complexion is stunning in bold, saturated colors. Electric blues, fuchsias, and bright purples make you shine.',
      'deep-neutral':   'Your deep neutral skin is regal and striking. Bright whites, reds, and royal purples create a powerful, elegant statement.',
    };
    const key = `${tone}-${undertone}`;
    return insights[key] || 'Your unique skin tone has its own natural beauty. The recommended palette is curated to enhance your complexion.';
  };

  const handleOpenCamera = async () => {
    if (!permission) {
      // Camera permissions are still loading.
      return;
    }

    if (!permission.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        showAlert('Permission Denied', 'Camera access is required to use this feature.');
        return;
      }
    }
    setCameraVisible(true);
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      // ── Validate face presence before closing camera ──
      const faceDetected = await validateFacePresence(photo.uri);

      if (!faceDetected) {
        Alert.alert(
          '⚠️ No Face Detected',
          'We could not detect a face in the photo. Please:\n\n• Center your face in the oval\n• Ensure good lighting\n• Remove sunglasses or mask\n• Move closer to the camera',
          [{ text: 'Try Again', style: 'default' }]
        );
        return; // Stay on camera — don't close
      }

      // Face detected — proceed
      setCapturedImage(photo.uri);
      setCameraVisible(false);
      await analyzeSkinTone(photo.uri);

    } catch (err) {
      console.error('takePicture error:', err);
      Alert.alert('Error', 'Could not take photo. Please try again.');
    }
  };

  const validateFacePresence = async (imageUri) => {
    try {
      // Resize image to small size for fast pixel analysis
      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 100, height: 100 } }],
        { format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!manipResult.base64) return false;

      // Decode base64 to bytes
      const binaryStr = atob(manipResult.base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      // Sample pixels at regular intervals
      const startOffset = Math.floor(bytes.length * 0.2);
      const step = Math.max(1, Math.floor(bytes.length / 80));

      let skinPixelCount = 0;
      let totalSampled = 0;
      let rValues = [];
      let gValues = [];
      let bValues = [];

      for (let i = startOffset; i < bytes.length - 3; i += step) {
        const r = bytes[i];
        const g = bytes[i + 1] || 0;
        const b = bytes[i + 2] || 0;

        // Skip near-black and near-white (background, over-exposure)
        if (r < 30 && g < 30 && b < 30) continue;
        if (r > 240 && g > 240 && b > 240) continue;

        rValues.push(r);
        gValues.push(g);
        bValues.push(b);
        totalSampled++;

        const isSkinTone = (
          r > 60 &&
          r > g &&
          r > b &&
          (r - b) > 8 &&
          (r - g) < 80 &&
          g > 30 &&
          b > 20 &&
          r < 250
        );

        if (isSkinTone) skinPixelCount++;
      }

      if (totalSampled === 0) return false;

      // Check pixel variance — a blank wall has very low variance
      if (rValues.length > 5) {
        const rMean = rValues.reduce((a, b) => a + b, 0) / rValues.length;
        const variance = rValues.reduce((acc, v) => acc + Math.pow(v - rMean, 2), 0) / rValues.length;
        if (variance < 30) return false;
      }

      // Need at least 25% of sampled pixels to be skin-toned
      const skinRatio = skinPixelCount / totalSampled;
      return skinRatio >= 0.12;

    } catch (err) {
      console.error('validateFacePresence error:', err);
      return true; // Fail open — if validation crashes, allow the photo
    }
  };

  // Helper: Get today's date as YYYY-MM-DD string in local timezone (reused from Rentals)
  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper: Parse YYYY-MM-DD string to Date object at midnight local time (reused from Rentals)
  const parseLocalDateString = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  };

  // Calendar utilities (Rentals style)
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const today = new Date();
  const todayString = getLocalDateString(today);

  const [formData, setFormData] = useState({
    customerName: '',
    contactNumber: '',
    email: '',
    eventDate: new Date(today),
    eventDateString: '',
    preferredColors: '',
    fabricPreference: '',
    specialRequests: '',
    budget: '',
    branch: 'Taguig Main - Cadena de Amor',
  });

  useEffect(() => {
    const loadGowns = async () => {
      try {
        const url = `${API_CONFIG.BASE_URL}/inventory/public`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          // Normalize gowns as done in Collection.jsx (simplified for matching)
          const mapped = (data.items || []).map(item => ({
            id: item._id || item.id,
            name: item.name,
            color: item.color,
            image: item.image,
            price: item.price,
            category: item.category,
          }));
          setAllGowns(mapped);
        }
      } catch (err) {
        console.error('Failed to load gowns for recommendations:', err);
      }
    };

    const checkSession = async () => {
      const logged = await sessionService.isLoggedIn();
      setIsLoggedIn(logged);
      if (logged) {
        const session = await sessionService.getSession();
        if (session?.token) setAuthToken(session.token);
        const currentUser = await sessionService.getCurrentUser();
        setCurrentUser(currentUser);
        if (currentUser && currentUser.email) {
          setUserEmail(currentUser.email.toLowerCase());
          // Fetch custom orders for this user
          fetchUserOrders(currentUser.email.toLowerCase());
        }
        if (currentUser && currentUser.email) {
          const fullName = currentUser.name || (currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : '');
          const phone = currentUser.phoneNumber 
            || currentUser.phone 
            || currentUser.contactNumber 
            || ''; 
          // Strip leading +63 or 0, keep only 10 digits starting with 9 
          const digits = phone.replace(/^\+63/, '').replace(/^0/, ''); 
          const normalized = digits.startsWith('9') && digits.length === 10 
            ? digits 
            : ''; 
          setFormData(prev => ({ 
            ...prev, 
            customerName: fullName, 
            email: currentUser.email, 
            contactNumber: normalized, 
          })); 
          setPhoneVerified(Boolean(currentUser.phoneVerified)); 
        }
      }
    };
    loadGowns();
    checkSession();
  }, []);

  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^(\+63|0)?9\d{9}$/;
    return phoneRegex.test(phone.replace(/\s|-/g, ''));
  };

  // Sparkle animation effect
  useEffect(() => { 
    if (!show3DViewer) return; 
    const interval = setInterval(() => setSparkleVisible(v => !v), 600); 
    return () => clearInterval(interval); 
  }, [show3DViewer]);

  // Helper function to clear auto-rotate
  const clearAutoRotate = () => { 
    if (autoRotateRef.current) { 
      clearInterval(autoRotateRef.current); 
      autoRotateRef.current = null; 
    } 
  };

  // PanResponder for 3D dress drag
  const panResponder3D = React.useMemo(() => PanResponder.create({ 
    onStartShouldSetPanResponder: () => true, 
    onMoveShouldSetPanResponder: () => true, 
    onPanResponderGrant: (evt) => { 
      setIsDragging3D(true); 
      setLastTouchPos({ x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY }); 
    }, 
    onPanResponderMove: (evt) => { 
      const dx = evt.nativeEvent.pageX - lastTouchPos.x; 
      const dy = evt.nativeEvent.pageY - lastTouchPos.y; 
      setRotation3D(prev => ({ 
        x: prev.x + dy * 0.5, 
        y: prev.y + dx * 0.5, 
      })); 
      setLastTouchPos({ x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY }); 
    }, 
    onPanResponderRelease: () => setIsDragging3D(false), 
  }), [lastTouchPos]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Shared validation: Contact number (exact same as Rentals)
  const handleContactNumberChange = (value) => {
    // Keep digits only, max 10 digits
    const digits = (value || '').replace(/\D/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, contactNumber: digits }));

    // Real-time validation
    if (digits.length === 0) {
      setValidationErrors(prev => ({ ...prev, contactNumber: 'Contact number is required' }));
    } else if (digits.length < 10) {
      setValidationErrors(prev => ({ ...prev, contactNumber: `${10 - digits.length} more digit(s) needed` }));
    } else {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.contactNumber;
        return newErrors;
      });
    }
  };

  const fetchUserOrders = async (email) => {
    try {
      console.log('Fetching custom orders for', email);
      const session = await sessionService.getSession();
      const token = session?.token || authToken;
      const orders = await mongodbService.getCustomOrdersByUser(token);
      console.log('Fetched orders:', orders && orders.length);
      // Normalize returned orders (ensure id field exists)
      const norm = (Array.isArray(orders) ? orders : []).map(o => ({ ...o, id: o._id || o.id }));
      setUserOrders(norm);
    } catch (err) {
      console.error('Failed to fetch user orders:', err);
    }
  };

  // Handle event date selection (restricts to today and future)
  const handleEventDateChange = (date) => {
    setShowEventDatePicker(false);
    if (date) {
      const dateStr = getLocalDateString(date);
      setFormData(prev => ({ ...prev, eventDate: date, eventDateString: dateStr }));
      // Clear error when valid date is selected
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.eventDate;
        return newErrors;
      });
    }
  };

  const openEventDatePicker = () => {
    if (Platform.OS !== 'web') {
      setShowEventDatePicker(true);
      return;
    }

    setWebCalendarState({
      active: 'event',
      display: formData.eventDate ? new Date(formData.eventDate) : new Date(today),
    });
  };

  const handleWebCalendarMonthChange = (direction) => {
    if (!webCalendarState.display) return;
    const newDisplay = new Date(webCalendarState.display);
    newDisplay.setMonth(newDisplay.getMonth() + direction);
    setWebCalendarState((prev) => ({ ...prev, display: newDisplay }));
  };

  const handleWebCalendarDateSelect = (day) => {
    if (!webCalendarState.display || !webCalendarState.active) return;

    const selectedDate = new Date(
      webCalendarState.display.getFullYear(),
      webCalendarState.display.getMonth(),
      day,
      0, 0, 0, 0
    );

    const selectedDateStr = getLocalDateString(selectedDate);
    const nowActual = new Date(); 
    const daysToAdd = nowActual.getHours() >= 17 ? 2 : 1; 
    const minDate = new Date(nowActual); 
    minDate.setDate(minDate.getDate() + daysToAdd); 
    minDate.setHours(0, 0, 0, 0); 
  
    if (selectedDate < minDate) { 
      const minStr = getLocalDateString(minDate); 
      showAlert('Invalid date', `Please choose ${minStr} or a later date for your event.`); 
      return; 
    }

    setFormData((prev) => ({
      ...prev,
      eventDate: selectedDate,
      eventDateString: selectedDateStr,
    }));

    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.eventDate;
      return newErrors;
    });

    setWebCalendarState({ active: null, display: null });
  };

  // Check if all required fields are valid (disable submit until true)
  const isFormValid = () => {
    return (
      formData.customerName.trim() &&
      formData.contactNumber.length === 10 &&
      formData.email.trim() &&
      validateEmail(formData.email) &&
      formData.eventDateString &&
      formData.preferredColors &&
      formData.fabricPreference &&
      formData.budget &&
      Object.keys(validationErrors).length === 0
    );
  };

  const handleSubmit = async () => {
    // Phone verification gate — same pattern as Rentals 
    if (!phoneVerified) { 
      showAlert( 
        'Phone Number Not Verified', 
        'You need to verify your phone number in Profile Settings before submitting a custom order. This helps us contact you about your order.', 
        () => navigation.navigate('Profile') 
      ); 
      return; 
    }

    const newErrors = {};

    // Validation
    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Please enter your name';
    }

    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = 'Please enter your contact number';
    } else if (formData.contactNumber.length < 10) {
      newErrors.contactNumber = 'Please enter a valid 10-digit mobile number';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Please enter your email address';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.eventDateString) {
      newErrors.eventDate = 'Please select an event date';
    }

    if (!formData.preferredColors) {
      newErrors.preferredColors = 'Please select preferred colors';
    }

    if (!formData.fabricPreference) {
      newErrors.fabricPreference = 'Please select fabric preference';
    }

    if (!formData.budget) {
      newErrors.budget = 'Please select a budget range';
    }

    if (Object.keys(newErrors).length > 0) {
      setValidationErrors(newErrors);
      return;
    }

    setValidationErrors({});

    // Create order object from form data for DB
    const newOrder = {
      orderType: 'Custom Order',
      eventDate: formData.eventDateString,
      preferredColors: formData.preferredColors,
      fabricPreference: formData.fabricPreference,
      specialRequests: formData.specialRequests || '',
      budget: formData.budget,
      branch: formData.branch,
      ...(design3DData && { design3D: design3DData }),
    };

    // Try to save to backend
    try {
      const session = await sessionService.getSession();
      const token = session?.token || authToken;

      if (!token) {
        showAlert('Session Expired', 'Please log in again.');
        return;
      }

      const res = await mongodbService.createCustomOrder(newOrder, token);
      if (res.success && (res.customOrder || res.order)) {
        console.log('✅ Custom order created, refreshing from database...');
        const freshSession = await sessionService.getSession();
        const freshToken = freshSession?.token || authToken;
        const freshOrders = await mongodbService.getCustomOrdersByUser(freshToken);
        const normalized = (Array.isArray(freshOrders) ? freshOrders : []).map(order => ({ ...order, id: order._id || order.id }));
        setUserOrders(normalized);
      } else {
        console.warn('Create custom order failed:', res.error, 'status:', res.status);
        if (res.error?.toLowerCase().includes('phone number')) {
          showAlert('Phone Number Required', 'Please add your phone number in Profile Settings before submitting a custom order.');
        } else if (res.error?.toLowerCase().includes('verify your phone')) {
          showAlert('Phone Not Verified', 'Please verify your phone number in Profile Settings before submitting a custom order.');
        } else {
          showAlert('Error', res.error || 'Failed to submit order. Please try again.');
        }
        return;
      }
    } catch (err) {
      console.error('Error creating custom order:', err);
      showAlert('Error', 'Failed to submit order. Please check your connection.');
      return;
    }

    // Reset form (preserve customer name and email)
    setFormData({
      customerName: formData.customerName,
      contactNumber: '',
      email: formData.email || '',
      eventDate: new Date(today),
      eventDateString: '',
      preferredColors: '',
      fabricPreference: '',
      specialRequests: '',
      budget: '',
      branch: 'Taguig Main - Cadena de Amor',
    });
    setDesign3DData(null);

    // Show success modal and switch to My Orders tab
    setShowSuccessModal(true);
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setActiveTab('existing');
  };

  const handleLogout = async () => {
    await sessionService.clearSession();
    setIsLoggedIn(false);
    setMenuVisible(false);
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const handleAuthAction = (target) => {
    if (!isLoggedIn) {
      setMenuVisible(false);
      navigation.navigate('Home', { openAuth: true });
    } else {
      setMenuVisible(false);
      navigation.navigate(target);
    }
  };

  const getStatusIndex = (status) => {
    return statusSteps.findIndex((step) => step.key === status);
  };

  const getStatusLabel = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'inquiry': return 'Inquiry';
      case 'design-approval': return 'Design Approval';
      case 'in-progress': return 'In Progress';
      case 'fitting': return 'Fitting';
      case 'completed': return 'Completed';
      case 'rejected': return 'Rejected';
      default: return (status || '').charAt(0).toUpperCase() + (status || '').slice(1);
    }
  };

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'inquiry': return '#3b82f6'; // blue 
      case 'design-approval': return '#8b5cf6'; // purple 
      case 'in-progress': return '#f59e0b'; // amber 
      case 'fitting': return '#06b6d4'; // cyan 
      case 'completed': return '#10b981'; // green 
      case 'rejected': return '#ef4444'; // red 
      default: return '#6B5D4F';
    }
  };

  const getStatusBgColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'inquiry': return '#dbeafe';
      case 'design-approval': return '#ede9fe';
      case 'in-progress': return '#fef3c7';
      case 'fitting': return '#cffafe';
      case 'completed': return '#d1fae5';
      case 'rejected': return '#fee2e2';
      default: return '#F5EFE6';
    }
  };

  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [consultationOrderId, setConsultationOrderId] = useState(null);
  const [consultationDate, setConsultationDate] = useState('');
  const [consultationTime, setConsultationTime] = useState('');
  const [consultationReason, setConsultationReason] = useState('');
  const [schedulingConsultation, setSchedulingConsultation] = useState(false);
  const [consultationError, setConsultationError] = useState('');

  const [showFittingModal, setShowFittingModal] = useState(false);
  const [fittingOrderId, setFittingOrderId] = useState(null);
  const [fittingDate, setFittingDate] = useState('');
  const [fittingTime, setFittingTime] = useState('');
  const [fittingReason, setFittingReason] = useState('');
  const [schedulingFitting, setSchedulingFitting] = useState(false);
  const [fittingError, setFittingError] = useState('');

  const handleScheduleConsultation = async () => {
    if (!consultationDate || !consultationTime) {
      setConsultationError('Please select both a date and time.');
      return;
    }
    setSchedulingConsultation(true);
    setConsultationError('');
    try {
      const session = await sessionService.getSession();
      const token = session?.token || authToken;
      const body = { consultationDate, consultationTime };
      if (consultationReason) body.consultationRescheduleReason = consultationReason;
      const res = await mongodbService.scheduleConsultation(consultationOrderId, body, token);
      if (res.success) {
        setShowConsultationModal(false);
        fetchUserOrders(userEmail);
        showAlert('Success', 'Consultation scheduled successfully!');
      } else {
        setConsultationError(res.error || 'Failed to schedule consultation.');
      }
    } catch (err) {
      setConsultationError(err.message || 'Failed to schedule consultation.');
    } finally {
      setSchedulingConsultation(false);
    }
  };

  const handleScheduleFitting = async () => {
    if (!fittingDate || !fittingTime) {
      setFittingError('Please select both a date and time.');
      return;
    }
    setSchedulingFitting(true);
    setFittingError('');
    try {
      const session = await sessionService.getSession();
      const token = session?.token || authToken;
      const body = { fittingDate, fittingTime };
      if (fittingReason) body.fittingRescheduleReason = fittingReason;
      const res = await mongodbService.scheduleFitting(fittingOrderId, body, token);
      if (res.success) {
        setShowFittingModal(false);
        fetchUserOrders(userEmail);
        showAlert('Success', 'Fitting appointment scheduled successfully!');
      } else {
        setFittingError(res.error || 'Failed to schedule fitting.');
      }
    } catch (err) {
      setFittingError(err.message || 'Failed to schedule fitting.');
    } finally {
      setSchedulingFitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        navigation={navigation} 
        onMenuPress={() => setMenuVisible(true)} 
        isLoggedIn={isLoggedIn} 
        unreadCount={unreadCount || 0} 
        onBellPress={() => navigation.navigate('Notifications')} 
      /> 

      {/* PAGE HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Custom Orders</Text>
        <Text style={styles.headerSub}>Create bespoke pieces tailored to your vision</Text>
      </View>

      {/* TABS */}
      <View style={styles.tabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={{ flexDirection: 'row', paddingHorizontal: 16 }}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === 'new' && styles.tabActive]}
            onPress={() => setActiveTab('new')}
          >
            <Text style={[styles.tabText, activeTab === 'new' && styles.tabTextActive]}>
              New Order
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'existing' && styles.tabActive]}
            onPress={() => setActiveTab('existing')}
          >
            <Text style={[styles.tabText, activeTab === 'existing' && styles.tabTextActive]}>
              My Orders
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              Order History
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView 
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'new' ? (
          // NEW ORDER FORM (3-STEP WIZARD)
          <View style={styles.mainPadding}>
            {/* STEP PROGRESS BAR */}
            <View style={styles.stepProgressContainer}>
              <View style={styles.stepProgressRow}>
                <Text style={styles.stepProgressLabel}>Step {currentStep} of 3</Text>
                <Text style={styles.stepProgressLabel}>{Math.round((currentStep / 3) * 100)}%</Text>
              </View>
              <View style={styles.stepProgressTrack}>
                <View style={[styles.stepProgressFill, { width: `${(currentStep / 3) * 100}%` }]} />
              </View>
            </View>

            {/* STEP 1: CONTACT & EVENT DETAILS */}
            {currentStep === 1 && (
              <>
                <View style={styles.stepHeaderContainer}>
                  <Sparkles size={32} color="#D4AF37" />
                  <Text style={styles.stepTitle}>Your Details</Text>
                  <Text style={styles.stepSubtitle}>Tell us about you and your event</Text>
                </View>

                {/* 3D Gown Designer Card */}
                <View style={styles.designer3DCard}>
                  <View style={styles.designer3DIconBox}>
                    <Sparkles size={24} color="#1a1a1a" />
                  </View>
                  <View style={styles.designer3DTextCol}>
                    <Text style={styles.designer3DTitle}>3D Gown Designer</Text>
                    <Text style={styles.designer3DDesc}>
                      Design your dream gown in real-time with our interactive 3D customizer. Rotate, zoom, and preview fabrics.
                    </Text>
                    <TouchableOpacity 
                      style={styles.designer3DBtn} 
                      onPress={() => navigation.navigate('GownDesigner3D', { 
                        onDesignComplete: (summary) => { 
                          setDesign3DData(summary); 
                          setFormData(prev => ({ 
                            ...prev, 
                            preferredColors: summary.color || prev.preferredColors, 
                            fabricPreference: summary.fabric || prev.fabricPreference, 
                            budget: summary.estimatedCost 
                              ? `₱${summary.estimatedCost.toLocaleString('en-PH')}` 
                              : prev.budget, 
                            specialRequests: prev.specialRequests 
                              ? prev.specialRequests 
                              : `3D Design: ${summary.silhouette} in ${summary.color} ${summary.fabric}${summary.addOns?.length ? ' with ' + summary.addOns.join(', ') : ''}`, 
                          })); 
                        } 
                      })}
                    >
                      <Text style={styles.designer3DBtnText}>Try Designer</Text>
                      <ChevronRight size={14} color="#1a1a1a" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 3D Design Applied Badge */}
                {design3DData && ( 
                  <View style={{ 
                    flexDirection: 'row', alignItems: 'center', gap: 8, 
                    backgroundColor: '#FAF7F0', borderWidth: 1, borderColor: '#D4AF37', 
                    padding: 12, marginBottom: 16, 
                  }}> 
                    <CheckCircle2 size={16} color="#D4AF37" /> 
                    <View style={{ flex: 1 }}> 
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#1a1a1a' }}> 
                        3D Design Applied ✦ {design3DData.silhouette} · {design3DData.color} · {design3DData.fabric} 
                      </Text> 
                      <Text style={{ fontSize: 11, color: '#6B5D4F', marginTop: 2 }}> 
                        Est. {formatPeso(design3DData.estimatedCost)}  · Saved to your order 
                      </Text> 
                    </View> 
                  </View> 
                )}

                {/* OR Separator */}
                <Text style={styles.orSeparator}>— Or Choose Inspiration Style —</Text>

                {/* Full Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name *</Text>
                  <TextInput
                    style={[
                      {
                        borderWidth: 1,
                        borderColor: '#E8DCC8',
                        borderRadius: 0,
                        paddingHorizontal: 14,
                        paddingVertical: 13,
                        fontSize: 14,
                        color: '#1a1a1a',
                        backgroundColor: '#fff',
                      },
                      isLoggedIn && { backgroundColor: '#F5F1E8', color: '#6B5D4F' },
                      validationErrors.customerName && { borderColor: '#dc2626', backgroundColor: '#fef2f2' },
                    ]}
                    placeholder="Enter your name"
                    placeholderTextColor="#999"
                    value={formData.customerName}
                    editable={!isLoggedIn}
                    onChangeText={(val) => {
                      setFormData({ ...formData, customerName: val });
                      if (validationErrors.customerName) {
                        setValidationErrors({ ...validationErrors, customerName: null });
                      }
                    }}
                  />
                  {validationErrors.customerName && (
                    <Text style={styles.errorMessage}>{validationErrors.customerName}</Text>
                  )}
                </View>

                {/* Contact Number */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Contact Number *</Text>
                  <Text style={styles.helperText}>Country code shown; enter 10-digit mobile number</Text>
                  <View style={styles.contactRow}>
                    <View style={styles.countryCodeContainer}>
                      <Text style={styles.countryCodeText}>+63</Text>
                    </View>
                    <TextInput
                      style={[
                        {
                          borderWidth: 1,
                          borderColor: '#E8DCC8',
                          borderRadius: 0,
                          paddingHorizontal: 14,
                          paddingVertical: 13,
                          fontSize: 14,
                          color: '#1a1a1a',
                          backgroundColor: '#fff',
                        },
                        styles.contactInput,
                        isLoggedIn && { backgroundColor: '#F5F1E8', color: '#6B5D4F' },
                        validationErrors.contactNumber && { borderColor: '#dc2626', backgroundColor: '#fef2f2' },
                      ]}
                      placeholder="9xxxxxxxxx"
                      placeholderTextColor="#999"
                      value={formData.contactNumber}
                      onChangeText={handleContactNumberChange}
                      keyboardType={Platform.OS === 'web' ? 'default' : 'number-pad'}
                      inputMode={Platform.OS === 'web' ? 'numeric' : undefined}
                      maxLength={10}
                      editable={!isLoggedIn}
                    />
                  </View>
                  {validationErrors.contactNumber && (
                    <Text style={styles.errorMessage}>{validationErrors.contactNumber}</Text>
                  )}
                  {!phoneVerified && formData.contactNumber.length === 10 && ( 
                    <View style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      backgroundColor: '#FFF7ED', 
                      borderWidth: 1, 
                      borderColor: '#FED7AA', 
                      borderRadius: 8, 
                      padding: 10, 
                      marginTop: 6, 
                      gap: 8, 
                    }}> 
                      <Text style={{ fontSize: 14 }}>⚠️</Text> 
                      <View style={{ flex: 1 }}> 
                        <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '600' }}> 
                          Phone number not verified 
                        </Text> 
                        <Text style={{ fontSize: 11, color: '#92400E', marginTop: 2 }}> 
                          Please verify your number in Profile Settings to proceed. 
                        </Text> 
                      </View> 
                      <TouchableOpacity onPress={() => navigation.navigate('Profile')}> 
                        <Text style={{ fontSize: 11, color: '#D97706', fontWeight: '700' }}> 
                          Verify → 
                        </Text> 
                      </TouchableOpacity> 
                    </View> 
                  )}
                </View>

                {/* Email Address */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address *</Text>
                  <TextInput
                    style={[
                      {
                        borderWidth: 1,
                        borderColor: '#E8DCC8',
                        borderRadius: 0,
                        paddingHorizontal: 14,
                        paddingVertical: 13,
                        fontSize: 14,
                        color: '#1a1a1a',
                        backgroundColor: '#fff',
                      },
                      isLoggedIn && { backgroundColor: '#F5F1E8', color: '#6B5D4F' },
                      validationErrors.email && { borderColor: '#dc2626', backgroundColor: '#fef2f2' },
                    ]}
                    placeholder="your@email.com"
                    placeholderTextColor="#999"
                    value={formData.email}
                    onChangeText={(val) => {
                      setFormData({ ...formData, email: val });
                      if (validationErrors.email) {
                        setValidationErrors({ ...validationErrors, email: null });
                      }
                    }}
                    keyboardType="email-address"
                    editable={!isLoggedIn}
                  />
                  {validationErrors.email && (
                    <Text style={styles.errorMessage}>{validationErrors.email}</Text>
                  )}
                </View>

                {/* Preferred Branch */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Preferred Branch</Text>
                  <View style={styles.selectContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {['Taguig Main - Cadena de Amor', 'BGC Branch', 'Makati Branch', 'Quezon City'].map(
                        (branch) => (
                          <TouchableOpacity
                            key={branch}
                            style={[
                              styles.branchOption,
                              formData.branch === branch && styles.branchOptionSelected,
                            ]}
                            onPress={() => setFormData({ ...formData, branch })}
                          >
                            <Text
                              style={[
                                styles.branchText,
                                formData.branch === branch && styles.branchTextSelected,
                              ]}
                            >
                              {branch}
                            </Text>
                          </TouchableOpacity>
                        )
                      )}
                    </ScrollView>
                  </View>
                </View>

                {/* Event Date */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Event Date *</Text>
                  <TouchableOpacity 
                    style={[
                      {
                        borderWidth: 1,
                        borderColor: '#E8DCC8',
                        borderRadius: 0,
                        paddingHorizontal: 14,
                        paddingVertical: 13,
                        fontSize: 14,
                        color: '#1a1a1a',
                        backgroundColor: '#fff',
                        flexDirection: 'row',
                        alignItems: 'center',
                      },
                      validationErrors.eventDate && { borderColor: '#dc2626', backgroundColor: '#fef2f2' },
                    ]}
                    onPress={openEventDatePicker}
                  >
                    <Calendar size={16} color="#6B5D4F" style={{ marginRight: 8 }} />
                    <Text style={[styles.datePickerText, !formData.eventDateString && styles.datePickerPlaceholder]}>
                      {formData.eventDateString || 'Select event date'}
                    </Text>
                  </TouchableOpacity>
                  {validationErrors.eventDate && (
                    <Text style={styles.errorMessage}>{validationErrors.eventDate}</Text>
                  )}
                </View>

                {/* Continue Button */}
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    !(
                      formData.customerName.trim() &&
                      formData.contactNumber.length === 10 &&
                      formData.email.trim() &&
                      validateEmail(formData.email) &&
                      formData.eventDateString
                    ) && styles.continueButtonDisabled,
                  ]}
                  onPress={() => setCurrentStep(2)}
                  disabled={
                    !(
                      formData.customerName.trim() &&
                      formData.contactNumber.length === 10 &&
                      formData.email.trim() &&
                      validateEmail(formData.email) &&
                      formData.eventDateString
                    )
                  }
                >
                  <Text style={styles.continueButtonText}>Continue to Fabrics</Text>
                  <ChevronRight color="#fff" size={18} />
                </TouchableOpacity>
              </>
            )}

            {/* STEP 2: FABRIC & COLOR SELECTION */}
            {currentStep === 2 && (
              <>
                <View style={styles.stepHeaderContainer}>
                  <Palette size={32} color="#D4AF37" />
                  <Text style={styles.stepTitle}>Fabric & Colors</Text>
                  <Text style={styles.stepSubtitle}>Choose your preferred fabric and color palette</Text>
                </View>

                {/* Fabric Preference */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={styles.label}>Select Fabric *</Text>
                  <View style={styles.fabricGrid}>
                    {fabricOptions.map((fabric) => (
                      <TouchableOpacity
                        key={fabric}
                        style={[
                          styles.fabricCard,
                          formData.fabricPreference === fabric && styles.fabricCardSelected,
                        ]}
                        onPress={() => {
                          setFormData((prev) => ({ ...prev, fabricPreference: fabric }));
                          if (validationErrors.fabricPreference) {
                            setValidationErrors((prev) => {
                              const newErr = { ...prev };
                              delete newErr.fabricPreference;
                              return newErr;
                            });
                          }
                        }}
                      >
                        <View style={styles.fabricCardHeader}>
                          <Text style={styles.fabricCardName}>{fabric}</Text>
                          {formData.fabricPreference === fabric && (
                            <CheckCircle2 size={18} color="#D4AF37" />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {validationErrors.fabricPreference && (
                    <Text style={styles.errorMessage}>{validationErrors.fabricPreference}</Text>
                  )}
                </View>

                {/* Preferred Colors */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={styles.label}>Preferred Colors *</Text>
                  <View style={styles.colorChipContainer}>
                    {colorOptions.map((color) => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorChip,
                          formData.preferredColors === color && styles.colorChipSelected,
                        ]}
                        onPress={() => {
                          setFormData((prev) => ({ ...prev, preferredColors: color }));
                          if (validationErrors.preferredColors) {
                            setValidationErrors((prev) => {
                              const newErr = { ...prev };
                              delete newErr.preferredColors;
                              return newErr;
                            });
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.colorChipText,
                            formData.preferredColors === color && styles.colorChipTextSelected,
                          ]}
                        >
                          {color}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {validationErrors.preferredColors && (
                    <Text style={styles.errorMessage}>{validationErrors.preferredColors}</Text>
                  )}
                </View>

                {/* Navigation Buttons */}
                <View style={styles.navButtonRow}>
                  <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep(1)}>
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.continueButton,
                      !(formData.fabricPreference && formData.preferredColors) && styles.continueButtonDisabled,
                    ]}
                    onPress={() => setCurrentStep(3)}
                    disabled={!(formData.fabricPreference && formData.preferredColors)}
                  >
                    <Text style={styles.continueButtonText}>Continue to Details</Text>
                    <ChevronRight color="#fff" size={18} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* STEP 3: ORDER DETAILS & SUBMISSION */}
            {currentStep === 3 && (
              <>
                <View style={styles.stepHeaderContainer}>
                  <Ruler size={32} color="#D4AF37" />
                  <Text style={styles.stepTitle}>Order Details</Text>
                  <Text style={styles.stepSubtitle}>Share your vision and budget</Text>
                </View>

                {/* Budget Range */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Budget Range *</Text>
                  <View style={styles.selectContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {[
                        { label: '₱25K - ₱35K', value: '25000-35000' },
                        { label: '₱35K - ₱55K', value: '35000-55000' },
                        { label: '₱55K - ₱80K', value: '55000-80000' },
                        { label: '₱80K+', value: '80000+' },
                      ].map((budget) => (
                        <TouchableOpacity
                          key={budget.value}
                          style={[
                            styles.optionButton,
                            formData.budget === budget.value && styles.optionButtonSelected,
                          ]}
                          onPress={() => {
                            setFormData({ ...formData, budget: budget.value });
                            if (validationErrors.budget) {
                              setValidationErrors((prev) => {
                                const newErr = { ...prev };
                                delete newErr.budget;
                                return newErr;
                              });
                            }
                          }}
                        >
                          <Text
                            style={[
                              styles.optionButtonText,
                              formData.budget === budget.value && styles.optionButtonTextSelected,
                            ]}
                          >
                            {budget.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  {validationErrors.budget && (
                    <Text style={styles.errorMessage}>{validationErrors.budget}</Text>
                  )}
                </View>

                {/* Special Requests */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Special Requests & Design Ideas</Text>
                  <TextInput
                    style={[
                      {
                        borderWidth: 1,
                        borderColor: '#E8DCC8',
                        borderRadius: 0,
                        paddingHorizontal: 14,
                        paddingVertical: 13,
                        fontSize: 14,
                        color: '#1a1a1a',
                        backgroundColor: '#fff',
                        minHeight: 120,
                      },
                    ]}
                    placeholder="Describe your vision, inspirations, or specific design elements you'd like..."
                    placeholderTextColor="#999"
                    value={formData.specialRequests}
                    onChangeText={(val) => setFormData({ ...formData, specialRequests: val })}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* AI Color Recommendation - EXACTLY AS IS */}
<View style={styles.aiBox}>

  {/* ── Header Row ── */}
  <View style={styles.aiHeader}>
    <View style={styles.aiIconBadge}>
      <Palette size={22} color="#D4AF37" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.aiTitle}>AI Skin Tone Advisor</Text>
      <Text style={styles.aiDescription}>
        Scan your skin for a personalized gown color palette
      </Text>
    </View>
  </View>

  {/* ── Scan Button ── */}
  <TouchableOpacity
    style={[styles.aiScanBtn, isAnalyzing && styles.aiButtonDisabled]}
    onPress={handleOpenCamera}
    disabled={isAnalyzing}
    activeOpacity={0.85}
  >
    <CameraIcon size={18} color={capturedImage ? '#6B5D4F' : '#fff'} />
    <Text style={[styles.aiScanBtnText, capturedImage && { color: '#6B5D4F' }]}>
      {isAnalyzing ? 'Analyzing...' : capturedImage ? 'Retake Photo' : 'Scan My Skin Tone'}
    </Text>
  </TouchableOpacity>

  {/* ── Captured Photo + Analysis ── */}
  {capturedImage && (
    <View style={styles.aiResultCard}>

      {/* Photo - full width tall */}
      <View style={styles.aiPhotoWrapper}>
        <Image source={{ uri: capturedImage }} style={styles.aiPhoto} />

        {/* Analyzing overlay */}
        {isAnalyzing && (
          <View style={styles.aiAnalyzingOverlay}>
            <ActivityIndicator color="#D4AF37" size="large" />
            <Text style={styles.aiAnalyzingText}>Analyzing your skin tone...</Text>
            <Text style={styles.aiAnalyzingSubText}>Detecting cheek undertone</Text>
          </View>
        )}

        {/* Remove button */}
        <TouchableOpacity
          style={styles.aiRemoveBtn}
          onPress={() => {
            setCapturedImage(null);
            setSkinAnalysis(null);
            setRecommendedGowns([]);
          }}
        >
          <X size={14} color="#fff" />
        </TouchableOpacity>

        {/* Skin tone badge overlay on photo */}
        {skinAnalysis && !isAnalyzing && (
          <View style={styles.aiPhotoBadge}>
            <View style={[styles.aiSkinDot, { backgroundColor: skinAnalysis.hex }]} />
            <Text style={styles.aiPhotoBadgeText}>
              {skinAnalysis.tone.charAt(0).toUpperCase() + skinAnalysis.tone.slice(1)}-
              {skinAnalysis.undertone.charAt(0).toUpperCase() + skinAnalysis.undertone.slice(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Analysis Results */}
      {skinAnalysis && !isAnalyzing && (
        <View style={styles.aiAnalysisResults}>

          {/* Tone + Undertone Row */}
          <View style={styles.aiToneRow}>
            <View style={styles.aiToneItem}>
              <Text style={styles.aiToneLabel}>SKIN TONE</Text>
              <Text style={styles.aiToneValue}>
                {skinAnalysis.tone.charAt(0).toUpperCase() + skinAnalysis.tone.slice(1)}
              </Text>
            </View>
            <View style={styles.aiToneDivider} />
            <View style={styles.aiToneItem}>
              <Text style={styles.aiToneLabel}>UNDERTONE</Text>
              <Text style={styles.aiToneValue}>
                {skinAnalysis.undertone.charAt(0).toUpperCase() + skinAnalysis.undertone.slice(1)}
              </Text>
            </View>
            <View style={styles.aiToneDivider} />
            <View style={styles.aiToneItem}>
              <Text style={styles.aiToneLabel}>SKIN HEX</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <View style={[styles.aiToneHexDot, { backgroundColor: skinAnalysis.hex }]} />
                <Text style={styles.aiToneHexText}>{skinAnalysis.hex}</Text>
              </View>
            </View>
          </View>

          {/* Tone Spectrum Bar */}
          <View style={styles.aiSpectrumWrapper}>
            <Text style={styles.aiSpectrumLabel}>TONE SPECTRUM</Text>
            <View style={styles.aiSpectrumTrack}>
              <View style={styles.aiSpectrumGradient} />
              <View style={[
                styles.aiSpectrumIndicator,
                {
                  left: `${
                    skinAnalysis.tone === 'fair' ? 5 :
                    skinAnalysis.tone === 'light' ? 25 :
                    skinAnalysis.tone === 'medium' ? 48 :
                    skinAnalysis.tone === 'tan' ? 70 : 90
                  }%`
                }
              ]} />
            </View>
            <View style={styles.aiSpectrumLabels}>
              {['Fair','Light','Medium','Tan','Deep'].map(t => (
                <Text
                  key={t}
                  style={[
                    styles.aiSpectrumTick,
                    skinAnalysis.tone === t.toLowerCase() && styles.aiSpectrumTickActive
                  ]}
                >{t}</Text>
              ))}
            </View>
          </View>

          {/* AI Insight Card */}
          <View style={styles.aiInsightBox}>
            <View style={styles.aiInsightHeader}>
              <Sparkles size={14} color="#D4AF37" />
              <Text style={styles.aiInsightTitle}>AI Stylist Insight</Text>
            </View>
            <Text style={styles.aiInsightText}>{skinAnalysis.insight}</Text>
          </View>

          {/* Color Palette */}
          <View style={styles.aiPaletteSection}>
            <Text style={styles.aiPaletteTitle}>YOUR COLOR PALETTE</Text>
            <Text style={styles.aiPaletteSub}>Tap any color to apply it to your order</Text>
            <View style={styles.aiPaletteGrid}>
              {skinAnalysis.recommendedColors.map((color, idx) => {
                const hex = COLOR_HEX_MAP[color] || '#E8DCC8';
                const isFirst = idx === 0;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.aiPaletteChip, isFirst && styles.aiPaletteChipTop]}
                    onPress={() => setFormData(prev => ({ ...prev, preferredColors: color }))}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.aiPaletteColor, { backgroundColor: hex }]}>
                      {isFirst && (
                        <View style={styles.aiPaletteBestBadge}>
                          <Text style={styles.aiPaletteBestText}>✦ BEST</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.aiPaletteColorName} numberOfLines={1}>{color}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Apply Button */}
          <TouchableOpacity
            style={styles.aiApplyBtn}
            onPress={applyAIRecommendation}
            activeOpacity={0.85}
          >
            <Sparkles size={16} color="#1a1a1a" />
            <Text style={styles.aiApplyBtnText}>Apply AI Recommendation to Order</Text>
          </TouchableOpacity>

        </View>
      )}
    </View>
  )}

  {/* ── Recommended Gowns ── */}
  {skinAnalysis && !isAnalyzing && (
    <View ref={recommendationRef} style={styles.aiGownsSection}>
      <View style={styles.aiGownsHeader}>
        <View>
          <Text style={styles.aiGownsTitle}>Recommended For You</Text>
          <Text style={styles.aiGownsSub}>
            {recommendedGowns.length} gowns matched to your {skinAnalysis.tone} {skinAnalysis.undertone} tone
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Collection')}>
          <Text style={styles.aiGownsSeeAll}>See All</Text>
        </TouchableOpacity>
      </View>

      {recommendedGowns.length > 0 ? (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={recommendedGowns}
          keyExtractor={(item) => String(item.id || item._id)}
          contentContainerStyle={{ paddingRight: 8 }}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.aiGownCard}
              onPress={() => navigation.navigate('Collection', { selectedGownId: item.id })}
              activeOpacity={0.85}
            >
              {/* Match badge on top 2 */}
              {index < 2 && (
                <View style={styles.aiGownMatchBadge}>
                  <Text style={styles.aiGownMatchBadgeText}>✦ TOP MATCH</Text>
                </View>
              )}

              {/* Gown Image */}
              <View style={styles.aiGownImageBox}>
                {item.image ? (
                  <Image
                    source={{ uri: item.image.startsWith('http') ? item.image : `${API_CONFIG.BASE_URL}${item.image}` }}
                    style={styles.aiGownImage}
                  />
                ) : (
                  <View style={[styles.aiGownImage, { backgroundColor: '#F5F1E8', justifyContent: 'center', alignItems: 'center' }]}>
                    <ShoppingBag size={28} color="#D4AF37" />
                  </View>
                )}
              </View>

              {/* Gown Info */}
              <View style={styles.aiGownInfo}>
                <Text style={styles.aiGownName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.aiGownCategory}>{item.category}</Text>

                {/* Color chip */}
                <View style={styles.aiGownColorRow}>
                  <View style={[styles.aiGownColorDot, { backgroundColor: COLOR_HEX_MAP[item.color] || item.color?.toLowerCase() || '#E8DCC8' }]} />
                  <Text style={styles.aiGownColorLabel}>{item.color}</Text>
                </View>

                {/* Match % bar */}
                <View style={styles.aiGownMatchRow}>
                  <View style={styles.aiGownMatchTrack}>
                    <View style={[styles.aiGownMatchFill, { width: `${item.matchPct || 70}%` }]} />
                  </View>
                  <Text style={styles.aiGownMatchPct}>{item.matchPct || 70}%</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.aiNoMatch}>
          <Text style={styles.aiNoMatchText}>No exact matches in current inventory.</Text>
          <TouchableOpacity style={styles.aiNoMatchBtn} onPress={() => navigation.navigate('Collection')}>
            <Text style={styles.aiNoMatchBtnText}>Browse All Collections</Text>
            <ArrowRight size={14} color="#D4AF37" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  )}

</View>

                {/* What Happens Next Info Box */}
                <View style={styles.infoBox}>
                  <Text style={styles.infoBoxTitle}>What Happens Next?</Text>
                  <Text style={styles.infoBoxItem}>
                    ★ Our design team will review your preferences and contact you within 24–48 hours
                  </Text>
                  <Text style={styles.infoBoxItem}>
                    ★ A consultation will be scheduled to discuss your vision in detail
                  </Text>
                  <Text style={styles.infoBoxItem}>
                    ★ Estimated production timeline: 8–12 weeks
                  </Text>
                </View>

                {/* Navigation + Submit Buttons */}
                <View style={styles.navButtonRow}>
                  <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep(2)}>
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.submitGoldBtn,
                      !isFormValid() && styles.submitGoldBtnDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={!isFormValid()}
                  >
                    <Text style={styles.submitGoldBtnText}>Submit Order Inquiry</Text>
                    <ChevronRight color="#fff" size={18} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        ) : activeTab === 'history' ? (
          <View style={styles.mainPadding}> 
            {(() => { 
              const historyOrders = userOrders.filter(o => 
                ['completed','rejected','cancelled'].includes(o.status) 
              ); 
              return historyOrders.length > 0 ? ( 
                <View style={{ gap: 16 }}> 
                  {historyOrders.map(order => ( 
                    <View key={order.id || order._id} style={styles.orderCard}> 
                      <View style={styles.orderHeader}> 
                        <View style={{ flex: 1 }}> 
                          <Text style={styles.orderTitle}> 
                            {order.orderType || order.type || 'Custom Order'} 
                          </Text> 
                          {order.referenceId ? ( 
                            <Text style={{ fontSize: 12, color: '#6B5D4F', marginTop: 2 }}> 
                              Ref: {order.referenceId} 
                            </Text> 
                          ) : null} 
                          {order.createdAt ? ( 
                            <Text style={{ fontSize: 12, color: '#6B5D4F', marginTop: 2 }}> 
                              Placed: {new Date(order.createdAt).toLocaleDateString('en-PH', { 
                                year: 'numeric', month: 'short', day: 'numeric' 
                              })} 
                            </Text> 
                          ) : null} 
                        </View> 
                        <View style={[styles.statusBadge, { 
                          backgroundColor: getStatusBgColor(order.status) 
                        }]}> 
                          <Text style={[styles.statusBadgeText, { 
                            color: getStatusColor(order.status) 
                          }]}> 
                            {getStatusLabel(order.status)} 
                          </Text> 
                        </View> 
                      </View> 
      
                      {order.budget ? ( 
                        <Text style={{ fontSize: 13, color: '#6B5D4F', marginTop: 6 }}> 
                          Budget: ₱{Number(order.budget).toLocaleString()} 
                        </Text> 
                      ) : null} 
      
                      {order.preferredColors ? ( 
                        <Text style={{ fontSize: 13, color: '#6B5D4F', marginTop: 4 }}> 
                          Colors: {Array.isArray(order.preferredColors) 
                            ? order.preferredColors.join(', ') 
                            : order.preferredColors} 
                        </Text> 
                      ) : null} 
      
                      {order.status === 'rejected' && order.rejectionReason ? ( 
                        <View style={{ backgroundColor: '#FEE2E2', borderRadius: 6, padding: 8, marginTop: 8 }}> 
                          <Text style={{ color: '#991B1B', fontSize: 12, fontWeight: '600' }}> 
                            Rejection reason: {order.rejectionReason} 
                          </Text> 
                        </View> 
                      ) : null} 
      
                      {order.status === 'completed' && order.completedAt ? ( 
                        <View style={{ backgroundColor: '#ECFDF5', borderRadius: 6, padding: 8, marginTop: 8 }}> 
                          <Text style={{ color: '#065F46', fontSize: 12, fontWeight: '600' }}> 
                            ✓ Completed on {new Date(order.completedAt).toLocaleDateString('en-PH', { 
                              year: 'numeric', month: 'short', day: 'numeric' 
                            })} 
                          </Text> 
                        </View> 
                      ) : null} 
                    </View> 
                  ))} 
                </View> 
              ) : ( 
                <View style={styles.emptyState}> 
                  <Text style={{ fontSize: 48 }}>📋</Text> 
                  <Text style={styles.emptyTitle}>No order history yet</Text> 
                  <Text style={styles.emptyText}> 
                    Your completed and rejected orders will appear here. 
                  </Text> 
                </View> 
              ); 
            })()} 
          </View>
        ) : (
          // EXISTING ORDERS
          <View style={styles.mainPadding}>
            {userOrders.filter(o => !['completed','rejected','cancelled'].includes(o.status)).length > 0 ? (
              <View style={styles.ordersList}>
                {userOrders
                  .filter(o => !['completed','rejected','cancelled'].includes(o.status))
                  .map((order) => {
                  const currentStatusIndex = getStatusIndex(order.status);

                  return (
                    <View key={order.id} style={styles.orderCard}>
                      <View style={styles.orderHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.orderTitleRow}>
                            <Text style={styles.orderTitle}>{order.orderType || 'Custom Order'}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(order.status) }]}>
                              <Text style={[styles.statusBadgeText, { color: getStatusColor(order.status) }]}>
                                {getStatusLabel(order.status)}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.orderId}>Ref# {order.referenceId || order.id}</Text>
                          <Text style={styles.orderDates}>Event: {order.eventDate || 'TBD'}</Text>
                          <Text style={styles.orderDates}>Branch: {order.branch || '-'}</Text>
                          <Text style={styles.orderDates}>Budget: {order.budget || 'TBD'}</Text>

                          {/* Consultation schedule — shown when status is design-approval or later */}
                          {order.consultationDate && order.consultationTime && (
                            <View style={styles.scheduleRow}>
                              <Text style={[styles.orderDates, { color: '#8b5cf6', fontWeight: '600' }]}>
                                📅 Consultation: {order.consultationDate} at {order.consultationTime}
                              </Text>
                            </View>
                          )}

                          {/* Fitting schedule — shown when status is fitting or later */}
                          {order.fittingDate && order.fittingTime && (
                            <View style={styles.scheduleRow}>
                              <Text style={[styles.orderDates, { color: '#06b6d4', fontWeight: '600' }]}>
                                📅 Fitting: {order.fittingDate} at {order.fittingTime}
                              </Text>
                            </View>
                          )}

                          {/* Design image */}
                          {order.designImageUrl && (
                            <Image
                              source={{ uri: order.designImageUrl }}
                              style={{ width: '100%', height: 140, borderRadius: 8, marginTop: 8 }}
                              resizeMode="cover"
                            />
                          )}

                          {/* Rejection reason */}
                          {order.status === 'rejected' && order.rejectionReason && (
                            <View style={{ backgroundColor: '#fee2e2', borderRadius: 6, padding: 8, marginTop: 8 }}>
                              <Text style={{ color: '#991b1b', fontSize: 12, fontWeight: '600' }}>
                                Reason: {order.rejectionReason}
                              </Text>
                            </View>
                          )}

                          {/* Schedule Consultation Button */}
                          {order.status === 'design-approval' && (
                            <TouchableOpacity
                              style={[styles.actionBtn, { backgroundColor: '#8b5cf6' }]}
                              onPress={() => {
                                setConsultationOrderId(order.id || order._id);
                                setConsultationDate('');
                                setConsultationTime('');
                                setConsultationReason('');
                                setConsultationError('');
                                setShowConsultationModal(true);
                              }}
                            >
                              <Text style={styles.actionBtnText}>
                                {order.consultationDate ? '🔄 Reschedule Consultation' : '📅 Schedule Consultation'}
                              </Text>
                            </TouchableOpacity>
                          )}

                          {/* Schedule Fitting Button */}
                          {order.status === 'fitting' && (
                            <TouchableOpacity
                              style={[styles.actionBtn, { backgroundColor: '#06b6d4' }]}
                              onPress={() => {
                                setFittingOrderId(order.id || order._id);
                                setFittingDate('');
                                setFittingTime('');
                                setFittingReason('');
                                setFittingError('');
                                setShowFittingModal(true);
                              }}
                            >
                              <Text style={styles.actionBtnText}>
                                {order.fittingDate ? '🔄 Reschedule Fitting' : '📅 Schedule Fitting'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      {/* Progress Steps */}
                      <View style={styles.stepsContainer}>
                        {statusSteps.map((step, index) => (
                          <View key={step.key} style={styles.stepItem}>
                            <View
                              style={[
                                styles.stepCircle,
                                index <= currentStatusIndex && styles.stepCircleActive,
                              ]}
                            >
                              {index < currentStatusIndex ? (
                                <CheckCircle2 size={20} color="#fff" />
                              ) : (
                                <Text style={styles.stepNumber}>{index + 1}</Text>
                              )}
                            </View>
                            <Text
                              style={[
                                styles.stepLabel,
                                index <= currentStatusIndex && styles.stepLabelActive,
                              ]}
                            >
                              {step.label}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ruler size={48} color="#E8DCC8" />
                <Text style={styles.emptyTitle}>No active orders</Text>
                <Text style={styles.emptyText}>Completed and rejected orders appear in Order History.</Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => setActiveTab('new')}
                >
                  <Text style={styles.emptyButtonText}>Create Custom Order</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* DATE PICKER - Mobile date picker */}
      {Platform.OS !== 'web' && (
        <DateTimePickerModal
          isVisible={showEventDatePicker}
          mode="date"
          onConfirm={handleEventDateChange}
          onCancel={() => setShowEventDatePicker(false)}
          minimumDate={(() => { 
            const now = new Date(); 
            const d = new Date(now); 
            d.setDate(d.getDate() + (now.getHours() >= 17 ? 2 : 1)); 
            d.setHours(0, 0, 0, 0); 
            return d; 
          })()}
        />
      )}

      {/* DATE PICKER - Web calendar modal (Rentals style) */}
      {Platform.OS === 'web' && (
        <Modal
          visible={webCalendarState.active !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setWebCalendarState({ active: null, display: null })}
        >
          <View style={styles.calendarModalOverlay}>
            <View style={styles.calendarModal}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity
                  onPress={() => handleWebCalendarMonthChange(-1)}
                  style={styles.calendarNavBtn}
                >
                  <Text style={styles.calendarNavText}>← Prev</Text>
                </TouchableOpacity>
                <Text style={styles.calendarHeaderText}>
                  {webCalendarState.display ?
                    webCalendarState.display.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : ''
                  }
                </Text>
                <TouchableOpacity
                  onPress={() => handleWebCalendarMonthChange(1)}
                  style={styles.calendarNavBtn}
                >
                  <Text style={styles.calendarNavText}>Next →</Text>
                </TouchableOpacity>
              </View>

              {webCalendarState.display && (
                <View style={styles.calendarGrid}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <Text key={day} style={styles.calendarDayHeader}>{day}</Text>
                  ))}

                  {(() => {
                    const firstDay = getFirstDayOfMonth(webCalendarState.display);
                    const daysInMonth = getDaysInMonth(webCalendarState.display);
                    const days = [];
                    for (let i = 0; i < firstDay; i++) {
                      days.push(<View key={`empty-${i}`} style={styles.calendarDayEmpty} />);
                    }

                    for (let day = 1; day <= daysInMonth; day++) {
                      const date = new Date(
                        webCalendarState.display.getFullYear(),
                        webCalendarState.display.getMonth(),
                        day
                      );
                      const dateStr = getLocalDateString(date);
                      const isSelected = dateStr === formData.eventDateString;
                      const isPast = date < parseLocalDateString(todayString);

                      days.push(
                        <TouchableOpacity
                          key={day}
                          style={[
                            styles.calendarDay,
                            isSelected && styles.calendarDaySelected,
                            isPast && styles.calendarDayDisabled,
                          ]}
                          onPress={() => {
                            if (!isPast) {
                              handleWebCalendarDateSelect(day);
                            }
                          }}
                          disabled={isPast}
                        >
                          <Text style={[
                            styles.calendarDayText,
                            isSelected && styles.calendarDaySelectedText,
                            isPast && styles.calendarDayDisabledText,
                          ]}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    }

                    return days;
                  })()}
                </View>
              )}

              <View style={styles.calendarFooter}>
                <TouchableOpacity
                  style={styles.calendarCloseBtn}
                  onPress={() => setWebCalendarState({ active: null, display: null })}
                >
                  <Text style={styles.calendarCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

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

      {/* Schedule Consultation Modal */}
      <Modal visible={showConsultationModal} transparent animationType="fade" onRequestClose={() => setShowConsultationModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.scheduleModal}>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.scheduleModalTitle}>Schedule Consultation</Text>
              <Text style={styles.scheduleModalSub}>Pick a date at least 1 day from today and a time between 08:00 - 17:00</Text>

              <Text style={styles.scheduleLabel}>Consultation Date *</Text>
              <TextInput
                style={styles.scheduleInput}
                placeholder="YYYY-MM-DD"
                value={consultationDate}
                onChangeText={setConsultationDate}
                keyboardType="numbers-and-punctuation"
              />

              <Text style={styles.scheduleLabel}>Consultation Time *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(time => (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timeChip, consultationTime === time && styles.timeChipSelected]}
                    onPress={() => setConsultationTime(time)}
                  >
                    <Text style={[styles.timeChipText, consultationTime === time && styles.timeChipTextSelected]}>{time}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.scheduleLabel}>Reason for Rescheduling (if changing existing schedule)</Text>
              <TextInput
                style={[styles.scheduleInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Required only when rescheduling"
                value={consultationReason}
                onChangeText={setConsultationReason}
                multiline
              />

              {consultationError ? <Text style={styles.scheduleError}>{consultationError}</Text> : null}

              <TouchableOpacity
                style={[styles.scheduleConfirmBtn, schedulingConsultation && { opacity: 0.6 }]}
                onPress={handleScheduleConsultation}
                disabled={schedulingConsultation}
              >
                {schedulingConsultation
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.scheduleConfirmBtnText}>Confirm Consultation</Text>
                }
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity style={styles.scheduleCancelBtn} onPress={() => setShowConsultationModal(false)}>
              <Text style={styles.scheduleCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Schedule Fitting Modal */}
      <Modal visible={showFittingModal} transparent animationType="fade" onRequestClose={() => setShowFittingModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.scheduleModal}>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.scheduleModalTitle}>Schedule Fitting</Text>
              <Text style={styles.scheduleModalSub}>Pick a date at least 1 day from today and a time between 08:00 - 17:00</Text>

              <Text style={styles.scheduleLabel}>Fitting Date *</Text>
              <TextInput
                style={styles.scheduleInput}
                placeholder="YYYY-MM-DD"
                value={fittingDate}
                onChangeText={setFittingDate}
                keyboardType="numbers-and-punctuation"
              />

              <Text style={styles.scheduleLabel}>Fitting Time *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(time => (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timeChip, fittingTime === time && styles.timeChipSelected]}
                    onPress={() => setFittingTime(time)}
                  >
                    <Text style={[styles.timeChipText, fittingTime === time && styles.timeChipTextSelected]}>{time}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.scheduleLabel}>Reason for Rescheduling (if changing existing schedule)</Text>
              <TextInput
                style={[styles.scheduleInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Required only when rescheduling"
                value={fittingReason}
                onChangeText={setFittingReason}
                multiline
              />

              {fittingError ? <Text style={styles.scheduleError}>{fittingError}</Text> : null}

              <TouchableOpacity
                style={[styles.scheduleConfirmBtn, { backgroundColor: '#06b6d4' }, schedulingFitting && { opacity: 0.6 }]}
                onPress={handleScheduleFitting}
                disabled={schedulingFitting}
              >
                {schedulingFitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.scheduleConfirmBtnText}>Confirm Fitting</Text>
                }
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity style={styles.scheduleCancelBtn} onPress={() => setShowFittingModal(false)}>
              <Text style={styles.scheduleCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CAMERA MODAL */}
      <Modal visible={cameraVisible} animationType="slide">
        <SafeAreaView style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
          >
            <View style={styles.cameraOverlay}>

              {/* Top bar */}
              <View style={styles.cameraTopBar}>
                <TouchableOpacity
                  style={styles.cameraCloseBtn}
                  onPress={() => setCameraVisible(false)}
                >
                  <X color="#fff" size={24} />
                </TouchableOpacity>
                <View style={styles.cameraTopCenter}>
                  <Text style={styles.cameraTopTitle}>AI Skin Analysis</Text>
                  <Text style={styles.cameraTopSub}>Position face in the frame</Text>
                </View>
                <View style={{ width: 36 }} />
              </View>

              {/* Face Frame */}
              <View style={styles.faceFrameWrapper}>

                {/* Dark overlay sides */}
                <View style={styles.faceFrameSideOverlay} />
                <View style={[styles.faceFrameSideOverlay, { right: 0, left: undefined }]} />

                {/* The oval face guide */}
                <View style={styles.faceOval}>

                  {/* Corner brackets — top left */}
                  <View style={[styles.cornerBracket, styles.cornerTL]} />
                  <View style={[styles.cornerBracketH, styles.cornerTLH]} />

                  {/* Corner brackets — top right */}
                  <View style={[styles.cornerBracket, styles.cornerTR]} />
                  <View style={[styles.cornerBracketH, styles.cornerTRH]} />

                  {/* Corner brackets — bottom left */}
                  <View style={[styles.cornerBracket, styles.cornerBL]} />
                  <View style={[styles.cornerBracketH, styles.cornerBLH]} />

                  {/* Corner brackets — bottom right */}
                  <View style={[styles.cornerBracket, styles.cornerBR]} />
                  <View style={[styles.cornerBracketH, styles.cornerBRH]} />

                  {/* Animated scan line */}
                  <Animated.View style={[
                    styles.scanLine,
                    {
                      transform: [{
                        translateY: scanLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 280],
                        })
                      }]
                    }
                  ]} />

                  {/* Cheek indicators — left cheek */}
                  <View style={[styles.cheekDot, styles.cheekDotLeft]}>
                    <View style={styles.cheekDotInner} />
                    <Text style={styles.cheekDotLabel}>Cheek</Text>
                  </View>

                  {/* Cheek indicators — right cheek */}
                  <View style={[styles.cheekDot, styles.cheekDotRight]}>
                    <View style={styles.cheekDotInner} />
                    <Text style={styles.cheekDotLabel}>Cheek</Text>
                  </View>

                </View>

                {/* Instruction text below oval */}
                <View style={styles.faceInstructionBox}>
                  <Text style={styles.faceInstructionTitle}>
                    🎯 Center your face in the frame
                  </Text>
                  <Text style={styles.faceInstructionSub}>
                    AI samples skin tone from your cheek area
                  </Text>
                </View>

              </View>

              {/* Bottom controls */}
              <View style={styles.cameraControls}>
                <Text style={styles.captureHint}>Tap to capture and analyze</Text>
                <TouchableOpacity
                  style={styles.captureBtn}
                  onPress={takePicture}
                  activeOpacity={0.8}
                >
                  <View style={styles.captureBtnRing}>
                    <View style={styles.captureBtnInner} />
                  </View>
                </TouchableOpacity>
                <Text style={styles.captureHintSub}>Good lighting = better results</Text>
              </View>

            </View>
          </CameraView>
        </SafeAreaView>
      </Modal>

      {/* SUCCESS MODAL */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <Text style={styles.successTitle}>✓ Success!</Text>
            <Text style={styles.successMessage}>Your custom order inquiry has been submitted successfully.</Text>
            <Text style={styles.successSubMessage}>
              Our team will contact you within 24-48 hours.
            </Text>
            <TouchableOpacity style={styles.successButton} onPress={handleSuccessModalClose}>
              <Text style={styles.successButtonText}>View My Orders</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 3D GOWN VIEWER MODAL */}
      <Modal visible={show3DViewer} animationType="slide" statusBarTranslucent> 
        <SafeAreaView style={styles.viewer3DContainer}> 
          {/* Header Bar */}
          <View style={styles.viewer3DHeader}> 
            <TouchableOpacity 
              onPress={() => { setShow3DViewer(false); clearAutoRotate(); }}
            >
              <X size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.viewer3DTitle}>3D Gown Preview</Text>
            <View style={styles.viewer3DReadout}>
              <Text style={styles.viewer3DReadoutText}>Y: {Math.round(rotation3D.y)}°</Text>
              <Text style={styles.viewer3DReadoutText}>X: {Math.round(rotation3D.x)}°</Text>
              <Text style={styles.viewer3DReadoutText}>{zoom3D.toFixed(1)}x</Text>
            </View>
          </View>

          {/* 3D Canvas Area */}
          <View 
            style={styles.viewer3DCanvas} 
            {...panResponder3D.panHandlers}
          >
            <Svg width="300" height="400" viewBox="-150 -200 300 400">
              <Defs>
                <LinearGradient id="bodiceGrad" x1="-60" y1="-150" x2="60" y2="-50">
                  <Stop offset="0" stopColor="rgba(0,0,0,0.3)" />
                  <Stop offset="0.5" stopColor="#D4AF37" />
                  <Stop offset="1" stopColor="rgba(255,255,255,0.5)" />
                </LinearGradient>
                <RadialGradient id="skirtGrad" cx="50%" cy="30%" r="70%">
                  <Stop offset="0" stopColor="#D4AF37" />
                  <Stop offset="0.6" stopColor="#C9A852" />
                  <Stop offset="1" stopColor="rgba(0,0,0,0.3)" />
                </RadialGradient>
              </Defs>
              <G transform={`translate(0, 25) scale(${zoom3D * Math.cos((rotation3D.y * Math.PI) / 180)}, ${zoom3D}) skewX(${Math.sin((rotation3D.y * Math.PI) / 180) * 0.3 * 30})`}>
                {/* Bodice */}
                <Path d="M -50 -150 L 50 -150 L 40 -50 L -40 -50 Z" fill="url(#bodiceGrad)" />
                {/* Straps */}
                <Path d="M -45 -180 L -30 -180 L -30 -150 L -45 -150 Z" fill="#D4AF37" />
                <Path d="M 30 -180 L 45 -180 L 45 -150 L 30 -150 Z" fill="#D4AF37" />
                {/* Waist Detail */}
                <Line x1="-40" y1="-50" x2="40" y2="-50" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
                {/* Skirt */}
                <Path d="M -40 -50 Q -80 20 -120 150 L 120 150 Q 80 20 40 -50 Z" fill="url(#skirtGrad)" />
                {/* Fabric Fold Lines */}
                {[-3, -2, -1, 0, 1, 2, 3].map(i => (
                  <Path 
                    key={i} 
                    d={`M ${i*15} -50 Q ${i*25} 50 ${i*35} 150`} 
                    stroke="rgba(255,255,255,0.3)" 
                    strokeWidth="1" 
                    fill="none" 
                  />
                ))}
                {/* Hem Highlight */}
                <Line x1="-120" y1="150" x2="120" y2="150" stroke="rgba(255,255,255,0.5)" strokeWidth="3" />
                {/* Animated Sparkles */}
                {sparkleVisible && [-30, 0, 30].map(x => 
                  [0, 50, 100].map(y => (
                    <Circle key={`${x}-${y}`} cx={x} cy={y} r={3.5} fill="#FFD700" opacity={0.8} />
                  ))
                )}
              </G>
            </Svg>

            {/* Instructions Overlay */}
            <View style={styles.viewer3DInstructions}> 
              <Move size={12} color="#D4AF37" />
              <Text style={styles.viewer3DInstructionText}>Drag to rotate</Text>
            </View>
          </View>

          {/* Controls Bar */}
          <View style={styles.viewer3DControls}> 
            {/* Auto Rotate */}
            <TouchableOpacity 
              style={styles.viewer3DControlBtn} 
              onPress={() => {
                if (autoRotateRef.current) {
                  clearAutoRotate();
                } else {
                  autoRotateRef.current = setInterval(() => {
                    setRotation3D(prev => ({
                      ...prev,
                      y: prev.y + 2
                    }));
                  }, 30);
                  setTimeout(() => clearAutoRotate(), 3000);
                }
              }}
            >
              <RotateCw size={16} color="#fff" />
              <Text style={styles.viewer3DControlBtnText}>Rotate</Text>
            </TouchableOpacity>

            {/* Zoom In */}
            <TouchableOpacity 
              style={styles.viewer3DIconBtn} 
              onPress={() => setZoom3D(prev => Math.min(prev + 0.2, 2))} 
            >
              <ZoomIn size={16} color="#fff" />
            </TouchableOpacity>

            {/* Zoom Out */}
            <TouchableOpacity 
              style={styles.viewer3DIconBtn} 
              onPress={() => setZoom3D(prev => Math.max(prev - 0.2, 0.5))} 
            >
              <ZoomOut size={16} color="#fff" />
            </TouchableOpacity>

            {/* Reset */}
            <TouchableOpacity 
              style={styles.viewer3DControlBtn} 
              onPress={() => {
                setRotation3D({ x: 0, y: 0 });
                setZoom3D(1);
              }}
            >
              <Maximize2 size={16} color="#fff" />
              <Text style={styles.viewer3DControlBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView> 
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F0',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E4D9',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  headerSub: {
    fontSize: 13,
    color: '#6B5D4F',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DCC8',
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#1a1a1a',
  },
  tabText: {
    fontSize: 13,
    color: '#6B5D4F',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  mainPadding: {
    padding: 16,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8DCC8',
  },
  formTitle: {
    fontSize: 22,
    fontFamily: 'serif',
    marginBottom: 20,
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: '#6B5D4F',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E8DCC8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  errorMessage: {
    fontSize: 11,
    color: '#dc2626',
    marginTop: 4,
    fontWeight: '500',
  },
  selectContainer: {
    borderWidth: 1,
    borderColor: '#E8DCC8',
    borderRadius: 8,
    overflow: 'hidden',
  },
  branchOption: {
    marginHorizontal: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#F5F1E8',
    borderWidth: 1,
    borderColor: '#E8DCC8',
    marginVertical: 8,
  },
  branchOptionSelected: {
    backgroundColor: '#1a1a1a',
    borderColor: '#1a1a1a',
  },
  branchText: {
    fontSize: 13,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  branchTextSelected: {
    color: '#fff',
  },
  optionButton: {
    marginHorizontal: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#F5F1E8',
    borderWidth: 1,
    borderColor: '#E8DCC8',
    marginVertical: 8,
  },
  optionButtonSelected: {
    backgroundColor: '#1a1a1a',
    borderColor: '#1a1a1a',
  },
  optionButtonText: {
    fontSize: 12,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  optionButtonTextSelected: {
    color: '#fff',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  datePickerText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  datePickerPlaceholder: {
    color: '#999',
  },
  helperText: { fontSize: 11, color: '#999', marginBottom: 6, fontStyle: 'italic' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countryCodeContainer: { backgroundColor: '#F5F1E8', borderWidth: 1, borderColor: '#E8DCC8', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8 },
  countryCodeText: { fontSize: 14, color: '#1a1a1a', fontWeight: '600' },
  contactInput: { flex: 1, paddingVertical: 12 },
  dropdownButton: {
    justifyContent: 'center',
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  dropdownPlaceholder: {
    color: '#999',
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8DCC8',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#1a1a1a',
  },
  calendarModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  calendarModal: { width: '90%', maxHeight: '70%', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E8DCC8' },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calendarNavBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  calendarNavText: { color: '#6B5D4F', fontSize: 13, fontWeight: '600' },
  calendarHeaderText: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  calendarDayHeader: { width: '14.28%', textAlign: 'center', fontSize: 12, fontWeight: '600', marginBottom: 4, color: '#6B5D4F' },
  calendarDay: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 2, borderRadius: 6 },
  calendarDayText: { color: '#1a1a1a' },
  calendarDaySelected: { backgroundColor: '#1a1a1a' },
  calendarDaySelectedText: { color: '#fff', fontWeight: '700' },
  calendarDayDisabled: { backgroundColor: '#f5f5f5' },
  calendarDayDisabledText: { color: '#b5b5b5' },
  calendarFooter: { marginTop: 12, alignItems: 'flex-end' },
  calendarCloseBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  calendarCloseBtnText: { color: '#6B5D4F', fontWeight: '600' },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E8DCC8',
    borderRadius: 12,
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 14,
    color: '#6B5D4F',
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  uploadSubText: {
    fontSize: 12,
    color: '#6B5D4F',
  },
  // ── AI Recommendation Box ──
  aiBox: {
    backgroundColor: '#FAF7F0',
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 2,
    padding: 16,
    marginVertical: 12,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  aiIconBadge: {
    width: 46,
    height: 46,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'serif',
    marginBottom: 2,
  },
  aiDescription: {
    fontSize: 12,
    color: '#6B5D4F',
    lineHeight: 17,
  },
  aiScanBtn: {
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 2,
    marginBottom: 16,
  },
  aiScanBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  aiButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },

  // ── Result Card ──
  aiResultCard: {
    borderWidth: 1,
    borderColor: '#E8DCC8',
    backgroundColor: '#fff',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  aiPhotoWrapper: {
    width: '100%',
    height: 260,
    position: 'relative',
  },
  aiPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  aiAnalyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  aiAnalyzingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'serif',
  },
  aiAnalyzingSubText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  aiRemoveBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiPhotoBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  aiSkinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#fff',
  },
  aiPhotoBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Analysis Results ──
  aiAnalysisResults: {
    padding: 16,
  },
  aiToneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF7F0',
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8DCC8',
  },
  aiToneItem: {
    flex: 1,
    alignItems: 'center',
  },
  aiToneDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E8DCC8',
  },
  aiToneLabel: {
    fontSize: 9,
    color: '#6B5D4F',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  aiToneValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'serif',
  },
  aiToneHexDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8DCC8',
  },
  aiToneHexText: {
    fontSize: 11,
    color: '#6B5D4F',
    fontWeight: '600',
  },

  // ── Spectrum Bar ──
  aiSpectrumWrapper: {
    marginBottom: 14,
  },
  aiSpectrumLabel: {
    fontSize: 9,
    color: '#6B5D4F',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  aiSpectrumTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E8DCC8',
    position: 'relative',
    overflow: 'visible',
    marginBottom: 6,
  },
  aiSpectrumGradient: {
    position: 'absolute',
    inset: 0,
    borderRadius: 5,
    height: '100%',
    width: '100%',
    backgroundColor: '#E8DCC8',
  },
  aiSpectrumIndicator: {
    position: 'absolute',
    top: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#D4AF37',
    borderWidth: 2,
    borderColor: '#fff',
    marginLeft: -8,
    elevation: 3,
  },
  aiSpectrumLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  aiSpectrumTick: {
    fontSize: 9,
    color: '#6B5D4F',
    textTransform: 'uppercase',
  },
  aiSpectrumTickActive: {
    color: '#D4AF37',
    fontWeight: '700',
  },

  // ── AI Insight ──
  aiInsightBox: {
    backgroundColor: '#FAF7F0',
    borderLeftWidth: 3,
    borderLeftColor: '#D4AF37',
    padding: 14,
    marginBottom: 16,
  },
  aiInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  aiInsightTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  aiInsightText: {
    fontSize: 13,
    color: '#6B5D4F',
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // ── Color Palette ──
  aiPaletteSection: {
    marginBottom: 16,
  },
  aiPaletteTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  aiPaletteSub: {
    fontSize: 11,
    color: '#6B5D4F',
    marginBottom: 12,
  },
  aiPaletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  aiPaletteChip: {
    width: '21%',
    alignItems: 'center',
  },
  aiPaletteChipTop: {
  },
  aiPaletteColor: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#E8DCC8',
    marginBottom: 5,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
  },
  aiPaletteBestBadge: {
    backgroundColor: '#D4AF37',
    width: '100%',
    paddingVertical: 2,
    alignItems: 'center',
  },
  aiPaletteBestText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  aiPaletteColorName: {
    fontSize: 9,
    color: '#6B5D4F',
    textAlign: 'center',
    fontWeight: '500',
  },

  // ── Apply Button ──
  aiApplyBtn: {
    backgroundColor: '#D4AF37',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 2,
  },
  aiApplyBtnText: {
    color: '#1a1a1a',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // ── Recommended Gowns ──
  aiGownsSection: {
    marginTop: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8DCC8',
    padding: 16,
    borderRadius: 2,
  },
  aiGownsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  aiGownsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'serif',
  },
  aiGownsSub: {
    fontSize: 11,
    color: '#6B5D4F',
    marginTop: 2,
  },
  aiGownsSeeAll: {
    fontSize: 12,
    color: '#D4AF37',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // ── Gown Cards ──
  aiGownCard: {
    width: 160,
    marginRight: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8DCC8',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  aiGownMatchBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#D4AF37',
    paddingVertical: 4,
    alignItems: 'center',
    zIndex: 10,
  },
  aiGownMatchBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  aiGownImageBox: {
    width: '100%',
    height: 180,
    marginTop: 22,
  },
  aiGownImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  aiGownInfo: {
    padding: 10,
  },
  aiGownName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    fontFamily: 'serif',
    marginBottom: 2,
  },
  aiGownCategory: {
    fontSize: 10,
    color: '#6B5D4F',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  aiGownColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  aiGownColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E8DCC8',
  },
  aiGownColorLabel: {
    fontSize: 10,
    color: '#6B5D4F',
  },
  aiGownMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiGownMatchTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#E8DCC8',
    borderRadius: 2,
    overflow: 'hidden',
  },
  aiGownMatchFill: {
    height: 4,
    backgroundColor: '#D4AF37',
    borderRadius: 2,
  },
  aiGownMatchPct: {
    fontSize: 10,
    color: '#D4AF37',
    fontWeight: '700',
  },

  // ── No Match ──
  aiNoMatch: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FAF7F0',
    gap: 12,
  },
  aiNoMatchText: {
    fontSize: 13,
    color: '#6B5D4F',
    textAlign: 'center',
  },
  aiNoMatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiNoMatchBtnText: {
    fontSize: 13,
    color: '#D4AF37',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  submitBtnDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Step Progress
  stepProgressContainer: { 
    backgroundColor: '#fff', 
    padding: 16, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#E8DCC8', 
  }, 
  stepProgressRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 8, 
  }, 
  stepProgressLabel: { 
    fontSize: 11, 
    color: '#6B5D4F', 
    textTransform: 'uppercase', 
    letterSpacing: 1, 
  }, 
  stepProgressTrack: { 
    height: 2, 
    backgroundColor: '#E8DCC8', 
    borderRadius: 1, 
    overflow: 'hidden', 
  }, 
  stepProgressFill: { 
    height: 2, 
    backgroundColor: '#D4AF37', 
  }, 
  
  // Step Header
  stepHeaderContainer: { 
    alignItems: 'center', 
    marginBottom: 24, 
  }, 
  stepTitle: { 
    fontFamily: 'serif', 
    fontSize: 26, 
    color: '#1a1a1a', 
    textAlign: 'center', 
    marginTop: 12, 
  }, 
  stepSubtitle: { 
    fontSize: 13, 
    color: '#6B5D4F', 
    textAlign: 'center', 
    marginTop: 4, 
  }, 
  
  // Fabric Cards Grid
  fabricGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
  }, 
  fabricCard: { 
    width: '48%', 
    borderWidth: 2, 
    borderColor: '#E8DCC8', 
    backgroundColor: '#fff', 
    padding: 14, 
    marginBottom: 10, 
  }, 
  fabricCardSelected: { 
    borderColor: '#D4AF37', 
    backgroundColor: '#FAF7F0', 
  }, 
  fabricCardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
  }, 
  fabricCardName: { 
    fontFamily: 'serif', 
    fontSize: 15, 
    color: '#1a1a1a', 
    flex: 1, 
  }, 
  
  // Color Chips
  colorChipContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginTop: 8, 
  }, 
  colorChip: { 
    paddingVertical: 8, 
    paddingHorizontal: 14, 
    borderWidth: 1, 
    borderColor: '#E8DCC8', 
    borderRadius: 20, 
    margin: 4, 
    backgroundColor: '#fff', 
  }, 
  colorChipSelected: { 
    borderColor: '#D4AF37', 
    backgroundColor: '#D4AF37', 
  }, 
  colorChipText: { 
    fontSize: 12, 
    color: '#6B5D4F', 
    fontWeight: '500', 
  }, 
  colorChipTextSelected: { 
    color: '#fff', 
  }, 
  
  // Navigation Buttons Row
  navButtonRow: { 
    flexDirection: 'row', 
    marginTop: 24, 
    gap: 12, 
  }, 
  backButton: { 
    flex: 1, 
    borderWidth: 2, 
    borderColor: '#1a1a1a', 
    paddingVertical: 14, 
    borderRadius: 2, 
    alignItems: 'center', 
    justifyContent: 'center', 
  }, 
  backButtonText: { 
    color: '#1a1a1a', 
    fontSize: 12, 
    fontWeight: '600', 
    textTransform: 'uppercase', 
    letterSpacing: 1, 
  }, 
  continueButton: { 
    flex: 2, 
    backgroundColor: '#1a1a1a', 
    paddingVertical: 14, 
    borderRadius: 2, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
  }, 
  continueButtonDisabled: { 
    backgroundColor: '#ccc', 
    opacity: 0.6, 
  }, 
  continueButtonText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '600', 
    textTransform: 'uppercase', 
    letterSpacing: 1, 
  }, 
  
  // Gold Submit Button
  submitGoldBtn: { 
    flex: 2, 
    backgroundColor: '#D4AF37', 
    paddingVertical: 14, 
    borderRadius: 2, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
  }, 
  submitGoldBtnDisabled: { 
    backgroundColor: '#ccc', 
    opacity: 0.6, 
  }, 
  submitGoldBtnText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '600', 
    textTransform: 'uppercase', 
    letterSpacing: 1, 
  }, 
  
  // What Happens Next info box
  infoBox: { 
    backgroundColor: '#FAF7F0', 
    borderLeftWidth: 4, 
    borderLeftColor: '#D4AF37', 
    padding: 16, 
    marginVertical: 16, 
  }, 
  infoBoxTitle: { 
    fontFamily: 'serif', 
    fontSize: 18, 
    color: '#1a1a1a', 
    marginBottom: 10, 
  }, 
  infoBoxItem: { 
    fontSize: 13, 
    color: '#6B5D4F', 
    marginBottom: 6, 
    lineHeight: 20, 
  },
  // 3D Designer Card (Step 1)
  designer3DCard: { 
    backgroundColor: '#1a1a1a', 
    borderRadius: 2, 
    padding: 20, 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: '#D4AF37', 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
  }, 
  designer3DIconBox: { 
    width: 52, 
    height: 52, 
    backgroundColor: '#D4AF37', 
    borderRadius: 2, 
    justifyContent: 'center', 
    alignItems: 'center', 
  }, 
  designer3DTextCol: { 
    flex: 1, 
    marginLeft: 14, 
  }, 
  designer3DTitle: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#fff', 
    marginBottom: 4, 
  }, 
  designer3DDesc: { 
    fontSize: 12, 
    color: 'rgba(255,255,255,0.65)', 
    lineHeight: 18, 
    marginBottom: 12, 
  }, 
  designer3DBtn: { 
    alignSelf: 'flex-start', 
    backgroundColor: '#D4AF37', 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 2, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
  }, 
  designer3DBtnText: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: '#1a1a1a', 
    textTransform: 'uppercase', 
    letterSpacing: 0.8, 
  }, 
  orSeparator: { 
    textAlign: 'center', 
    fontSize: 11, 
    color: '#6B5D4F', 
    textTransform: 'uppercase', 
    letterSpacing: 1.5, 
    marginBottom: 16, 
  }, 
  
  // 3D Viewer Modal
  viewer3DContainer: { 
    flex: 1, 
    backgroundColor: '#0a0a0a', 
  }, 
  viewer3DHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.1)', 
  }, 
  viewer3DTitle: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#fff', 
  }, 
  viewer3DReadout: { 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 6, 
  }, 
  viewer3DReadoutText: { 
    fontSize: 10, 
    color: 'rgba(255,255,255,0.7)', 
    lineHeight: 15, 
  }, 
  viewer3DCanvas: { 
    flex: 1, 
    backgroundColor: '#0d0d0d', 
    justifyContent: 'center', 
    alignItems: 'center', 
    position: 'relative', 
  }, 
  viewer3DInstructions: { 
    position: 'absolute', 
    bottom: 24, 
    alignSelf: 'center', 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    paddingHorizontal: 14, 
    paddingVertical: 7, 
    borderRadius: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
  }, 
  viewer3DInstructionText: { 
    fontSize: 12, 
    color: '#fff', 
  }, 
  viewer3DControls: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 10, 
    paddingVertical: 16, 
    paddingHorizontal: 16, 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(255,255,255,0.1)', 
  }, 
  viewer3DControlBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    paddingVertical: 10, 
    paddingHorizontal: 14, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 2, 
  }, 
  viewer3DControlBtnText: { 
    fontSize: 12, 
    color: '#fff', 
  }, 
  viewer3DIconBtn: { 
    width: 40, 
    height: 40, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 2, 
    justifyContent: 'center', 
    alignItems: 'center', 
  },
  ordersList: {
    gap: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8DCC8',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  orderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  orderId: {
    fontSize: 12,
    color: '#6B5D4F',
  },
  customerName: {
    fontSize: 13,
    color: '#6B5D4F',
    marginBottom: 4,
  },
  orderDates: {
    fontSize: 11,
    color: '#6B5D4F',
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 11,
    color: '#6B5D4F',
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    fontFamily: 'serif',
  },
  paidText: {
    fontSize: 11,
    color: '#6B5D4F',
    marginTop: 4,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8DCC8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: '#D4AF37',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B5D4F',
  },
  stepLabel: {
    fontSize: 10,
    color: '#6B5D4F',
    textAlign: 'center',
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DCC8',
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B5D4F',
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  footerContainer: {
    backgroundColor: '#6B5D4F',
    padding: 30,
    paddingTop: 60,
    width: '100%',
    marginTop: 20,
  },
  footerJoinTitle: {
    fontSize: 28,
    fontFamily: 'serif',
    color: '#FFF',
    marginBottom: 10,
  },
  footerJoinSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    marginBottom: 25,
  },
  newsletterRow: {
    flexDirection: 'row',
    height: 55,
    marginBottom: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
  },
  emailInput: {
    flex: 1,
    paddingHorizontal: 15,
    color: '#FFF',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  emailSubmitBtn: {
    width: 60,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLinksGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  footerColumn: {
    width: '48%',
  },
  columnHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    marginBottom: 15,
  },
  footerLink: {
    fontSize: 14,
    color: '#FFF',
    marginBottom: 12,
    lineHeight: 20,
  },
  socialRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  footerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 30,
  },
  copyrightText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 10,
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  legalText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', paddingTop: 50 },
  dropdownBox: { width: '90%', backgroundColor: '#FAF7F0', borderRadius: 2, paddingBottom: 30, elevation: 20 },
  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E8E4D9' },
  menuLogo: { fontSize: 20, fontFamily: 'serif', color: '#1a1a1a' },
  navItemsList: { paddingTop: 20, paddingHorizontal: 25 },
  navRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, gap: 15 },
  navText: { fontSize: 12, letterSpacing: 2, color: '#6B5D4F', fontWeight: '500' },
  logoutRow: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#E8E4D9', paddingTop: 15 },
  logoutText: { color: '#D9534F' },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  successSubMessage: {
    fontSize: 12,
    color: '#6B5D4F',
    marginBottom: 24,
    textAlign: 'center',
  },
  successButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
  },
  successButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },

  // Top bar
  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cameraCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraTopCenter: {
    alignItems: 'center',
  },
  cameraTopTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'serif',
    letterSpacing: 0.5,
  },
  cameraTopSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 2,
  },

  // Face frame area
  faceFrameWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  faceFrameSideOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '12%',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  // Oval face guide
  faceOval: {
    width: 240,
    height: 300,
    borderRadius: 120,
    borderWidth: 2,
    borderColor: '#D4AF37',
    backgroundColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },

  // Corner brackets
  cornerBracket: {
    position: 'absolute',
    width: 3,
    height: 28,
    backgroundColor: '#D4AF37',
  },
  cornerBracketH: {
    position: 'absolute',
    width: 28,
    height: 3,
    backgroundColor: '#D4AF37',
  },
  cornerTL:  { top: 12, left: 12 },
  cornerTLH: { top: 12, left: 12 },
  cornerTR:  { top: 12, right: 12 },
  cornerTRH: { top: 12, right: 12 },
  cornerBL:  { bottom: 12, left: 12 },
  cornerBLH: { bottom: 12, left: 12 },
  cornerBR:  { bottom: 12, right: 12 },
  cornerBRH: { bottom: 12, right: 12 },

  // Scan line
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(212,175,55,0.7)',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },

  // Cheek dots
  cheekDot: {
    position: 'absolute',
    top: '52%',
    alignItems: 'center',
    gap: 4,
  },
  cheekDotLeft: { left: 18 },
  cheekDotRight: { right: 18 },
  cheekDotInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D4AF37',
    backgroundColor: 'rgba(212,175,55,0.25)',
  },
  cheekDotLabel: {
    color: '#D4AF37',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Instructions
  faceInstructionBox: {
    marginTop: 20,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  faceInstructionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  faceInstructionSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    textAlign: 'center',
  },

  // Bottom controls
  cameraControls: {
    alignItems: 'center',
    paddingBottom: 40,
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingTop: 16,
  },
  captureHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212,175,55,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#D4AF37',
  },
  captureBtnRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#D4AF37',
  },
  captureHintSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scheduleRow: {
    marginTop: 4,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  scheduleModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 6,
  },
  scheduleModalSub: {
    fontSize: 12,
    color: '#6B5D4F',
    textAlign: 'center',
    marginBottom: 16,
  },
  scheduleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
    marginTop: 8,
  },
  scheduleInput: {
    borderWidth: 1,
    borderColor: '#E8DCC8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  timeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8DCC8',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  timeChipSelected: {
    borderColor: '#8b5cf6',
    backgroundColor: '#ede9fe',
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  timeChipTextSelected: {
    color: '#6d28d9',
  },
  scheduleError: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  scheduleConfirmBtn: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  scheduleConfirmBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  scheduleCancelBtn: {
    backgroundColor: '#F5F1E8',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  scheduleCancelBtnText: {
    color: '#1a1a1a',
    fontWeight: '600',
    fontSize: 14,
  },
});
