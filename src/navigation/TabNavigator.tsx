import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import type { MainTabParamList } from './types';
import HomeScreen from '../screens/main/HomeScreen';
import ChatScreen from '../screens/main/ChatScreen';
import GameScreen from '../screens/main/GameScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import { light, palette } from '../theme/colors';
import { layout, radii } from '../theme/spacing';
import { fontFamilies, fontSize, fontWeight } from '../theme/typography';

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<
  keyof MainTabParamList,
  { icon: TabIconName; iconFocused: TabIconName; label: string }
> = {
  Home: {
    icon: 'home-outline',
    iconFocused: 'home',
    label: 'Home',
  },
  Chat: {
    icon: 'chatbubble-outline',
    iconFocused: 'chatbubble',
    label: 'Chat',
  },
  Game: {
    icon: 'game-controller-outline',
    iconFocused: 'game-controller',
    label: 'Game',
  },
  Profile: {
    icon: 'person-outline',
    iconFocused: 'person',
    label: 'You & Me',
  },
};

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const config = TAB_CONFIG[route.name as keyof MainTabParamList];
        return {
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: palette.pink500,
          tabBarInactiveTintColor: palette.gray400,
          tabBarLabelStyle: {
            fontFamily: fontFamilies.sans,
            fontSize: fontSize.xs,
            fontWeight: fontWeight.medium,
            marginBottom: Platform.OS === 'ios' ? 0 : 4,
          },
          tabBarStyle: styles.tabBar,
          tabBarBackground: () =>
            Platform.OS === 'ios' ? (
              <BlurView
                tint="light"
                intensity={85}
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.tabBarAndroid]} />
            ),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? config.iconFocused : config.icon}
              size={size}
              color={color}
            />
          ),
        };
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Game" component={GameScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 0,
    height: layout.tabBarHeight + (Platform.OS === 'ios' ? 20 : 0),
    paddingTop: 8,
    backgroundColor: 'transparent',
    elevation: 0,
  },
  tabBarAndroid: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(228,228,231,0.8)',
  },
});
