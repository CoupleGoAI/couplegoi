import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientButton from '@components/ui/GradientButton';
import { useAuth } from '@hooks/useAuth';
import { colors, textStyles, spacing } from '@/theme/tokens';

export default function PlaceholderScreen() {
    const { signOut } = useAuth();

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <Text style={styles.emoji}>🎉</Text>
                <Text style={styles.title}>You&apos;re in!</Text>
                <Text style={styles.subtitle}>
                    Welcome to CoupleGoAI. More features coming soon.
                </Text>
                <GradientButton
                    label="Sign Out"
                    onPress={() => { void signOut(); }}
                    variant="outline"
                    size="md"
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        gap: spacing.lg,
    },
    emoji: {
        fontSize: 64,
    },
    title: {
        ...textStyles.displaySm,
        color: colors.foreground,
        textAlign: 'center',
    },
    subtitle: {
        ...textStyles.bodyMd,
        color: colors.gray,
        textAlign: 'center',
    },
});
