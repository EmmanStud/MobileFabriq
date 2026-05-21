import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    SafeAreaView,
    Modal,
    TextInput,
    FlatList,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Search, Heart, Calendar, MapPin, Star, Menu, ArrowRight, Instagram, Facebook, Mail, X, ShoppingBag, Ruler, User } from 'lucide-react-native';
import { sessionService } from '../services/sessionService';
import { mongodbService } from '../services/mongodbService';
import { API_CONFIG } from '../services/apiConfig';
import HamburgerMenu from '../components/HamburgerMenu';
import Header from '../components/Header';

export default function Collection({ navigation, route, unreadCount = 0 }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedGown, setSelectedGown] = useState(null);
    const [favorites, setFavorites] = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [gowns, setGowns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authToken, setAuthToken] = useState(null); 
    const [serverFavorites, setServerFavorites] = useState([]);

    const categories = ['All', 'Evening Gown', 'Wedding Dress', 'Ball Gown', 'Cocktail Dress'];

    // Color mapping for display when database image is missing
    const COLOR_PALETTE = {
        'red': '#E74C3C',
        'blue': '#3498DB',
        'black': '#2C3E50',
        'white': '#ECF0F1',
        'gold': '#F39C12',
        'silver': '#95A5A6',
        'pink': '#E91E63',
        'purple': '#9B59B6',
        'emerald': '#27AE60',
        'champagne': '#D4AF37',
        'navy': '#001F3F',
        'cream': '#FFFDD0',
    };

    // Get color from palette or return a default
    const getPlaceholderColor = (color) => {
        const colorLower = (color || '').toLowerCase();
        return COLOR_PALETTE[colorLower] || '#BDC3C7';
    };

    /**
     * Safely convert an image value from the backend into a React Native source.
     * The backend now normalizes all images to absolute URLs, but this acts as
     * a client-side safety net for any edge cases or cached data.
     *
     * Returns { uri: string } | null
     */
    const safeImageSource = (image) => {
        if (!image || typeof image !== 'string' || !image.trim()) return null;

        const trimmed = image.trim();

        // Already a full absolute URL
        if (/^https?:\/\//i.test(trimmed)) {
            const serverBase = API_CONFIG.BASE_URL.replace(/\/api$/, '');

            // /uploads/ URLs may carry a stale IP from a different server —
            // always rewrite them to point at the configured backend.
            if (/\/uploads\//i.test(trimmed)) {
                const urlPath = trimmed.replace(/^https?:\/\/[^/]+/, '');
                return { uri: `${serverBase}${urlPath}` };
            }
            // Rewrite localhost / 127.0.0.1 to the configured LAN base
            if (/localhost|127\.0\.0\.1/i.test(trimmed)) {
                const urlPath = trimmed.replace(/^https?:\/\/[^/]+/, '');
                return { uri: `${serverBase}${urlPath}` };
            }
            return { uri: trimmed };
        }

        // Relative path (e.g. /uploads/photo.jpg) — prepend server base
        if (trimmed.startsWith('/')) {
            const serverBase = API_CONFIG.BASE_URL.replace(/\/api$/, '');
            return { uri: `${serverBase}${trimmed}` };
        }

        return null;
    };

    // Convert backend InventoryItem to mobile catalog gown format
    // Field names match web Catalog.tsx: id, name, category, color, size, price, status, branch, image, rating
    const toCatalogGown = (item, index) => {
        const imageSource = safeImageSource(item.image);
        console.log(`🖼️ [${item.sku}] "${item.name}" image: raw="${item.image}" → resolved=${imageSource ? imageSource.uri : 'null'}`);
        // Only allow status: 'available', 'rented', 'reserved'. Fallback to 'reserved' if unknown.
        const allowedStatuses = ['available', 'rented', 'reserved'];
        const status = allowedStatuses.includes((item.status || '').toLowerCase())
            ? item.status.toLowerCase()
            : 'reserved';
        return {
            id: item.id || item._id || `${index}`,
            sku: item.sku,
            name: item.name || 'Unnamed Gown',
            category: item.category || 'Evening Gown',
            color: item.color || 'Unspecified',
            placeholderColor: getPlaceholderColor(item.color),
            size: Array.isArray(item.size) ? item.size : (item.size ? [item.size] : ['M']),
            price: item.price || 0,
            status,
            branch: item.branch || 'Main Branch',
            image: imageSource,
            hasImage: !!imageSource,
            description: item.description || '',
            rating: item.rating ?? 0,
            stock: item.stock || 1,
            lastRented: item.lastRented,
        };
    };

    // Fetch catalog from backend
    const loadCatalog = async () => {
        try {
            setLoading(true);
            const url = `${API_CONFIG.BASE_URL}/inventory/public`;
            console.log('📡 Fetching catalog from:', url);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Catalog loaded:', data.items?.length || 0, 'items');

            // Map backend response to mobile gown structure
            const mappedGowns = (data.items || []).map((item, index) => toCatalogGown(item, index));

            setGowns(mappedGowns);
        } catch (err) {
            console.error('❌ Error loading catalog:', err);
            setGowns([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;
        (async () => {
            await loadCatalog();
            const session = await sessionService.getSession();
            if (session?.token) { 
                setAuthToken(session.token); 
                const favs = await mongodbService.getFavorites(session.token); 
                const favIds = (Array.isArray(favs) ? favs : []).map(f => f.id); 
                if (mounted) {
                    setFavorites(favIds); 
                    setServerFavorites(Array.isArray(favs) ? favs : []); 
                }
            }
            if (mounted) setIsLoggedIn(!!session?.isLoggedIn);
        })();
        return () => (mounted = false);
    }, []);



    // Only filter by search and category; status is used for UI only
    const filteredGowns = gowns.filter((gown) => {
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch =
            gown.name.toLowerCase().includes(q) || gown.color.toLowerCase().includes(q);
        const matchesCategory = selectedCategory === 'All' || gown.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Debug logs
    console.log('📊 Inventory:', gowns.length);
    console.log('📊 Final rendered:', filteredGowns.length);
    // ...existing code...

    const toggleFavorite = async (gownId) => { 
        const gown = gowns.find(g => g.id === gownId || g._id === gownId); 
        if (!gown || !authToken) return; 
     
        const isCurrentlyFavorited = favorites.includes(gownId); 
        let updatedServerFavorites; 
     
        if (isCurrentlyFavorited) { 
            // Remove from favorites 
            setFavorites(prev => prev.filter(id => id !== gownId)); 
            updatedServerFavorites = serverFavorites.filter(f => f.id !== gownId); 
        } else { 
            // Add to favorites 
            setFavorites(prev => [...prev, gownId]); 
            const newFav = { 
                id: gown.id || gown._id, 
                name: gown.name || '', 
                category: gown.category || gown.type || '', 
                color: gown.color || '', 
                size: Array.isArray(gown.size) ? gown.size : [], 
                price: gown.price || 0, 
                status: gown.status || 'available', 
                branch: gown.branch || '', 
                image: gown.image?.uri || '', 
                rating: gown.rating || 0, 
            }; 
            updatedServerFavorites = [...serverFavorites, newFav]; 
        } 
     
        setServerFavorites(updatedServerFavorites); 
     
        // Sync with backend 
        try { 
            await mongodbService.updateFavorites(updatedServerFavorites, authToken); 
        } catch (err) { 
            console.warn('Failed to sync favorites:', err); 
        } 
    };

    const handleLogout = async () => {
        await sessionService.clearSession();
        setIsLoggedIn(false);
        setMenuVisible(false);
        // Ensure clean navigation stack and immediate redirect to Home
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

    // When an image URL returns a 404 or fails to load, fall back to color placeholder
    const handleImageError = (itemId, uri) => {
        console.warn(`❌ Image failed to load for item ${itemId}: ${uri}`);
        setGowns(prev => prev.map(g =>
            g.id === itemId ? { ...g, hasImage: false, image: null } : g
        ));
    };

    const renderCard = ({ item }) => (
        <TouchableOpacity style={[styles.card, item.status === 'rented' && { opacity: 0.65 }]} onPress={() => setSelectedGown(item)}>
            <View style={styles.imageWrap}>
                {item.hasImage ? (
                    <View style={{ width: '100%', height: '100%' }}>
                        {/* Color background shown while image loads */}
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: item.placeholderColor, justifyContent: 'center', alignItems: 'center' }]}>
                            <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
                        </View>
                        <Image
                            source={item.image}
                            style={styles.cardImage}
                            resizeMode="cover"
                            onError={() => handleImageError(item.id, item.image?.uri)}
                        />
                    </View>
                ) : (
                    <View style={[styles.cardImage, { backgroundColor: item.placeholderColor, justifyContent: 'center', alignItems: 'center' }]}>
                        <ShoppingBag size={28} color="rgba(255,255,255,0.5)" />
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 6 }}>
                            {item.name}
                        </Text>
                    </View>
                )}
                {item.status === 'rented' && (
                    <View style={[styles.badge, { backgroundColor: '#6B5D4F' }]}>
                        <Text style={styles.badgeText}>Rented</Text>
                    </View>
                )}
                {item.status === 'reserved' && (
                    <View style={[styles.badge, { backgroundColor: '#D4AF37' }]}>
                        <Text style={styles.badgeText}>Reserved</Text>
                    </View>
                )}
                <TouchableOpacity
                    style={styles.favBtn}
                    onPress={() => toggleFavorite(item.id)}
                >
                    <Heart size={18} color={favorites.includes(item.id) ? '#e11d48' : '#6B5D4F'} />
                </TouchableOpacity>
            </View>

            <View style={styles.cardContent}>
                <View style={styles.metaRow}>
                    <View style={styles.ratingRow}>
                        <Star size={14} color="#D4AF37" />
                        <Text style={styles.ratingText}>{item.rating}</Text>
                    </View>
                    <Text style={styles.categoryText}>{item.category}</Text>
                </View>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>{item.color}</Text>
                <View style={styles.cardFooter}>
                    <View>
                        <Text style={styles.smallLabel}>Rental Price</Text>
                        <Text style={styles.price}>₱{item.price.toLocaleString()}</Text>
                    </View>
                    {item.status === 'rented' ? (
                        <View style={[styles.bookBtn, { backgroundColor: '#999' }]}>
                            <Text style={styles.bookBtnText}>Rented</Text>
                        </View>
                    ) : item.status === 'available' ? (
                        <TouchableOpacity
                            style={styles.bookBtn}
                            onPress={async () => {
                                const logged = await sessionService.isLoggedIn();
                                if (logged) { 
                                  navigation.navigate('Rentals', { 
                                    selectedGown: item,
                                    selectedBranch: item.branch
                                  }); 
                                } 
                                else { navigation.navigate('Home', { openAuth: true }); }
                            }}
                        >
                            <Text style={styles.bookBtnText}>Book Now</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
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

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1a1a1a" />
                    <Text style={styles.loadingText}>Loading catalog...</Text>
                </View>
            ) : (
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.mainPadding}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Shop All</Text>
                        <Text style={styles.lead}>
                            Discover our curated collection of exquisite gowns for every occasion.
                        </Text>
                    </View>

                    <View style={styles.controls}>
                        <View style={styles.searchRow}>
                            <Search size={16} color="#6B5D4F" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search gowns..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholderTextColor="#6B5D4F"
                            />
                        </View>

                        <View style={styles.filterRow}>
                            {categories.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.filterBtn,
                                        selectedCategory === cat ? styles.filterBtnActive : styles.filterBtnInactive,
                                    ]}
                                    onPress={() => setSelectedCategory(cat)}
                                >
                                    <Text style={selectedCategory === cat ? styles.filterTextActive : styles.filterTextInactive}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <Text style={styles.results}>{filteredGowns.length} {filteredGowns.length === 1 ? 'gown' : 'gowns'} found</Text>

                    <FlatList
                        data={filteredGowns}
                        renderItem={renderCard}
                        keyExtractor={(i) => i.id}
                        numColumns={2}
                        columnWrapperStyle={styles.column}
                        scrollEnabled={false}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    />

                    {filteredGowns.length === 0 && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyTitle}>No gowns found</Text>
                            <TouchableOpacity
                                style={styles.resetBtn}
                                onPress={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                            >
                                <Text style={styles.resetBtnText}>Reset Filters</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>
            )}

            <Modal visible={!!selectedGown} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    {selectedGown && (
                        <View style={styles.modalCard}>
                            {/* Close Button */}
                            <TouchableOpacity 
                                style={styles.closeBtn}
                                onPress={() => setSelectedGown(null)}
                            >
                                <X color="#333" size={24} />
                            </TouchableOpacity>

                            <ScrollView contentContainerStyle={styles.modalContent}>
                                {/* Image Section */}
                                {selectedGown.hasImage ? (
                                    <View style={{ width: '100%', height: 400 }}>
                                        <View style={[StyleSheet.absoluteFill, { backgroundColor: selectedGown.placeholderColor, justifyContent: 'center', alignItems: 'center' }]}>
                                            <ActivityIndicator size="large" color="rgba(255,255,255,0.6)" />
                                        </View>
                                        <Image 
                                            source={selectedGown.image} 
                                            style={styles.modalImageFull} 
                                            resizeMode="cover"
                                            onError={() => {
                                                handleImageError(selectedGown.id, selectedGown.image?.uri);
                                                setSelectedGown(prev => prev ? { ...prev, hasImage: false, image: null } : null);
                                            }}
                                        />
                                    </View>
                                ) : (
                                    <View style={[styles.modalImageFull, { backgroundColor: selectedGown.placeholderColor, justifyContent: 'center', alignItems: 'center' }]}>
                                        <ShoppingBag size={40} color="rgba(255,255,255,0.5)" />
                                        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginTop: 8 }}>
                                            {selectedGown.name}
                                        </Text>
                                    </View>
                                )}

                                {/* Details Section */}
                                <View style={styles.detailsSection}>
                                    {/* Rating & Category */}
                                    <View style={styles.ratingSection}>
                                        <Star size={16} color="#D4AF37" fill="#D4AF37" />
                                        <Text style={styles.ratingText}>{selectedGown.rating}</Text>
                                        <Text style={styles.dot}>•</Text>
                                        <Text style={styles.categoryTag}>{selectedGown.category}</Text>
                                    </View>

                                    {/* Title */}
                                    <Text style={styles.productTitle}>{selectedGown.name}</Text>

                                    {/* Price Section */}
                                    <View style={styles.priceSection}>
                                        <Text style={styles.priceLabel}>Rental Price</Text>
                                        <Text style={styles.priceLargeNew}>₱{selectedGown.price.toLocaleString()}</Text>
                                        <Text style={styles.perDayText}>per day</Text>
                                    </View>

                                    {/* Divider */}
                                    <View style={styles.divider} />

                                    {/* Details Grid */}
                                    <View style={styles.detailsGrid}>
                                        {/* Color */}
                                        <View style={styles.detailItem}>
                                            <Text style={styles.detailLabel}>Color:</Text>
                                            <Text style={styles.detailValue}>{selectedGown.color}</Text>
                                        </View>

                                        {/* Sizes Available */}
                                        <View style={styles.detailItem}>
                                            <Text style={styles.detailLabel}>Sizes Available:</Text>
                                            <View style={styles.sizesContainer}>
                                                {selectedGown.size.map((size, idx) => (
                                                    <View key={idx} style={styles.sizeTagNew}>
                                                        <Text style={styles.sizeTextNew}>{size}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>

                                        {/* Location */}
                                        <View style={styles.detailItem}>
                                            <Text style={styles.detailLabel}>Location:</Text>
                                            <View style={styles.locationRow}>
                                                <MapPin size={14} color="#6B5D4F" />
                                                <Text style={styles.detailValue}>{selectedGown.branch}</Text>
                                            </View>
                                        </View>

                                        {/* Status */}
                                        <View style={styles.detailItem}>
                                            <Text style={styles.detailLabel}>Status:</Text>
                                            <View style={[
                                                styles.statusBadge,
                                                selectedGown.status === 'available' && styles.statusAvailable,
                                                selectedGown.status === 'rented' && styles.statusRented,
                                                selectedGown.status === 'reserved' && styles.statusReserved
                                            ]}>
                                                <Text style={[
                                                    styles.statusText,
                                                    selectedGown.status === 'available' && styles.statusAvailableText,
                                                    selectedGown.status !== 'available' && styles.statusUnavailableText
                                                ]}>
                                                    {selectedGown.status.toUpperCase()}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Divider */}
                                    <View style={styles.divider} />

                                    {/* Action Buttons */}
                                    <View style={styles.actionsContainer}>
                                        {selectedGown.status === 'available' && (
                                            <>
                                                <TouchableOpacity 
                                                    style={styles.primaryButton}
                                                    onPress={() => {
                                                        if (!isLoggedIn) {
                                                            setSelectedGown(null);
                                                            navigation.navigate('Home', { openAuth: true });
                                                        } else {
                                                            setSelectedGown(null);
                                                            navigation.navigate('Rentals', { 
                                                              selectedGown: selectedGown,
                                                              selectedBranch: selectedGown.branch
                                                            });
                                                        }
                                                    }}
                                                >
                                                    <Text style={styles.primaryButtonText}>Rent This Gown</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity 
                                                    style={styles.secondaryButton}
                                                    onPress={() => {
                                                        setSelectedGown(null);
                                                        if (isLoggedIn) {
                                                            navigation.navigate('Appointments');
                                                        } else {
                                                            navigation.navigate('Home', { openAuth: true });
                                                        }
                                                    }}
                                                >
                                                    <Text style={styles.secondaryButtonText}>Schedule Fitting</Text>
                                                </TouchableOpacity>
                                            </>
                                        )}
                                        {(selectedGown.status !== 'available') && (
                                            <TouchableOpacity 
                                                style={styles.primaryButton}
                                                onPress={() => {
                                                    setSelectedGown(null);
                                                    if (isLoggedIn) {
                                                        navigation.navigate('Appointments');
                                                    } else {
                                                        navigation.navigate('Home', { openAuth: true });
                                                    }
                                                }}
                                            >
                                                <Text style={styles.primaryButtonText}>Get Notified When Available</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {/* Close Text Button */}
                                    <TouchableOpacity 
                                        style={styles.closeTextBtn}
                                        onPress={() => setSelectedGown(null)}
                                    >
                                        <Text style={styles.closeTextBtnText}>Close</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    )}
                </View>
            </Modal>

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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F0' },
    scrollContent: { flexGrow: 1 },
    mainPadding: { padding: 16 },
    header: { marginBottom: 12 },
    title: { fontSize: 34, fontFamily: 'serif', marginBottom: 6 },
    lead: { color: '#6B5D4F', fontSize: 14 },
    controls: { marginVertical: 12 },
    searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#E8DCC8' },
    searchInput: { marginLeft: 8, flex: 1, height: 36, color: '#6B5D4F' },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    filterBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 4, marginRight: 8, marginBottom: 8 },
    filterBtnActive: { backgroundColor: '#1a1a1a' },
    filterBtnInactive: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8DCC8' },
    filterTextActive: { color: '#fff', fontSize: 11, textTransform: 'uppercase' },
    filterTextInactive: { color: '#6B5D4F', fontSize: 11, textTransform: 'uppercase' },
    results: { color: '#6B5D4F', marginVertical: 8 },
    column: { justifyContent: 'space-between' },
    card: { backgroundColor: '#fff', width: '48%', marginBottom: 16, borderRadius: 6, overflow: 'hidden' },
    imageWrap: { height: 220, backgroundColor: '#F5F1E8' },
    cardImage: { width: '100%', height: '100%' },
    badge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    badgeText: { color: '#fff', fontSize: 11, textTransform: 'uppercase' },
    favBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.9)', padding: 6, borderRadius: 20 },
    cardContent: { padding: 10 },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    ratingRow: { flexDirection: 'row', alignItems: 'center' },
    ratingText: { marginLeft: 6, color: '#6B5D4F' },
    categoryText: { fontSize: 11, color: '#6B5D4F', textTransform: 'uppercase' },
    cardTitle: { fontFamily: 'serif', fontSize: 18, marginBottom: 4 },
    cardSubtitle: { color: '#6B5D4F', fontSize: 12, marginBottom: 8 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    smallLabel: { fontSize: 11, color: '#6B5D4F', textTransform: 'uppercase' },
    price: { fontFamily: 'serif', fontSize: 18 },
    bookBtn: { backgroundColor: '#1a1a1a', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 4 },
    bookBtnText: { color: '#fff', fontSize: 11, textTransform: 'uppercase' },
    emptyState: { alignItems: 'center', padding: 24 },
    emptyTitle: { fontFamily: 'serif', fontSize: 24, color: '#6B5D4F', marginBottom: 8 },
    resetBtn: { backgroundColor: '#1a1a1a', padding: 10, borderRadius: 6 },
    resetBtnText: { color: '#fff' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end', alignItems: Platform.OS === 'web' ? 'center' : undefined, padding: Platform.OS === 'web' ? 20 : 0 },
    modalCard: { backgroundColor: '#fff', borderRadius: Platform.OS === 'web' ? 16 : 0, borderTopLeftRadius: Platform.OS === 'ios' || Platform.OS === 'android' ? 16 : undefined, borderTopRightRadius: Platform.OS === 'ios' || Platform.OS === 'android' ? 16 : undefined, maxHeight: '95%', width: Platform.OS === 'web' ? '90%' : '100%', maxWidth: Platform.OS === 'web' ? 600 : undefined, position: 'relative' },
    closeBtn: { position: 'absolute', top: 12, right: 12, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.9)', padding: 8, borderRadius: 20 },
    modalContent: { paddingBottom: 40 },
    modalImageFull: { width: '100%', height: 350, backgroundColor: '#F5F1E8' },
    detailsSection: { padding: Platform.OS === 'web' ? 32 : 20, paddingTop: Platform.OS === 'web' ? 24 : 20 },
    ratingSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
    ratingText: { color: '#D4AF37', fontSize: 14, fontWeight: 'bold' },
    dot: { color: '#6B5D4F', fontSize: 12 },
    categoryTag: { fontSize: 11, color: '#6B5D4F', textTransform: 'uppercase', fontWeight: '500' },
    productTitle: { fontSize: Platform.OS === 'web' ? 32 : 28, fontFamily: 'serif', marginBottom: Platform.OS === 'web' ? 20 : 16, color: '#1a1a1a', fontWeight: 'bold' },
    priceSection: { marginBottom: 16 },
    priceLabel: { fontSize: 11, color: '#6B5D4F', textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
    priceLargeNew: { fontSize: Platform.OS === 'web' ? 36 : 32, fontFamily: 'serif', color: '#1a1a1a', fontWeight: 'bold', marginBottom: 2 },
    perDayText: { fontSize: 12, color: '#6B5D4F' },
    divider: { height: 1, backgroundColor: '#E8DCC8', marginVertical: 16 },
    detailsGrid: { gap: Platform.OS === 'web' ? 16 : 12, marginBottom: 8 },
    detailItem: { gap: 6 },
    detailLabel: { fontSize: 11, color: '#6B5D4F', textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.5 },
    detailValue: { fontSize: 14, color: '#1a1a1a' },
    sizesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
    sizeTagNew: { backgroundColor: '#F5F1E8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: '#E8DCC8' },
    sizeTextNew: { fontSize: 13, color: '#1a1a1a', fontWeight: '500' },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 },
    statusAvailable: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#10b981' },
    statusRented: { backgroundColor: '#6B5D4F' },
    statusReserved: { backgroundColor: '#D4AF37' },
    statusText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    statusAvailableText: { color: '#059669' },
    statusUnavailableText: { color: '#fff' },
    actionsContainer: { gap: 10, marginTop: 16, marginBottom: 8 },
    primaryButton: { backgroundColor: '#1a1a1a', paddingVertical: 16, paddingHorizontal: 16, borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    secondaryButton: { borderWidth: 1.5, borderColor: '#1a1a1a', paddingVertical: 16, paddingHorizontal: 16, borderRadius: 6, alignItems: 'center' },
    secondaryButtonText: { color: '#1a1a1a', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    closeTextBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
    closeTextBtnText: { fontSize: 13, color: '#6B5D4F', fontWeight: '500' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', paddingTop: 50 },
    dropdownBox: { width: '90%', backgroundColor: '#FAF7F0', borderRadius: 2, paddingBottom: 30, elevation: 20 },
    menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E8E4D9' },
    menuLogo: { fontSize: 20, fontFamily: 'serif', color: '#1a1a1a' },
    navItemsList: { paddingTop: 20, paddingHorizontal: 25 },
    navRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, gap: 15 },
    navText: { fontSize: 12, letterSpacing: 2, color: '#6B5D4F', fontWeight: '500' },
    logoutRow: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#E8E4D9', paddingTop: 15 },
    logoutText: { color: '#D9534F' },
    footerContainer: { backgroundColor: '#6B5D4F', padding: 30, paddingTop: 60, width: '100%' },
    footerJoinTitle: { fontSize: 28, fontFamily: 'serif', color: '#FFF', marginBottom: 10 },
    footerJoinSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20, marginBottom: 25 },
    newsletterRow: { flexDirection: 'row', height: 55, marginBottom: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    emailInput: { flex: 1, paddingHorizontal: 15, color: '#FFF' },
    emailSubmitBtn: { width: 60, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
    footerLinksGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
    footerColumn: { width: '48%' },
    columnHeader: { fontSize: 12, fontWeight: 'bold', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, marginBottom: 15 },
    footerLink: { fontSize: 14, color: '#FFF', marginBottom: 12 },
    socialRow: { flexDirection: 'row', marginTop: 10 },
    footerDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 30 },
    copyrightText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 10 },
    legalRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 20 },
    legalText: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF7F0' },
    loadingText: { marginTop: 12, fontSize: 14, color: '#6B5D4F', fontFamily: 'serif' },
});