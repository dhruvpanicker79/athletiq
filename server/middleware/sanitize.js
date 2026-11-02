// Strips Mongo operator keys ($gt, a.b) and HTML tags from all incoming input.
const SKIP = new Set(['password', 'confirmPassword', 'currentPassword', 'newPassword']);
const TAGS = /<\/?[a-z!][^>]*>/gi;

function clean(value, key) {
  if (Array.isArray(value)) return value.map((v) => clean(v));
  if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) {
      if (k.startsWith('$') || k.includes('.') || k === '__proto__' || k === 'constructor') delete value[k];
      else value[k] = clean(value[k], k);
    }
    return value;
  }
  if (typeof value === 'string' && !SKIP.has(key)) return value.replace(TAGS, '').replace(/[<>]/g, '');
  return value;
}

export const sanitize = (req, res, next) => {
  ['body', 'query', 'params'].forEach((p) => { if (req[p]) clean(req[p]); });
  next();
};
