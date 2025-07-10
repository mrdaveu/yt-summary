import { getVideoIdFromUrl, getApiKey, postJson } from "./utils.js";

const BACKEND = "https://your-backend-domain.vercel.app";

/** Observe added thumbnails on the homepage */
const thumbObserver = new MutationObserver(mutations => {
  mutations.forEach(m => {
    m.addedNodes.forEach(n => {
      if (n.nodeType === 1) scanForThumbnails(n);
    });
  });
});
thumbObserver.observe(document, { childList: true, subtree: true });
scanForThumbnails(document);

function scanForThumbnails(root) {
  root.querySelectorAll("a#thumbnail:not([data-summarizer])").forEach(initThumb);
}

async function initThumb(a) {
  a.dataset.summarizer = "true";
  const videoId = getVideoIdFromUrl(a.href);
  if (!videoId) return;

  // create button container
  const btn = document.createElement("div");
  btn.className = "summary-btn loading";
  a.parentElement.style.position = "relative";
  a.parentElement.appendChild(btn);

  // pre-check cache
  try {
    const res = await postJson(`${BACKEND}/api/summary`, { video_id: videoId });
    if (res && res.short) {
      btn.className = "summary-btn cached";
      btn.title = "Hover for summaries";
      attachCachedHover(btn, res);
    } else {
      btn.className = "summary-btn generate";
      btn.textContent = "?";
      btn.title = "What's this video about?";
      btn.onclick = () => generateAndShow(btn, videoId);
    }
  } catch (e) {
    console.error(e);
    btn.remove(); // fail silently
  }
}

function attachCachedHover(btn, summaries) {
  const tooltip = document.createElement("div");
  tooltip.className = "summary-tooltip";
  tooltip.innerHTML = `
      <p class="s s1">${summaries.short}</p>
      <p class="s s2">${summaries.medium}</p>
      <p class="s s3">${summaries.long}</p>`;
  btn.onmouseenter = () => btn.appendChild(tooltip);
  btn.onmouseleave = () => tooltip.remove();
}

async function generateAndShow(btn, videoId) {
  btn.className = "summary-btn working";
  btn.textContent = "…";
  try {
    const transcript = await fetchTranscript(videoId);
    const apiKey = await getApiKey();
    const data = await postJson(`${BACKEND}/api/summarize`, {
      video_id: videoId,
      transcript,
      openai_key: apiKey
    });
    attachCachedHover(btn, data);
    btn.className = "summary-btn cached";
    btn.textContent = "";
  } catch (err) {
    console.error(err);
    btn.textContent = "×";
    btn.title = err.message;
  }
}

/** Client-side transcript fetch via POST */
async function fetchTranscript(videoId) {
  const payload = {
    context: {
      client: { clientName: "WEB", clientVersion: "2.20250701.00.00" }
    },
    externalVideoId: videoId,
    languageCode: "en",
    kind: "asr"
  };
  const res = await fetch(
    "https://www.youtube.com/youtubei/v1/get_transcript?key=AIzaSyDQ-FAKE-KEY-Zk", // YouTube internal key leakage is common; rotate when needed
    {
      method: "POST",
      credentials: "omit",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  );
  if (!res.ok) throw new Error("Transcript fetch failed");
  const data = await res.json();
  // Minimal parsing: flatten text runs
  return data?.actions
    ?.flatMap(a => a?.updateEngagementPanelAction?.content?.transcriptRenderer?.body?.url)
    ?.join(" ") ?? "";
}
