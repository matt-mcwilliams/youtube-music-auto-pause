const checkbox = document.querySelector("#enabled");
const status = document.querySelector("#status");

function render(enabled) {
  checkbox.checked = enabled;
  status.textContent = enabled
    ? "On — music pauses for YouTube videos"
    : "Off — music will not be controlled";
}

chrome.storage.local.get({ enabled: false }, ({ enabled }) => {
  render(enabled === true);
});

checkbox.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: checkbox.checked }, () => {
    void chrome.runtime.lastError;
  });
  render(checkbox.checked);
});
