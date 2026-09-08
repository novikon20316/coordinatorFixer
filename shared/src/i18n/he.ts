import { DegreeType, Faculty, StudentStatus, StudentTrack, UserRole } from "../constants/status";

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
  },

  menu: {
    overview: "סקירה",
    reports: "דוחות",
    changeStatus: "שינוי סטטוס",
  },

  dashboard: {
    tabs: {
      [StudentTrack.REGULAR]: "מן המניין",
      [StudentTrack.COMPLETION]: "בהשלמה",
    } as Record<StudentTrack, string>,
  },

  table: {
    columns: {
      fullName: "שם מלא",
      previousCollege: "מכללה אקדמית קודמת",
      degreeField: "תחום התואר",
      degreeType: "סוג התואר",
      gpa: "ממוצע ציונים",
      background: "רקע התלמיד",
      status: "סטטוס",
    },
  },

  status: {
    [StudentStatus.ACTIVE]: "פעיל",
    [StudentStatus.REGISTERED]: "נרשם",
    [StudentStatus.REJECTED]: "לא התקבל",
    [StudentStatus.CANCELED]: "בוטל על ידי התלמיד",
  } as Record<StudentStatus, string>,

  statusDescription: {
    [StudentStatus.ACTIVE]: "תלמיד שהחל ללמוד במכללה",
    [StudentStatus.REGISTERED]: "התלמיד נמצא כרגע בוועדת קבלה שתקבע האם הוא כשיר ללמוד",
    [StudentStatus.REJECTED]: "ממוצע ציונים מתחת ל-85 או שאין לתלמיד רקע בתחום",
    [StudentStatus.CANCELED]: "התלמיד חזר בו או שהרכז ביטל את מועמדותו",
  } as Record<StudentStatus, string>,

  degreeType: {
    [DegreeType.BA]: "תואר ראשון (BA)",
    [DegreeType.BSC]: "תואר ראשון (BSc)",
    [DegreeType.OTHER]: "אחר",
  } as Record<DegreeType, string>,

  faculty: {
    [Faculty.DATA_SCIENCE]: "מדעי הנתונים",
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
