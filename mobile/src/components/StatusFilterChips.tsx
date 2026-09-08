import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { he, STUDENT_STATUS_VALUES, StudentStatus } from "@admin-coordinator/shared";

export function StatusFilterChips({
  value,
  onChange,
}: {
  value: StudentStatus | null;
  onChange: (status: StudentStatus | null) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      <Chip label="הכל" active={value === null} onPress={() => onChange(null)} />
      {STUDENT_STATUS_VALUES.map((status) => (
        <Chip
          key={status}
          label={he.status[status]}
          active={value === status}
          onPress={() => onChange(status)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row-reverse",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    marginStart: 8,
  },
  chipActive: {
    backgroundColor: "#1E3A8A",
  },
  chipText: {
    color: "#374151",
    fontSize: 13,
    writingDirection: "rtl",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
