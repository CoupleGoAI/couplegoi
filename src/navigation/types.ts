import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

// --- Auth Stack ---
export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

// --- Root Stack ---
export type RootStackParamList = {
    Auth: undefined;
    Main: undefined;
};

// Navigation prop helpers
export type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;
export type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

// Auth screen props
export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;
