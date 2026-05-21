import React from 'react';
import { Modal, View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { X, ShoppingBag, Calendar, Ruler, User } from 'lucide-react-native';

// Local Assets
import FabriQLogo from '../assets/FabriQLogo.png';

/**
 * Standardized Hamburger Menu Component
 * Used across all pages for consistent design and navigation
 * 
 * Props:
 *   visible (bool): Controls menu visibility
 *   onClose (func): Called when menu should close
 *   isLoggedIn (bool): Show/hide logout button
 *   onLogout (func): Called when logout is pressed
 *   onNavigate (func): Called with route name when navigation item is tapped
 *   onAuthAction (func): Called with route name for protected routes (Rentals, Bespoke, etc.)
 *   currentRoute (string): Name of current route to hide self-link (optional)
 *   styles (object): StyleSheet object with menu styles
 */
export default function HamburgerMenu({
  visible,
  onClose,
  isLoggedIn,
  onLogout,
  onNavigate,
  onAuthAction,
  currentRoute,
  styles,
}) {
  // Provide safe defaults for callbacks to avoid undefined calls
  const safeOnClose = typeof onClose === 'function' ? onClose : () => {};
  const safeOnNavigate = typeof onNavigate === 'function' ? onNavigate : () => {};
  const safeOnAuthAction = typeof onAuthAction === 'function' ? onAuthAction : (r) => safeOnNavigate(r);
  const safeOnLogout = typeof onLogout === 'function' ? onLogout : () => {};
  const mergedStyles = styles ? { ...defaultStyles, ...styles } : defaultStyles;

  const handleNavigation = (routeName, requiresAuth = false) => {
    safeOnClose();
    if (requiresAuth) {
      safeOnAuthAction(routeName);
    } else {
      safeOnNavigate(routeName);
    }
  };

  return (
    <Modal visible={!!visible} animationType="fade" transparent={true}>
      <TouchableOpacity 
        style={mergedStyles.modalOverlay}
        activeOpacity={1}
        onPress={safeOnClose}
      >
        <View style={mergedStyles.dropdownBox}>
          {/* Menu Header */}
          <View style={mergedStyles.menuHeader}>
            <Image source={FabriQLogo} style={mergedStyles.menuLogoImage} />
            <TouchableOpacity onPress={safeOnClose}>
              <X color="#333" size={24} />
            </TouchableOpacity>
          </View>

          {/* Navigation Items */}
          <View style={mergedStyles.navItemsList}>
            {/* HOME - Hide if already on Home */}
            {currentRoute !== 'Home' && (
              <TouchableOpacity 
                style={mergedStyles.navRow} 
                onPress={() => handleNavigation('Home')}
              >
                <ShoppingBag size={18} color="#6B5D4F" />
                <Text style={mergedStyles.navText}>HOME</Text>
              </TouchableOpacity>
            )}

            {/* COLLECTIONS */}
            {currentRoute !== 'Collection' && (
              <TouchableOpacity 
                style={mergedStyles.navRow} 
                onPress={() => handleNavigation('Collection')}
              >
                <ShoppingBag size={18} color="#6B5D4F" />
                <Text style={mergedStyles.navText}>COLLECTIONS</Text>
              </TouchableOpacity>
            )}

            {/* RENTALS (Protected) */}
            {currentRoute !== 'Rentals' && ( 
              <TouchableOpacity 
                style={mergedStyles.navRow} 
                onPress={() => handleNavigation('Rentals', true)} 
              > 
                <Calendar size={18} color="#6B5D4F" /> 
                <Text style={mergedStyles.navText}>RENTALS</Text> 
              </TouchableOpacity> 
            )} 

            {/* BESPOKE (Protected) */}
            {currentRoute !== 'Bespoke' && ( 
              <TouchableOpacity 
                style={mergedStyles.navRow} 
                onPress={() => handleNavigation('Bespoke', true)} 
              > 
                <Ruler size={18} color="#6B5D4F" /> 
                <Text style={mergedStyles.navText}>BESPOKE</Text> 
              </TouchableOpacity> 
            )} 

            {/* BOOK APPOINTMENT (Protected) - hide when already on Appointments */}
            {currentRoute !== 'Appointments' && (
              <TouchableOpacity 
                style={mergedStyles.navRow} 
                onPress={() => handleNavigation('Appointments', true)}
              >
                <Calendar size={18} color="#6B5D4F" />
                <Text style={mergedStyles.navText}>BOOK</Text>
              </TouchableOpacity>
            )}

            {/* PROFILE (Protected) */}
            {currentRoute !== 'Profile' && ( 
              <TouchableOpacity 
                style={mergedStyles.navRow} 
                onPress={() => handleNavigation('Profile', true)} 
              > 
                <User size={18} color="#6B5D4F" /> 
                <Text style={mergedStyles.navText}>PROFILE</Text> 
              </TouchableOpacity> 
            )} 

            {/* LOGOUT - Only show if logged in */}
            {isLoggedIn && (
              <TouchableOpacity 
                style={[mergedStyles.navRow, mergedStyles.logoutRow]} 
                onPress={() => {
                  safeOnClose();
                  safeOnLogout();
                }}
              >
                <X size={18} color="#D9534F" />
                <Text style={[mergedStyles.navText, mergedStyles.logoutText]}>LOGOUT</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const defaultStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
  },
  dropdownBox: {
    backgroundColor: '#FAF7F0',
    width: '75%',
    height: '100%',
    paddingTop: 60,
    paddingHorizontal: 20,
    borderRightWidth: 1,
    borderRightColor: '#E8DCC8',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DCC8',
  },
  menuLogo: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'serif',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  menuLogoImage: {
    height: 25,
    resizeMode: 'contain',
  },
  navItemsList: {
    gap: 0,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  navText: {
    marginLeft: 0,
    fontSize: 13,
    color: '#6B5D4F',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  logoutRow: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E8DCC8',
    borderBottomWidth: 0,
    paddingTop: 16,
    paddingBottom: 0,
  },
  logoutText: {
    color: '#D9534F',
    fontWeight: '700',
  },
});
