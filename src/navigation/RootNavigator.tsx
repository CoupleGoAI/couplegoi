import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { useAuthStore } from '@store/authStore';
import { useAuth } from '@hooks/useAuth';
import AuthNavigator from '@navigation/AuthNavigator';
import PlaceholderScreen from '@screens/main/PlaceholderScreen';
import SplashScreen from '@screens/auth/SplashScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
    const isInitialized = useAuthStore((s) => s.isInitialized);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
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
                ) : (
                    <Stack.Screen name="Main" component={PlaceholderScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
