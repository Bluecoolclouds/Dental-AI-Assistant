import React, { useEffect, useState } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import * as Font from "expo-font";
import { Feather } from "@expo/vector-icons";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { getDatabase } from "@/storage/database";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";

function AppContent() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        await Font.loadAsync(Feather.font);
        setFontsLoaded(true);
      } catch (e) {
        console.warn("Font loading error:", e);
        setFontsLoaded(true);
      }

      try {
        if (Platform.OS === "web") {
          setDbError("SQLite не поддерживается в браузере. Используйте Expo Go на мобильном устройстве.");
          return;
        }
        await getDatabase();
        setIsDbReady(true);
      } catch (error: any) {
        console.error("Database initialization failed:", error);
        setDbError(error.message || "Ошибка инициализации базы данных");
      }
    }
    init();
  }, []);

  if (Platform.OS === "web") {
    return (
      <ThemedView style={styles.splashContainer}>
        <ThemedText type="h3" style={styles.splashText}>
          Для полноценной работы приложения
        </ThemedText>
        <ThemedText type="body" style={styles.splashSubtext}>
          Отсканируйте QR-код в Expo Go на мобильном устройстве
        </ThemedText>
      </ThemedView>
    );
  }

  if (dbError) {
    return (
      <ThemedView style={styles.splashContainer}>
        <ThemedText type="h3" style={styles.splashText}>
          Ошибка
        </ThemedText>
        <ThemedText type="body" style={styles.splashSubtext}>
          {dbError}
        </ThemedText>
      </ThemedView>
    );
  }

  if (!isDbReady || !fontsLoaded) {
    return (
      <ThemedView style={styles.splashContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <ThemedText type="body" style={styles.splashText}>
          Загрузка...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <KeyboardProvider>
            <NavigationContainer>
              <RootStackNavigator />
            </NavigationContainer>
            <StatusBar style="auto" />
          </KeyboardProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  splashText: {
    textAlign: "center",
  },
  splashSubtext: {
    textAlign: "center",
    opacity: 0.7,
  },
});
