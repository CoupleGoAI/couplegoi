import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from './types';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import CreateAccountScreen from '../screens/onboarding/CreateAccountScreen';
import GenerateQRScreen from '../screens/onboarding/GenerateQRScreen';
import ScanQRScreen from '../screens/onboarding/ScanQRScreen';
import ConnectionConfirmedScreen from '../screens/onboarding/ConnectionConfirmedScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
      <Stack.Screen name="GenerateQR" component={GenerateQRScreen} />
      <Stack.Screen name="ScanQR" component={ScanQRScreen} />
      <Stack.Screen name="ConnectionConfirmed" component={ConnectionConfirmedScreen} />
    </Stack.Navigator>
  );
}
