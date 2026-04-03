import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { MainTabParamList, RootNavProp } from '@navigation/types';
import { TabBar } from '@components/ui/TabBar';
import { HomeScreen } from '@screens/main/HomeScreen';
import { GamesScreen } from '@screens/main/GamesScreen';
import { UsScreen } from '@screens/main/UsScreen';
import ProfileScreen from '@screens/main/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Dummy component — center button never renders a real screen
function ChatTabScreen(): null {
    return null;
}

export default function MainTabNavigator(): React.ReactElement {
    const rootNav = useNavigation<RootNavProp>();

    return (
        <Tab.Navigator
            tabBar={(props) => (
                <TabBar
                    {...props}
                    onChatPress={() => rootNav.navigate('AiChat')}
                />
            )}
            screenOptions={{ headerShown: false }}
        >
            <Tab.Screen name="Nest" component={HomeScreen} />
            <Tab.Screen name="Play" component={GamesScreen} />
            <Tab.Screen name="ChatTab" component={ChatTabScreen} />
            <Tab.Screen name="Us" component={UsScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}
