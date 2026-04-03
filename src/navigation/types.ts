import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp, BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// --- Auth Stack ---
export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

// --- Main Tab ---
export type MainTabParamList = {
    Nest: undefined;
    Play: undefined;
    /** Dummy route — center button navigates to AiChat in root stack */
    ChatTab: undefined;
    Us: undefined;
    Profile: undefined;
};

// --- Root Stack ---
export type RootStackParamList = {
    Auth: undefined;
    OnboardingProfile: undefined;
    GenerateQR: undefined;
    ScanQR: undefined;
    ConnectionConfirmed: { partnerName: string | null; coupleId: string };
    CoupleSetup: undefined;
    MainTabs: undefined;
    AiChat: undefined;
    Profile: undefined;
    DisconnectConfirm: undefined;
    GameWouldYouRather: undefined;
    GameThisOrThat: undefined;
    GameLoveCheckIn: undefined;
};

// Navigation prop helpers
export type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;
export type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

// Composite nav prop for tab screens that also need root-stack navigation
export type NestScreenNavProp = CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Nest'>,
    NativeStackNavigationProp<RootStackParamList>
>;
export type UsScreenNavProp = CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Us'>,
    NativeStackNavigationProp<RootStackParamList>
>;

// Auth screen props
export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;

// Onboarding screen props
export type OnboardingProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'OnboardingProfile'>;

// Couple setup screen props
export type CoupleSetupScreenProps = NativeStackScreenProps<RootStackParamList, 'CoupleSetup'>;

// AI chat screen props
export type AiChatScreenProps = NativeStackScreenProps<RootStackParamList, 'AiChat'>;

// Pairing screen props
export type GenerateQRScreenProps = NativeStackScreenProps<RootStackParamList, 'GenerateQR'>;
export type ScanQRScreenProps = NativeStackScreenProps<RootStackParamList, 'ScanQR'>;
export type ConnectionConfirmedScreenProps = NativeStackScreenProps<RootStackParamList, 'ConnectionConfirmed'>;

// Profile & Disconnect screen props
export type ProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'Profile'>;
export type DisconnectConfirmScreenProps = NativeStackScreenProps<RootStackParamList, 'DisconnectConfirm'>;

// Tab screen props
export type GamesScreenProps = BottomTabScreenProps<MainTabParamList, 'Play'>;

// Composite nav prop for the Play tab (needs root stack for game screens)
export type PlayScreenNavProp = CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Play'>,
    NativeStackNavigationProp<RootStackParamList>
>;
