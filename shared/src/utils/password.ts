/**
 * Ported from organization-all-system/web/app/admin/panel/NewUserModal.tsx's
 * generateReadableTempPassword - a readable, easy-to-relay-by-phone temp
 * password: excludes visually ambiguous characters (I/O/l/0/1) and always
 * includes a digit + symbol so it satisfies typical password rules without
 * needing to loop-retry random generation.
 */
export function generateReadableTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${out}1!`;
}
