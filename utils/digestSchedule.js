function zonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'Africa/Cairo',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    minutes: (Number(parts.hour) % 24) * 60 + Number(parts.minute),
    weekday: weekdays[parts.weekday],
  };
}

function isDigestDue(settings, now = new Date()) {
  if (!settings.digestEnabled) return false;
  const [hour, minute] = String(settings.digestTimeOfDay || '08:00').split(':').map(Number);
  const targetMinutes = (Number.isFinite(hour) ? hour : 8) * 60 + (Number.isFinite(minute) ? minute : 0);
  const current = zonedParts(now, settings.timeZone);
  const diff = Math.abs(current.minutes - targetMinutes);
  const withinWindow = Math.min(diff, 1440 - diff) <= 5;
  if (!withinWindow) return false;
  if (settings.digestFrequency === 'weekly') {
    return current.weekday === Number(settings.digestWeekday);
  }
  return true;
}

module.exports = { zonedParts, isDigestDue };
