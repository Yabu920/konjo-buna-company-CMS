export function getCsrfToken(): string {
  const prefix = 'konjo_csrf=';
  const cookie = document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : '';
}

export function csrfHeaders(includeJson = true): Record<string, string> {
  const headers: Record<string, string> = { 'X-CSRF-Token': getCsrfToken() };
  if (includeJson) headers['Content-Type'] = 'application/json';
  return headers;
}
