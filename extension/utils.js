export function getVideoIdFromUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      // home thumbnails come as /watch?v=ID in href
      const vMatch = u.search.match(/[?&]v=([\w-]{11})/);
      return vMatch ? vMatch[1] : null;
    }
  } catch (_) {}
  return null;
}

export async function getApiKey() {
  return (await chrome.storage.sync.get("openai_key")).openai_key;
}

export async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
