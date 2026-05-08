// lib/fetchJson.js
export async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text(); // read as text first
  const data = text ? JSON.parse(text) : {}; // only parse if not empty

  if (!response.ok) {
    throw new Error(data?.message || `Request failed with status ${response.status}`);
  }

  return data;
}