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
  ID_CAT_WEBM_CUSTOM_URL,
  LABEL_CAT_WEBM_CUSTOM_URL,
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

// Загружаем видео из JSON файла с GitHub
async function loadDefaultVideos() {
  try {
    const response = await fetch('https://github.com/Linaryx/spicetify-cat-jam-synced-twitch/raw/5393eb68cf205af4cbeaddbc52d6e1d92977259b/src/resources/default-videos.json');
    const data = await response.json();
    return data.videos || [];
  } catch (error) {
    console.error('Ошибка загрузки видео:', error);
    // Возвращаем дефолтные видео если загрузка не удалась
    return [
      { name: "Cat Jam (По умолчанию)", url: "https://github.com/Linaryx/spicetify-cat-jam-synced-twitch/raw/5393eb68cf205af4cbeaddbc52d6e1d92977259b/src/resources/catjam.webm", bpm: 135.48 },
      { name: "Beb", url: "https://github.com/Linaryx/spicetify-cat-jam-synced-twitch/raw/5393eb68cf205af4cbeaddbc52d6e1d92977259b/src/resources/beb.webm", bpm: 170.0 },
      { name: "Walter Vibe", url: "https://github.com/Linaryx/spicetify-cat-jam-synced-twitch/raw/5393eb68cf205af4cbeaddbc52d6e1d92977259b/src/resources/waltervibe.webm", bpm: 122.0 }
    ];
  }
}

let defaultVideos: Array<{name: string, url: string, bpm: number}> = [];
let videoOptions: string[] = [];
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
        "https://github.com/Linaryx/spicetify-cat-jam-synced-twitch/raw/5393eb68cf205af4cbeaddbc52d6e1d92977259b/src/resources/catjam.webm";
    } else {
      // Если выбрано видео из списка, получаем URL
      const selectedIndex = parseInt(videoURL);
      if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < defaultVideos.length) {
        videoURL = defaultVideos[selectedIndex].url;
      } else if (selectedIndex === defaultVideos.length) {
        // Если выбрано "Пользовательское", используем пользовательский URL
        const customURL = String(settings.getFieldValue("catjam-webm-custom-url") || "");
        if (customURL && customURL.startsWith("http")) {
          videoURL = customURL;
        } else {
          videoURL = "https://github.com/Linaryx/spicetify-cat-jam-synced-twitch/raw/5393eb68cf205af4cbeaddbc52d6e1d92977259b/src/resources/catjam.webm";
        }
      } else if (videoURL.startsWith("http")) {
        // Если это уже URL, используем как есть
        videoURL = videoURL;
      } else {
        // Если это не число и не URL, используем дефолтное видео
        videoURL = "https://github.com/Linaryx/spicetify-cat-jam-synced-twitch/raw/5393eb68cf205af4cbeaddbc52d6e1d92977259b/src/resources/catjam.webm";
      }
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

function applyButtonStyles(buttonId: string) {
  const btn = document.getElementById(
    "catjam-settings." + buttonId,
  ) as HTMLButtonElement | null;
  if (btn) {
    btn.setAttribute("style", STYLE_RECONNECT_BUTTON);
    try {
      btn.addEventListener("mouseenter", () => {
        btn.style.backgroundColor = "#282828";
        btn.style.borderColor = "#a7a7a7";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.backgroundColor = "transparent";
        btn.style.borderColor = "#878787";
      });
      btn.addEventListener("focus", () => {
        btn.style.outline = "none";
        btn.style.boxShadow = "0 0 0 2px #fff";
      });
      btn.addEventListener("blur", () => {
        btn.style.boxShadow = "";
      });
    } catch (_error) { void 0; }
  }
}

function enhanceHeaderRowUI(
  buttonId: string,
  headerStyle: string,
  titleText: string,
): void {
  try {
    const btn = document.querySelector(
      `#catjam-settings button[id*="${buttonId}"]`,
    ) as HTMLButtonElement | null;
    if (!btn) return;
    
    // Просто стилизуем кнопку как разделитель
    btn.textContent = titleText;
    btn.setAttribute("style", headerStyle);
    
    // Растягиваем на всю ширину
    const row = btn.closest(".x-settings-row") as HTMLDivElement | null;
    if (row) {
      const firstCol = row.querySelector(".x-settings-firstColumn") as HTMLDivElement | null;
      const secondCol = row.querySelector(".x-settings-secondColumn") as HTMLDivElement | null;
      
      if (firstCol) firstCol.style.display = "none";
      if (secondCol) {
        secondCol.style.gridColumn = "1 / -1";
        secondCol.style.width = "100%";
      }
    }
  } catch (_error) { void 0; }
}

function applyUiEnhancements(): void {
  try {
    const container = document.getElementById("catjam-settings");
    if (!container) return;

    enhanceHeaderRowUI(ID_CAT_SECTION, STYLE_HEADER_CAT, TITLE_CAT_SECTION);
    enhanceHeaderRowUI(
      ID_TWITCH_SECTION,
      STYLE_HEADER_TWITCH,
      TITLE_TWITCH_SECTION,
    );
    
    // Применяем стили кнопок
    applyButtonStyles(ID_TWITCH_RECONNECT);
    applyButtonStyles(ID_CAT_RELOAD);
  } catch (_error) { void 0; }
}

async function main() {
  while (!Spicetify?.Player?.addEventListener || !Spicetify?.getAudioData) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  
  // Загружаем видео из JSON файла
  defaultVideos = await loadDefaultVideos();
  videoOptions = [...defaultVideos.map(video => video.name), "Пользовательское"];
  
  let audioData;

  // Create Settings UI - Cat (on top)
  settings.addButton(
    ID_CAT_SECTION,
    TITLE_CAT_SECTION,
    TEXT_CAT_SECTION,
    () => {},
  );
  settings.addDropDown(
    ID_CAT_WEBM_LINK,
    LABEL_CAT_WEBM_LINK,
    videoOptions,
    0,
  );
  settings.addInput(ID_CAT_WEBM_CUSTOM_URL, LABEL_CAT_WEBM_CUSTOM_URL, "");
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
    // Поддерживаем неактивное состояние
    btn.disabled = true;
    btn.style.pointerEvents = "none";
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
  
  // Добавляем обработчик для автоматического заполнения BPM при выборе видео
  setTimeout(() => {
    const videoSelect = document.getElementById(
      "catjam-settings." + ID_CAT_WEBM_LINK,
    ) as HTMLSelectElement | null;
    const bpmInput = document.getElementById(
      "catjam-settings." + ID_CAT_WEBM_BPM,
    ) as HTMLInputElement | null;
    
    if (videoSelect && bpmInput) {
      videoSelect.addEventListener("change", () => {
        const selectedIndex = videoSelect.selectedIndex;
        if (selectedIndex >= 0 && selectedIndex < defaultVideos.length) {
          const selectedVideo = defaultVideos[selectedIndex];
          bpmInput.value = selectedVideo.bpm.toString();
          // Сохраняем индекс выбранного видео
          settings.setFieldValue(ID_CAT_WEBM_LINK, selectedIndex.toString());
        } else if (selectedIndex === defaultVideos.length) {
          // Если выбрано "Пользовательское", очищаем BPM
          bpmInput.value = "";
          settings.setFieldValue(ID_CAT_WEBM_LINK, selectedIndex.toString());
        }
      });
      
      // Устанавливаем начальное значение, если оно сохранено
      const savedIndex = String(settings.getFieldValue(ID_CAT_WEBM_LINK) || "");
      if (savedIndex && !isNaN(parseInt(savedIndex))) {
        const index = parseInt(savedIndex);
        if (index >= 0 && index < defaultVideos.length) {
          videoSelect.selectedIndex = index;
          const selectedVideo = defaultVideos[index];
          bpmInput.value = selectedVideo.bpm.toString();
        } else if (index === defaultVideos.length) {
          videoSelect.selectedIndex = index;
          bpmInput.value = "";
        }
      }
    }
  }, 1000);

  const applyInitialStyles = () => {
    const statusBtn = document.getElementById(
      "catjam-settings." + ID_TWITCH_STATUS_INDICATOR,
    ) as HTMLButtonElement | null;
    if (statusBtn) {
      statusBtn.setAttribute("style", darkButtonStyle);
      // Убираем кнопочный вид, делаем как простой текст
      statusBtn.disabled = true;
      statusBtn.style.pointerEvents = "none";
    }
    applyUiEnhancements();
  };

  setTimeout(applyInitialStyles, 0);
  setTimeout(applyInitialStyles, 100);
  setTimeout(applyInitialStyles, 500);
  setTimeout(applyInitialStyles, 1000);


  applyStatusToUi();

  try {
    const container = document.getElementById(settings.settingsId);
    if (container) {
      const observer = new MutationObserver(() => {
        applyStatusToUi();
        setTimeout(applyUiEnhancements, 50);
      });
      observer.observe(container, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 5000);
    }
  } catch (_error) { void 0; }

  try {
    const refreshInterval = setInterval(() => {
      applyStatusToUi();
      applyUiEnhancements();
    }, 200);
    setTimeout(() => clearInterval(refreshInterval), 10000);
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
