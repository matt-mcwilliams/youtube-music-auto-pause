function getMedia() {
  return document.querySelector("video, audio");
}

function getPlayButton() {
  return document.querySelector(
    "#play-pause-button, button[aria-label^='Play'], [role='button'][aria-label^='Play']"
  );
}

async function resumeMusic() {
  const media = getMedia();

  if (media && !media.paused && !media.ended) return true;

  if (media) {
    try {
      await media.play();
      if (!media.paused && !media.ended) return true;
    } catch (_error) {
      // Chromium may reject play() when it is not directly user initiated.
    }
  }

  // YouTube Music's own control can succeed when direct media.play() is blocked.
  const button = getPlayButton();
  if (!button) return false;
  button.click();
  await new Promise((resolve) => setTimeout(resolve, 250));

  const currentMedia = getMedia();
  return Boolean(currentMedia && !currentMedia.paused && !currentMedia.ended);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const media = getMedia();

  if (message?.type === "GET_MUSIC_STATE") {
    sendResponse({ playing: Boolean(media && !media.paused && !media.ended) });
    return;
  }

  if (message?.type === "PAUSE_MUSIC") {
    if (!media || media.paused || media.ended) {
      sendResponse({ paused: false });
      return;
    }

    media.pause();
    sendResponse({ paused: true });
    return;
  }

  if (message?.type === "RESUME_MUSIC") {
    resumeMusic().then((resumed) => sendResponse({ resumed }));
    return true;
  }
});
