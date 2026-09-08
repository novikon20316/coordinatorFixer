import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { he } from "@admin-coordinator/shared";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { sendResetEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await sendResetEmail(email);
      setSent(true);
    } catch (e) {
      setError(he.common.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{he.auth.forgotPasswordTitle}</Text>

        {sent ? (
          <Text style={styles.success}>{he.auth.resetLinkSent}</Text>
        ) : (
          <>
            <Text style={styles.label}>{he.auth.email}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textAlign="right"
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{he.auth.sendResetLink}</Text>
              )}
            </Pressable>
          </>
        )}

        <Pressable onPress={() => navigation.navigate("Login")}>
          <Text style={styles.link}>{he.auth.backToLogin}</Text>
        </Pressable>
      </View>
    </View>
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
  },
  title: {
    textAlign: "center",
    writingDirection: "rtl",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    color: "#111827",
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
  success: {
    color: "#065F46",
    backgroundColor: "#D1FAE5",
    padding: 12,
    borderRadius: 8,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 8,
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
