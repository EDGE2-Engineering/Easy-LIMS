import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function camelCaseToTitleCase(str) {
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // split acronyms properly
    .replace(/([a-z])([A-Z])/g, '$1 $2') // normal camelCase split
    .replace(/^./, (s) => s.toUpperCase());
}

export function safeFormatDate(dateVal, formatStr = 'dd MMM yyyy', fallback = '-') {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch (err) {
    return fallback;
  }
}
