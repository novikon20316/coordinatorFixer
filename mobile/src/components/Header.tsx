import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function Header({ title, onMenuPress }: { title: string; onMenuPress: () => void }) {
  return (
    <View style={styles.container}>
      <Pressable onPress={onMenuPress} hitSlop={12} style={styles.menuButton}>
        <View style={styles.bar} />
        <View style={styles.bar} />
        <View style={styles.bar} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#1E3A8A",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    writingDirection: "rtl",
  },
  menuButton: {
    gap: 4,
    padding: 4,
  },
  bar: {
    width: 22,
    height: 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 1,
  },
  spacer: {
    width: 30,
  },
});
