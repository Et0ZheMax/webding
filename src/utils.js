function sanitizeText(input, max = 300) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function parsePositiveInt(value, fallback = 1) {
  const num = Number.parseInt(value, 10);
  if (Number.isNaN(num) || num < 0) return fallback;
  return num;
}

module.exports = { sanitizeText, parsePositiveInt };
