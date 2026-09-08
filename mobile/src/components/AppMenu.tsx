import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { he, UserRole } from "@admin-coordinator/shared";
import { useAuth } from "../context/AuthContext";
import { MenuKey } from "../navigation/types";

const BASE_ITEMS: { key: MenuKey; label: string }[] = [
  { key: "overview", label: he.menu.overview },
  { key: "reports", label: he.menu.reports },
  { key: "changeStatus", label: he.menu.changeStatus },
];

export function AppMenu({
  visible,
  active,
  onSelect,
  onClose,
}: {
  visible: boolean;
  active: MenuKey;
  onSelect: (key: MenuKey) => void;
  onClose: () => void;
}) {
  const { logout, profile } = useAuth();
  const items =
    profile?.role === UserRole.ADMIN
      ? [...BASE_ITEMS, { key: "coordinators" as MenuKey, label: he.menu.coordinators }]
      : BASE_ITEMS;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.appName}>{he.app.name}</Text>
          {items.map((item) => (
            <Pressable
              key={item.key}
              style={[styles.item, active === item.key && styles.itemActive]}
              onPress={() => {
                onSelect(item.key);
                onClose();
              }}
            >
              <Text style={[styles.itemText, active === item.key && styles.itemTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
          <View style={styles.divider} />
          <Pressable style={styles.item} onPress={logout}>
            <Text style={styles.logoutText}>{he.auth.logout}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    flexDirection: "row-reverse",
  },
  panel: {
    width: "72%",
    backgroundColor: "#FFFFFF",
    paddingTop: 60,
    paddingHorizontal: 12,
  },
  appName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E3A8A",
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  itemActive: {
    backgroundColor: "#EFF6FF",
  },
  itemText: {
    fontSize: 16,
    textAlign: "right",
    writingDirection: "rtl",
    color: "#111827",
  },
  itemTextActive: {
    color: "#1E3A8A",
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  logoutText: {
    color: "#B91C1C",
    textAlign: "right",
    writingDirection: "rtl",
  },
});
