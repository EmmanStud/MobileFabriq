import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from './apiConfig';

const GUEST_TOKEN_KEY = 'fabriq_chat_guest_token';

export const getOrCreateGuestToken = async () => {
  try {
    let token = await AsyncStorage.getItem(GUEST_TOKEN_KEY);
    if (!token) {
      token = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      await AsyncStorage.setItem(GUEST_TOKEN_KEY, token);
    }
    return token;
  } catch {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
};

export const sendChatMessage = async ({ customerId, guestToken, uid, name, text }) => {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const date = now.toISOString().slice(0, 10);

  const payload = {
    chat: text,
    text,
    time,
    date,
    sender: 'customer',
    ...(uid && { uid }),
    ...(name && { name }),
    ...(customerId ? { customerId } : { guestToken }),
  };

  const response = await fetch(`${API_CONFIG.BASE_URL}/chat-messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error('Failed to send message');
  return response.json();
};

export const getChatbotReply = async ({ conversationId, customerId, guestToken, uid, name, userQuery }) => {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const date = now.toISOString().slice(0, 10);

  const payload = {
    conversationId,
    userQuery,
    time,
    date,
    ...(uid && { uid }),
    ...(name && { name }),
    ...(customerId ? { customerId } : { guestToken }),
  };

  const response = await fetch(`${API_CONFIG.BASE_URL}/chat-messages/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error('Failed to get reply');
  return response.json();
};
