import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { CreateAccountScreenProps } from '../../navigation/types';
import GradientButton from '../../components/ui/GradientButton';
import { useAppStore } from '../../store/appStore';
import { generateId } from '../../utils/helpers';
import { palette, gradients } from '../../theme/colors';
import { radii, spacing, shadows } from '../../theme/spacing';
import { fontFamilies, fontSize, fontWeight, textStyles } from '../../theme/typography';

export default function CreateAccountScreen({ navigation }: CreateAccountScreenProps) {
  const [name, setName] = useState('');
  const [focused, setFocused] = useState(false);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);

  const canProceed = name.trim().length >= 2;

  const handleContinue = () => {
    if (!canProceed) return;
    setCurrentUser({
      id: generateId(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
    });
    navigation.navigate('GenerateQR');
  };

  return (
    <LinearGradient colors={gradients.heroWash as any} style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inner}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back */}
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color={palette.purple900} />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.emoji}>✨</Text>
              <Text style={styles.title}>What should we{'\n'}call you?</Text>
              <Text style={styles.subtitle}>
                Just your first name is perfect. Your partner will see this.
              </Text>
            </View>

            {/* Input */}
            <View style={styles.inputSection}>
              <View style={[styles.inputWrap, focused && styles.inputFocused]}>
                <Ionicons name="person-outline" size={20} color={focused ? palette.pink500 : palette.gray400} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Your name"
                  placeholderTextColor={palette.gray400}
                  autoFocus
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
                  style={styles.input}
                  maxLength={30}
                />
                {name.length > 0 && (
                  <TouchableOpacity onPress={() => setName('')}>
                    <Ionicons name="close-circle" size={18} color={palette.gray400} />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.hint}>
                {name.length}/30
              </Text>
            </View>

            {/* Step indicator */}
            <View style={styles.steps}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.stepDot,
                    i === 0 && styles.stepDotActive,
                  ]}
                />
              ))}
            </View>

            {/* CTA */}
            <GradientButton
              label="Continue →"
              onPress={handleContinue}
              disabled={!canProceed}
              size="lg"
              fullWidth
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  inner: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing['5'],
    paddingBottom: spacing['8'],
    gap: spacing['6'],
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing['2'],
  },
  header: { gap: spacing['3'], alignItems: 'center', marginTop: spacing['8'] },
  emoji: { fontSize: 48 },
  title: {
    ...textStyles.displaySm,
    color: palette.purple900,
    textAlign: 'center',
  },
  subtitle: {
    ...textStyles.bodyMd,
    color: palette.gray500,
    textAlign: 'center',
    maxWidth: 260,
  },
  inputSection: { gap: spacing['2'] },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: radii.xl,
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['3'],
    borderWidth: 1.5,
    borderColor: palette.gray200,
    gap: spacing['3'],
    ...shadows.sm,
  },
  inputFocused: {
    borderColor: palette.pink400,
    ...shadows.md,
  },
  input: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.md,
    color: palette.purple900,
    fontWeight: fontWeight.medium,
  },
  hint: {
    ...textStyles.caption,
    color: palette.gray400,
    textAlign: 'right',
    paddingRight: spacing['1'],
  },
  steps: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing['2'],
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.gray200,
  },
  stepDotActive: {
    width: 24,
    backgroundColor: palette.pink500,
  },
});
