import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { he, STUDENT_TRACK_VALUES, StudentTrack } from "@admin-coordinator/shared";

export function TrackTabs({
  value,
  onChange,
}: {
  value: StudentTrack;
  onChange: (track: StudentTrack) => void;
}) {
  return (
    <View style={styles.container}>
      {STUDENT_TRACK_VALUES.map((track) => {
        const active = track === value;
        return (
          <Pressable
            key={track}
            onPress={() => onChange(track)}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {he.dashboard.tabs[track]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row-reverse",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 4,
    margin: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#2563EB",
  },
  tabText: {
    fontWeight: "600",
    color: "#374151",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
});
