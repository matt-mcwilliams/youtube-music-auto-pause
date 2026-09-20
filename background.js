const state = {
  enabled: false,
  playingVideoTabs: new Set(),
  pausedMusicTabs: new Set()
};

let resumeTimer;
let pausePromise = Promise.resolve();
let readyResolve;
const ready = new Promise((resolve) => {
  readyResolve = resolve;
});

async function loadState() {
  const [local, session] = await Promise.all([
    chrome.storage.local.get({ enabled: false }),
    chrome.storage.session.get({ playingVideoTabs: [], pausedMusicTabs: [] })
  ]);

  state.enabled = local.enabled === true;
  state.playingVideoTabs = new Set(session.playingVideoTabs);
  state.pausedMusicTabs = new Set(session.pausedMusicTabs);
  await updateBadge();
  readyResolve();
}

const stateLoaded = loadState().catch((error) => {
  console.error("Could not load extension state", error);
  readyResolve();
});

async function waitUntilReady() {
  await stateLoaded;
  await ready;
}

async function saveSessionState() {
  await chrome.storage.session.set({
    playingVideoTabs: [...state.playingVideoTabs],
    pausedMusicTabs: [...state.pausedMusicTabs]
  });
}

async function updateBadge() {
  await chrome.action.setBadgeText({ text: state.enabled ? "ON" : "OFF" });
  await chrome.action.setBadgeBackgroundColor({
    color: state.enabled ? "#188038" : "#777777"
  });
}

async function sendToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (_error) {
    return null;
  }
}

async function pausePlayingMusic() {
  const tabs = await chrome.tabs.query({ url: "https://music.youtube.com/*" });

  await Promise.all(tabs.map(async (tab) => {
    const tabId = tab.id;
    if (typeof tabId !== "number") return;

    const musicState = await sendToTab(tabId, { type: "GET_MUSIC_STATE" });
    if (!musicState?.playing) return;

    const result = await sendToTab(tabId, { type: "PAUSE_MUSIC" });
    if (result?.paused) {
      state.pausedMusicTabs.add(tabId);
    }
  }));

  await saveSessionState();
}

async function resumePausedMusic() {
  await pausePromise;

  if (state.playingVideoTabs.size !== 0) return;

  const tabsToResume = [...state.pausedMusicTabs];
  const results = await Promise.all(tabsToResume.map((tabId) => (
    sendToTab(tabId, { type: "RESUME_MUSIC" })
  )));

  state.pausedMusicTabs = new Set(
    tabsToResume.filter((_tabId, index) => results[index]?.resumed !== true)
  );
  await saveSessionState();
}

function scheduleResume() {
  clearTimeout(resumeTimer);
  resumeTimer = setTimeout(() => {
    resumePausedMusic().catch((error) => {
      console.error("Could not resume YouTube Music", error);
    });
  }, 300);
}

async function setEnabled(enabled) {
  await waitUntilReady();
  state.enabled = enabled === true;
  await updateBadge();

  if (!state.enabled) {
    clearTimeout(resumeTimer);
    await resumePausedMusic();
    state.playingVideoTabs.clear();
    state.pausedMusicTabs.clear();
    await saveSessionState();
    return;
  }

  await saveSessionState();

  // Pick up videos that were already playing when the user enabled us.
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map((tab) => {
    if (typeof tab.id !== "number") return undefined;
    return sendToTab(tab.id, { type: "CHECK_VIDEO" });
  }));
}

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === "install") {
    const { enabled } = await chrome.storage.local.get("enabled");
    if (typeof enabled !== "boolean") {
      await chrome.storage.local.set({ enabled: false });
    }
  }

  await waitUntilReady();
  await updateBadge();
});

chrome.runtime.onStartup.addListener(() => {
  loadState().catch((error) => console.error("Could not restore state", error));
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes.enabled) return;
  setEnabled(changes.enabled.newValue === true).catch((error) => {
    console.error("Could not change extension state", error);
  });
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "VIDEO_PLAYING" || typeof sender.tab?.id !== "number") {
    return;
  }

  (async () => {
    await waitUntilReady();
    if (!state.enabled) return;

    const tabId = sender.tab.id;
    const isPlaying = message.playing === true;

    if (isPlaying) {
      const wasEmpty = state.playingVideoTabs.size === 0;
      state.playingVideoTabs.add(tabId);
      clearTimeout(resumeTimer);

      if (wasEmpty) {
        pausePromise = pausePlayingMusic().catch((error) => {
          console.error("Could not pause YouTube Music", error);
        });
        await pausePromise;
      }
    } else if (state.playingVideoTabs.delete(tabId)) {
      await saveSessionState();
      if (state.playingVideoTabs.size === 0) scheduleResume();
    }

    await saveSessionState();
  })().catch((error) => console.error("Could not process playback state", error));
});

chrome.tabs.onRemoved.addListener((tabId) => {
  (async () => {
    await waitUntilReady();
    const wasPlaying = state.playingVideoTabs.delete(tabId);
    state.pausedMusicTabs.delete(tabId);
    await saveSessionState();
    if (wasPlaying && state.playingVideoTabs.size === 0) scheduleResume();
  })().catch((error) => console.error("Could not process closed tab", error));
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url) {
    return;
  }

  (async () => {
    await waitUntilReady();
    const leftMusic = !changeInfo.url.startsWith("https://music.youtube.com/");
    const removedVideo = state.playingVideoTabs.delete(tabId);
    const removedMusic = leftMusic && state.pausedMusicTabs.delete(tabId);

    if (removedVideo || removedMusic) {
      await saveSessionState();
      if (removedVideo && state.playingVideoTabs.size === 0) scheduleResume();
    }
  })().catch((error) => console.error("Could not process navigation", error));
});
