let currentVideo = null;
let lastPlaying = null;
let reconnectTimer;

function report(playing, force = false) {
  if (!force && lastPlaying === playing) return;
  lastPlaying = playing;
  chrome.runtime.sendMessage({ type: "YOUTUBE_PLAYING", playing }, () => {
    // Reading lastError prevents a harmless missing-response warning.
    void chrome.runtime.lastError;
  });
}

function attachVideo(video) {
  if (currentVideo === video) return;

  if (currentVideo) {
    currentVideo.removeEventListener("play", onPlay);
    currentVideo.removeEventListener("pause", onPause);
    currentVideo.removeEventListener("ended", onPause);
  }

  currentVideo = video;
  if (!currentVideo) {
    report(false);
    return;
  }

  currentVideo.addEventListener("play", onPlay);
  currentVideo.addEventListener("pause", onPause);
  currentVideo.addEventListener("ended", onPause);
  report(!currentVideo.paused && !currentVideo.ended);
}

function onPlay() {
  report(true);
}

function onPause() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    const video = document.querySelector("video");
    attachVideo(video);
    if (video === currentVideo) report(!video.paused && !video.ended);
  }, 100);
}

function findVideo() {
  attachVideo(document.querySelector("video"));
}

findVideo();
new MutationObserver(findVideo).observe(document.documentElement, {
  childList: true,
  subtree: true
});

document.addEventListener("yt-navigate-finish", findVideo);

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "CHECK_VIDEO") return;
  const playing = Boolean(currentVideo && !currentVideo.paused && !currentVideo.ended);
  report(playing, true);
});
