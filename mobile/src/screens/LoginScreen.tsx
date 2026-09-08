import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { he } from "@admin-coordinator/shared";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { login, isFirebaseConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (e) {
      setError(he.auth.invalidCredentials);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.appName}>{he.app.name}</Text>
        <Text style={styles.title}>{he.auth.loginTitle}</Text>

        {!isFirebaseConfigured && (
          <Text style={styles.warning}>Firebase טרם חובר - זהו מסך הדגמה</Text>
        )}

        <Text style={styles.label}>{he.auth.email}</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textAlign="right"
        />

        <Text style={styles.label}>{he.auth.password}</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textAlign="right"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{he.auth.login}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
          <Text style={styles.link}>{he.auth.forgotPassword}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    gap: 4,
  },
  appName: {
    textAlign: "center",
    writingDirection: "rtl",
    color: "#1E3A8A",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  title: {
    textAlign: "center",
    writingDirection: "rtl",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    color: "#111827",
  },
  warning: {
    textAlign: "center",
    writingDirection: "rtl",
    color: "#B45309",
    backgroundColor: "#FEF3C7",
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 12,
  },
  label: {
    textAlign: "right",
    writingDirection: "rtl",
    color: "#374151",
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    writingDirection: "rtl",
  },
  error: {
    color: "#DC2626",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 12,
  },
  button: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  link: {
    textAlign: "center",
    writingDirection: "rtl",
    color: "#2563EB",
    marginTop: 16,
  },
});
