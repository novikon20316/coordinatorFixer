import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Student, he } from "@admin-coordinator/shared";

const COLUMN_WIDTH = 130;

const COLUMNS: { key: keyof Student; label: string; render?: (s: Student) => string }[] = [
  { key: "fullName", label: he.table.columns.fullName },
  { key: "previousCollege", label: he.table.columns.previousCollege },
  { key: "degreeField", label: he.table.columns.degreeField },
  {
    key: "degreeType",
    label: he.table.columns.degreeType,
    render: (s) => he.degreeType[s.degreeType],
  },
  { key: "gpa", label: he.table.columns.gpa, render: (s) => String(s.gpa) },
  { key: "background", label: he.table.columns.background },
  { key: "status", label: he.table.columns.status, render: (s) => he.status[s.status] },
];

export function StudentsTable({ students }: { students: Student[] }) {
  if (students.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{he.common.noData}</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View>
        <View style={[styles.row, styles.headerRow]}>
          {COLUMNS.map((col) => (
            <View key={String(col.key)} style={styles.cell}>
              <Text style={styles.headerText}>{col.label}</Text>
            </View>
          ))}
        </View>
        <ScrollView>
          {students.map((student) => (
            <View key={student.id} style={styles.row}>
              {COLUMNS.map((col) => (
                <View key={String(col.key)} style={styles.cell}>
                  <Text style={styles.cellText}>
                    {col.render ? col.render(student) : String(student[col.key])}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerRow: {
    backgroundColor: "#F3F4F6",
  },
  cell: {
    width: COLUMN_WIDTH,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  headerText: {
    fontWeight: "700",
    textAlign: "right",
    writingDirection: "rtl",
    color: "#374151",
  },
  cellText: {
    textAlign: "right",
    writingDirection: "rtl",
    color: "#111827",
  },
  empty: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    color: "#6B7280",
  },
});
