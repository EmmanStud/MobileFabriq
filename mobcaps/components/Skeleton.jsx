import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export function SkeletonBox({ width = '100%', height = 16, radius = 4, style }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.box, { width, height, borderRadius: radius, opacity }, style]}
    />
  );
}

export function CollectionCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.imagePlaceholder} />
      <View style={styles.cardContent}>
        <View style={styles.metaRow}>
          <SkeletonBox width={42} height={12} />
          <SkeletonBox width="42%" height={10} />
        </View>
        <SkeletonBox width="78%" height={20} radius={3} style={styles.titleBar} />
        <SkeletonBox width="46%" height={12} style={styles.subtitleBar} />
        <View style={styles.footer}>
          <View>
            <SkeletonBox width={58} height={10} />
            <SkeletonBox width={64} height={20} radius={3} style={styles.priceBar} />
          </View>
          <SkeletonBox width={68} height={32} radius={4} />
        </View>
      </View>
    </View>
  );
}

export function CollectionGridSkeleton({ count = 6 }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }, (_, index) => (
        <CollectionCardSkeleton key={index} />
      ))}
    </View>
  );
}

export function MeasurementsSkeleton({ count = 6 }) {
  return (
    <View style={styles.measurementsGrid}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.measurementItem}>
          <SkeletonBox width="60%" height={12} />
          <SkeletonBox width="40%" height={18} style={styles.measurementValue} />
        </View>
      ))}
    </View>
  );
}

export function FavoritesRowSkeleton({ count = 3 }) {
  return (
    <View>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.favoriteItem}>
          <View style={styles.favoriteInfo}>
            <SkeletonBox width="70%" height={14} />
            <SkeletonBox width="45%" height={12} style={styles.rowBar} />
          </View>
          <View style={styles.favoriteActions}>
            <SkeletonBox width={50} height={28} radius={16} />
            <SkeletonBox width={36} height={36} radius={18} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function HistoryRowSkeleton({ count = 3 }) {
  return (
    <View>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.historyItem}>
          <View style={styles.historyInfo}>
            <SkeletonBox width="65%" height={14} />
            <SkeletonBox width="40%" height={12} style={styles.rowBar} />
            <SkeletonBox width="30%" height={12} style={styles.rowBar} />
          </View>
          <SkeletonBox width={50} height={16} />
        </View>
      ))}
    </View>
  );
}

export function RentalListSkeleton({ count = 3 }) {
  return (
    <View>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.rentalItem}>
          <View style={styles.rentalInfo}>
            <SkeletonBox width="62%" height={16} />
            <SkeletonBox width="42%" height={12} style={styles.rowBar} />
            <SkeletonBox width="34%" height={12} style={styles.rowBar} />
          </View>
          <SkeletonBox width={72} height={30} radius={16} />
        </View>
      ))}
    </View>
  );
}

export function AppointmentListSkeleton({ count = 3 }) {
  return <RentalListSkeleton count={count} />;
}

export function OrderListSkeleton({ count = 3 }) {
  return <RentalListSkeleton count={count} />;
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#E8DCC8' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { backgroundColor: '#fff', width: '48%', marginBottom: 16, borderRadius: 6, overflow: 'hidden' },
  imagePlaceholder: { aspectRatio: 0.78, backgroundColor: '#F5F1E8' },
  cardContent: { padding: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  titleBar: { marginBottom: 4 },
  subtitleBar: { marginBottom: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceBar: { marginTop: 4 },
  measurementsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  measurementItem: {
    width: '48%',
    backgroundColor: '#FAF7F0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8DCC8',
    padding: 12,
  },
  measurementValue: { marginTop: 6 },
  favoriteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8DCC8',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  favoriteInfo: { flex: 1 },
  favoriteActions: { flexDirection: 'row', gap: 8 },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8DCC8',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  historyInfo: { flex: 1 },
  rowBar: { marginTop: 6 },
  rentalItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DCC8',
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rentalInfo: { flex: 1 },
});
