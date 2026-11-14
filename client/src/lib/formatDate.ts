export function formatBangkokDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(date);

    const day = parts.find((p) => p.type === 'day')?.value || '';
    const month = parts.find((p) => p.type === 'month')?.value || '';
    const year = parts.find((p) => p.type === 'year')?.value || '';
    const hour = parts.find((p) => p.type === 'hour')?.value || '00';
    const minute = parts.find((p) => p.type === 'minute')?.value || '00';

    return `${day} ${month} ${year}, ${hour}:${minute}`;
  } catch {
    return isoString;
  }
}
