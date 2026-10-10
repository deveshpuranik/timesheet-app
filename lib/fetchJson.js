// Small fetch wrapper for the browser: always returns parsed JSON and throws an
// Error with the server's message when the request fails.
export async function fetchJson(url, options) {
  let response;

  try {
    response = await fetch(url, { cache: "no-store", ...options });
  } catch {
    throw new Error("Could not reach the server. Please check your internet connection.");
  }

  const text = await response.text();
  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }

  if (!response.ok) {
    const error = new Error(
      data?.message || `Something went wrong (error ${response.status}). Please try again.`
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

export function postJson(url, body, method = "POST") {
  return fetchJson(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
