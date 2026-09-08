import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { ensureRTL } from "./src/lib/rtl";

export default function App() {
  useEffect(() => {
    ensureRTL();
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  );
}
