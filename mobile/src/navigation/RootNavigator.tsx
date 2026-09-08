import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { he } from "@admin-coordinator/shared";
import { useAuth } from "../context/AuthContext";
import { LoginScreen } from "../screens/LoginScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { MainScreen } from "../screens/MainScreen";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

function NoAccountScreen() {
  const { logout } = useAuth();
  return (
    <View style={styles.center}>
      <Text style={styles.noAccountText}>{he.auth.noAccount}</Text>
      <Pressable onPress={logout}>
        <Text style={styles.logoutLink}>{he.auth.logout}</Text>
      </Pressable>
    </View>
  );
}

export function RootNavigator() {
  const { user, profile, profileLoading, loading } = useAuth();

  if (loading || (user && profileLoading)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // A Firebase Auth session exists (notably via Google/Apple sign-in, which
  // auto-creates the Auth account for anyone regardless of whether an admin
  // ever provisioned them) but no users/{uid} profile does - Firestore
  // rules already deny this account read access to everything else, so
  // make that explicit instead of rendering an empty dashboard.
  if (user && !profileLoading && !profile) {
    return <NoAccountScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainScreen} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  noAccountText: {
    color: "#DC2626",
    textAlign: "center",
    writingDirection: "rtl",
  },
  logoutLink: {
    color: "#2563EB",
    writingDirection: "rtl",
  },
});
