// Tiny API helper. Everything the app knows lives on the local server.
export async function api<T = any>(path: string, body?: any, method?: string): Promise<T> {
  const res = await fetch(path, {
    method: method || (body !== undefined ? 'POST' : 'GET'),
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function upload<T = any>(path: string, file: File): Promise<T> {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: await file.arrayBuffer() });
  const data = await res.json().catch(() => ({ error: 'Upload failed' }));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export const fileUrl = (p: string) => `/files/${p.split('/').map(encodeURIComponent).join('/')}`;

export function trackActivity(path: string, label: string) {
  api('/api/activity', { path, label }).catch(() => {});
}

export const SKILL_COLORS: Record<string, string> = { excel: '#15803d', sql: '#2563eb', pq: '#b45309', pbi: '#ca8a04', think: '#7c3aed' };
export const SKILL_NAMES: Record<string, string> = { excel: 'Excel', sql: 'SQL', pq: 'Power Query', pbi: 'Power BI', think: 'Analyst Thinking' };
export const STATUS_LABEL: Record<string, string> = { locked: 'Locked', new: 'Not started', placed: 'To confirm', learning: 'Learning', practicing: 'Practicing', good: 'Good', mastered: 'Mastered' };
