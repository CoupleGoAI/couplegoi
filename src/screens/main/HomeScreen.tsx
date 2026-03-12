import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function HomeScreen(): React.ReactElement {
    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="flex-1 items-center justify-center">
                <Text className="text-lg font-bold text-foreground">Home</Text>
            </View>
        </SafeAreaView>
    );
}
