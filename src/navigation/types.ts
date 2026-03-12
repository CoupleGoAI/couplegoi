import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

// --- Auth Stack ---
export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

// --- Root Stack ---
export type RootStackParamList = {
    Auth: undefined;
    OnboardingProfile: undefined;
    GenerateQR: undefined;
    ScanQR: undefined;
    ConnectionConfirmed: { partnerName: string | null; coupleId: string };
    CoupleSetup: undefined;
    Home: undefined;
};

// Navigation prop helpers
export type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;
export type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

// Auth screen props
export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;

// Onboarding screen props
export type OnboardingProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'OnboardingProfile'>;

// Couple setup screen props
export type CoupleSetupScreenProps = NativeStackScreenProps<RootStackParamList, 'CoupleSetup'>;

// Pairing screen props
export type GenerateQRScreenProps = NativeStackScreenProps<RootStackParamList, 'GenerateQR'>;
export type ScanQRScreenProps = NativeStackScreenProps<RootStackParamList, 'ScanQR'>;
export type ConnectionConfirmedScreenProps = NativeStackScreenProps<RootStackParamList, 'ConnectionConfirmed'>;
