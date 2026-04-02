import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { useAuthStore } from '@store/authStore';
import { usePairingStore } from '@store/pairingStore';
import { useAuth } from '@hooks/useAuth';
import SplashScreen from '@screens/auth/SplashScreen';
import AuthNavigator from '@navigation/AuthNavigator';
import { OnboardingProfileScreen } from '@screens/main/OnboardingProfileScreen';
import { GenerateQRScreen } from '@screens/main/GenerateQRScreen';
import { ScanQRScreen } from '@screens/main/ScanQRScreen';
import { ConnectionConfirmedScreen } from '@screens/main/ConnectionConfirmedScreen';
import { CoupleSetupScreen } from '@screens/main/CoupleSetupScreen';
import MainTabNavigator from '@navigation/MainTabNavigator';
import { AiChatScreen } from '@screens/main/AiChatScreen';
import ProfileScreen from '@screens/main/ProfileScreen';
import DisconnectConfirmScreen from '@screens/main/DisconnectConfirmScreen';
import { WouldYouRatherScreen } from '@screens/main/games/WouldYouRatherScreen';
import { ThisOrThatScreen } from '@screens/main/games/ThisOrThatScreen';
import { LoveCheckInScreen } from '@screens/main/games/LoveCheckInScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
    const isInitialized = useAuthStore((s) => s.isInitialized);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const onboardingCompleted = useAuthStore((s) => s.user?.onboardingCompleted ?? false);
    const coupleId = useAuthStore((s) => s.user?.coupleId ?? null);
    const coupleSetupCompleted = useAuthStore((s) => s.user?.coupleSetupCompleted ?? false);
    const pairingSkipped = useAuthStore((s) => s.pairingSkipped);
    const pairingEntryScreen = usePairingStore((s) => s.entryScreen);
    const { initialize } = useAuth();

    const shouldStartPairingOnScan = pairingEntryScreen === 'ScanQR';

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
                    <Stack.Screen name="OnboardingProfile" component={OnboardingProfileScreen} />
                ) : coupleId === null && !pairingSkipped ? (
                    shouldStartPairingOnScan ? (
                        <>
                            <Stack.Screen
                                name="ScanQR"
                                component={ScanQRScreen}
                                options={{ animation: 'slide_from_right' }}
                            />
                            <Stack.Screen name="GenerateQR" component={GenerateQRScreen} />
                            <Stack.Screen
                                name="ConnectionConfirmed"
                                component={ConnectionConfirmedScreen}
                                options={{ animation: 'slide_from_right', gestureEnabled: false }}
                            />
                        </>
                    ) : (
                        <>
                            <Stack.Screen name="GenerateQR" component={GenerateQRScreen} />
                            <Stack.Screen
                                name="ScanQR"
                                component={ScanQRScreen}
                                options={{ animation: 'slide_from_right' }}
                            />
                            <Stack.Screen
                                name="ConnectionConfirmed"
                                component={ConnectionConfirmedScreen}
                                options={{ animation: 'slide_from_right', gestureEnabled: false }}
                            />
                        </>
                    )
                ) : coupleId !== null && !coupleSetupCompleted ? (
                    <Stack.Screen name="CoupleSetup" component={CoupleSetupScreen} />
                ) : (
                    <>
                        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
                        <Stack.Screen
                            name="AiChat"
                            component={AiChatScreen}
                            options={{ animation: 'slide_from_bottom' }}
                        />
                        <Stack.Screen
                            name="Profile"
                            component={ProfileScreen}
                            options={{ animation: 'slide_from_right' }}
                        />
                        <Stack.Screen
                            name="DisconnectConfirm"
                            component={DisconnectConfirmScreen}
                            options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
                        />
                        <Stack.Screen
                            name="GameWouldYouRather"
                            component={WouldYouRatherScreen}
                            options={{ animation: 'slide_from_right' }}
                        />
                        <Stack.Screen
                            name="GameThisOrThat"
                            component={ThisOrThatScreen}
                            options={{ animation: 'slide_from_right' }}
                        />
                        <Stack.Screen
                            name="GameLoveCheckIn"
                            component={LoveCheckInScreen}
                            options={{ animation: 'slide_from_right' }}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}