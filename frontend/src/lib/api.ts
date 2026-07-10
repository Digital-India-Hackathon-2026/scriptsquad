export const API_URL = 'http://localhost:5000/api';

export const apiFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${API_URL}${path}`, options);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};
