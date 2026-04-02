import React, { ComponentProps, useEffect, useState, useCallback } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AppIcon from "@/components/Icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, Text } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTranslation } from "react-i18next";

import HomeScreen from "@/screens/HomeScreen";
import ToothMapScreen from "@/screens/ToothMapScreen";
import AIChatScreen from "@/screens/AIChatScreen";
import CalendarScreen from "@/screens/CalendarScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import { useAuthContext } from "@/contexts/AuthContext";
import { getUnreadAlertsCount } from "@/storage/repositories/alertsRepository";

export type MainTabParamList = {
  HomeTab: undefined;
  ToothMapTab: undefined;
  AIChatTab: undefined;
  CalendarTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type AppIconName = ComponentProps<typeof AppIcon>["name"];
function IconWithBadge({ name, size, color, count }: { name: AppIconName; size: number; color: string; count: number }) {
  return (
    <View>
      <AppIcon name={name} size={size} color={color} />
      {count > 0 && (
        <View style={[badgeStyles.badge, count > 9 ? badgeStyles.badgeWide : {}]}>
          <Text style={badgeStyles.badgeText}>{count > 99 ? "99+" : count}</Text>
        </View>
      )}
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeWide: {
    minWidth: 20,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
  },
});

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const screenOptions = useScreenOptions();
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!user?.id) return;
    try {
      const count = await getUnreadAlertsCount(user.id);
      setUnreadCount(count);
    } catch {}
  }, [user?.id]);

  useEffect(() => {
    refreshUnread();
    const interval = setInterval(refreshUnread, 30000);
    return () => clearInterval(interval);
  }, [refreshUnread]);

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
        headerTitleAlign: screenOptions.headerTitleAlign,
        headerTintColor: screenOptions.headerTintColor,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: t("nav.home"),
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
          title: t("nav.map"),
          headerTitle: t("home.toothMap"),
          tabBarIcon: ({ color, size }) => (
            <AppIcon name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AIChatTab"
        component={AIChatScreen}
        options={{
          title: t("nav.ai"),
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
          title: t("nav.calendar"),
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
          title: t("nav.profile"),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <IconWithBadge name="user" size={size} color={color} count={unreadCount} />
          ),
        }}
        listeners={{
          tabPress: () => {
            refreshUnread();
          },
        }}
      />
    </Tab.Navigator>
  );
}
