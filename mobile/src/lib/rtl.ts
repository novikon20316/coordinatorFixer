import { I18nManager } from "react-native";

/**
 * RN only applies a changed RTL setting after the app reloads, so this just
 * makes sure the native flag matches our Hebrew-only UI; on first install
 * that reload happens automatically. Component styles still set explicit
 * `writingDirection`/`textAlign` as a safety net for JS-side (web/Expo Go)
 * rendering that doesn't restart.
 */
export function ensureRTL() {
  if (!I18nManager.isRTL) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  }
}
