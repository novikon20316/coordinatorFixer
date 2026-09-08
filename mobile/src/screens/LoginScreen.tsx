import React, { useEffect, useState } from "react";
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
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import { FirebaseError } from "firebase/app";
import { he } from "@admin-coordinator/shared";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";

WebBrowser.maybeCompleteAuthSession();

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

function socialErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError && err.code === "auth/account-exists-with-different-credential") {
    return he.auth.accountExistsDifferentMethod;
  }
  return he.auth.socialSignInFailed;
}

export function LoginScreen({ navigation }: Props) {
  const { login, loginWithGoogleIdToken, loginWithApple, isFirebaseConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [socialSubmitting, setSocialSubmitting] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  // Requires EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID - the OAuth "Web client" id
  // Firebase creates once Google sign-in is enabled in the console (see
  // README's OAuth setup section). Works via Expo's auth-session redirect
  // flow in both Expo Go and a custom dev client.
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type !== "success") return;
    const idToken = response.authentication?.idToken ?? response.params?.id_token;
    if (!idToken) return;
    setSocialSubmitting(true);
    loginWithGoogleIdToken(idToken)
      .catch((err) => setError(socialErrorMessage(err)))
      .finally(() => setSocialSubmitting(false));
  }, [response]);

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

  async function handleAppleSignIn() {
    setError(null);
    setSocialSubmitting(true);
    try {
      await loginWithApple();
    } catch (err) {
      setError(socialErrorMessage(err));
    } finally {
      setSocialSubmitting(false);
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

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{he.auth.or}</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={styles.googleButton}
          onPress={() => promptAsync()}
          disabled={!request || socialSubmitting}
        >
          <Text style={styles.googleButtonText}>{he.auth.continueWithGoogle}</Text>
        </Pressable>

        {appleAvailable && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={8}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        )}
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    marginBottom: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    color: "#9CA3AF",
    fontSize: 12,
  },
  googleButton: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  googleButtonText: {
    color: "#374151",
    fontWeight: "600",
  },
  appleButton: {
    height: 44,
    marginTop: 12,
  },
});
