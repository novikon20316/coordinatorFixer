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
    reports: "דוחות",
    changeStatus: "שינוי סטטוס",
    coordinators: "ניהול רכזים",
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
