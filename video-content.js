let videos = new Set();
let lastPlaying = null;

function report(force = false) {
  const playing = [...videos].some((video) => !video.paused && !video.ended);
  if (!force && lastPlaying === playing) return;

  lastPlaying = playing;
  chrome.runtime.sendMessage({ type: "VIDEO_PLAYING", playing }, () => {
    // Reading lastError prevents a harmless missing-response warning.
    void chrome.runtime.lastError;
  });
}

function onPlaybackChange() {
  report();
}

function watchVideo(video) {
  if (videos.has(video)) return;

  videos.add(video);
  video.addEventListener("play", onPlaybackChange);
  video.addEventListener("playing", onPlaybackChange);
  video.addEventListener("pause", onPlaybackChange);
  video.addEventListener("ended", onPlaybackChange);
  video.addEventListener("emptied", onPlaybackChange);
}

function unwatchVideo(video) {
  video.removeEventListener("play", onPlaybackChange);
  video.removeEventListener("playing", onPlaybackChange);
  video.removeEventListener("pause", onPlaybackChange);
  video.removeEventListener("ended", onPlaybackChange);
  video.removeEventListener("emptied", onPlaybackChange);
  videos.delete(video);
}

function syncVideos() {
  const currentVideos = new Set(document.querySelectorAll("video"));

  for (const video of videos) {
    if (!currentVideos.has(video)) unwatchVideo(video);
  }

  for (const video of currentVideos) watchVideo(video);
  report();
}

syncVideos();
new MutationObserver(syncVideos).observe(document.documentElement, {
  childList: true,
  subtree: true
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "CHECK_VIDEO") return;
  syncVideos();
  report(true);
});
