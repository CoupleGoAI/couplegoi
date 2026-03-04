import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ChatScreenProps } from '../../navigation/types';
import Avatar from '../../components/ui/Avatar';
import { useChatStore } from '../../store/chatStore';
import { useAppStore } from '../../store/appStore';
import { generateId, formatTimestamp } from '../../utils/helpers';
import type { Message } from '../../types';
import { palette, gradients, light } from '../../theme/colors';
import { radii, spacing, shadows, layout } from '../../theme/spacing';
import { fontFamilies, fontSize, fontWeight, textStyles } from '../../theme/typography';

const { width } = Dimensions.get('window');
const MAX_BUBBLE_WIDTH = width * 0.72;

// ─── Message bubble ──────────────────────────────────────────────────────────
interface BubbleProps {
  message: Message;
  onLongPress: (message: Message) => void;
  myName: string;
  partnerName: string;
}

function MessageBubble({ message, onLongPress, myName, partnerName }: BubbleProps) {
  const isUser = message.role === 'user';
  const isAi = message.role === 'ai';
  const isPartner = message.role === 'partner';

  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  React.useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, damping: 14, useNativeDriver: true }).start();
  }, []);

  if (isAi) {
    return (
      <Animated.View style={[styles.aiRow, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.aiAvatarWrap}>
          <LinearGradient colors={gradients.brand as any} style={styles.aiAvatar}>
            <Text style={styles.aiAvatarEmoji}>✨</Text>
          </LinearGradient>
        </View>
        <View style={[styles.aiBubble]}>
          <Text style={styles.aiSenderLabel}>CoupleGoAI</Text>
          <Text style={styles.aiText}>{message.content}</Text>
          <Text style={styles.timestamp}>{formatTimestamp(message.timestamp)}</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.bubbleRow,
        isUser ? styles.bubbleRowRight : styles.bubbleRowLeft,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      {!isUser && (
        <Avatar name={partnerName} size="xs" gradient={false} style={styles.partnerAvatar} />
      )}
      <View>
        {!isUser && (
          <Text style={styles.senderLabel}>{partnerName}</Text>
        )}
        <TouchableOpacity
          onLongPress={() => onLongPress(message)}
          activeOpacity={0.85}
          style={styles.bubbleTouchable}
        >
          {isUser ? (
            <LinearGradient
              colors={gradients.brand as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.bubble, styles.userBubble]}
            >
              <Text style={styles.userBubbleText}>{message.content}</Text>
              {message.isEdited && <Text style={styles.editedLabel}>edited</Text>}
            </LinearGradient>
          ) : (
            <View style={[styles.bubble, styles.partnerBubble]}>
              <Text style={styles.partnerBubbleText}>{message.content}</Text>
              {message.isEdited && <Text style={styles.editedLabelDark}>edited</Text>}
            </View>
          )}
        </TouchableOpacity>
        <Text style={[styles.timestamp, isUser ? styles.timestampRight : styles.timestampLeft]}>
          {formatTimestamp(message.timestamp)}
          {isUser && message.status === 'read' && (
            <Text style={styles.readReceipt}> ✓✓</Text>
          )}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Typing indicator ────────────────────────────────────────────────────────
function TypingIndicator({ name }: { name: string }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );
    Animated.parallel([animateDot(dot1, 0), animateDot(dot2, 200), animateDot(dot3, 400)]).start();
  }, []);

  return (
    <View style={styles.typingRow}>
      <View style={styles.typingBubble}>
        <Text style={styles.typingName}>{name} is typing</Text>
        <View style={styles.dots}>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.View
              key={i}
              style={[styles.dot, { transform: [{ translateY: dot }] }]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function ChatScreen({ navigation }: ChatScreenProps) {
  const [inputText, setInputText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const currentUser = useAppStore((s) => s.currentUser);
  const partner = useAppStore((s) => s.partner);
  const { messages, isTyping, isPartnerTyping, addMessage, updateMessage, setTyping } = useChatStore();

  const myName = currentUser?.name ?? 'You';
  const partnerName = partner?.name ?? 'Partner';

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    if (editingId) {
      updateMessage(editingId, { content: text, isEdited: true });
      setEditingId(null);
    } else {
      const newMsg: Message = {
        id: generateId(),
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
        status: 'sent',
      };
      addMessage(newMsg);

      // Simulate AI response
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        addMessage({
          id: generateId(),
          role: 'ai',
          content: getAiResponse(text),
          timestamp: new Date().toISOString(),
          status: 'delivered',
        });
      }, 1800);
    }
    setInputText('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [inputText, editingId]);

  const handleLongPress = useCallback((message: Message) => {
    if (message.role !== 'user') return;
    Alert.alert('Message options', undefined, [
      {
        text: 'Edit',
        onPress: () => {
          setEditingId(message.id);
          setInputText(message.content);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => useChatStore.getState().deleteMessage(message.id),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, []);

  const AI_SUGGESTIONS = [
    'Plan a date for us 🗓️',
    'Help us communicate better 💬',
    'Give us a fun challenge 🎯',
    'How are we doing? 💕',
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <LinearGradient colors={gradients.brand as any} style={styles.aiBadge}>
            <Text style={{ fontSize: 18 }}>✨</Text>
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle}>AI Chat</Text>
            <Text style={styles.headerSub}>
              {partner ? `You, ${partnerName} & AI` : 'Just you & AI for now'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="ellipsis-horizontal" size={20} color={palette.gray600} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* ── Messages ── */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              onLongPress={handleLongPress}
              myName={myName}
              partnerName={partnerName}
            />
          )}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={
            isTyping || isPartnerTyping ? (
              <TypingIndicator name={isTyping ? 'AI' : partnerName} />
            ) : null
          }
        />

        {/* ── AI suggestion chips ── */}
        {inputText.length === 0 && !editingId && (
          <View style={styles.suggestionsWrap}>
            <FlatList
              data={AI_SUGGESTIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionChip}
                  onPress={() => setInputText(item.replace(/\s[^\s]+$/, '').trim())}
                  activeOpacity={0.8}
                >
                  <Text style={styles.suggestionChipText}>{item}</Text>
                </TouchableOpacity>
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: layout.screenPaddingH, gap: spacing['2'] }}
            />
          </View>
        )}

        {/* ── Input bar ── */}
        <View style={[styles.inputBar, inputFocused && styles.inputBarFocused]}>
          {editingId && (
            <View style={styles.editingBanner}>
              <Ionicons name="pencil" size={14} color={palette.pink500} />
              <Text style={styles.editingText}>Editing message</Text>
              <TouchableOpacity onPress={() => { setEditingId(null); setInputText(''); }}>
                <Ionicons name="close" size={16} color={palette.gray500} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Message your AI guide…"
              placeholderTextColor={palette.gray400}
              style={styles.input}
              multiline
              maxLength={500}
              returnKeyType="default"
            />
            <TouchableOpacity
              style={[styles.sendBtn, inputText.trim().length > 0 && styles.sendBtnActive]}
              onPress={handleSend}
              disabled={inputText.trim().length === 0}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={inputText.trim().length > 0 ? palette.white : palette.gray400}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getAiResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes('date')) {
    return '🗓️ Date idea incoming! How about a "no phones" evening — cook together, light some candles, and pick a movie neither of you has seen. Simple, intentional, and memorable.';
  }
  if (lower.includes('communicat') || lower.includes('talk') || lower.includes('fight')) {
    return '💬 Communication tip: Try the "I feel…" framework. Instead of "You always do X," try "I feel Y when Z happens." It removes blame and opens real conversation.';
  }
  if (lower.includes('challenge') || lower.includes('game')) {
    return '🎯 Challenge: For the next 24 hours, every time you catch your partner doing something kind — no matter how small — say it out loud. Watch what happens. 💕';
  }
  return '💕 I hear you both. Want to explore that more? Sometimes just naming what you\'re feeling is the first step. What\'s one thing you wish your partner understood about you right now?';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: light.bgPrimary },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: spacing['3'],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: light.borderLight,
    backgroundColor: light.bgPrimary,
  },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing['3'] },
  aiBadge: {
    width: 40,
    height: 40,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: palette.purple900,
  },
  headerSub: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    color: palette.gray500,
  },
  headerAction: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.xl,
    backgroundColor: light.bgMuted,
  },
  // Messages
  messageList: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing['4'],
    paddingBottom: spacing['4'],
    gap: spacing['3'],
  },
  // AI bubble
  aiRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing['2'],
    maxWidth: MAX_BUBBLE_WIDTH + 44,
  },
  aiAvatarWrap: {},
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatarEmoji: { fontSize: 16 },
  aiBubble: {
    flex: 1,
    backgroundColor: light.bgCard,
    borderRadius: radii['2xl'],
    borderBottomLeftRadius: radii.sm,
    padding: spacing['4'],
    gap: spacing['1'],
    ...shadows.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: light.borderLight,
  },
  aiSenderLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: palette.pink500,
    letterSpacing: 0.5,
  },
  aiText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.base,
    color: palette.purple900,
    lineHeight: fontSize.base * 1.6,
  },
  // User / partner bubble
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing['2'],
  },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  partnerAvatar: { marginBottom: spacing['4'] },
  senderLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    color: palette.gray400,
    marginBottom: spacing['1'],
    marginLeft: spacing['2'],
  },
  bubbleTouchable: {},
  bubble: {
    maxWidth: MAX_BUBBLE_WIDTH,
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['3'],
    gap: spacing['1'],
  },
  userBubble: {
    borderRadius: radii['2xl'],
    borderBottomRightRadius: radii.sm,
  },
  partnerBubble: {
    backgroundColor: palette.white,
    borderRadius: radii['2xl'],
    borderBottomLeftRadius: radii.sm,
    ...shadows.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: light.borderLight,
  },
  userBubbleText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.base,
    color: palette.white,
    lineHeight: fontSize.base * 1.5,
  },
  partnerBubbleText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.base,
    color: palette.purple900,
    lineHeight: fontSize.base * 1.5,
  },
  editedLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.6)',
  },
  editedLabelDark: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    color: palette.gray400,
  },
  timestamp: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    color: palette.gray400,
    marginTop: spacing['0.5'],
  },
  timestampRight: { textAlign: 'right', marginRight: spacing['2'] },
  timestampLeft: { marginLeft: spacing['2'] },
  readReceipt: { color: palette.pink400 },
  // Typing indicator
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    paddingLeft: spacing['2'],
    paddingTop: spacing['2'],
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: light.bgCard,
    borderRadius: radii['2xl'],
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['3'],
    gap: spacing['2'],
    ...shadows.sm,
  },
  typingName: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    color: palette.gray400,
  },
  dots: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.pink400 },
  // Suggestions
  suggestionsWrap: { paddingVertical: spacing['2'] },
  suggestionChip: {
    backgroundColor: palette.lavender100,
    borderRadius: radii.full,
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['2'],
    borderWidth: 1,
    borderColor: palette.lavender200,
  },
  suggestionChipText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    color: palette.lavender700,
    fontWeight: fontWeight.medium,
  },
  // Input bar
  inputBar: {
    backgroundColor: light.bgSecondary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: light.borderLight,
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing['2'],
    paddingBottom: Platform.OS === 'ios' ? spacing['8'] : spacing['3'],
    gap: spacing['2'],
  },
  inputBarFocused: {
    ...shadows.md,
  },
  editingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    paddingVertical: spacing['1'],
  },
  editingText: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    color: palette.pink500,
    fontWeight: fontWeight.medium,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing['3'],
    backgroundColor: light.bgMuted,
    borderRadius: radii['2xl'],
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['2'],
  },
  input: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.base,
    color: palette.purple900,
    maxHeight: 100,
    paddingTop: Platform.OS === 'ios' ? spacing['2'] : 0,
    paddingBottom: Platform.OS === 'ios' ? spacing['2'] : 0,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: light.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? spacing['1'] : 0,
  },
  sendBtnActive: {
    backgroundColor: palette.pink500,
    ...shadows.brand,
  },
});
