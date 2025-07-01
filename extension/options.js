const keyInput = document.getElementById("key");
chrome.storage.sync.get("openai_key", ({ openai_key }) => {
  if (openai_key) keyInput.value = openai_key;
});
document.getElementById("save").onclick = () => {
  chrome.storage.sync.set({ openai_key: keyInput.value.trim() }, () =>
    alert("Saved!")
  );
};
