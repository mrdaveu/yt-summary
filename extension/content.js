const BACKEND = "https://yt-summary-dun.vercel.app";

/* ------------------------------------------------------------------ */
/* 1. observe new thumbnails on the YouTube homepage                  */
const obs = new MutationObserver(ms =>
  ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && scan(n)))
);
obs.observe(document, { childList: true, subtree: true });
scan(document);

function scan(root) {
  root.querySelectorAll("a#thumbnail:not([data-summarizer])").forEach(init);
}

async function init(a) {
  a.dataset.summarizer = "1";
  const id = getVideoIdFromUrl(a.href);
  if (!id) return;

  /* inject btn */
  const btn = document.createElement("div");
  btn.className = "summary-btn loading";
  a.parentElement.style.position = "relative";
  a.parentElement.append(btn);

  /* ask backend for cache */
  try {
    const cache = await postJson(`${BACKEND}/api/summary`, { video_id: id });
    if (cache && cache.short) renderCached(btn, cache);
    else renderGenerate(btn, id);
  } catch (e) {
    console.error(e);
    btn.remove();
  }
}

/* ------------------------------------------------------------------ */
/* 2. render states                                                   */
function renderCached(btn, s) {
  btn.className = "summary-btn cached";
  btn.title = "Hover for summaries";
  const tip = document.createElement("div");
  tip.className = "summary-tooltip";
  tip.innerHTML = `
    <p class="s1">${s.short}</p>
    <p class="s2">${s.medium}</p>
    <p class="s3">${s.long}</p>`;
  btn.onmouseenter = () => btn.append(tip);
  btn.onmouseleave = () => tip.remove();
}

function renderGenerate(btn, id) {
  btn.className = "summary-btn generate";
  btn.textContent = "?";
  btn.title = "What's this video about?";
  btn.onclick = () => generate(btn, id);
}

/* ------------------------------------------------------------------ */
/* 3. generate summary + cache                                        */
async function generate(btn, id) {
  try {
    btn.className = "summary-btn working";
    btn.textContent = "…";

    const { text } = await getTranscript(id);
    const openai_key = await getApiKey();

    const s = await postJson(`${BACKEND}/api/summarize`, {
      video_id: id, transcript: text, openai_key
    });

    renderCached(btn, s);
  } catch (err) {
    console.error(err);
    btn.textContent = "×";
    btn.title = err.message;
  }
}
