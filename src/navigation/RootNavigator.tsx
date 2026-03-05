import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { useAuthStore } from '@store/authStore';
import { useAuth } from '@hooks/useAuth';
import SplashScreen from '@screens/auth/SplashScreen';
import AuthNavigator from '@navigation/AuthNavigator';
import { OnboardingChatScreen } from '@screens/main/OnboardingChatScreen';
import PlaceholderScreen from '@screens/main/PlaceholderScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
    const isInitialized = useAuthStore((s) => s.isInitialized);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const onboardingCompleted = useAuthStore((s) => s.user?.onboardingCompleted ?? false);
    const { initialize } = useAuth();

    useEffect(() => {
        void initialize();
    }, [initialize]);

    if (!isInitialized) {
        return <SplashScreen />;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
                {!isAuthenticated ? (
                    <Stack.Screen name="Auth" component={AuthNavigator} />
                ) : !onboardingCompleted ? (
                    <Stack.Screen name="Onboarding" component={OnboardingChatScreen} />
                ) : (
                    <Stack.Screen name="Main" component={PlaceholderScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}