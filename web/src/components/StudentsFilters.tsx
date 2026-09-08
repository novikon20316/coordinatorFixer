"use client";

import { DEGREE_TYPE_VALUES, he, Student, STUDENT_STATUS_VALUES } from "@admin-coordinator/shared";

export interface StudentFilterState {
  previousCollege: string;
  degreeField: string;
  degreeType: string;
  status: string;
  minGpa: string;
  maxGpa: string;
}

export const emptyFilters: StudentFilterState = {
  previousCollege: "",
  degreeField: "",
  degreeType: "",
  status: "",
  minGpa: "",
  maxGpa: "",
};

export function applyFilters(students: Student[], filters: StudentFilterState): Student[] {
  return students.filter((s) => {
    if (filters.previousCollege && s.previousCollege !== filters.previousCollege) return false;
    if (filters.degreeField && s.degreeField !== filters.degreeField) return false;
    if (filters.degreeType && s.degreeType !== filters.degreeType) return false;
    if (filters.status && s.status !== filters.status) return false;
    if (filters.minGpa && s.gpa < Number(filters.minGpa)) return false;
    if (filters.maxGpa && s.gpa > Number(filters.maxGpa)) return false;
    return true;
  });
}

function distinct(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "he"));
}

export function StudentsFilters({
  students,
  value,
  onChange,
}: {
  students: Student[];
  value: StudentFilterState;
  onChange: (filters: StudentFilterState) => void;
}) {
  const colleges = distinct(students.map((s) => s.previousCollege));
  const fields = distinct(students.map((s) => s.degreeField));

  function set<K extends keyof StudentFilterState>(key: K, val: string) {
    onChange({ ...value, [key]: val });
  }

  const selectClass =
    "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none";

  return (
    <div className="flex flex-wrap gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <select
        className={selectClass}
        value={value.previousCollege}
        onChange={(e) => set("previousCollege", e.target.value)}
      >
        <option value="">{he.table.columns.previousCollege}</option>
        {colleges.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={value.degreeField}
        onChange={(e) => set("degreeField", e.target.value)}
      >
        <option value="">{he.table.columns.degreeField}</option>
        {fields.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={value.degreeType}
        onChange={(e) => set("degreeType", e.target.value)}
      >
        <option value="">{he.table.columns.degreeType}</option>
        {DEGREE_TYPE_VALUES.map((d) => (
          <option key={d} value={d}>
            {he.degreeType[d]}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={value.status}
        onChange={(e) => set("status", e.target.value)}
      >
        <option value="">{he.table.columns.status}</option>
        {STUDENT_STATUS_VALUES.map((s) => (
          <option key={s} value={s}>
            {he.status[s]}
          </option>
        ))}
      </select>

      <input
        className={`${selectClass} w-24`}
        type="number"
        placeholder="ממוצע מ-"
        value={value.minGpa}
        onChange={(e) => set("minGpa", e.target.value)}
      />
      <input
        className={`${selectClass} w-24`}
        type="number"
        placeholder="ממוצע עד"
        value={value.maxGpa}
        onChange={(e) => set("maxGpa", e.target.value)}
      />

      {(Object.values(value).some(Boolean)) && (
        <button
          className="rounded-md px-3 py-2 text-sm font-medium text-blue-700 hover:underline"
          onClick={() => onChange(emptyFilters)}
        >
          נקה סינון
        </button>
      )}
    </div>
  );
}
