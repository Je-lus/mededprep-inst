/**
 * Express 5 compatibility helper for req.params/req.query values
 *
 * Express 5 params and query values can be string | string[]
 * This helper extracts the first value when an array is provided
 */
export function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}
