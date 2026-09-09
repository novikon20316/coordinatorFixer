"use client";

import { he, Student, StudentStatus } from "@admin-coordinator/shared";

const STATUS_STYLES: Record<StudentStatus, string> = {
  [StudentStatus.ACTIVE]: "bg-green-100 text-green-800",
  [StudentStatus.REGISTERED]: "bg-blue-100 text-blue-800",
  [StudentStatus.REJECTED]: "bg-red-100 text-red-800",
  [StudentStatus.CANCELED]: "bg-gray-200 text-gray-700",
};

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value || "—"}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function StudentDetailModal({ student, onClose }: { student: Student; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{student.fullName}</h2>
            <p className="text-xs text-gray-500">{he.studentDetail.title}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[student.status]}`}
          >
            {he.status[student.status]}
          </span>
        </div>

        {student.source === "IMPORTED" && (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {he.studentDetail.importedBadge}
          </p>
        )}

        <div className="flex flex-col gap-4">
          <Section title={he.studentDetail.personalSection}>
            <Field label={he.table.columns.fullName} value={student.fullName} />
            <Field label={he.coordinators.faculty} value={he.faculty[student.faculty]} />
          </Section>

          <Section title={he.studentDetail.academicSection}>
            <Field label={he.table.columns.previousCollege} value={student.previousCollege} />
            <Field label={he.table.columns.degreeField} value={student.degreeField} />
            <Field label={he.table.columns.degreeType} value={he.degreeType[student.degreeType]} />
            <Field label={he.table.columns.gpa} value={student.gpa} />
            <Field label={he.table.columns.background} value={student.background} />
          </Section>

          <Section title={he.studentDetail.statusSection}>
            <Field label={he.studentForm.track} value={he.dashboard.tabs[student.track]} />
            <Field label={he.table.columns.status} value={he.status[student.status]} />
          </Section>
          <p className="-mt-2 text-xs text-gray-500">{he.statusDescription[student.status]}</p>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            {he.studentDetail.close}
          </button>
        </div>
      </div>
    </div>
  );
}
