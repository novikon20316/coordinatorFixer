import { CandidateStatus, DegreeType, Faculty, StudentStatus, StudentTrack, UserRole } from "../constants/status";

/**
 * Single source of truth for Hebrew display labels. When additional
 * languages are introduced, add a sibling file (e.g. `en.ts`) with the same
 * shape and select the active dictionary based on user/app locale.
 */
export const he = {
  locale: "he",
  direction: "rtl" as const,

  app: {
    name: "מערכת רכזי הקבלה",
  },

  auth: {
    loginTitle: "התחברות",
    email: "אימייל",
    password: "סיסמה",
    login: "התחבר",
    forgotPassword: "שכחתי סיסמה",
    forgotPasswordTitle: "שחזור סיסמה",
    sendResetLink: "שלח קישור לאיפוס סיסמה",
    backToLogin: "חזרה להתחברות",
    resetLinkSent: "קישור לאיפוס סיסמה נשלח לכתובת האימייל",
    invalidCredentials: "אימייל או סיסמה שגויים",
    logout: "התנתקות",
    resetPasswordTitle: "קביעת סיסמה חדשה",
    newPassword: "סיסמה חדשה",
    confirmNewPassword: "אימות סיסמה חדשה",
    submitNewPassword: "עדכן סיסמה",
    passwordMismatch: "הסיסמאות אינן תואמות",
    passwordTooShort: "הסיסמה חייבת להכיל לפחות 6 תווים",
    resetSuccess: "הסיסמה עודכנה בהצלחה. ניתן להתחבר כעת",
    invalidOrExpiredLink: "הקישור אינו תקין או שפג תוקפו",
    requestNewLink: "בקש קישור חדש",
    or: "או",
    continueWithGoogle: "המשך עם Google",
    continueWithApple: "המשך עם Apple",
    accountExistsDifferentMethod: "כתובת האימייל הזו כבר רשומה עם שיטת התחברות אחרת",
    socialSignInFailed: "ההתחברות נכשלה, נסה שוב",
    noAccount: "החשבון הזה אינו רשום במערכת - פנה למנהל המערכת",
  },

  menu: {
    overview: "סקירה",
    candidates: "מועמדים",
    reports: "דוחות",
    changeStatus: "שינוי סטטוס",
    coordinators: "ניהול רכזים",
    facultyFilter: "פקולטה מוצגת",
  },

  coordinators: {
    title: "ניהול רכזים",
    addNew: "רכז חדש",
    fullName: "שם מלא",
    email: "אימייל",
    tempPassword: "סיסמה זמנית",
    generatePassword: "צור סיסמה",
    copyPassword: "העתק סיסמה",
    copied: "הועתק!",
    faculty: "פקולטה",
    selectFaculty: "בחר פקולטה",
    create: "צור רכז",
    createSuccess: "הרכז נוצר בהצלחה",
    tempPasswordHint: "הרכז ישתמש ב\"שכחתי סיסמה\" כדי לקבוע סיסמה משלו",
    active: "פעיל",
    disabled: "מושבת",
    disable: "השבת",
    enable: "הפעל",
    noCoordinators: "עדיין לא נוספו רכזים",
    accessDenied: "הדף הזה מיועד למנהל המערכת בלבד",
    getResetLink: "קישור לאיפוס סיסמה",
    resetLinkTitle: "קישור לאיפוס סיסמה",
    resetLinkHint: "העתק ושלח לרכז - הקישור תקף לזמן מוגבל ומיועד לשימוש חד פעמי",
    copyLink: "העתק קישור",
    close: "סגור",
  },

  dashboard: {
    tabs: {
      [StudentTrack.REGULAR]: "מן המניין",
      [StudentTrack.COMPLETION]: "בהשלמה",
    } as Record<StudentTrack, string>,
    addStudent: "הוספת תלמיד",
    importStudents: "ייבוא תלמידים",
    importGrades: "ייבוא ציונים",
    importRoster: "ייבוא רשימת מחזור",
    studentsListTitle: "רשימת סטודנטים",
    searchPlaceholder: "חיפוש לפי שם או ת.ז...",
    cohortFilterAll: "כל המחזורים",
    sortAscending: "מיון א-ת",
    sortDescending: "מיון ת-א",
    graduatesTab: "בוגרים",
  },

  studentForm: {
    title: "הוספת סטודנט/ית חדש/ה",
    idNumber: "תעודת זהות",
    idNumberPlaceholder: "לדוגמה: 123456789",
    fullNamePlaceholder: "לדוגמה: רון כהן",
    track: "מסלול",
    cohortYear: "מחזור",
    create: "הוסף לרשימה",
    createSuccess: "התלמיד נוסף בהצלחה",
  },

  studentCard: {
    cohortYear: "מחזור",
    yearOfStudy: {
      1: "שנה א׳",
      2: "שנה ב׳",
      GRADUATED: "בוגר/ת",
    } as Record<"1" | "2" | "GRADUATED", string>,
    projectSection: "פרויקט / תזה",
    projectTitle: "שם הפרויקט",
    supervisorName: "שם המנחה",
    milestones: "אבני דרך",
    addMilestone: "הוסף אבן דרך",
    milestoneNamePlaceholder: "שם אבן הדרך",
    removeMilestone: "הסר",
    finalGrade: "ציון סופי",
    courseworkSection: "מקצועות לתואר",
    addCourse: "הוסף קורס",
    courseName: "שם הקורס",
    credits: "נ\"ז",
    grade: "ציון",
    passed: "עבר/ה",
    removeCourse: "הסר",
    academicHistorySection: "היסטוריה אקדמית",
    academicHistoryEmpty: "לא יובאה היסטוריית ציונים",
    semesterAverage: "ממוצע סמסטר",
    semesterLabel: {
      A: "סמסטר א׳",
      B: "סמסטר ב׳",
    } as Record<"A" | "B", string>,
    notes: "הערות",
    requiredCompletionCourses: "קורסי השלמה נדרשים",
    moreDetails: "פרטים נוספים",
    clearanceForm: "פתיחת טופס סילוקין",
  },

  studentDetail: {
    title: "פרטי תלמיד",
    personalSection: "פרטים אישיים",
    academicSection: "רקע אקדמי",
    statusSection: "סטטוס קבלה",
    importedBadge: "יובא ממערכת חיצונית - יש להשלים פרטים",
    close: "סגור",
  },

  studentImport: {
    title: "ייבוא תלמידים ממערכת אחרת",
    description:
      "אין כרגע חיבור אוטומטי בין המערכות. יש לייצא את רשימת המשתמשים מהמערכת השנייה לקובץ Excel (תפריט הרכזים/מנהל שם) ולהעלות אותו כאן. שורות שאינן מסומנות כתלמיד יידלגו, ושדות שלא קיימים במערכת המקור (מכללה קודמת, תחום, ממוצע, רקע) יישארו ריקים להשלמה ידנית.",
    uploadButton: "בחר קובץ Excel",
    uploading: "מייבא...",
    resultSummary: "יובאו {created} מתוך {total} שורות ({skipped} דולגו, {failed} נכשלו)",
    noRows: "לא נמצאו שורות בקובץ",
  },

  candidates: {
    title: "מועמדים",
    addNew: "הוספת מועמד/ת",
    applyingForYear: "מועמד/ת למחזור",
    previousCollege: "מכללה אקדמית קודמת",
    degreeField: "תחום התואר",
    gpa: "ממוצע ציונים",
    background: "רקע",
    completionCoursesSection: "קורסי השלמה",
    completionAverage: "ממוצע השלמות",
    acceptanceDecision: "החלטת ועדת קבלה",
    acceptanceDecisionOptions: {
      REGULAR: "מן המניין",
      CONDITIONAL: "על תנאי",
      NOT_REGULAR: "לא מן המניין",
      "": "טרם הוחלט",
    } as Record<"REGULAR" | "CONDITIONAL" | "NOT_REGULAR" | "", string>,
    committeeNotes: "חוות דעת הוועדה",
    promote: "קבל וצרף כתלמיד/ה",
    promoteConfirm: "לצרף את המועמד/ת כתלמיד/ה פעיל/ה במחזור שאליו הוא/היא מועמד/ת?",
    promoteSuccess: "המועמד/ת צורף/ה כתלמיד/ה",
    alreadyPromoted: "כבר צורף/ה כתלמיד/ה",
    importCandidates: "ייבוא מועמדים",
    noCandidates: "לא נוספו מועמדים",
  },

  candidateStatus: {
    [CandidateStatus.PENDING]: "בבדיקה",
    [CandidateStatus.ACCEPTED]: "התקבל/ה",
    [CandidateStatus.REJECTED]: "נדחה/תה",
    [CandidateStatus.WITHDRAWN]: "ביטל/ה מועמדות",
  } as Record<CandidateStatus, string>,

  importReview: {
    title: "בדיקת ייבוא לפני שמירה",
    description: "אלו הרשומות שיובאו מהקובץ. ניתן לבטל סימון שורות שלא רוצים לייבא.",
    rowsFound: "נמצאו {count} שורות",
    actionNew: "חדש",
    actionUpdate: "עדכון: {name}",
    confirm: "אישור ייבוא",
    confirming: "מייבא...",
    cancel: "ביטול",
    resultSummary: "יובאו/עודכנו {count} רשומות",
  },

  reports: {
    title: "דוחות",
    balanceReportTitle: "מאזן חובות",
    balanceReportDescription: "בחרו מחזור להורדת קובץ Excel עם רשימת התלמידים שלו ומצבם האקדמי.",
    cohortLabel: "מחזור",
    download: "הורד דוח",
    noStudents: "אין תלמידים במחזור זה",
    columns: {
      cohortLabel: "מחזור",
      track: "מסלול",
      status: "סטטוס",
      wasEverCompletion: "האם היה בהשלמה",
      coreCurriculumProgress: "מקצועות ליבה שהושלמו",
      finalGrade: "ציון סופי",
      projectTitle: "שם הפרויקט",
      supervisorName: "שם המנחה",
    },
    yes: "כן",
    no: "לא",
  },

  changeStatus: {
    title: "שינוי סטטוס",
    trackFilterAll: "כל המסלולים",
    facultyFilterAll: "כל הפקולטות",
    clickToChange: "לחצו על שורת תלמיד/ה כדי לשנות את הסטטוס שלו/ה",
    modalTitle: "שינוי סטטוס",
    newStatus: "סטטוס חדש",
  },

  table: {
    columns: {
      fullName: "שם מלא",
      idNumber: "תעודת זהות",
      previousCollege: "מכללה אקדמית קודמת",
      degreeField: "תחום התואר",
      degreeType: "סוג התואר",
      gpa: "ממוצע ציונים",
      background: "רקע התלמיד",
      status: "סטטוס",
      cohortYear: "מחזור",
    },
  },

  status: {
    [StudentStatus.ACTIVE]: "פעיל",
    [StudentStatus.CANCELED_REGISTRATION]: "ביטל הרשמה",
    [StudentStatus.INTERNAL_MAPPING]: "מיפוי פנימי",
    [StudentStatus.NOT_REGULAR]: "לא מן המניין",
    [StudentStatus.CONDITIONAL]: "על תנאי",
    [StudentStatus.ON_LEAVE]: "בחופשה",
    [StudentStatus.GRADUATED_ELIGIBLE]: "בוגר סיים טופס טיולים וזכאי לתואר",
    [StudentStatus.GRADUATED_PENDING]: "בוגר בטופס טיולים לקראת זכאות לתואר",
  } as Record<StudentStatus, string>,

  // Meanings not yet provided for the 8-value status list above - left
  // blank rather than guessing at wrong descriptions; fill in once they
  // arrive (see status.ts's module comment).
  statusDescription: {
    [StudentStatus.ACTIVE]: "",
    [StudentStatus.CANCELED_REGISTRATION]: "",
    [StudentStatus.INTERNAL_MAPPING]: "",
    [StudentStatus.NOT_REGULAR]: "",
    [StudentStatus.CONDITIONAL]: "",
    [StudentStatus.ON_LEAVE]: "",
    [StudentStatus.GRADUATED_ELIGIBLE]: "",
    [StudentStatus.GRADUATED_PENDING]: "",
  } as Record<StudentStatus, string>,

  degreeType: {
    [DegreeType.BA]: "תואר ראשון (BA)",
    [DegreeType.BSC]: "תואר ראשון (BSc)",
    [DegreeType.OTHER]: "אחר",
  } as Record<DegreeType, string>,

  faculty: {
    [Faculty.SCIENCES]: "הפקולטה למדעים",
    [Faculty.ELECTRICAL]: "הפקולטה להנדסת חשמל ואלקטרוניקה",
    [Faculty.INDUSTRIAL]: "הפקולטה להנדסת תעשייה וניהול טכנולוגיה",
    [Faculty.LEARNING_TECH]: "הפקולטה לטכנולוגיות למידה",
    [Faculty.MEDICAL_TECH]: "הפקולטה לטכנולוגיות רפואיות",
    [Faculty.DESIGN]: "הפקולטה לעיצוב",
    [Faculty.DATA_SCIENCE]: "המחלקה למדעי הנתונים",
  } as Record<Faculty, string>,

  role: {
    [UserRole.ADMIN]: "מנהל מערכת",
    [UserRole.COORDINATOR]: "רכז",
  } as Record<UserRole, string>,

  common: {
    save: "שמירה",
    cancel: "ביטול",
    edit: "עריכה",
    delete: "מחיקה",
    loading: "טוען...",
    noData: "אין נתונים להצגה",
    error: "אירעה שגיאה",
    comingSoon: "בקרוב",
  },
};

export type Dictionary = typeof he;
