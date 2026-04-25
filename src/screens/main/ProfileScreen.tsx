import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    ScrollView,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import GradientButton from '@components/ui/GradientButton';
import { useProfile } from '@hooks/useProfile';
import { useAuthStore } from '@store/authStore';
import { exportData } from '@data/profileApi';
import type { ProfileScreenProps } from '@navigation/types';
import { HelpFocusChips } from '@screens/main/profile/HelpFocusChips';
import {
    validateName,
    validateBirthDate,
    validateDatingStartDate,
    validateDatingAfterBirth,
} from '@screens/main/profile/validation';
import {
    HeaderRow,
    AvatarCircle,
    FormSection,
    ErrorBanner,
    DateFieldRow,
    styles,
} from '@screens/main/profile/ProfileFormComponents';
import { useAuth } from '@hooks/useAuth';
import { colors, gradients } from '@/theme/tokens';

const MIN_AGE_YEARS = 13;

function parseDateStr(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
}

function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getMaxBirthDate(): Date {
    const d = new Date();
    d.setFullYear(d.getFullYear() - MIN_AGE_YEARS);
    return d;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps): React.ReactElement {
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const { isSaving, isUploading, error, saveProfile, uploadAvatar } = useProfile();
    const { signOut } = useAuth();

    const [name, setName] = useState(user?.name ?? '');
    const [birthDateValue, setBirthDateValue] = useState<Date | null>(parseDateStr(user?.birthDate));
    const [birthDateStr, setBirthDateStr] = useState(user?.birthDate ?? '');
    const [showBirthPicker, setShowBirthPicker] = useState(false);

    const [helpFocus, setHelpFocus] = useState(user?.helpFocus ?? '');

    const [datingDateValue, setDatingDateValue] = useState<Date | null>(parseDateStr(user?.datingStartDate));
    const [datingDateStr, setDatingDateStr] = useState(user?.datingStartDate ?? '');
    const [showDatingPicker, setShowDatingPicker] = useState(false);

    const [validationError, setValidationError] = useState<string | null>(null);

    const avatarScale = useSharedValue(0);
    const avatarAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: avatarScale.value }],
    }));

    useEffect(() => {
        avatarScale.value = withSpring(1, { damping: 12, stiffness: 120 });
    }, [avatarScale]);

    const initial = name.trim().charAt(0).toUpperCase() || '?';

    const handleBirthDateChange = useCallback((event: DateTimePickerEvent, date?: Date) => {
        if (Platform.OS === 'android') setShowBirthPicker(false);
        if (event.type === 'set' && date) {
            setBirthDateValue(date);
            setBirthDateStr(formatDate(date));
        }
    }, []);

    const handleDatingDateChange = useCallback((event: DateTimePickerEvent, date?: Date) => {
        if (Platform.OS === 'android') setShowDatingPicker(false);
        if (event.type === 'set' && date) {
            setDatingDateValue(date);
            setDatingDateStr(formatDate(date));
        }
    }, []);

    const handleAvatarPress = useCallback(async (): Promise<void> => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            await uploadAvatar(result.assets[0].uri);
        }
    }, [uploadAvatar]);

    const handleSave = useCallback(async (): Promise<void> => {
        const nameErr = validateName(name);
        if (nameErr) {
            setValidationError(nameErr);
            return;
        }

        const birthErr = validateBirthDate(birthDateStr);
        if (birthErr) {
            setValidationError(birthErr);
            return;
        }

        const datingErr = validateDatingStartDate(datingDateStr);
        if (datingErr) {
            setValidationError(datingErr);
            return;
        }

        const crossErr = validateDatingAfterBirth(datingDateStr, birthDateStr);
        if (crossErr) {
            setValidationError(crossErr);
            return;
        }

        setValidationError(null);

        const success = await saveProfile({
            name: name.trim(),
            birthDate: birthDateStr || null,
            helpFocus: helpFocus || null,
            datingStartDate: datingDateStr || null,
        });

        if (success) navigation.goBack();
    }, [name, birthDateStr, helpFocus, datingDateStr, saveProfile, navigation]);

    const [isExporting, setIsExporting] = useState(false);

    const handleExport = useCallback(async (): Promise<void> => {
        setIsExporting(true);
        try {
            const result = await exportData();
            if (!result.ok) return;
            await Share.share({ message: result.data, title: 'Your CoupleGoAI data' });
        } finally {
            setIsExporting(false);
        }
    }, []);

    const displayError = validationError ?? error;
    const hasCoupleId = user?.coupleId != null;
    const bottomScrollPadding = insets.bottom + 148;

    return (
        <SafeAreaView style={styles.safe}>
            <LinearGradient colors={gradients.heroWash} style={StyleSheet.absoluteFill} />
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <HeaderRow onBack={() => navigation.goBack()} />

                <ScrollView
                    contentContainerStyle={[
                        styles.scroll,
                        { flexGrow: 1, paddingBottom: bottomScrollPadding },
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <AvatarCircle
                        initial={initial}
                        avatarUrl={user?.avatarUrl ?? null}
                        isUploading={isUploading}
                        animStyle={avatarAnimStyle}
                        onPress={() => {
                            void handleAvatarPress();
                        }}
                    />

                    <FormSection delay={0} label="Name">
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder="Your name"
                            placeholderTextColor={colors.gray}
                            maxLength={60}
                            style={styles.textInput}
                        />
                    </FormSection>

                    <FormSection delay={100} label="Birth Date">
                        <DateFieldRow
                            label="Birth Date"
                            value={birthDateValue}
                            displayStr={birthDateStr}
                            showPicker={showBirthPicker}
                            onPress={() => setShowBirthPicker((p) => !p)}
                            onChange={handleBirthDateChange}
                            maximumDate={getMaxBirthDate()}
                        />
                    </FormSection>

                    <FormSection delay={200} label="Help Focus">
                        <HelpFocusChips selected={helpFocus} onSelect={setHelpFocus} />
                        <Text style={styles.hint}>Leave blank to keep current</Text>
                    </FormSection>

                    {hasCoupleId && (
                        <FormSection delay={300} label="Dating Start Date">
                            <DateFieldRow
                                label="Dating Start Date"
                                value={datingDateValue}
                                displayStr={datingDateStr}
                                showPicker={showDatingPicker}
                                onPress={() => setShowDatingPicker((p) => !p)}
                                onChange={handleDatingDateChange}
                                maximumDate={new Date()}
                                minimumDate={birthDateValue ?? undefined}
                            />
                            <Text style={styles.hint}>Leave blank to keep current</Text>
                        </FormSection>
                    )}

                    {displayError != null && <ErrorBanner message={displayError} />}

                    <View style={styles.actions}>
                        <GradientButton
                            label="Save changes"
                            onPress={() => {
                                void handleSave();
                            }}
                            size="lg"
                            fullWidth
                            loading={isSaving}
                            disabled={isSaving}
                        />

                        <TouchableOpacity
                            style={styles.memoryBtn}
                            activeOpacity={0.8}
                            onPress={() => navigation.navigate('MemoryInsight')}
                        >
                            <Text style={styles.memoryLabel}>What does the AI know about me?</Text>
                        </TouchableOpacity>

                        <View style={styles.secondaryRow}>
                            {hasCoupleId && (
                                <TouchableOpacity
                                    style={[styles.disconnectBtn, styles.secondaryBtn]}
                                    activeOpacity={0.8}
                                    onPress={() => navigation.navigate('DisconnectConfirm')}
                                >
                                    <Text style={styles.disconnectLabel}>Disconnect from partner</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[styles.logoutBtn, styles.secondaryBtn]}
                                activeOpacity={0.8}
                                onPress={() => {
                                    void signOut();
                                }}
                            >
                                <Text style={styles.logoutLabel}>Log out</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.memoryBtn}
                            activeOpacity={0.8}
                            disabled={isExporting}
                            onPress={() => {
                                void handleExport();
                            }}
                        >
                            <Text style={styles.memoryLabel}>
                                {isExporting ? 'Preparing export…' : 'Download my data'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.deleteBtn}
                            activeOpacity={0.8}
                            onPress={() => navigation.navigate('AccountDelete')}
                        >
                            <Text style={styles.deleteLabel}>Delete account</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
