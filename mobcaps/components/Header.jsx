import React from 'react'; 
import { View, TouchableOpacity, Image, StyleSheet, Text } from 'react-native'; 
import { Menu, Bell } from 'lucide-react-native'; 
import FabriQLogo from '../assets/FabriQLogo.png'; 
 
export default function Header({ navigation, onMenuPress, unreadCount = 0, onBellPress, isLoggedIn = false }) { 
  return ( 
    <View style={styles.header}> 
      <View style={styles.logoWrapper}> 
        <TouchableOpacity onPress={() => navigation.navigate('Home')}> 
          <Image source={FabriQLogo} style={styles.logoImage} /> 
        </TouchableOpacity> 
      </View> 
      <View style={styles.rightRow}> 
        {isLoggedIn && onBellPress && ( 
          <TouchableOpacity style={styles.bellBtn} onPress={onBellPress}> 
            <Bell color="#333" size={24} /> 
            {unreadCount > 0 && ( 
              <View style={styles.badge}> 
                <Text style={styles.badgeText}> 
                  {unreadCount > 99 ? '99+' : String(unreadCount)} 
                </Text> 
              </View> 
            )} 
          </TouchableOpacity> 
        )} 
        <TouchableOpacity onPress={onMenuPress}> 
          <Menu color="#333" size={28} /> 
        </TouchableOpacity> 
      </View> 
    </View> 
  ); 
} 
 
const styles = StyleSheet.create({ 
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E8E4D9', 
  }, 
  logoWrapper: { 
    flex: 1, 
    alignItems: 'flex-start', 
  }, 
  logoImage: { 
    height: 35, 
    resizeMode: 'contain', 
  }, 
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, 
  bellBtn: { position: 'relative', width: 36, height: 36, justifyContent: 'center', alignItems: 'center' }, 
  badge: { position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#DC2626', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 }, 
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' }, 
}); 
