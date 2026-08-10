import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  Modal, SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, StyleSheet, Linking, Keyboard,
} from 'react-native';
import { X, Send, MessageCircle } from 'lucide-react-native';
import { sendChatMessage, getChatbotReply, getOrCreateGuestToken } from '../services/chatService';
import { sessionService } from '../services/sessionService';

const CONTACT_REPLY = 'please contact us through here';
const WELCOME_MESSAGE = {
  id: 'welcome',
  sender: 'admin',
  text: 'Hi there! Welcome to Hannah Vanessa. How can we help you today?',
  time: new Date(),
};

export default function ChatModal({ visible, onClose }) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [guestToken, setGuestToken] = useState('');
  const flatListRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const user = await sessionService.getCurrentUser();
      setCurrentUser(user);
      if (!user) {
        const token = await getOrCreateGuestToken();
        setGuestToken(token);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    const onKeyboardShow = () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    };
    const onKeyboardHide = () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };
    const showSub = Keyboard.addListener('keyboardDidShow', onKeyboardShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onKeyboardHide);
    return () => {
      showSub?.remove?.();
      hideSub?.remove?.();
    };
  }, []);

  const formatTime = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const isContactReply = (text) =>
    String(text || '').trim().toLowerCase() === CONTACT_REPLY;

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    Keyboard.dismiss();

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      time: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsSending(true);

    try {
      const customerId = currentUser?.id || currentUser?._id || null;
      const uid = String(customerId || guestToken || '').trim();
      const name = currentUser
        ? [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ').trim()
          || currentUser.email
          || 'Customer'
        : 'Guest Customer';

      const sendResult = await sendChatMessage({
        customerId,
        guestToken: customerId ? undefined : guestToken,
        uid,
        name,
        text,
      });

      const nextConvId = sendResult?.conversationId || conversationId;
      if (nextConvId) setConversationId(nextConvId);

      const replyResult = await getChatbotReply({
        conversationId: nextConvId,
        customerId,
        guestToken: customerId ? undefined : guestToken,
        uid,
        name,
        userQuery: text,
      });

      const replyText = replyResult?.message?.text || replyResult?.message?.chat || '';

      setMessages(prev => [...prev, {
        id: `bot-${Date.now()}`,
        sender: 'admin',
        text: replyText,
        time: new Date(),
      }]);

    } catch (err) {
      console.error('[Chat] Error:', err);
      setMessages(prev => [...prev, {
        id: `bot-${Date.now()}`,
        sender: 'admin',
        text: "Thank you for your message! Our team will get back to you shortly.",
        time: new Date(),
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    const isContact = !isUser && isContactReply(item.text);

    return (
      <View style={[
        styles.messageRow,
        { justifyContent: isUser ? 'flex-end' : 'flex-start' }
      ]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.adminBubble,
        ]}>
          {isContact ? (
            <Text style={styles.adminBubbleText}>
              Please contact us through{' '}
              <Text
                style={styles.contactLink}
                onPress={() => Linking.openURL('tel:09175931093')}
              >
                0917 593 1093
              </Text>
              {' '}or{' '}
              <Text
                style={styles.contactLink}
                onPress={() => Linking.openURL('mailto:hannahvanessaexclusive@gmail.com')}
              >
                email us
              </Text>
            </Text>
          ) : (
            <Text style={isUser ? styles.userBubbleText : styles.adminBubbleText}>
              {item.text}
            </Text>
          )}
          <Text style={[
            styles.messageTime,
            { color: isUser ? 'rgba(255,255,255,0.6)' : '#8A7763' }
          ]}>
            {formatTime(item.time)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
          >
            <View style={styles.container}>

              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.headerTitle}>Chat with us</Text>
                  <Text style={styles.headerSub}>
                    We usually reply within a few minutes
                  </Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                  <X size={20} color="#6B5D4F" />
                </TouchableOpacity>
              </View>

              {/* Messages */}
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() =>
                  flatListRef.current?.scrollToEnd({ animated: true })
                }
              />

              {/* Typing indicator */}
              {isSending && (
                <View style={styles.typingRow}>
                  <View style={styles.typingBubble}>
                    <ActivityIndicator size="small" color="#D4AF37" />
                    <Text style={styles.typingText}>Typing...</Text>
                  </View>
                </View>
              )}

              {/* Input */}
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Type your message..."
                  placeholderTextColor="#8A7763"
                  multiline={false}
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                  editable={!isSending}
                />
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    (!inputText.trim() || isSending) && styles.sendBtnDisabled
                  ]}
                  onPress={handleSend}
                  disabled={!inputText.trim() || isSending}
                >
                  <Send size={20} color="#fff" />
                </TouchableOpacity>
              </View>

            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    flex: 1,
    maxHeight: '85%',
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    backgroundColor: '#FFFDF9',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 400,
    borderWidth: 1,
    borderColor: '#E8DCC8',
    overflow: 'hidden',
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE3D0',
    backgroundColor: '#FFFDF9',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'serif',
    fontWeight: '300',
    color: '#1a1a1a',
  },
  headerSub: {
    fontSize: 9,
    color: '#8A7763',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5EEE2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Messages
  messagesList: {
    padding: 16,
    gap: 10,
    flexGrow: 1,
    backgroundColor: '#FAF7F0',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#1a1a1a',
    borderBottomRightRadius: 4,
  },
  adminBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E8DCC8',
  },
  userBubbleText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  adminBubbleText: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  contactLink: {
    color: '#D4AF37',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },

  // Typing
  typingRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#FAF7F0',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8DCC8',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  typingText: {
    fontSize: 13,
    color: '#8A7763',
    fontStyle: 'italic',
  },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFE3D0',
    backgroundColor: '#FFFDF9',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5EEE2',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
    maxHeight: 80,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
