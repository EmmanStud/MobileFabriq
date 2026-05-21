import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, SafeAreaView } from "react-native";

export default function SplashScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Start Appearance Animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Loading Progress Logic
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          // Small delay after hitting 100% for visual polish
          setTimeout(() => {
            if (onComplete) onComplete(); 
          }, 400);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.brandContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.title}>Hannah Vanessa</Text>
          <Text style={styles.subtitle}>BOUTIQUE</Text>
        </Animated.View>

        <View style={styles.loaderTrack}>
          <View // Changed from Animated.View as width doesn't support Native Driver
            style={[
              styles.loaderFill,
              { width: `${progress}%` },
            ]}
          />
        </View>

        <Text style={styles.tagline}>Cadena de Amor, Taguig City</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F1E8", justifyContent: "center", alignItems: "center" },
  center: { alignItems: "center" },
  brandContainer: { alignItems: "center", marginBottom: 40 },
  title: { fontSize: 40, fontWeight: "300", color: "#1a1a1a" },
  subtitle: { marginTop: 8, fontSize: 12, letterSpacing: 4, color: "#6B5D4F" },
  loaderTrack: { width: 220, height: 2, backgroundColor: "#E8DCC8", overflow: "hidden", marginTop: 20 },
  loaderFill: { height: "100%", backgroundColor: "#D4AF37" },
  tagline: { marginTop: 30, fontSize: 10, letterSpacing: 2, color: "#6B5D4F" },
});