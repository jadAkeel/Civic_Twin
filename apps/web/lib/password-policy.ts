/**
 * Mirrors apps/api/app/core/security.py so people get an Arabic explanation before
 * submitting. The API remains the authority and re-checks every rule.
 */
export const PASSWORD_MIN_LENGTH = 10;

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "passw0rd",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyuiop",
  "administrator",
  "citymind",
  "citymind123",
  "tripoli123",
  "changeme",
  "letmein",
  "welcome1",
  "iloveyou",
]);
const SEQUENCES = /(?:abcdefg|0123456|1234567|7654321|qwertyu)/i;

export function passwordProblem(password: string, email = ""): string | null {
  const candidate = password.normalize("NFKC");
  if (candidate.length < PASSWORD_MIN_LENGTH) {
    return `يجب أن تتكون كلمة المرور من ${PASSWORD_MIN_LENGTH} أحرف على الأقل.`;
  }
  if (candidate.length > 128) return "يجب ألا تتجاوز كلمة المرور 128 حرفًا.";
  if (candidate.trim() !== candidate) return "يجب ألا تبدأ كلمة المرور أو تنتهي بمسافة.";

  const lowered = candidate.toLowerCase();
  if (COMMON_PASSWORDS.has(lowered)) return "كلمة المرور شائعة جدًا. اختر عبارة مرور فريدة.";
  if (SEQUENCES.test(lowered)) return "يجب ألا تحتوي كلمة المرور على تسلسل أحرف أو أرقام متتالية.";
  if (new Set(candidate).size < 5) return "يجب ألا تكرر كلمة المرور الأحرف نفسها.";

  const localPart = email.split("@")[0]?.toLowerCase() ?? "";
  if (localPart.length >= 3 && lowered.includes(localPart)) {
    return "يجب ألا تحتوي كلمة المرور على بريدك الإلكتروني.";
  }

  // Same five classes as the API. Arabic letters (\p{Lo}) are a class of their own,
  // so an Arabic passphrase with digits and a separator is accepted.
  const classes = [/\p{Ll}/u, /\p{Lu}/u, /\p{Lo}/u, /\p{Nd}/u, /[^\p{L}\p{N}]/u].filter((pattern) =>
    pattern.test(candidate),
  ).length;
  if (classes < 3) {
    return "استخدم ثلاثة أنواع على الأقل من: أحرف عربية، أحرف لاتينية صغيرة، أحرف لاتينية كبيرة، أرقام، رموز أو مسافات.";
  }
  return null;
}
