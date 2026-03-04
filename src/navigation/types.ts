import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp, BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// --- Onboarding Stack ---
export type OnboardingStackParamList = {
  Welcome: undefined;
  CreateAccount: undefined;
  GenerateQR: undefined;
  ScanQR: undefined;
  ConnectionConfirmed: undefined;
};

// --- Main Tab ---
export type MainTabParamList = {
  Home: undefined;
  Chat: undefined;
  Game: undefined;
  Profile: undefined;
};

// --- Root Stack (wraps both) ---
export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
};

// Navigation prop helpers
export type OnboardingNavProp = NativeStackNavigationProp<OnboardingStackParamList>;
export type MainTabNavProp = BottomTabNavigationProp<MainTabParamList>;
export type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

export type WelcomeScreenProps = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;
export type CreateAccountScreenProps = NativeStackScreenProps<OnboardingStackParamList, 'CreateAccount'>;
export type GenerateQRScreenProps = NativeStackScreenProps<OnboardingStackParamList, 'GenerateQR'>;
export type ScanQRScreenProps = NativeStackScreenProps<OnboardingStackParamList, 'ScanQR'>;
export type ConnectionConfirmedScreenProps = NativeStackScreenProps<OnboardingStackParamList, 'ConnectionConfirmed'>;

export type HomeScreenProps = BottomTabScreenProps<MainTabParamList, 'Home'>;
export type ChatScreenProps = BottomTabScreenProps<MainTabParamList, 'Chat'>;
export type GameScreenProps = BottomTabScreenProps<MainTabParamList, 'Game'>;
export type ProfileScreenProps = BottomTabScreenProps<MainTabParamList, 'Profile'>;
