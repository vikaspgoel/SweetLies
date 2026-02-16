import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable, Text } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarStyle: { display: 'none' },
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "What's Sugar?",
          headerTitle: () => null,
          headerLeft: () => (
            <Link href="/whats-sugar" asChild>
              <Pressable style={{ marginLeft: 16 }}>
                {({ pressed }) => (
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '700',
                      color: Colors[colorScheme ?? 'light'].tint,
                      textDecorationLine: 'underline',
                      opacity: pressed ? 0.7 : 1,
                    }}
                  >
                    What&apos;s Sugar?
                  </Text>
                )}
              </Pressable>
            </Link>
          ),
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable>
                {({ pressed }) => (
                  <FontAwesome
                    name="info-circle"
                    size={25}
                    color={Colors[colorScheme ?? 'light'].text}
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  );
}
