import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Faculty, Student, StudentStatus, StudentTrack } from "@admin-coordinator/shared";
import { TrackTabs } from "../components/TrackTabs";
import { StatusFilterChips } from "../components/StatusFilterChips";
import { StudentsTable } from "../components/StudentsTable";
import { subscribeStudents } from "../data/studentsRepository";

// Faculty selection will become a real picker once additional faculties exist.
const CURRENT_FACULTY = Faculty.DATA_SCIENCE;

export function DashboardScreen() {
  const [track, setTrack] = useState<StudentTrack>(StudentTrack.REGULAR);
  const [students, setStudents] = useState<Student[]>([]);
  const [statusFilter, setStatusFilter] = useState<StudentStatus | null>(null);

  useEffect(() => {
    setStatusFilter(null);
    const unsubscribe = subscribeStudents(CURRENT_FACULTY, track, setStudents);
    return unsubscribe;
  }, [track]);

  const filtered = useMemo(
    () => (statusFilter ? students.filter((s) => s.status === statusFilter) : students),
    [students, statusFilter]
  );

  return (
    <View style={styles.container}>
      <TrackTabs value={track} onChange={setTrack} />
      <StatusFilterChips value={statusFilter} onChange={setStatusFilter} />
      <StudentsTable students={filtered} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
