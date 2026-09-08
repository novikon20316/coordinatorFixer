import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { he } from "@admin-coordinator/shared";

export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{he.common.comingSoon}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    writingDirection: "rtl",
    color: "#111827",
  },
  subtitle: {
    color: "#6B7280",
    writingDirection: "rtl",
  },
});
