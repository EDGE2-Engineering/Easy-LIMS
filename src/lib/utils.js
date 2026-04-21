import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

export function camelCaseToTitleCase(str) {
	return str
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // split acronyms properly
		.replace(/([a-z])([A-Z])/g, '$1 $2')       // normal camelCase split
		.replace(/^./, s => s.toUpperCase());
}