import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  AppUser,
  Faculty,
  FACULTY_VALUES,
  generateReadableTempPassword,
  he,
  UserRole,
} from "@admin-coordinator/shared";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/apiClient";

export function CoordinatorsScreen() {
  const { profile } = useAuth();
  const [coordinators, setCoordinators] = useState<AppUser[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const isAdmin = profile?.role === UserRole.ADMIN;

  async function reload() {
    setLoadingList(true);
    setListError(null);
    try {
      const users = (await apiFetch("/api/users")) as AppUser[];
      setCoordinators(users.filter((u) => u.role === UserRole.COORDINATOR));
    } catch (err) {
      setListError(err instanceof Error ? err.message : he.common.error);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    if (isAdmin) reload();
  }, [isAdmin]);

  async function toggleActive(uid: string, isActive: boolean) {
    await apiFetch(`/api/users/${uid}/active`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !isActive }),
    });
    reload();
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.deniedText}>{he.coordinators.accessDenied}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      ListHeaderComponent={
        <>
          <NewCoordinatorForm onCreated={reload} />
          {listError && <Text style={styles.errorText}>{listError}</Text>}
          {loadingList && <ActivityIndicator style={{ marginTop: 12 }} />}
          {!loadingList && coordinators.length === 0 && (
            <Text style={styles.emptyText}>{he.coordinators.noCoordinators}</Text>
          )}
        </>
      }
      data={coordinators}
      keyExtractor={(item) => item.uid}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName}>{item.displayName}</Text>
            <Text style={styles.rowSub}>{item.email}</Text>
            <Text style={styles.rowSub}>
              {item.facultyId ? he.faculty[item.facultyId] : "-"}
            </Text>
          </View>
          <View style={styles.rowActions}>
            <View style={[styles.badge, item.isActive ? styles.badgeActive : styles.badgeDisabled]}>
              <Text style={styles.badgeText}>
                {item.isActive ? he.coordinators.active : he.coordinators.disabled}
              </Text>
            </View>
            <Pressable onPress={() => toggleActive(item.uid, item.isActive)}>
              <Text style={styles.toggleLink}>
                {item.isActive ? he.coordinators.disable : he.coordinators.enable}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}

function NewCoordinatorForm({ onCreated }: { onCreated: () => void }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [facultyId, setFacultyId] = useState<Faculty | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleGeneratePassword() {
    setPassword(generateReadableTempPassword());
    setShowPassword(true);
    setCopied(false);
  }

  async function handleCopyPassword() {
    await Clipboard.setStringAsync(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit() {
    setError(null);
    setSuccess(false);
    if (!facultyId) {
      setError(he.coordinators.selectFaculty);
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify({ displayName, email, password, facultyId }),
      });
      setSuccess(true);
      setDisplayName("");
      setEmail("");
      setPassword("");
      setShowPassword(false);
      setFacultyId(null);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : he.common.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle}>{he.coordinators.addNew}</Text>

      <Text style={styles.label}>{he.coordinators.fullName}</Text>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} textAlign="right" />

      <Text style={styles.label}>{he.coordinators.email}</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        textAlign="right"
      />

      <Text style={styles.label}>{he.coordinators.tempPassword}</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        textAlign="right"
      />
      <View style={styles.passwordActions}>
        <Pressable style={styles.smallButton} onPress={handleGeneratePassword}>
          <Text style={styles.smallButtonText}>{he.coordinators.generatePassword}</Text>
        </Pressable>
        {password.length > 0 && (
          <Pressable style={styles.smallButton} onPress={handleCopyPassword}>
            <Text style={styles.smallButtonText}>
              {copied ? he.coordinators.copied : he.coordinators.copyPassword}
            </Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.hint}>{he.coordinators.tempPasswordHint}</Text>

      <Text style={styles.label}>{he.coordinators.faculty}</Text>
      <Pressable style={styles.input} onPress={() => setPickerVisible(true)}>
        <Text style={styles.pickerText}>
          {facultyId ? he.faculty[facultyId] : he.coordinators.selectFaculty}
        </Text>
      </Pressable>

      {error && <Text style={styles.errorText}>{error}</Text>}
      {success && <Text style={styles.successText}>{he.coordinators.createSuccess}</Text>}

      <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{he.coordinators.create}</Text>
        )}
      </Pressable>

      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setPickerVisible(false)}>
          <View style={styles.pickerPanel}>
            {FACULTY_VALUES.map((f) => (
              <Pressable
                key={f}
                style={styles.pickerItem}
                onPress={() => {
                  setFacultyId(f);
                  setPickerVisible(false);
                }}
              >
                <Text style={styles.pickerItemText}>{he.faculty[f]}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  deniedText: { color: "#B91C1C", writingDirection: "rtl" },
  form: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    writingDirection: "rtl",
    textAlign: "right",
    marginBottom: 12,
    color: "#111827",
  },
  label: {
    textAlign: "right",
    writingDirection: "rtl",
    color: "#374151",
    marginTop: 10,
    marginBottom: 4,
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
  },
  pickerText: {
    textAlign: "right",
    writingDirection: "rtl",
    color: "#111827",
  },
  hint: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 4,
  },
  passwordActions: {
    flexDirection: "row-reverse",
    gap: 8,
    marginTop: 8,
  },
  smallButton: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  errorText: {
    color: "#DC2626",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 10,
  },
  successText: {
    color: "#047857",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 10,
  },
  button: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "700" },
  emptyText: {
    textAlign: "center",
    writingDirection: "rtl",
    color: "#6B7280",
    marginTop: 16,
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowName: { fontWeight: "700", textAlign: "right", writingDirection: "rtl", color: "#111827" },
  rowSub: { fontSize: 12, color: "#6B7280", textAlign: "right", writingDirection: "rtl" },
  rowActions: { alignItems: "flex-end", gap: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  badgeActive: { backgroundColor: "#D1FAE5" },
  badgeDisabled: { backgroundColor: "#E5E7EB" },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#111827" },
  toggleLink: { color: "#2563EB", fontSize: 12, fontWeight: "600" },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 24,
  },
  pickerPanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 8,
  },
  pickerItem: { paddingVertical: 14, paddingHorizontal: 16 },
  pickerItemText: { textAlign: "right", writingDirection: "rtl", color: "#111827" },
});
