export function isSafeString(value, maxLength = 255) {
  if (typeof value !== 'string') return false;
  if (value.length > maxLength) return false;
  const blockedPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror\s*=/i,
    /onload\s*=/i,
    /\$where/i,
    /union\s+select/i,
    /drop\s+table/i
  ];
  return !blockedPatterns.some((pattern) => pattern.test(value));
}

export function sanitizeString(value, maxLength = 255) {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, maxLength);
}

export function isPositiveMoney(value) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 && num <= 999999.99;
}

export function isPositiveInteger(value) {
  const num = Number(value);
  return Number.isInteger(num) && num >= 0;
}

export function isValidPassword(password, minLength = 8) {
  if (typeof password !== 'string') return false;
  if (password.length < minLength) return false;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasLetter && hasNumber;
}
