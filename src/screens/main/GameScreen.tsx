import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { GameScreenProps } from '../../navigation/types';
import { useGameStore } from '../../store/gameStore';
import { useAppStore } from '../../store/appStore';
import { getCategoryColor, getCategoryEmoji, getCategoryLabel, getTypeEmoji } from '../../utils/helpers';
import { getRandomCard } from '../../utils/todCards';
import type { TodCategory, TodType } from '../../types';
import { palette, gradients, light } from '../../theme/colors';
import { radii, spacing, shadows, layout } from '../../theme/spacing';
import { fontFamilies, fontSize, fontWeight, textStyles } from '../../theme/typography';

const { width, height } = Dimensions.get('window');

// ─── Category selection ───────────────────────────────────────────────────────
const CATEGORIES: Array<{ id: TodCategory; emoji: string; description: string }> = [
  { id: 'romantic', emoji: '💕', description: 'Deep, heartfelt questions and sweet dares' },
  { id: 'spicy', emoji: '🔥', description: 'A little bold, a lot of fun' },
  { id: 'fun', emoji: '🎉', description: 'Silly, playful, and guaranteed laughs' },
];

function CategoryPicker({ onSelect }: { onSelect: (cat: TodCategory) => void }) {
  return (
    <SafeAreaView style={styles.pickerSafe} edges={['top', 'bottom']}>
      <LinearGradient colors={gradients.heroWash as any} style={styles.pickerContainer}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerEmoji}>🎲</Text>
          <Text style={styles.pickerTitle}>Truth or Dare</Text>
          <Text style={styles.pickerSubtitle}>
            Pick a vibe. Take turns. Get closer.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>CHOOSE YOUR CATEGORY</Text>

        <View style={styles.categoryList}>
          {CATEGORIES.map((cat) => {
            const color = getCategoryColor(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => onSelect(cat.id)}
                activeOpacity={0.85}
                style={styles.categoryCard}
              >
                <View style={[styles.categoryIconWrap, { backgroundColor: color + '1A' }]}>
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                </View>
                <View style={styles.categoryText}>
                  <Text style={styles.categoryTitle}>{getCategoryLabel(cat.id)}</Text>
                  <Text style={styles.categoryDesc}>{cat.description}</Text>
                </View>
                <View style={[styles.categoryArrow, { backgroundColor: color + '20' }]}>
                  <Ionicons name="chevron-forward" size={16} color={color} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* How it works */}
        <View style={styles.howItWorks}>
          {[
            { icon: '🔄', text: 'Take turns picking Truth or Dare' },
            { icon: '🃏', text: 'Cards are synced with your partner' },
            { icon: '✅', text: 'Complete dares, answer truths' },
          ].map((step) => (
            <View key={step.text} style={styles.howStep}>
              <Text style={styles.howEmoji}>{step.icon}</Text>
              <Text style={styles.howText}>{step.text}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

// ─── Game card ────────────────────────────────────────────────────────────────
interface GameCardProps {
  category: TodCategory;
  type: TodType | null;
  content: string | null;
  isMyTurn: boolean;
  playerName: string;
  onSelectType: (type: TodType) => void;
  onComplete: () => void;
  onSkip: () => void;
  roundCount: number;
  completedRounds: number;
}

function GameCard({
  category, type, content, isMyTurn, playerName,
  onSelectType, onComplete, onSkip,
  roundCount, completedRounds,
}: GameCardProps) {
  const categoryColor = getCategoryColor(category);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = useState(false);

  const flipCard = () => {
    Animated.spring(flipAnim, { toValue: isFlipped ? 0 : 1, damping: 12, useNativeDriver: true }).start();
    setIsFlipped(!isFlipped);
  };

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  return (
    <View style={styles.gameContainer}>
      {/* Turn indicator */}
      <View style={styles.turnIndicator}>
        <LinearGradient
          colors={[categoryColor + '33', categoryColor + '11']}
          style={styles.turnBadge}
        >
          <Text style={[styles.turnText, { color: categoryColor }]}>
            {isMyTurn ? '⚡ Your turn!' : `⏳ ${playerName}'s turn`}
          </Text>
        </LinearGradient>
        {/* Progress */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{completedRounds} completed</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min((completedRounds / Math.max(roundCount, 1)) * 100, 100)}%`,
                  backgroundColor: categoryColor,
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Type selection or card */}
      {!type ? (
        <View style={styles.typeSelection}>
          <Text style={styles.chooseLabel}>Choose your challenge</Text>
          <View style={styles.typeRow}>
            {(['truth', 'dare'] as TodType[]).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => onSelectType(t)}
                activeOpacity={0.85}
                style={[styles.typeBtn, { borderColor: categoryColor }]}
                disabled={!isMyTurn}
              >
                <LinearGradient
                  colors={t === 'truth'
                    ? ['#EDE9FE', '#DDD6FE']
                    : [categoryColor + '22', categoryColor + '11']}
                  style={styles.typeBtnGrad}
                >
                  <Text style={styles.typeBtnEmoji}>{getTypeEmoji(t)}</Text>
                  <Text style={[styles.typeBtnLabel, { color: t === 'truth' ? palette.lavender700 : categoryColor }]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                  {!isMyTurn && <Text style={styles.waitLabel}>Waiting…</Text>}
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.cardArea}>
          {/* Category chip */}
          <View style={[styles.categoryChip, { backgroundColor: categoryColor + '20' }]}>
            <Text style={styles.chipEmoji}>{getCategoryEmoji(category)}</Text>
            <Text style={[styles.chipLabel, { color: categoryColor }]}>
              {getCategoryLabel(category)} · {type === 'truth' ? '💭 Truth' : '⚡ Dare'}
            </Text>
          </View>

          {/* Card */}
          <TouchableOpacity onPress={flipCard} activeOpacity={0.9} style={styles.cardFlipWrap}>
            <Animated.View style={[styles.cardFront, { transform: [{ rotateY: frontRotate }] }]}>
              <LinearGradient colors={gradients.ctaPanel as any} style={styles.flipCardFront}>
                <Text style={styles.flipHint}>Tap to reveal</Text>
                <Text style={styles.flipEmoji}>{type === 'truth' ? '💭' : '⚡'}</Text>
              </LinearGradient>
            </Animated.View>
            <Animated.View style={[styles.cardBack, { transform: [{ rotateY: backRotate }] }]}>
              <View style={styles.flipCardBack}>
                <Text style={styles.cardContent}>{content}</Text>
              </View>
            </Animated.View>
          </TouchableOpacity>

          {/* Actions */}
          {isFlipped && isMyTurn && (
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={onSkip} style={styles.skipBtn} activeOpacity={0.8}>
                <Ionicons name="refresh" size={16} color={palette.gray500} />
                <Text style={styles.skipBtnText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onComplete}
                style={[styles.doneBtn, { backgroundColor: categoryColor }]}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark" size={18} color={palette.white} />
                <Text style={styles.doneBtnText}>Done!</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function GameScreen({ navigation }: GameScreenProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  const partner = useAppStore((s) => s.partner);
  const {
    isActive, category, currentTurn, currentCard,
    roundCount, completedRounds,
    startGame, setCurrentCard, nextTurn, completeRound, endGame,
  } = useGameStore();

  const isMyTurn = currentTurn === 'user';
  const myName = currentUser?.name ?? 'You';
  const partnerName = partner?.name ?? 'Partner';

  if (!isActive || !category) {
    return <CategoryPicker onSelect={(cat) => startGame(cat)} />;
  }

  const handleSelectType = (type: TodType) => {
    const card = getRandomCard(category, type);
    setCurrentCard(card);
  };

  const handleComplete = () => {
    completeRound();
    nextTurn();
  };

  const handleSkip = () => {
    if (currentCard) {
      const newCard = getRandomCard(category, currentCard.type);
      setCurrentCard(newCard);
    }
  };

  return (
    <SafeAreaView style={styles.gameSafe} edges={['top']}>
      {/* Header */}
      <View style={styles.gameHeader}>
        <TouchableOpacity onPress={endGame} style={styles.gameBackBtn}>
          <Ionicons name="chevron-back" size={22} color={palette.purple900} />
        </TouchableOpacity>
        <View style={styles.gameHeaderCenter}>
          <Text style={styles.gameHeaderTitle}>
            {getCategoryEmoji(category)} {getCategoryLabel(category)}
          </Text>
        </View>
        <TouchableOpacity onPress={endGame} style={styles.gameEndBtn}>
          <Text style={styles.gameEndText}>End</Text>
        </TouchableOpacity>
      </View>

      <GameCard
        category={category}
        type={currentCard?.type ?? null}
        content={currentCard?.content ?? null}
        isMyTurn={isMyTurn}
        playerName={partnerName}
        onSelectType={handleSelectType}
        onComplete={handleComplete}
        onSkip={handleSkip}
        roundCount={roundCount}
        completedRounds={completedRounds}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Category picker
  pickerSafe: { flex: 1 },
  pickerContainer: { flex: 1 },
  pickerHeader: {
    alignItems: 'center',
    paddingTop: spacing['8'],
    paddingBottom: spacing['5'],
    paddingHorizontal: layout.screenPaddingH,
    gap: spacing['2'],
  },
  pickerEmoji: { fontSize: 52 },
  pickerTitle: { ...textStyles.displaySm, color: palette.purple900, textAlign: 'center' },
  pickerSubtitle: { ...textStyles.bodyMd, color: palette.gray500, textAlign: 'center' },
  sectionLabel: {
    ...textStyles.labelSm,
    color: palette.pink500,
    paddingHorizontal: layout.screenPaddingH,
    marginBottom: spacing['3'],
  },
  categoryList: {
    paddingHorizontal: layout.screenPaddingH,
    gap: spacing['3'],
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: radii['2xl'],
    padding: spacing['4'],
    gap: spacing['4'],
    ...shadows.sm,
  },
  categoryIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmoji: { fontSize: 26 },
  categoryText: { flex: 1, gap: spacing['1'] },
  categoryTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: palette.purple900,
  },
  categoryDesc: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    color: palette.gray500,
    lineHeight: fontSize.sm * 1.4,
  },
  categoryArrow: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howItWorks: {
    marginTop: spacing['6'],
    paddingHorizontal: layout.screenPaddingH,
    gap: spacing['3'],
  },
  howStep: { flexDirection: 'row', alignItems: 'center', gap: spacing['3'] },
  howEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  howText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    color: palette.gray600,
    flex: 1,
  },
  // Game screen
  gameSafe: { flex: 1, backgroundColor: light.bgPrimary },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: spacing['3'],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: light.borderLight,
  },
  gameBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameHeaderCenter: { flex: 1, alignItems: 'center' },
  gameHeaderTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: palette.purple900,
  },
  gameEndBtn: {
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['2'],
    borderRadius: radii.lg,
    backgroundColor: '#FEE2E2',
  },
  gameEndText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: palette.error,
  },
  gameContainer: {
    flex: 1,
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing['5'],
    gap: spacing['5'],
  },
  // Turn indicator
  turnIndicator: { gap: spacing['3'] },
  turnBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['2'],
    borderRadius: radii.full,
  },
  turnText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing['3'] },
  progressText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    color: palette.gray400,
    minWidth: 80,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: palette.gray200,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  // Type selection
  typeSelection: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing['6'] },
  chooseLabel: {
    ...textStyles.h2,
    color: palette.purple900,
    textAlign: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing['4'],
    width: '100%',
  },
  typeBtn: {
    flex: 1,
    borderRadius: radii['2xl'],
    borderWidth: 2,
    overflow: 'hidden',
  },
  typeBtnGrad: {
    alignItems: 'center',
    paddingVertical: spacing['8'],
    gap: spacing['3'],
  },
  typeBtnEmoji: { fontSize: 40 },
  typeBtnLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  waitLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    color: palette.gray400,
  },
  // Card area
  cardArea: {
    flex: 1,
    gap: spacing['4'],
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    alignSelf: 'flex-start',
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['2'],
    borderRadius: radii.full,
  },
  chipEmoji: { fontSize: 16 },
  chipLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  cardFlipWrap: {
    flex: 1,
    maxHeight: 320,
    position: 'relative',
    alignSelf: 'stretch',
  },
  cardFront: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: 'hidden',
  },
  cardBack: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: 'hidden',
  },
  flipCardFront: {
    flex: 1,
    borderRadius: radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['4'],
    ...shadows.brand,
  },
  flipHint: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.8)',
  },
  flipEmoji: { fontSize: 64 },
  flipCardBack: {
    flex: 1,
    borderRadius: radii['3xl'],
    backgroundColor: palette.white,
    padding: spacing['8'],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
    borderWidth: 1,
    borderColor: light.borderLight,
  },
  cardContent: {
    fontFamily: fontFamilies.serif,
    fontSize: fontSize.lg,
    color: palette.purple900,
    textAlign: 'center',
    lineHeight: fontSize.lg * 1.6,
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing['3'],
    paddingBottom: layout.tabBarHeight + spacing['4'],
  },
  skipBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2'],
    paddingVertical: spacing['4'],
    borderRadius: radii['2xl'],
    backgroundColor: light.bgMuted,
    borderWidth: 1,
    borderColor: light.borderLight,
  },
  skipBtnText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.base,
    color: palette.gray500,
    fontWeight: fontWeight.medium,
  },
  doneBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2'],
    paddingVertical: spacing['4'],
    borderRadius: radii['2xl'],
    ...shadows.md,
  },
  doneBtnText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.md,
    color: palette.white,
    fontWeight: fontWeight.bold,
  },
});
