// Minimal timezone utilities. Per UX request we avoid doing timezone conversions
// in the client and instead show only the time portion (HH:MM) of whatever
// ISO or display string the backend returned. This keeps the client from
// reinterpreting timestamps and prevents timezone labels from appearing.

export function timeOnly(inputStr) {
  if (!inputStr) return '';
  try {
    // If it's already a short display like "22:00 IST" or "22:00", extract HH:MM
    const m = String(inputStr).match(/(\d{1,2}:\d{2})/);
    if (m) return m[1];

    // Fallback: try to parse as Date and return local HH:MM (best-effort)
    const d = new Date(inputStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Last resort, return the original string
    return String(inputStr);
  } catch (err) {
    return String(inputStr);
  }
}

// Deprecated helpers (kept for compatibility but not used):
export function formatToCategoryTimezone() { return ''; }
export function formatResponseTimeWithZone(input) { return input || ''; }

/**
 * formatDateTime(inputStr, includeSeconds=false)
 * - Accepts ISO-like datetime strings (e.g. "2026-03-05T15:30:00" or
 *   "2026-03-05 15:30:00") and returns a user-friendly string
 *   "DD/MM/YYYY, HH:MM" (or with seconds if includeSeconds=true).
 * - Does not perform timezone conversions; it extracts the values present
 *   in the string to avoid reinterpreting the server-provided instant.
 */
export function formatDateTime(inputStr, includeSeconds = false) {
  if (!inputStr) return '';
  const s = String(inputStr);
  // If the string contains an explicit timezone designator (Z or ±HH:MM),
  // parse it as an absolute instant and format in the user's locale so the
  // created/updated timestamps look like "just now" to the user.
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) {
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', ...(includeSeconds ? { second: '2-digit' } : {}),
        });
      }
    } catch (err) {
      // fall through to pattern extraction
    }
  }

  // Match YYYY-MM-DDTHH:MM[:SS][...] (no timezone information) — treat as
  // server-provided local/naive timestamp and display the fields as-is.
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const year = m[1];
    const month = m[2];
    const day = m[3];
    const hour = m[4];
    const minute = m[5];
    const second = m[6] || '00';
    // Human friendly: "5 Mar 2026, 15:30"
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dayNum = String(parseInt(day, 10));
    const monthName = MONTHS[parseInt(month, 10) - 1] || month;
    return `${dayNum} ${monthName} ${year}, ${hour}:${minute}${includeSeconds ? `:${second}` : ''}`;
  }

  // Fallback: try parsing with Date and format using en-GB locale
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', ...(includeSeconds ? { second: '2-digit' } : {}),
      });
    }
  } catch (err) {
    // ignore
  }

  return s;
}

/**
 * formatDate(inputStr)
 * Returns only the date part in a human-friendly format: "5 Mar 2026".
 */
export function formatDate(inputStr) {
  if (!inputStr) return '';
  const s = String(inputStr);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const year = m[1];
    const month = m[2];
    const day = String(parseInt(m[3], 10));
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthName = MONTHS[parseInt(month, 10) - 1] || month;
    return `${day} ${monthName} ${year}`;
  }
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  } catch (err) {}
  return s;
}

/**
 * formatDateLocal(inputStr)
 * - Always parses the input as a Date and formats it in the user's locale as
 *   a short date (e.g. "05 Mar 2026"). If parsing fails, falls back to
 *   the original string.
 */
export function formatDateLocal(inputStr) {
  if (!inputStr) return '';
  try {
    const s = String(inputStr);
    // If the server returned a naive ISO datetime (no timezone designator),
    // interpret it as UTC so we can present it in the user's local timezone.
    const naiveIso = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2})?$/;
    const parsed = naiveIso.test(s) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? new Date(s + 'Z') : new Date(s);
    const d = parsed;
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  } catch (err) {
    // ignore
  }
  return String(inputStr);
}

/**
 * formatDateTimeLocal(inputStr, includeSeconds=false)
 * - Parses the input as an absolute instant (if possible) and formats it in
 *   the user's locale including time. Falls back to the original input when
 *   parsing fails.
 */
export function formatDateTimeLocal(inputStr, includeSeconds = false) {
  if (!inputStr) return '';
  try {
    const s = String(inputStr);
    const naiveIso = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2})?$/;
    const d = naiveIso.test(s) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? new Date(s + 'Z') : new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', ...(includeSeconds ? { second: '2-digit' } : {}),
      });
    }
  } catch (err) {}
  return String(inputStr);
}

/**
 * formatServerDateTime(inputStr, includeSeconds=false)
 * - Do NOT perform timezone conversion. Extract the date/time fields from an
 *   ISO-like input and present them in a human-friendly form (e.g. "04 Mar 2026, 09:30").
 * - This is intended for scheduled times which should be shown exactly as the
 *   server provided (no interpretation as a different instant in the client's timezone).
 */
export function formatServerDateTime(inputStr, includeSeconds = false) {
  if (!inputStr) return '';
  const s = String(inputStr);
  // Match YYYY-MM-DDTHH:MM[:SS] optionally followed by timezone info — we ignore the timezone part
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const year = m[1];
    const month = m[2];
    const day = m[3];
    const hour = m[4];
    const minute = m[5];
    const second = m[6] || '00';
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dayNum = String(parseInt(day, 10));
    const monthName = MONTHS[parseInt(month, 10) - 1] || month;
    return `${dayNum} ${monthName} ${year}, ${hour}:${minute}${includeSeconds ? `:${second}` : ''}`;
  }
  // Fallback to formatDateTime which will try other heuristics but avoid converting to local time
  return formatDateTime(s, includeSeconds);
}
