import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { ChevronLeft, Bell } from 'lucide-react-native';
import { useNotifications } from '../hooks/useNotifications';

/**
 * Notifications Screen
 * Displays a list of user notifications with filtering and read/unread status
 */
export default function NotificationsScreen({ navigation }) {
  const { notifications, loading, error, markAsRead, refresh } = useNotifications();
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [expandedId, setExpandedId] = useState(null);

  /**
   * Filter notifications based on current tab
   */
  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter(n => !n.readAt);
    }
    return notifications;
  }, [notifications, filter]);

  /**
   * Handle notification card press
   */
  const handleNotificationPress = (notification) => {
    const id = notification.id || notification._id;
    
    // Toggle expansion
    setExpandedId(expandedId === id ? null : id);
    
    // Mark as read if it's currently unread
    if (!notification.readAt) {
      markAsRead(notification);
    }
  };

  /**
   * Render individual notification card
   */
  const renderItem = ({ item }) => {
    const id = item.id || item._id;
    const isUnread = !item.readAt;
    const isExpanded = expandedId === id;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isUnread ? styles.unreadCard : styles.readCard
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{item.title}</Text>
              {isUnread && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.metaRow}>
              {item.type.toUpperCase()} · {item.status}
            </Text>
          </View>
          
          <Text 
            style={styles.message}
            numberOfLines={isExpanded ? undefined : 2}
          >
            {item.message}
          </Text>

          {(item.location || item.date) && (
            <Text style={styles.metadata}>
              {item.date && `${item.dateType || 'Date'}: ${item.date} `}
              {item.time && `@ ${item.time} `}
              {item.location && `· ${item.location}`}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color="#1a1a1a" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} /> {/* Spacer for centering */}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, filter === 'all' && styles.activeTab]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.tabText, filter === 'all' && styles.activeTabText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filter === 'unread' && styles.activeTab]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.tabText, filter === 'unread' && styles.activeTabText]}>Unread</Text>
        </TouchableOpacity>
      </View>

      {/* List content */}
      {loading && notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1a1a1a" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Bell color="#E8DCC8" size={64} />
          <Text style={styles.emptyText}>
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id || item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onRefresh={refresh}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DCC8',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'serif',
    color: '#1a1a1a',
  },
  tabs: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8DCC8',
  },
  activeTab: {
    backgroundColor: '#1a1a1a',
    borderColor: '#1a1a1a',
  },
  tabText: {
    fontSize: 14,
    color: '#6B5D4F',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FAF7F0',
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DCC8',
  },
  unreadCard: {
    backgroundColor: '#FFF8F0',
  },
  readCard: {
    backgroundColor: '#FAF7F0',
  },
  cardHeader: {
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontFamily: 'serif',
    color: '#1a1a1a',
    fontWeight: 'bold',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D62828',
    marginLeft: 8,
  },
  metaRow: {
    fontSize: 11,
    color: '#9E9183',
    fontWeight: '500',
  },
  message: {
    fontSize: 13,
    color: '#6B5D4F',
    lineHeight: 18,
    marginBottom: 4,
  },
  metadata: {
    fontSize: 12,
    color: '#9E9183',
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    color: '#D62828',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  retryText: {
    color: '#FAF7F0',
    fontWeight: 'bold',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B5D4F',
    textAlign: 'center',
  },
});
