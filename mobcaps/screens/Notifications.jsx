import React, { useState, useEffect, useCallback } from 'react'; 
import { 
  View, Text, ScrollView, TouchableOpacity, 
  StyleSheet, SafeAreaView, ActivityIndicator, 
  RefreshControl, StatusBar, 
} from 'react-native'; 
import { Bell, Package, Calendar, Scissors, CheckCircle, ChevronRight } from 'lucide-react-native'; 
import { sessionService } from '../services/sessionService'; 
import { mongodbService } from '../services/mongodbService'; 
 
function getTypeIcon(type) { 
  switch ((type || '').toLowerCase()) { 
    case 'rental':      return <Package size={18} color="#D4AF37" />; 
    case 'appointment': return <Calendar size={18} color="#3B82F6" />; 
    case 'bespoke':     return <Scissors size={18} color="#8B5CF6" />; 
    default:            return <Bell size={18} color="#6B5D4F" />; 
  } 
} 
 
function getTypeBgColor(type) { 
  switch ((type || '').toLowerCase()) { 
    case 'rental':      return '#FEF9EC'; 
    case 'appointment': return '#EFF6FF'; 
    case 'bespoke':     return '#F5F3FF'; 
    default:            return '#FAF7F0'; 
  } 
} 
 
function getTypeBorderColor(type) { 
  switch ((type || '').toLowerCase()) { 
    case 'rental':      return '#FDE68A'; 
    case 'appointment': return '#BFDBFE'; 
    case 'bespoke':     return '#DDD6FE'; 
    default:            return '#E8DCC8'; 
  } 
} 
 
function formatTimestamp(createdAt) { 
  if (!createdAt) return ''; 
  const parsed = new Date(createdAt); 
  if (isNaN(parsed.getTime())) return ''; 
  const now = new Date(); 
  const diffMs = now - parsed; 
  const diffMins = Math.floor(diffMs / 60000); 
  const diffHours = Math.floor(diffMs / 3600000); 
  const diffDays = Math.floor(diffMs / 86400000); 
  if (diffMins < 1) return 'Just now'; 
  if (diffMins < 60) return `${diffMins}m ago`; 
  if (diffHours < 24) return `${diffHours}h ago`; 
  if (diffDays < 7) return `${diffDays}d ago`; 
  return parsed.toLocaleDateString(); 
} 
 
export default function Notifications({ navigation }) { 
  const [notifications, setNotifications] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [refreshing, setRefreshing] = useState(false); 
  const [filter, setFilter] = useState('all'); 
  const [authToken, setAuthToken] = useState(null); 
  const [error, setError] = useState(''); 
 
  const loadNotifications = useCallback(async (token, showLoader = true) => { 
    if (showLoader) setLoading(true); 
    setError(''); 
    try { 
      const data = await mongodbService.getMyNotifications(token); 
      setNotifications(Array.isArray(data) ? data : []); 
    } catch (err) { 
      setError('Failed to load notifications.'); 
    } finally { 
      setLoading(false); 
      setRefreshing(false); 
    } 
  }, []); 
 
  useEffect(() => { 
    const init = async () => { 
      try { 
        const session = await sessionService.getSession(); 
        if (!session?.token) { navigation.navigate('Home'); return; } 
        setAuthToken(session.token); 
        await loadNotifications(session.token); 
      } catch (err) { 
        setLoading(false); 
      } 
    }; 
    init(); 
  }, []); 
 
  const handleRefresh = async () => { 
    setRefreshing(true); 
    if (authToken) await loadNotifications(authToken, false); 
    setRefreshing(false); 
  }; 
 
  const handleMarkRead = async (notification) => { 
    if (notification.readAt) return; 
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n) 
    ); 
    try { 
      await mongodbService.markNotificationRead(notification.id, authToken); 
    } catch (err) { 
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, readAt: null } : n) 
      ); 
    } 
  }; 
 
  const handleNotificationPress = async (notification) => { 
    await handleMarkRead(notification); 
    switch ((notification.type || '').toLowerCase()) { 
      case 'rental':      navigation.navigate('Rentals'); break; 
      case 'appointment': navigation.navigate('Appointments'); break; 
      case 'bespoke':     navigation.navigate('Bespoke'); break; 
      default: break; 
    } 
  }; 
 
  const filtered = filter === 'unread' ? notifications.filter(n => !n.readAt) : notifications; 
  const unreadCount = notifications.filter(n => !n.readAt).length; 
 
  return ( 
    <SafeAreaView style={styles.container}> 
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" /> 
       
      <View style={styles.header}> 
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}> 
          <Text style={styles.backBtnText}>←</Text> 
        </TouchableOpacity> 
        <View> 
          <Text style={styles.headerTitle}>Notifications</Text> 
          {unreadCount > 0 && <Text style={styles.headerSub}>{unreadCount} unread</Text>} 
        </View> 
      </View> 
 
      <View style={styles.filterRow}> 
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]} 
          onPress={() => setFilter('all')}> 
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}> 
            All ({notifications.length}) 
          </Text> 
        </TouchableOpacity> 
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]} 
          onPress={() => setFilter('unread')}> 
          <Text style={[styles.filterTabText, filter === 'unread' && styles.filterTabTextActive]}> 
            Unread ({unreadCount}) 
          </Text> 
        </TouchableOpacity> 
      </View> 
 
      {loading ? ( 
        <View style={styles.centerBox}> 
          <ActivityIndicator size="large" color="#1a1a1a" /> 
          <Text style={styles.loadingText}>Loading notifications...</Text> 
        </View> 
      ) : error ? ( 
        <View style={styles.centerBox}> 
          <Text style={styles.errorText}>{error}</Text> 
          <TouchableOpacity style={styles.retryBtn} onPress={() => authToken && loadNotifications(authToken)}> 
            <Text style={styles.retryBtnText}>Retry</Text> 
          </TouchableOpacity> 
        </View> 
      ) : filtered.length === 0 ? ( 
        <View style={styles.centerBox}> 
          <Bell size={48} color="#E8DCC8" /> 
          <Text style={styles.emptyTitle}> 
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'} 
          </Text> 
          <Text style={styles.emptySubtitle}> 
            {filter === 'unread' ? 'All caught up! Switch to All to see past notifications.' : 'Notifications about your rentals, appointments, and orders will appear here.'} 
          </Text> 
          {filter === 'unread' && ( 
            <TouchableOpacity style={styles.retryBtn} onPress={() => setFilter('all')}> 
              <Text style={styles.retryBtnText}>View All</Text> 
            </TouchableOpacity> 
          )} 
        </View> 
      ) : ( 
        <ScrollView  
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />} 
          contentContainerStyle={{ padding: 16 }}> 
          {filtered.map((notification) => ( 
            <TouchableOpacity  
              key={notification.id}  
              onPress={() => handleNotificationPress(notification)} activeOpacity={0.85} 
              style={[ 
                styles.notifCard,  
                { backgroundColor: notification.readAt ? '#fff' : '#FFF8F0', borderColor: notification.readAt ? '#E8DCC8' : '#D4AF37' } 
              ]}> 
              {!notification.readAt && <View style={styles.unreadDot} />} 
              <View style={[styles.notifIconBox, { backgroundColor: getTypeBgColor(notification.type), borderColor: getTypeBorderColor(notification.type) }]}> 
                {getTypeIcon(notification.type)} 
              </View> 
               
              <View style={{ flex: 1 }}> 
                <View style={styles.notifTitleRow}> 
                  <Text style={styles.notifTitle} numberOfLines={1}>{notification.title}</Text> 
                  <Text style={styles.notifTime}>{formatTimestamp(notification.createdAt)}</Text> 
                </View> 
                 
                <Text style={styles.notifMessage}>{notification.message}</Text> 
                 
                <View style={styles.notifDetailsRow}> 
                  {notification.itemLabel ? <Text style={styles.notifDetail}>👗 {notification.itemLabel}</Text> : null} 
                  {notification.date ? <Text style={styles.notifDetail}>📅 {notification.date}{notification.time ? ` at ${notification.time}` : ''}</Text> : null} 
                  {notification.location ? <Text style={styles.notifDetail}>📍 {notification.location}</Text> : null} 
                </View> 
                 
                <View style={styles.notifFooter}> 
                  <View style={[styles.typeBadge, { backgroundColor: getTypeBgColor(notification.type) }]}> 
                    <Text style={styles.typeBadgeText}> 
                      {(notification.type || '').toUpperCase()} 
                    </Text> 
                  </View> 
                   
                  {notification.readAt ? ( 
                    <View style={styles.readBadge}> 
                      <CheckCircle size={12} color="#6B5D4F" /> 
                      <Text style={styles.readBadgeText}>Read</Text> 
                    </View> 
                  ) : ( 
                    <Text style={styles.tapToReadText}>Tap to mark as read</Text> 
                  )} 
                </View> 
              </View> 
              <ChevronRight size={16} color="#E8DCC8" style={{ marginLeft: 8, marginTop: 4 }} /> 
            </TouchableOpacity> 
          ))} 
        </ScrollView> 
      )} 
    </SafeAreaView> 
  ); 
} 
 
const styles = StyleSheet.create({ 
  container: { flex: 1, backgroundColor: '#FAF7F0' }, 
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E8DCC8' }, 
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 8 }, 
  backBtnText: { fontSize: 24, color: '#1a1a1a' }, 
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' }, 
  headerSub: { fontSize: 12, color: '#D4AF37', fontWeight: '600', marginTop: 2 }, 
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E8DCC8', gap: 8 }, 
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E8DCC8', backgroundColor: '#fff' }, 
  filterTabActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' }, 
  filterTabText: { fontSize: 13, fontWeight: '600', color: '#6B5D4F' }, 
  filterTabTextActive: { color: '#fff' }, 
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }, 
  loadingText: { marginTop: 12, color: '#6B5D4F', fontSize: 14 }, 
  errorText: { color: '#DC2626', fontSize: 14, textAlign: 'center', marginBottom: 12 }, 
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginTop: 16, textAlign: 'center' }, 
  emptySubtitle: { fontSize: 13, color: '#6B5D4F', marginTop: 8, textAlign: 'center', lineHeight: 20 }, 
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#1a1a1a', borderRadius: 20 }, 
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 }, 
  notifCard: { borderRadius: 12, borderLeftWidth: 4, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', position: 'relative', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }, 
  unreadDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#D4AF37' }, 
  notifIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#E8DCC8' }, 
  notifTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }, 
  notifTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', flex: 1, marginRight: 8 }, 
  notifTime: { fontSize: 11, color: '#6B5D4F' }, 
  notifMessage: { fontSize: 13, color: '#4B4B4B', lineHeight: 18, marginBottom: 8 }, 
  notifDetailsRow: { gap: 2, marginBottom: 8 }, 
  notifDetail: { fontSize: 11, color: '#6B5D4F' }, 
  notifFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, 
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }, 
  typeBadgeText: { fontSize: 10, fontWeight: '700', color: '#4B4B4B' }, 
  readBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 }, 
  readBadgeText: { fontSize: 11, color: '#6B5D4F' }, 
  tapToReadText: { fontSize: 11, color: '#D4AF37', fontWeight: '600' }, 
}); 
