import { useState, useEffect, useCallback, useRef } from 'react';
import { sessionService } from '../services/sessionService';
import { notificationAPI } from '../services/notificationAPI';

/**
 * Hook for managing user notifications
 * Handles fetching, polling, and marking as read
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const pollIntervalRef = useRef(null);

  /**
   * Fetch notifications from API
   */
  const fetchNotifications = useCallback(async (showLoading = true) => {
    const session = await sessionService.getSession();
    
    if (!session?.isLoggedIn || !session?.token) {
      setIsLoggedIn(false);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setIsLoggedIn(true);
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const data = await notificationAPI.getMyNotifications(session.token);
      setNotifications(data || []);
      
      // Calculate unread count
      const unread = (data || []).filter(n => !n.readAt).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Failed to fetch notifications:', err.message);
      setError(err.message || 'Could not load notifications');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  /**
   * Refresh notifications manually
   */
  const refresh = useCallback(() => {
    return fetchNotifications(true);
  }, [fetchNotifications]);

  /**
   * Mark a notification as read
   * @param {Object} notification - Notification object to mark
   */
  const markAsRead = useCallback(async (notification) => {
    const session = await sessionService.getSession();
    if (!session?.token || notification.readAt) return;

    // Optimistic update
    const notificationId = notification.id || notification._id;
    setNotifications(prev => 
      prev.map(n => 
        (n.id || n._id) === notificationId 
          ? { ...n, readAt: new Date().toISOString() } 
          : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await notificationAPI.markNotificationRead(session.token, notificationId);
    } catch (err) {
      console.error('Failed to mark notification as read on server:', err.message);
      // Optional: Rollback on failure if needed, but usually not necessary for "read" status
    }
  }, []);

  /**
   * Set up initial fetch and polling
   */
  useEffect(() => {
    const init = async () => {
      const session = await sessionService.getSession();
      
      // Clear any existing interval first
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      if (session?.isLoggedIn && session?.token) {
        setIsLoggedIn(true);
        fetchNotifications(true);
        
        // Start polling every 30 seconds
        pollIntervalRef.current = setInterval(async () => {
          const currentSession = await sessionService.getSession();
          if (currentSession?.isLoggedIn && currentSession?.token) {
            fetchNotifications(false);
          } else {
            // Stop polling if logged out
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setIsLoggedIn(false);
            setNotifications([]);
            setUnreadCount(0);
          }
        }, 30000);
      } else {
        setIsLoggedIn(false);
        setNotifications([]);
        setUnreadCount(0);
      }
    };

    init();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchNotifications]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    refresh,
    isLoggedIn
  };
};
