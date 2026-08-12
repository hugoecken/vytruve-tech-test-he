import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges conditional class names while resolving Tailwind conflicts.
 *
 * @param inputs Class values supplied by a component or its caller.
 * @returns One normalized class name string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
