import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AppIcon from "@/components/Icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { useScreenOptions } from "@/hooks/useScreenOptions";

import HomeScreen from "@/screens/HomeScreen";
import ToothMapScreen from "@/screens/ToothMapScreen";
import AIChatScreen from "@/screens/AIChatScreen";
import CalendarScreen from "@/screens/CalendarScreen";
import ProfileScreen from "@/screens/ProfileScreen";

export type MainTabParamList = {
  HomeTab: undefined;
  ToothMapTab: undefined;
  AIChatTab: undefined;
  CalendarTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const screenOptions = useScreenOptions();

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
          }),
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        ...screenOptions,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: "Главная",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <AppIcon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ToothMapTab"
        component={ToothMapScreen}
        options={{
          title: "Карта",
          headerTitle: "Карта зубов",
          tabBarIcon: ({ color, size }) => (
            <AppIcon name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AIChatTab"
        component={AIChatScreen}
        options={{
          title: "ИИ",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <AppIcon name="message-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarScreen}
        options={{
          title: "Календарь",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <AppIcon name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: "Профиль",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <AppIcon name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
