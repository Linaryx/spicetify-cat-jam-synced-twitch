import { SettingsSection } from "spcr-settings";
import TwitchClient from "./services/twitch/client";
import { getTrackFromDom } from "./utils/track";
import { computePlaybackRate } from "./services/bpm";
import { waitForElement } from "./utils/dom";
import {
  SETTINGS_SECTION_TITLE,
  SETTINGS_SECTION_ID,
  POSITION_OPTIONS,
  BPM_METHOD_OPTIONS,
  DEFAULT_LEFT_LIBRARY_SIZE,
  VIDEO_STYLE_BOTTOM,
  STYLE_DARK_BUTTON,
  STYLE_RECONNECT_BUTTON,
  STYLE_HEADER_CAT,
  STYLE_HEADER_TWITCH,
  STATUS_CONNECTED_TEXT,
  STATUS_DISCONNECTED_TEXT,
  ID_CAT_SECTION,
  TITLE_CAT_SECTION,
  TEXT_CAT_SECTION,
  ID_CAT_WEBM_LINK,
  LABEL_CAT_WEBM_LINK,
  ID_CAT_WEBM_BPM,
  LABEL_CAT_WEBM_BPM,
  ID_CAT_WEBM_POSITION,
  LABEL_CAT_WEBM_POSITION,
  ID_CAT_BPM_METHOD_SLOW,
  LABEL_CAT_BPM_METHOD_SLOW,
  ID_CAT_BPM_METHOD_FAST,
  LABEL_CAT_BPM_METHOD_FAST,
  ID_CAT_LEFT_SIZE,
  LABEL_CAT_LEFT_SIZE,
  ID_CAT_RELOAD,
  TITLE_CAT_RELOAD,
  TEXT_CAT_RELOAD,
  ID_TWITCH_SECTION,
  TITLE_TWITCH_SECTION,
  TEXT_TWITCH_SECTION,
  ID_TWITCH_TOKEN,
  LABEL_TWITCH_TOKEN,
  ID_TWITCH_CHANNEL,
  LABEL_TWITCH_CHANNEL,
  ID_TWITCH_ENABLED,
  LABEL_TWITCH_ENABLED,
  ID_TWITCH_MESSAGE_DELAY,
  LABEL_TWITCH_MESSAGE_DELAY,
  ID_TWITCH_MESSAGE_FORMAT,
  LABEL_TWITCH_MESSAGE_FORMAT,
  ID_TWITCH_BPM_VALUES,
  LABEL_TWITCH_BPM_VALUES,
  ID_TWITCH_STATUS_INDICATOR,
  TITLE_TWITCH_STATUS_INDICATOR,
  ID_TWITCH_RECONNECT,
  TITLE_TWITCH_RECONNECT,
  TEXT_TWITCH_RECONNECT,
} from "./constants";

const settings = new SettingsSection(
  SETTINGS_SECTION_TITLE,
  SETTINGS_SECTION_ID,
);
let audioData;
let twitchClient: TwitchClient;
type TrackInfo = { track: string; artist: string; bpm: number };
async function getPlaybackRate(audioData) {
  return computePlaybackRate(audioData, settings);
}
async function fetchAudioData(retryDelay = 200, maxRetries = 10) {
  try {
    const data = await Spicetify.getAudioData();
    return data;
  } catch (error) {
    if (typeof error === "object" && error !== null && "message" in error) {
      const message = error.message;

      if (
        message.includes("Cannot read properties of undefined") &&
        maxRetries > 0
      ) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return fetchAudioData(retryDelay, maxRetries - 1);
      }
    } else { void 0; }
    return null;
  }
}

async function getCurrentTrackInfo(): Promise<TrackInfo> {
  let { track: trackName, artist: artistName } = getTrackFromDom();
  let trackBPM = 120;

  if (trackName === "Unknown Track") {
    const playerData = Spicetify.Player.data;
    if (playerData?.item) {
      trackName = playerData.item.name || trackName;
      artistName = playerData.item.artists?.[0]?.name || artistName;
    }
  }

  try {
    const data = await fetchAudioData();
    if (data?.track?.tempo) {
      trackBPM = data.track.tempo;
    }
  } catch (_error) { void 0; }

  return { track: trackName, artist: artistName, bpm: trackBPM };
}

async function sendCurrentTrackIfNeeded(force = false): Promise<void> {
  if (!twitchClient || !twitchClient.isConnectedToTwitch()) return;
  const info = await getCurrentTrackInfo();
  const trackChanged =
    lastTrackInfo.track !== info.track || lastTrackInfo.artist !== info.artist;
  if (force || !lastMessageSent || trackChanged) {
    await sendTrackInfoToTwitch(info.track, info.artist, info.bpm);
  }
}

async function syncTiming(startTime, progress) {
  const videoElement = document.getElementById(
    "catjam-webm",
  ) as HTMLVideoElement;
  if (videoElement) {
    if (Spicetify.Player.isPlaying()) {
      progress = progress / 1000;

      if (audioData && audioData.beats) {
        const upcomingBeat = audioData.beats.find(
          (beat) => beat.start > progress,
        );
        if (upcomingBeat) {
          const operationTime = performance.now() - startTime;
          const delayUntilNextBeat = Math.max(
            0,
            (upcomingBeat.start - progress) * 1000 - operationTime,
          );

          setTimeout(() => {
            videoElement.currentTime = 0;
            videoElement.play();
          }, delayUntilNextBeat);
        } else {
          videoElement.currentTime = 0;
          videoElement.play();
        }
      } else {
        videoElement.currentTime = 0;
        videoElement.play();
      }
    } else {
      videoElement.pause();
    }
  } else { void 0; }
}

async function createWebMVideo() {
  try {
    const bottomPlayerClass = ".main-nowPlayingBar-right";
    const leftLibraryClass = ".main-yourLibraryX-libraryItemContainer";
    const leftLibraryVideoSize =
      Number(settings.getFieldValue("catjam-webm-position-left-size")) ||
      DEFAULT_LEFT_LIBRARY_SIZE;
    const bottomPlayerStyle = VIDEO_STYLE_BOTTOM;
    const leftLibraryStyle = `width: ${leftLibraryVideoSize}%; max-width: 300px; height: auto; max-height: 100%; position: absolute; bottom: 0; pointer-events: none; z-index: 1;`;
    const selectedPosition = settings.getFieldValue("catjam-webm-position");
    const targetElementSelector =
      selectedPosition === POSITION_OPTIONS[0]
        ? bottomPlayerClass
        : leftLibraryClass;
    const elementStyles =
      selectedPosition === POSITION_OPTIONS[0]
        ? bottomPlayerStyle
        : leftLibraryStyle;
    const targetElement = await waitForElement(targetElementSelector);

    const existingVideo = document.getElementById("catjam-webm");
    if (existingVideo) existingVideo.remove();

    let videoURL = String(settings.getFieldValue("catjam-webm-link"));
    if (!videoURL) {
      videoURL =
        "https://github.com/BlafKing/spicetify-cat-jam-synced/raw/main/src/resources/catjam.webm";
    }

    const videoElement = document.createElement("video");
    videoElement.setAttribute("loop", "true");
    videoElement.setAttribute("autoplay", "true");
    videoElement.setAttribute("muted", "true");
    videoElement.setAttribute("style", elementStyles);
    videoElement.src = videoURL;
    videoElement.id = "catjam-webm";

    audioData = await fetchAudioData();
    videoElement.playbackRate = await getPlaybackRate(audioData);

    if (targetElement.firstChild) {
      targetElement.insertBefore(videoElement, targetElement.firstChild);
    } else {
      targetElement.appendChild(videoElement);
    }
    if (Spicetify.Player.isPlaying()) {
      videoElement.play();
    } else {
      videoElement.pause();
    }
  } catch (_error) { void 0; }
}

// Global state for tracking message status
let lastMessageSent = false;
let lastTrackInfo = { track: "", artist: "", bpm: 0 };
let bpmCommandCooldown = 0;

async function sendTrackInfoToTwitch(
  track: string,
  artist: string,
  bpm: number,
): Promise<void> {
  if (twitchClient && twitchClient.isConnectedToTwitch()) {
    const ok = await twitchClient.sendTrackInfo(track, artist, bpm);
    if (ok) {
      lastMessageSent = true;
      lastTrackInfo = { track, artist, bpm };
    } else {
      try {
        const delayMs =
          parseInt(String(settings.getFieldValue("twitch-message-delay"))) ||
          5000;
        setTimeout(
          async () => {
            const retryOk = await twitchClient.sendTrackInfo(
              track,
              artist,
              bpm,
            );
            if (retryOk) {
              lastMessageSent = true;
              lastTrackInfo = { track, artist, bpm };
            }
          },
          Math.min(delayMs, 5000),
        );
      } catch (_error) { void 0; }
    }
  }
}

async function handleBpmCommand(): Promise<void> {
  const now = Date.now();
  if (now - bpmCommandCooldown < 60000) return;

  if (lastMessageSent && lastTrackInfo.track !== "") {
    await twitchClient.sendTrackInfo(
      lastTrackInfo.track,
      lastTrackInfo.artist,
      lastTrackInfo.bpm,
    );
    bpmCommandCooldown = now;
  } else { void 0; }
}

async function main() {
  while (!Spicetify?.Player?.addEventListener || !Spicetify?.getAudioData) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  let audioData;

  // Create Settings UI - Cat (on top)
  settings.addButton(
    ID_CAT_SECTION,
    TITLE_CAT_SECTION,
    TEXT_CAT_SECTION,
    () => {},
  );
  settings.addInput(ID_CAT_WEBM_LINK, LABEL_CAT_WEBM_LINK, "");
  settings.addInput(ID_CAT_WEBM_BPM, LABEL_CAT_WEBM_BPM, "");
  settings.addDropDown(
    ID_CAT_WEBM_POSITION,
    LABEL_CAT_WEBM_POSITION,
    POSITION_OPTIONS,
    0,
  );
  settings.addDropDown(
    ID_CAT_BPM_METHOD_SLOW,
    LABEL_CAT_BPM_METHOD_SLOW,
    BPM_METHOD_OPTIONS,
    0,
  );
  settings.addDropDown(
    ID_CAT_BPM_METHOD_FAST,
    LABEL_CAT_BPM_METHOD_FAST,
    BPM_METHOD_OPTIONS,
    0,
  );
  settings.addInput(ID_CAT_LEFT_SIZE, LABEL_CAT_LEFT_SIZE, "");
  settings.addButton(ID_CAT_RELOAD, TITLE_CAT_RELOAD, TEXT_CAT_RELOAD, () => {
    createWebMVideo();
  });
  settings.addButton(
    ID_TWITCH_SECTION,
    TITLE_TWITCH_SECTION,
    TEXT_TWITCH_SECTION,
    () => {},
  );
  settings.addInput(ID_TWITCH_TOKEN, LABEL_TWITCH_TOKEN, "");
  settings.addInput(ID_TWITCH_CHANNEL, LABEL_TWITCH_CHANNEL, "");
  settings.addToggle(ID_TWITCH_ENABLED, LABEL_TWITCH_ENABLED, false);
  settings.addInput(
    ID_TWITCH_MESSAGE_DELAY,
    LABEL_TWITCH_MESSAGE_DELAY,
    "5000",
  );
  settings.addInput(
    ID_TWITCH_MESSAGE_FORMAT,
    LABEL_TWITCH_MESSAGE_FORMAT,
    "{track} - {artist} | BPM: {bpm} | Nearest {nearest_bpm}",
  );
  settings.addInput(
    ID_TWITCH_BPM_VALUES,
    LABEL_TWITCH_BPM_VALUES,
    "80,100,110,120,130,140,150,160,170,180",
  );
  settings.addButton(
    ID_TWITCH_STATUS_INDICATOR,
    TITLE_TWITCH_STATUS_INDICATOR,
    "\uD83D\uDD34 Disconnected",
    () => {},
  );
  let lastConnected = false;
  const darkButtonStyle = STYLE_DARK_BUTTON;
  const applyStatusToUi = () => {
    const btn = document.getElementById(
      "catjam-settings." + ID_TWITCH_STATUS_INDICATOR,
    ) as HTMLButtonElement | null;
    if (!btn) return false;
    btn.textContent = lastConnected
      ? STATUS_CONNECTED_TEXT
      : STATUS_DISCONNECTED_TEXT;
    btn.setAttribute("style", darkButtonStyle);
    return true;
  };
  const setStatus = (connected: boolean) => {
    lastConnected = connected;
    if (!applyStatusToUi()) {
      setTimeout(applyStatusToUi, 1000);
      setTimeout(applyStatusToUi, 10000);
      setTimeout(applyStatusToUi, 20000);
    }
  };

  settings.addButton(
    ID_TWITCH_RECONNECT,
    TITLE_TWITCH_RECONNECT,
    TEXT_TWITCH_RECONNECT,
    () => {
      if (!twitchClient) return;
      const token = String(settings.getFieldValue(ID_TWITCH_TOKEN) || "");
      const channel = String(settings.getFieldValue(ID_TWITCH_CHANNEL) || "");
      const enabled = Boolean(settings.getFieldValue(ID_TWITCH_ENABLED));
      const delay =
        parseInt(String(settings.getFieldValue(ID_TWITCH_MESSAGE_DELAY))) ||
        5000;
      const format = String(
        settings.getFieldValue(ID_TWITCH_MESSAGE_FORMAT) || "",
      );
      const bpmValues = String(
        settings.getFieldValue(ID_TWITCH_BPM_VALUES) ||
          "80,100,110,120,130,140,150,160,170,180",
      );

      twitchClient.updateConfig({
        token,
        channel,
        enabled,
        message_delay: delay,
        message_format: format,
        bpm_values: bpmValues,
      });

      try {
        (twitchClient as any).disconnect?.();
      } catch (_error) { void 0; }
      twitchClient
        .connect()
        .then((ok) => setStatus(ok))
        .catch(() => setStatus(false));
    },
  );

  settings.pushSettings();
  setTimeout(() => {
    const statusBtn = document.getElementById(
      "catjam-settings." + ID_TWITCH_STATUS_INDICATOR,
    ) as HTMLButtonElement | null;
    if (statusBtn) statusBtn.setAttribute("style", darkButtonStyle);
    const catDivider = document.getElementById(
      "catjam-settings." + ID_CAT_SECTION,
    ) as HTMLButtonElement | null;
    if (catDivider) catDivider.setAttribute("style", STYLE_HEADER_CAT);
    const twitchDivider = document.getElementById(
      "catjam-settings." + ID_TWITCH_SECTION,
    ) as HTMLButtonElement | null;
    if (twitchDivider) twitchDivider.setAttribute("style", STYLE_HEADER_TWITCH);
    const reconnectBtn = document.getElementById(
      "catjam-settings." + ID_TWITCH_RECONNECT,
    ) as HTMLButtonElement | null;
    if (reconnectBtn) {
      reconnectBtn.setAttribute("style", STYLE_RECONNECT_BUTTON);
      try {
        reconnectBtn.addEventListener("mouseenter", () => {
          reconnectBtn.style.backgroundColor = "#0a0a0a";
        });
        reconnectBtn.addEventListener("mouseleave", () => {
          reconnectBtn.style.backgroundColor = "#000";
        });
        reconnectBtn.addEventListener("focus", () => {
          reconnectBtn.style.outline = "none";
          reconnectBtn.style.boxShadow = "0 0 0 3px rgba(255,255,255,0.15)";
        });
        reconnectBtn.addEventListener("blur", () => {
          reconnectBtn.style.boxShadow = "";
        });
      } catch (_error) { void 0; }
    }
    applyStatusToUi();
  }, 0);

  try {
    const container = document.getElementById(settings.settingsId);
    if (container) {
      const observer = new MutationObserver(() => {
        applyStatusToUi();
      });
      observer.observe(container, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 5000);
    }
  } catch (_error) { void 0; }

  try {
    const refreshInterval = setInterval(applyStatusToUi, 500);
    setTimeout(() => clearInterval(refreshInterval), 5000);
  } catch (_error) { void 0; }

  twitchClient = new TwitchClient();
  twitchClient.setStatusCallback(setStatus);
  setStatus(false);
  try {
    window.addEventListener("catjam:twitch-status", (e: any) => {
      setStatus(Boolean(e?.detail?.connected));
    });
  } catch (_error) { void 0; }
  const saved = twitchClient.getConfig();
  if (saved) {
    settings.setFieldValue("twitch-token", saved.token || "");
    settings.setFieldValue("twitch-channel", saved.channel || "");
    settings.setFieldValue("twitch-enabled", Boolean(saved.enabled));
    settings.setFieldValue(
      "twitch-message-delay",
      String(saved.message_delay ?? 5000),
    );
    settings.setFieldValue("twitch-message-format", saved.message_format || "");
    settings.setFieldValue(
      "twitch-bpm-values",
      saved.bpm_values || "80,100,110,120,130,140,150,160,170,180",
    );
  }
  if (saved?.enabled && saved.token && saved.channel) {
    const ok = await twitchClient.connect();
    setStatus(!!ok);
    if (ok && Spicetify.Player.isPlaying()) {
      await sendCurrentTrackIfNeeded(false);
    }
  }

  twitchClient.setBpmCommandCallback(handleBpmCommand);

  createWebMVideo();

  Spicetify.Player.addEventListener("onplaypause", async () => {
    const startTime = performance.now();
    const progress = Spicetify.Player.getProgress();
    lastProgress = progress;
    syncTiming(startTime, progress);
    if (Spicetify.Player.isPlaying()) {
      await sendCurrentTrackIfNeeded(false);
    }
  });

  let lastProgress = 0;
  Spicetify.Player.addEventListener("onprogress", async () => {
    const currentTime = performance.now();
    const progress = Spicetify.Player.getProgress();

    if (Math.abs(progress - lastProgress) >= 500) {
      syncTiming(currentTime, progress);
    }
    lastProgress = progress;
  });

  Spicetify.Player.addEventListener("songchange", async () => {
    const startTime = performance.now();
    lastProgress = Spicetify.Player.getProgress();

    const videoElement = document.getElementById(
      "catjam-webm",
    ) as HTMLVideoElement;
    if (videoElement) {
      audioData = await fetchAudioData();
      if (audioData && audioData.beats && audioData.beats.length > 0) {
        const firstBeatStart = audioData.beats[0].start;

        videoElement.playbackRate = await getPlaybackRate(audioData);

        const operationTime = performance.now() - startTime;
        const delayUntilFirstBeat = Math.max(
          0,
          firstBeatStart * 1000 - operationTime,
        );

        setTimeout(() => {
          videoElement.currentTime = 0;
          videoElement.play();
        }, delayUntilFirstBeat);
      } else {
        videoElement.playbackRate = await getPlaybackRate(audioData);
        videoElement.currentTime = 0;
        videoElement.play();
      }
    } else { void 0; }

    // Send track info to Twitch chat
    let trackName = "Unknown Track";
    let artistName = "Unknown Artist";
    let trackBPM = 120;

    try {
      const trackNameElement = document.querySelector(".main-trackInfo-name a");
      const artistNameElement = document.querySelector(
        ".main-trackInfo-artists a",
      );

      if (trackNameElement && trackNameElement.textContent) {
        trackName = trackNameElement.textContent.trim();
      }

      if (artistNameElement && artistNameElement.textContent) {
        artistName = artistNameElement.textContent.trim();
      }
    } catch (_error) {
      // logging removed
    }

    if (trackName === "Unknown Track") {
      const playerData = Spicetify.Player.data;
      if (playerData && playerData.item) {
        trackName = playerData.item.name || "Unknown Track";
        artistName = playerData.item.artists?.[0]?.name || "Unknown Artist";
      }
    }

    if (audioData && audioData.track && audioData.track.tempo) {
      trackBPM = audioData.track.tempo;
    }

    const trackChanged =
      lastTrackInfo.track !== trackName || lastTrackInfo.artist !== artistName;
    if (!lastMessageSent || trackChanged) {
      await sendTrackInfoToTwitch(trackName, artistName, trackBPM);
    } else { void 0; }
  });
}

export default main; // Export the main function for use in the application
