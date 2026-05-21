import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import {
  ChevronRight, ChevronLeft, X, RotateCw,
  Sparkles, Palette, Scissors, Plus, Minus, CheckCircle2,
  ShoppingBag, Zap,
} from 'lucide-react-native';
import { buildGownPrompt, submitGownGeneration, pollGownTask } from '../services/meshyService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LOCAL_SERVER = 'http://192.168.1.6:3456';

// ─── DATA ────────────────────────────────────────────────────────────────────

const silhouettes = [
  {
    id: 'aline',
    name: 'A-Line',
    basePrice: 15000,
    modelUrl: 'https://res.cloudinary.com/ddjislgmy/image/upload/v1778722638/ballgown_base_bspdrt.glb',
    description: 'Classic & universally flattering',
    emoji: '👗',
  },
  {
    id: 'ballgown',
    name: 'Ball Gown',
    basePrice: 18000,
    modelUrl: 'https://res.cloudinary.com/ddjislgmy/image/upload/v1778722025/aline_base_nwjato.glb',
    description: 'Dramatic & princess-worthy',
    emoji: '✨',
  },
  {
    id: 'mermaid',
    name: 'Mermaid',
    basePrice: 17000,
    modelUrl: 'https://res.cloudinary.com/ddjislgmy/image/upload/v1778722638/mermaid_base_kmb72y.glb',
    description: 'Fitted & glamorous silhouette',
    emoji: '🧜',
  },
  {
    id: 'sheath',
    name: 'Sheath',
    basePrice: 14000,
    modelUrl: 'https://res.cloudinary.com/ddjislgmy/image/upload/v1778722638/sheath_base_shvvvf.glb',
    description: 'Sleek, modern & minimalist',
    emoji: '💼',
  },
  {
    id: 'suit',
    name: 'Barong / Suit',
    basePrice: 13000,
    modelUrl: 'https://res.cloudinary.com/ddjislgmy/image/upload/v1778722637/suit_base_s8uxup.glb',
    description: 'Elegant Filipino formal wear',
    emoji: '🎋',
  },
];

const colors = [
  { name: 'Ivory White',  hex: '#FFFFF0' },
  { name: 'Blush Pink',   hex: '#FFB6C1' },
  { name: 'Rose Gold',    hex: '#B76E79' },
  { name: 'Champagne',    hex: '#D4AF37' },
  { name: 'Emerald',      hex: '#50C878' },
  { name: 'Royal Blue',   hex: '#4169E1' },
  { name: 'Burgundy',     hex: '#800020' },
  { name: 'Lavender',     hex: '#C9A0DC' },
  { name: 'Midnight',     hex: '#191970' },
  { name: 'Coral',        hex: '#FF7F50' },
  { name: 'Pearl',        hex: '#F0EAD6' },
  { name: 'Sage Green',   hex: '#B2AC88' },
];

const fabrics = [
  { id: 'satin',   name: 'Satin',   price: 2000, note: 'Smooth & lustrous' },
  { id: 'lace',    name: 'Lace',    price: 3500, note: 'Romantic & delicate' },
  { id: 'chiffon', name: 'Chiffon', price: 1800, note: 'Light & flowy' },
  { id: 'velvet',  name: 'Velvet',  price: 4000, note: 'Rich & luxurious' },
  { id: 'tulle',   name: 'Tulle',   price: 2500, note: 'Airy & layered' },
  { id: 'organza', name: 'Organza', price: 2200, note: 'Crisp & structured' },
  { id: 'silk',    name: 'Silk',    price: 5000, note: 'Premium & elegant' },
  { id: 'crepe',   name: 'Crepe',   price: 2800, note: 'Drapes beautifully' },
];

const addOnCategories = [
  {
    category: 'Overlay',
    items: [
      { id: 'lace_overlay', name: 'Lace Overlay',    price: 3500 },
      { id: 'beading',      name: 'Beading/Sequins', price: 5000 },
      { id: 'embroidery',   name: 'Embroidery',      price: 4500 },
    ],
  },
  {
    category: 'Accessories',
    items: [
      { id: 'belt',   name: 'Crystal Belt',  price: 1200 },
      { id: 'bow',    name: 'Back Bow',       price: 800  },
      { id: 'flower', name: 'Floral Accent',  price: 1000 },
    ],
  },
  {
    category: 'Sleeves',
    items: [
      { id: 'cap_sleeve',   name: 'Cap Sleeves',   price: 1500 },
      { id: 'long_sleeve',  name: 'Long Sleeves',  price: 2500 },
      { id: 'off_shoulder', name: 'Off Shoulder',  price: 1800 },
    ],
  },
  {
    category: 'Train',
    items: [
      { id: 'train_short', name: 'Short Train',      price: 2000 },
      { id: 'train_long',  name: 'Cathedral Train',  price: 4000 },
    ],
  },
  {
    category: 'Extras',
    items: [
      { id: 'veil',   name: 'Veil',          price: 3000 },
      { id: 'gloves', name: 'Elbow Gloves',  price: 1500 },
      { id: 'crown',  name: 'Crown/Tiara',   price: 2000 },
    ],
  },
];

// ─── COST CALCULATOR ─────────────────────────────────────────────────────────

const calculateTotal = (design) => {
  let total = design.silhouette?.basePrice || 0;
  total += design.fabric?.price || 0;
  total += design.addOns.reduce((sum, a) => sum + a.price, 0);
  return total;
};

const formatPeso = (amount) =>
  '₱' + amount.toLocaleString('en-PH');

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────

export default function GownDesigner3D({ navigation, route }) {
  const { onDesignComplete } = route.params || {};
  const colorPreviewRef = useRef(null);
  const generatedWebViewRef = useRef(null);

  const [step, setStep] = useState(1); // 1=silhouette, 2=color, 3=fabric, 4=addons, 5=preview
  const [design, setDesign] = useState({
    silhouette: null,
    color: null,
    fabric: null,
    addOns: [],
  });

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genMessage, setGenMessage] = useState('Preparing your design...');
  const [generatedModelUrl, setGeneratedModelUrl] = useState(null);
  const [pendingColorForGenerated, setPendingColorForGenerated] = useState(null);
  const [genError, setGenError] = useState(null);

  // Computed
  const totalCost = calculateTotal(design);
  const stepProgress = (step / 5) * 100;

  // ── Toggle add-on ──
  const toggleAddOn = (item) => {
    setDesign(prev => {
      const exists = prev.addOns.find(a => a.id === item.id);
      return {
        ...prev,
        addOns: exists
          ? prev.addOns.filter(a => a.id !== item.id)
          : [...prev.addOns, item],
      };
    });
  };

  const sendColorToViewer = (hex) => {
    console.log('[RN] sendColorToViewer called with:', hex);
    if (!colorPreviewRef?.current) {
      console.log('[RN] ERROR: colorPreviewRef is null');
      return;
    }
    if (!hex) {
      console.log('[RN] ERROR: hex is empty');
      return;
    }
    const js = `
      (function() {
        if (typeof window.applyColor === 'function') {
          window.applyColor('${hex}');
        } else {
          document.getElementById('debug').textContent = 'applyColor not found yet';
        }
        true;
      })();
    `;
    colorPreviewRef.current.injectJavaScript(js);
    console.log('[RN] injectJavaScript fired');
  };

  // ── Generate 3D ──
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenProgress(0);
    setGenError(null);
    setGeneratedModelUrl(null);

    try {
      const prompt = buildGownPrompt(design);
      const taskId = await submitGownGeneration(prompt);

      const result = await pollGownTask(taskId, (percent, message) => {
        setGenProgress(percent);
        setGenMessage(message);
      });

      setGeneratedModelUrl(result.modelUrl);
      setPendingColorForGenerated(design.color?.hex || null);
      setGenProgress(100);
      setGenMessage('Your gown is ready! ✨');
    } catch (err) {
      setGenError(err.message || 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Save design to Bespoke ──
  const handleSaveDesign = () => {
    const designSummary = {
      silhouette: design.silhouette?.name,
      color: design.color?.name,
      fabric: design.fabric?.name,
      addOns: design.addOns.map(a => a.name),
      estimatedCost: totalCost,
      modelUrl: generatedModelUrl,
      prompt: buildGownPrompt(design),
    };

    if (onDesignComplete) {
      onDesignComplete(designSummary);
    }
    navigation.goBack();
  };

  // ── Redesign ──
  const handleRedesign = () => {
    setGeneratedModelUrl(null);
    setGenError(null);
    setStep(1);
    setDesign({ silhouette: null, color: null, fabric: null, addOns: [] });
  };

  // ─── RENDER STEPS ────────────────────────────────────────────────────────

  const renderProgressBar = () => (
    <View style={s.progressContainer}>
      <View style={s.progressRow}>
        <Text style={s.progressLabel}>Step {step} of 4</Text>
        <Text style={s.progressLabel}>{Math.round(stepProgress)}%</Text>
      </View>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${stepProgress}%` }]} />
      </View>
      <View style={s.stepDotsRow}>
        {['Silhouette','Color','Fabric','Add-Ons'].map((label, i) => (
          <View key={i} style={s.stepDotItem}>
            <View style={[s.stepDot, step > i + 1 ? s.stepDotDone : step === i + 1 ? s.stepDotActive : s.stepDotInactive]}>
              {step > i + 1
                ? <CheckCircle2 size={10} color="#fff" />
                : <Text style={s.stepDotNum}>{i + 1}</Text>
              }
            </View>
            <Text style={[s.stepDotLabel, step === i + 1 && { color: '#1a1a1a', fontWeight: '600' }]}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  // STEP 1 — Silhouette
  const renderStep1 = () => (
    <View style={s.stepContent}>
      <View style={s.stepHeader}>
        <ShoppingBag size={32} color="#D4AF37" />
        <Text style={s.stepTitle}>Choose Your Silhouette</Text>
        <Text style={s.stepSubtitle}>Select the base shape of your dream gown</Text>
      </View>

      {silhouettes.map((sil) => {
        const selected = design.silhouette?.id === sil.id;
        return (
          <TouchableOpacity
            key={sil.id}
            style={[s.silhouetteCard, selected && s.silhouetteCardSelected]}
            onPress={() => setDesign(prev => ({ ...prev, silhouette: sil }))}
            activeOpacity={0.8}
          >
            <View style={s.silhouetteLeft}>
              <Text style={s.silhouetteEmoji}>{sil.emoji}</Text>
            </View>
            <View style={s.silhouetteMiddle}>
              <Text style={[s.silhouetteName, selected && { color: '#D4AF37' }]}>{sil.name}</Text>
              <Text style={s.silhouetteDesc}>{sil.description}</Text>
              <Text style={s.silhouettePrice}>Base: {formatPeso(sil.basePrice)}</Text>
            </View>
            {selected && <CheckCircle2 size={22} color="#D4AF37" />}
          </TouchableOpacity>
        );
      })}

      {design.silhouette && (
        <View style={s.previewBox}>
          <Text style={s.previewLabel}>Preview</Text>
          <WebView
            source={{ uri: `${LOCAL_SERVER}/viewer?url=${encodeURIComponent(design.silhouette.modelUrl)}` }}
            style={s.previewWebview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="always"
            originWhitelist={['*']}
            scrollEnabled={false}
          />
          <Text style={s.previewHint}>Drag to rotate · Pinch to zoom</Text>
        </View>
      )}
    </View>
  );

  // STEP 2 — Color
  const renderStep2 = () => (
    <View style={s.stepContent}>

      <View style={s.stepHeader}>
        <Palette size={32} color="#D4AF37" />
        <Text style={s.stepTitle}>Choose Your Color</Text>
        <Text style={s.stepSubtitle}>See it live on your selected gown</Text>
      </View>

      <View style={s.liveViewerBox}>
        <View style={s.liveViewerTopBar}>
          <View
            style={[
              s.liveColorIndicator,
              { backgroundColor: design.color?.hex || '#E8DCC8' },
            ]}
          />
          <Text style={s.liveColorName}>
            {design.color?.name || 'Select a color below'}
          </Text>
          <Text style={s.liveViewerHint}>Drag to rotate</Text>
        </View>

        <WebView
          ref={colorPreviewRef}
          source={{
            uri: `${LOCAL_SERVER}/viewer?url=${encodeURIComponent(
              design.silhouette?.modelUrl || ''
            )}`,
          }}
          style={s.liveWebview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="always"
          originWhitelist={['*']}
          scrollEnabled={false}
          onLoadEnd={() => {
            if (design.color?.hex) {
              const hex = design.color.hex;
              setTimeout(() => sendColorToViewer(hex), 1000);
              setTimeout(() => sendColorToViewer(hex), 2500);
              setTimeout(() => sendColorToViewer(hex), 4000);
            }
          }}
        />
      </View>

      <Text style={s.colorGridLabel}>SELECT COLOR</Text>
      <View style={s.colorGrid}>
        {colors.map((c) => {
          const selected = design.color?.name === c.name;
          return (
            <TouchableOpacity
              key={c.name}
              style={[s.colorCard, selected && s.colorCardSelected]}
              onPress={() => {
                setDesign(prev => ({ ...prev, color: c }));
                sendColorToViewer(c.hex);
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  s.colorSwatch,
                  { backgroundColor: c.hex },
                  selected && s.colorSwatchSelected,
                ]}
              />
              <Text style={[s.colorName, selected && { color: '#D4AF37', fontWeight: '600' }]}>{c.name}</Text>
              {selected && (
                <View style={s.colorCheck}>
                  <CheckCircle2 size={14} color="#D4AF37" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // STEP 3 — Fabric
  const renderStep3 = () => (
    <View style={s.stepContent}>
      <View style={s.stepHeader}>
        <Scissors size={32} color="#D4AF37" />
        <Text style={s.stepTitle}>Choose Your Fabric</Text>
        <Text style={s.stepSubtitle}>The material that brings your vision to life</Text>
      </View>

      {fabrics.map((f) => {
        const selected = design.fabric?.id === f.id;
        return (
          <TouchableOpacity
            key={f.id}
            style={[s.fabricCard, selected && s.fabricCardSelected]}
            onPress={() => setDesign(prev => ({ ...prev, fabric: f }))}
            activeOpacity={0.8}
          >
            <View style={s.fabricLeft}>
              <Text style={[s.fabricName, selected && { color: '#D4AF37' }]}>{f.name}</Text>
              <Text style={s.fabricNote}>{f.note}</Text>
            </View>
            <View style={s.fabricRight}>
              <Text style={[s.fabricPrice, selected && { color: '#D4AF37' }]}>+{formatPeso(f.price)}</Text>
              {selected && <CheckCircle2 size={18} color="#D4AF37" style={{ marginTop: 4 }} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // STEP 4 — Add-Ons
  const renderStep4 = () => (
    <View style={s.stepContent}>
      <View style={s.stepHeader}>
        <Sparkles size={32} color="#D4AF37" />
        <Text style={s.stepTitle}>Add Peripherals</Text>
        <Text style={s.stepSubtitle}>Personalize with accessories and details</Text>
      </View>

      {addOnCategories.map((cat) => (
        <View key={cat.category} style={s.addonCategory}>
          <Text style={s.addonCategoryLabel}>{cat.category.toUpperCase()}</Text>
          {cat.items.map((item) => {
            const selected = design.addOns.some(a => a.id === item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[s.addonRow, selected && s.addonRowSelected]}
                onPress={() => toggleAddOn(item)}
                activeOpacity={0.8}
              >
                <View style={[s.addonToggle, selected && s.addonToggleSelected]}>
                  {selected ? <Minus size={14} color="#fff" /> : <Plus size={14} color="#6B5D4F" />}
                </View>
                <Text style={[s.addonName, selected && { color: '#1a1a1a', fontWeight: '600' }]}>{item.name}</Text>
                <Text style={[s.addonPrice, selected && { color: '#D4AF37' }]}>+{formatPeso(item.price)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );

  // STEP 5 — Preview / Generation
  const renderStep5 = () => (
    <View style={{ flex: 1 }}>
      {/* Cost Breakdown */}
      <View style={s.costCard}>
        <Text style={s.costTitle}>💰 Cost Breakdown</Text>
        <View style={s.costRow}>
          <Text style={s.costLabel}>Base {design.silhouette?.name}</Text>
          <Text style={s.costValue}>{formatPeso(design.silhouette?.basePrice || 0)}</Text>
        </View>
        {design.fabric && (
          <View style={s.costRow}>
            <Text style={s.costLabel}>+ {design.fabric.name} Fabric</Text>
            <Text style={s.costValue}>{formatPeso(design.fabric.price)}</Text>
          </View>
        )}
        {design.addOns.map(a => (
          <View key={a.id} style={s.costRow}>
            <Text style={s.costLabel}>+ {a.name}</Text>
            <Text style={s.costValue}>{formatPeso(a.price)}</Text>
          </View>
        ))}
        <View style={s.costDivider} />
        <View style={s.costTotalRow}>
          <Text style={s.costTotalLabel}>ESTIMATED TOTAL</Text>
          <Text style={s.costTotalValue}>{formatPeso(totalCost)}</Text>
        </View>
        <Text style={s.costNote}>Subject to final boutique assessment</Text>
      </View>

      {/* Design Summary */}
      <View style={s.summaryCard}>
        <Text style={s.summaryTitle}>Your Design</Text>
        <Text style={s.summaryItem}>✦ {design.silhouette?.name} silhouette</Text>
        <Text style={s.summaryItem}>✦ {design.color?.name} color</Text>
        <Text style={s.summaryItem}>✦ {design.fabric?.name} fabric</Text>
        {design.addOns.length > 0 && (
          <Text style={s.summaryItem}>✦ {design.addOns.map(a => a.name).join(', ')}</Text>
        )}
      </View>

      {/* 3D Generation Area */}
      {!generatedModelUrl && !isGenerating && !genError && (
        <TouchableOpacity style={s.generateBtn} onPress={handleGenerate} activeOpacity={0.85}>
          <Zap size={20} color="#1a1a1a" />
          <Text style={s.generateBtnText}>Generate 3D Preview</Text>
        </TouchableOpacity>
      )}

      {/* Loading State */}
      {isGenerating && (
        <View style={s.generatingBox}>
          <ActivityIndicator size="large" color="#D4AF37" />
          <Text style={s.generatingMessage}>{genMessage}</Text>
          <View style={s.genProgressTrack}>
            <View style={[s.genProgressFill, { width: `${genProgress}%` }]} />
          </View>
          <Text style={s.genProgressPct}>{genProgress}%</Text>
          <Text style={s.genNote}>This takes 60–90 seconds. Please wait...</Text>
        </View>
      )}

      {/* Error State */}
      {genError && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{genError}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={handleGenerate}>
            <RotateCw size={16} color="#fff" />
            <Text style={s.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3D Viewer */}
      {generatedModelUrl && (
        <View style={s.viewerContainer}>
          <Text style={s.viewerLabel}>Your Custom Gown ✨</Text>
          <WebView
            ref={generatedWebViewRef}
            source={{
              uri: `${LOCAL_SERVER}/viewer?url=${encodeURIComponent(generatedModelUrl || '')}`
            }}
            style={s.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="always"
            originWhitelist={['*']}
            scrollEnabled={false}
            onLoadEnd={() => {
              const hex = pendingColorForGenerated || design.color?.hex;
              if (!hex) return;
              [2000, 4000, 6000, 8000].forEach(delay => {
                setTimeout(() => {
                  generatedWebViewRef.current?.injectJavaScript(`
                    (function() {
                      if (typeof window.applyColor === 'function') {
                        window.applyColor('${hex}');
                      }
                      true;
                    })();
                  `);
                }, delay);
              });
            }}
          />
          <View style={s.viewerActions}>
            <TouchableOpacity style={s.redesignBtn} onPress={handleRedesign} activeOpacity={0.85}>
              <RotateCw size={16} color="#1a1a1a" />
              <Text style={s.redesignBtnText}>Redesign</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={handleSaveDesign} activeOpacity={0.85}>
              <CheckCircle2 size={16} color="#fff" />
              <Text style={s.saveBtnText}>Save & Apply to Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  // ─── NAV BUTTONS ─────────────────────────────────────────────────────────

  const canProceed = () => {
    if (step === 1) return !!design.silhouette;
    if (step === 2) return !!design.color;
    if (step === 3) return !!design.fabric;
    if (step === 4) return true; // add-ons optional
    return false;
  };

  const renderNavButtons = () => {
    if (step === 5) return null; // step 5 has its own action buttons
    return (
      <View style={s.navRow}>
        {step > 1 && (
          <TouchableOpacity style={s.backBtn} onPress={() => setStep(s => s - 1)} activeOpacity={0.8}>
            <ChevronLeft size={18} color="#1a1a1a" />
            <Text style={s.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.nextBtn, !canProceed() && s.nextBtnDisabled, step === 1 && { flex: 1 }]}
          onPress={() => setStep(s => s + 1)}
          disabled={!canProceed()}
          activeOpacity={0.85}
        >
          <Text style={s.nextBtnText}>{step === 4 ? 'Review & Generate' : 'Continue'}</Text>
          <ChevronRight size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  // ─── MAIN RENDER ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safeArea}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBack}>
          <X size={20} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>3D Gown Designer</Text>
          <Text style={s.headerSub}>FabriQ Custom Studio</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.headerCost}>{formatPeso(totalCost)}</Text>
          <Text style={s.headerCostLabel}>Est. Total</Text>
        </View>
      </View>

      {/* Progress (steps 1–4 only) */}
      {step <= 4 && renderProgressBar()}

      {/* Step Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </ScrollView>

      {/* Nav Buttons */}
      {renderNavButtons()}
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAF7F0' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8DCC8',
  },
  headerBack: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: 'serif', fontSize: 18, color: '#1a1a1a', fontWeight: '600' },
  headerSub: { fontSize: 10, color: '#6B5D4F', textTransform: 'uppercase', letterSpacing: 1 },
  headerRight: { alignItems: 'flex-end' },
  headerCost: { fontSize: 15, fontWeight: '700', color: '#D4AF37' },
  headerCostLabel: { fontSize: 9, color: '#6B5D4F', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Progress Bar
  progressContainer: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#E8DCC8',
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 11, color: '#6B5D4F', textTransform: 'uppercase', letterSpacing: 1 },
  progressTrack: { height: 2, backgroundColor: '#E8DCC8', borderRadius: 1, marginBottom: 12 },
  progressFill: { height: 2, backgroundColor: '#D4AF37', borderRadius: 1 },
  stepDotsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stepDotItem: { alignItems: 'center', gap: 4 },
  stepDot: {
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  stepDotActive: { backgroundColor: '#1a1a1a' },
  stepDotDone: { backgroundColor: '#D4AF37' },
  stepDotInactive: { backgroundColor: '#E8DCC8' },
  stepDotNum: { fontSize: 10, color: '#fff', fontWeight: '700' },
  stepDotLabel: { fontSize: 9, color: '#6B5D4F', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Step Content
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  stepContent: { paddingTop: 20 },
  stepHeader: { alignItems: 'center', marginBottom: 24 },
  stepTitle: { fontFamily: 'serif', fontSize: 24, color: '#1a1a1a', textAlign: 'center', marginTop: 10 },
  stepSubtitle: { fontSize: 13, color: '#6B5D4F', textAlign: 'center', marginTop: 4 },

  // Silhouette Cards
  silhouetteCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 2, borderColor: '#E8DCC8',
    borderRadius: 2, padding: 16, marginBottom: 12,
  },
  silhouetteCardSelected: { borderColor: '#D4AF37', backgroundColor: '#FAF7F0' },
  silhouetteLeft: {
    width: 50, height: 50, backgroundColor: '#F5F1E8', borderRadius: 2,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  silhouetteEmoji: { fontSize: 26 },
  silhouetteMiddle: { flex: 1 },
  silhouetteName: { fontFamily: 'serif', fontSize: 17, color: '#1a1a1a', marginBottom: 2 },
  silhouetteDesc: { fontSize: 12, color: '#6B5D4F', marginBottom: 4 },
  silhouettePrice: { fontSize: 12, color: '#D4AF37', fontWeight: '600' },

  // Color Grid
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorCard: {
    width: (SCREEN_WIDTH - 32 - 30) / 3,
    backgroundColor: '#fff', borderWidth: 2, borderColor: '#E8DCC8',
    borderRadius: 2, padding: 10, alignItems: 'center', position: 'relative',
  },
  colorCardSelected: { borderColor: '#D4AF37', backgroundColor: '#FAF7F0' },
  colorSwatch: { width: 40, height: 40, borderRadius: 20, marginBottom: 6, borderWidth: 1, borderColor: '#E8DCC8' },
  colorSwatchSelected: { borderWidth: 2, borderColor: '#D4AF37' },
  colorName: { fontSize: 10, color: '#6B5D4F', textAlign: 'center', letterSpacing: 0.3 },
  colorCheck: { position: 'absolute', top: 6, right: 6 },

  // Fabric Cards
  fabricCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderWidth: 2, borderColor: '#E8DCC8',
    borderRadius: 2, padding: 16, marginBottom: 10,
  },
  fabricCardSelected: { borderColor: '#D4AF37', backgroundColor: '#FAF7F0' },
  fabricLeft: { flex: 1 },
  fabricName: { fontFamily: 'serif', fontSize: 16, color: '#1a1a1a', marginBottom: 2 },
  fabricNote: { fontSize: 12, color: '#6B5D4F' },
  fabricRight: { alignItems: 'flex-end' },
  fabricPrice: { fontSize: 13, fontWeight: '600', color: '#6B5D4F' },

  // Add-Ons
  addonCategory: { marginBottom: 20 },
  addonCategoryLabel: {
    fontSize: 10, color: '#6B5D4F', letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#E8DCC8', paddingBottom: 6,
  },
  addonRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8DCC8',
    borderRadius: 2, padding: 14, marginBottom: 8, gap: 12,
  },
  addonRowSelected: { borderColor: '#D4AF37', backgroundColor: '#FAF7F0' },
  addonToggle: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1, borderColor: '#E8DCC8',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F1E8',
  },
  addonToggleSelected: { backgroundColor: '#D4AF37', borderColor: '#D4AF37' },
  addonName: { flex: 1, fontSize: 14, color: '#6B5D4F' },
  addonPrice: { fontSize: 13, color: '#6B5D4F', fontWeight: '500' },

  // Nav Buttons
  navRow: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E8DCC8',
  },
  backBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#1a1a1a', borderRadius: 2, paddingVertical: 14, gap: 6,
  },
  backBtnText: { fontSize: 12, fontWeight: '600', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: 1 },
  nextBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1a1a1a', borderRadius: 2, paddingVertical: 14, gap: 6,
  },
  nextBtnDisabled: { backgroundColor: '#ccc' },
  nextBtnText: { fontSize: 12, fontWeight: '600', color: '#fff', textTransform: 'uppercase', letterSpacing: 1 },

  // Step 5 — Cost Breakdown
  costCard: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8DCC8',
    borderLeftWidth: 4, borderLeftColor: '#D4AF37',
    padding: 16, marginBottom: 16, marginTop: 16,
  },
  costTitle: { fontFamily: 'serif', fontSize: 18, color: '#1a1a1a', marginBottom: 12 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  costLabel: { fontSize: 13, color: '#6B5D4F' },
  costValue: { fontSize: 13, color: '#1a1a1a', fontWeight: '500' },
  costDivider: { height: 1, backgroundColor: '#E8DCC8', marginVertical: 10 },
  costTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costTotalLabel: { fontSize: 12, fontWeight: '700', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: 1 },
  costTotalValue: { fontSize: 20, fontWeight: '700', color: '#D4AF37' },
  costNote: { fontSize: 10, color: '#6B5D4F', marginTop: 6, fontStyle: 'italic' },

  // Summary Card
  summaryCard: {
    backgroundColor: '#F5F1E8', borderWidth: 1, borderColor: '#E8DCC8',
    padding: 16, marginBottom: 16,
  },
  summaryTitle: { fontFamily: 'serif', fontSize: 15, color: '#1a1a1a', marginBottom: 10 },
  summaryItem: { fontSize: 13, color: '#6B5D4F', marginBottom: 4, lineHeight: 20 },

  // Generate Button
  generateBtn: {
    backgroundColor: '#D4AF37', borderRadius: 2, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginBottom: 16,
  },
  generateBtnText: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: 1 },

  // Generating State
  generatingBox: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8DCC8',
    padding: 24, alignItems: 'center', marginBottom: 16, gap: 14,
  },
  generatingMessage: { fontFamily: 'serif', fontSize: 16, color: '#1a1a1a', textAlign: 'center' },
  genProgressTrack: { width: '100%', height: 4, backgroundColor: '#E8DCC8', borderRadius: 2 },
  genProgressFill: { height: 4, backgroundColor: '#D4AF37', borderRadius: 2 },
  genProgressPct: { fontSize: 12, color: '#D4AF37', fontWeight: '600' },
  genNote: { fontSize: 11, color: '#6B5D4F', textAlign: 'center' },

  // Error
  errorBox: {
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#dc2626',
    padding: 16, marginBottom: 16, alignItems: 'center', gap: 12,
  },
  errorText: { fontSize: 13, color: '#dc2626', textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#dc2626', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 2,
  },
  retryBtnText: { fontSize: 12, fontWeight: '600', color: '#fff', textTransform: 'uppercase' },

  // WebView Viewer
  viewerContainer: { marginBottom: 16 },
  viewerLabel: { fontFamily: 'serif', fontSize: 16, color: '#1a1a1a', marginBottom: 10, textAlign: 'center' },
  webview: { width: '100%', height: 340, backgroundColor: '#0d0d0d' },
  viewerActions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  redesignBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#1a1a1a', borderRadius: 2, paddingVertical: 14, gap: 8,
  },
  redesignBtnText: { fontSize: 12, fontWeight: '600', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: 1 },
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#D4AF37', borderRadius: 2, paddingVertical: 14, gap: 8,
  },
  saveBtnText: { fontSize: 12, fontWeight: '600', color: '#fff', textTransform: 'uppercase', letterSpacing: 1 },

  // Live 3D viewer in Step 2
  liveViewerBox: {
    borderWidth: 1,
    borderColor: '#E8DCC8',
    backgroundColor: '#111111',
    marginBottom: 20,
    overflow: 'hidden',
  },
  liveViewerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DCC8',
    gap: 10,
  },
  liveColorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8DCC8',
  },
  liveColorName: {
    flex: 1,
    fontSize: 13,
    color: '#1a1a1a',
    fontFamily: 'serif',
  },
  liveViewerHint: {
    fontSize: 10,
    color: '#6B5D4F',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  liveWebview: {
    width: '100%',
    height: 280,
    backgroundColor: '#111111',
  },
  colorGridLabel: {
    fontSize: 10,
    color: '#6B5D4F',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  
  // Step 1 Preview
  previewBox: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E8DCC8',
    backgroundColor: '#111',
    overflow: 'hidden',
  },
  previewLabel: {
    fontSize: 10,
    color: '#6B5D4F',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DCC8',
  },
  previewWebview: {
    width: '100%',
    height: 300,
    backgroundColor: '#111111',
  },
  previewHint: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    paddingVertical: 8,
    backgroundColor: '#111',
    fontFamily: 'sans-serif',
  },
});