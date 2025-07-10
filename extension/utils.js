function getVideoIdFromUrl(u) {
  try {
    const url = new URL(u);
    if (!url.hostname.includes("youtube.com")) return null;
    if (url.pathname === "/watch") return url.searchParams.get("v");
    const m = u.match(/[?&]v=([\w-]{11})/);
    return m ? m[1] : null;
  } catch (_) {
    return null;
  }
}

async function getApiKey() {
  return (await chrome.storage.sync.get("openai_key")).openai_key;
}

async function postJson(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/**
 * getTranscript(videoId) → Promise<{text, source}>
 *   source = "vtt" | "youtubei" | "live"
 */
async function getTranscript(videoId) {
  /* ----- route #1: captionTracks → VTT -------------------------------- */
  try {
    const html = await fetch(
      `https://www.youtube.com/watch?v=${videoId}&hl=en`,
      { credentials: "omit", mode: "cors" }
    ).then(r => r.text());

    const playerJson = JSON.parse(
      html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})/s)[1]
    );
    const track =
      playerJson?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.[0];

    if (track) {
      if (track.isLive) return { text: await fetchLive(track.baseUrl), source: "live" };

      const vtt = await fetch(track.baseUrl + "&fmt=vtt").then(r => r.text());
      return { text: vttToPlain(vtt), source: "vtt" };
    }
  } catch (_) { /* fall through */ }

  /* ----- route #2: internal youtubei/v1/get_transcript --------------- */
  const key = await fetchInternalApiKey();
  const payload = {
    context: { client: { clientName: "WEB", clientVersion: "2.20250701" } },
    externalVideoId: videoId,
    languageCode: "en",
    kind: "asr"
  };
  const data = await fetch(
    `https://www.youtube.com/youtubei/v1/get_transcript?key=${key}`,
    {
      method: "POST",
      credentials: "omit",
      mode: "cors",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }
  ).then(r => r.json());

  const runs =
    data?.actions?.flatMap(a =>
      a?.updateEngagementPanelAction?.content?.transcriptRenderer?.body?.transcriptBodyRenderer?.cueGroups
    )?.flatMap(g =>
      g?.transcriptCueGroupRenderer?.cues?.map(
        c => c.transcriptCueRenderer?.cue?.simpleText || ""
      )
    ) || [];

  return { text: runs.join(" "), source: "youtubei" };
}

/* ---------- helpers --------------------------------------------------- */
function vttToPlain(vtt) {
  return vtt
    .split(/\r?\n\r?\n/)
    .filter(b => /^\d+\s+\d\d:/.test(b))
    .map(b => b.split(/\r?\n/).slice(1).join(" "))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchLive(baseUrl) {
  let seq = 0, text = "";
  while (seq < 400) {
    const chunk = await fetch(baseUrl + `&seq=${seq}`).then(r => r.text());
    if (chunk.includes("<c>")) text += " " + vttToPlain(chunk);
    seq++;
    await new Promise(r => setTimeout(r, 1000));
  }
  return text.trim();
}

async function fetchInternalApiKey() {
  const homepage = await fetch("https://www.youtube.com", {
    credentials: "omit", mode: "cors"
  }).then(r => r.text());
  return homepage.match(/"INNERTUBE_API_KEY":"([^"]+)"/)[1];
}

Object.assign(window, {
  getVideoIdFromUrl,
  getApiKey,
  postJson,
  getTranscript
});
