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

// Функция для создания стилизованной кнопки
function createStyledButton(id: string, title: string, text: string, onClick: () => void, style: string) {
  // Создаём обычную кнопку через Spicetify
  settings.addButton(id, title, text, onClick);
  
  // Функция для применения стилей
  const applyStyles = () => {
    const btn = document.getElementById("catjam-settings." + id) as HTMLButtonElement | null;
    if (btn) {
      btn.setAttribute("style", style);
      
      // Добавляем hover эффекты
      btn.addEventListener("mouseenter", () => {
        btn.style.setProperty('background-color', '#282828', 'important');
        btn.style.setProperty('border-color', '#a7a7a7', 'important');
      });
      
      btn.addEventListener("mouseleave", () => {
        btn.style.setProperty('background-color', 'transparent', 'important');
        btn.style.setProperty('border-color', '#878787', 'important');
      });
      
      btn.addEventListener("focus", () => {
        btn.style.setProperty('outline', 'none', 'important');
        btn.style.setProperty('box-shadow', '0 0 0 2px #fff', 'important');
      });
      
      btn.addEventListener("blur", () => {
        btn.style.setProperty('box-shadow', '', 'important');
      });
      
      return true;
    }
    return false;
  };
  
  // Пробуем применить стили сразу
  if (!applyStyles()) {
    // Если не получилось, пробуем через небольшую задержку
    setTimeout(() => {
      if (!applyStyles()) {
        // Если все еще не получилось, пробуем через большую задержку
        setTimeout(applyStyles, 500);
      }
    }, 50);
  }
}

// Функция для очистки всех настроек
function clearAllSettings() {
  console.log('🧹 Очищаем все настройки Cat Jam...');
  
  const settingsToClear = [
    'catjam-webm-link',
    'catjam-webm-bpm', 
    'catjam-webm-position',
    'catjam-webm-bpm-method',
    'catjam-webm-position-left-size',
    'catjam-webm-custom-url',
    'catjam-installed'
  ];
  
  settingsToClear.forEach(key => {
    try {
      Spicetify.LocalStorage.remove(key);
      console.log(`✅ Удалён ключ: ${key}`);
    } catch (error) {
      console.log(`❌ Ошибка при удалении ${key}:`, error);
    }
  });
  
  // Очищаем конфигурацию Twitch
  try {
    localStorage.removeItem('twitch-config');
    console.log('✅ Удалена конфигурация Twitch');
  } catch (error) {
    console.log('❌ Ошибка при удалении twitch-config:', error);
  }
  
  console.log('🎉 Очистка завершена! Перезагрузите страницу.');
}

// Дефолтные видео (CORS блокирует загрузку с GitHub)
function getDefaultVideos() {
  return [
    { name: "Cat Jam (По умолчанию)", url: "https://github.com/Linaryx/spicetify-cat-jam-synced-twitch/raw/main/src/resources/catjam.webm", bpm: 135.48 },
    { name: "Beb", url: "https://github.com/Linaryx/spicetify-cat-jam-synced-twitch/raw/main/src/resources/beb.webm", bpm: 170.0 },
    { name: "Walter Vibe", url: "https://github.com/Linaryx/spicetify-cat-jam-synced-twitch/raw/main/src/resources/waltervibe.webm", bpm: 122.0 }
  ];
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
      console.log('🎵 BPM трека из getCurrentTrackInfo:', trackBPM);
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
        "https://github.com/Linaryx/spicetify-cat-jam-synced-twitch/raw/main/src/resources/catjam.webm";
    } else {
      // Если выбрано видео из списка, получаем URL
      const selectedIndex = parseInt(videoURL);
      
      if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < defaultVideos.length) {
        videoURL = defaultVideos[selectedIndex].url;
        console.log('🎵 BPM видео:', defaultVideos[selectedIndex].bpm);
      } else if (selectedIndex === defaultVideos.length || videoURL === "Пользовательское") {
        // Если выбрано "Пользовательское", используем пользовательский URL
        const customURL = String(settings.getFieldValue("catjam-webm-custom-url") || "");
        if (customURL && customURL.startsWith("http")) {
          videoURL = customURL;
        } else {
          videoURL = "https://github.com/Linaryx/spicetify-cat-jam-synced-twitch/raw/main/src/resources/catjam.webm";
        }
      } else if (videoURL.startsWith("http")) {
        // Если это уже URL, используем как есть
      } else {
        // Если это название видео, ищем по названию
        const foundVideo = defaultVideos.find(video => video.name === videoURL);
        if (foundVideo) {
          videoURL = foundVideo.url;
          console.log('🎵 BPM видео:', foundVideo.bpm);
        } else {
          // Если это не число и не URL, используем дефолтное видео
          videoURL = "https://github.com/Linaryx/spicetify-cat-jam-synced-twitch/raw/main/src/resources/catjam.webm";
        }
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
    console.log('📡 Отправляем в Twitch:', { track, artist, bpm });
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
    
    // Растягиваем на всю ширину - пробуем разные селекторы
    const row = btn.closest(".x-settings-row") || btn.closest("[class*='settings-row']") || btn.closest("[class*='row']") as HTMLDivElement | null;
    if (row) {
      // Убираем лишние логи
      
      // Пробуем разные селекторы для колонок
      const firstCol = (row.querySelector(".x-settings-firstColumn") || 
                      row.querySelector("[class*='firstColumn']") || 
                      row.querySelector("[class*='first-column']")) as HTMLDivElement | null;
      const secondCol = (row.querySelector(".x-settings-secondColumn") || 
                       row.querySelector("[class*='secondColumn']") || 
                       row.querySelector("[class*='second-column']")) as HTMLDivElement | null;
      
      if (firstCol) {
        firstCol.style.display = "none";
      }
      if (secondCol) {
        secondCol.style.gridColumn = "1 / -1";
        secondCol.style.width = "100%";
      }
    }
  } catch (_error) { 
    console.log('Ошибка в enhanceHeaderRowUI:', _error);
  }
}

function applyUiEnhancements(): void {
  try {
    const container = document.getElementById("catjam-settings");
    if (!container) {
      return; // Убираем лишний лог
    }

    // Убираем лишние логи, оставляем только ошибки
    enhanceHeaderRowUI(ID_CAT_SECTION, STYLE_HEADER_CAT, TITLE_CAT_SECTION);
    enhanceHeaderRowUI(
      ID_TWITCH_SECTION,
      STYLE_HEADER_TWITCH,
      TITLE_TWITCH_SECTION,
    );
    
    // Принудительно применяем стили к кнопкам
    const reloadBtn = document.getElementById("catjam-settings." + ID_CAT_RELOAD) as HTMLButtonElement | null;
    const reconnectBtn = document.getElementById("catjam-settings." + ID_TWITCH_RECONNECT) as HTMLButtonElement | null;
    
    if (reloadBtn && !reloadBtn.style.border) {
      reloadBtn.setAttribute("style", STYLE_RECONNECT_BUTTON);
    }
    
    if (reconnectBtn && !reconnectBtn.style.border) {
      reconnectBtn.setAttribute("style", STYLE_RECONNECT_BUTTON);
    }
    
    // Создаём поле пароля для токена (если ещё не создано)
    const tokenInput = document.getElementById("catjam-settings." + ID_TWITCH_TOKEN) as HTMLInputElement | null;
    if (tokenInput && tokenInput.type !== "password") {
      createPasswordField(ID_TWITCH_TOKEN);
    }
    
    // Применяем стили к заголовкам (растягиваем на всю ширину)
    enhanceHeaderRowUI(ID_CAT_SECTION, STYLE_HEADER_CAT, TITLE_CAT_SECTION);
    enhanceHeaderRowUI(
      ID_TWITCH_SECTION,
      STYLE_HEADER_TWITCH,
      TITLE_TWITCH_SECTION,
    );
    
  } catch (_error) { 
    console.log('Ошибка в applyUiEnhancements:', _error);
  }
}

async function main() {
  while (!Spicetify?.Player?.addEventListener || !Spicetify?.getAudioData) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  
  // Добавляем CSS стили в head документа
  try {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      #catjam-settings button[id*="twitch-reconnect"],
      #catjam-settings button[id*="cat-reload"] {
        background-color: transparent !important;
        border: 1px solid #878787 !important;
        color: #fff !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        padding: 8px 16px !important;
        border-radius: 4px !important;
        cursor: pointer !important;
        transition: all 0.1s ease !important;
        pointer-events: auto !important;
        user-select: none !important;
      }
      
      #catjam-settings button[id*="twitch-reconnect"]:hover,
      #catjam-settings button[id*="cat-reload"]:hover {
        background-color: #282828 !important;
        border-color: #a7a7a7 !important;
      }
      
      #catjam-settings button[id*="twitch-reconnect"]:focus,
      #catjam-settings button[id*="cat-reload"]:focus {
        outline: none !important;
        box-shadow: 0 0 0 2px #fff !important;
      }
      
      #catjam-settings button[id*="twitch-reconnect"]:active,
      #catjam-settings button[id*="cat-reload"]:active {
        background-color: #404040 !important;
        border-color: #a7a7a7 !important;
      }
    `;
    document.head.appendChild(styleElement);
    console.log('🎨 CSS стили добавлены в head');
  } catch (error) {
    console.log('❌ Ошибка при добавлении CSS стилей:', error);
  }
  
  // Проверяем, первая ли это установка
  const isFirstInstall = !Spicetify.LocalStorage.get('catjam-installed');
  if (isFirstInstall) {
    console.log('🎉 Первая установка Cat Jam - очищаем старые настройки...');
    
    // Очищаем все старые настройки
    const oldSettings = [
      'catjam-webm-link',
      'catjam-webm-bpm', 
      'catjam-webm-position',
      'catjam-webm-bpm-method',
      'catjam-webm-position-left-size',
      'catjam-webm-custom-url'
    ];
    
    oldSettings.forEach(key => {
      try {
        Spicetify.LocalStorage.remove(key);
        console.log(`🧹 Удалён старый ключ: ${key}`);
      } catch (error) {
        console.log(`❌ Ошибка при удалении ${key}:`, error);
      }
    });
    
    // Очищаем конфигурацию Twitch
    try {
      localStorage.removeItem('twitch-config');
      console.log('🧹 Удалена старая конфигурация Twitch');
    } catch (error) {
      console.log('❌ Ошибка при удалении twitch-config:', error);
    }
    
    // Отмечаем, что приложение установлено
    Spicetify.LocalStorage.set('catjam-installed', 'true');
    console.log('✅ Установка завершена');
  }
  
  // Загружаем дефолтные видео
  defaultVideos = getDefaultVideos();
  videoOptions = [...defaultVideos.map(video => video.name), "Пользовательское"];
  
  let audioData;

  // Create Settings UI - Cat (on top)
  createStyledButton(
    ID_CAT_SECTION,
    TITLE_CAT_SECTION,
    TEXT_CAT_SECTION,
    () => {},
    STYLE_HEADER_CAT
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
  createStyledButton(ID_CAT_RELOAD, TITLE_CAT_RELOAD, TEXT_CAT_RELOAD, () => {
    createWebMVideo();
  }, STYLE_RECONNECT_BUTTON);
  createStyledButton(
    ID_TWITCH_SECTION,
    TITLE_TWITCH_SECTION,
    TEXT_TWITCH_SECTION,
    () => {},
    STYLE_HEADER_TWITCH
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
  createStyledButton(
    ID_TWITCH_STATUS_INDICATOR,
    TITLE_TWITCH_STATUS_INDICATOR,
    "\uD83D\uDD34 Disconnected",
    () => {},
    STYLE_DARK_BUTTON
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

  createStyledButton(
    ID_TWITCH_RECONNECT,
    TITLE_TWITCH_RECONNECT,
    TEXT_TWITCH_RECONNECT,
    () => {
      if (!twitchClient) return;
      
      // Получаем токен из поля ввода напрямую
      const tokenInput = document.getElementById("catjam-settings." + ID_TWITCH_TOKEN) as HTMLInputElement | null;
      const token = tokenInput ? tokenInput.value : String(settings.getFieldValue(ID_TWITCH_TOKEN) || "");
      
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
        .then((ok) => {
          setStatus(ok);
        })
        .catch((error) => {
          setStatus(false);
        });
    },
    STYLE_RECONNECT_BUTTON
  );

  settings.pushSettings();
  
  // Ждём рендера DOM и применяем стили
  await waitForElement("#catjam-settings");
  
  // Создаём поле пароля для токена Twitch
  createPasswordField(ID_TWITCH_TOKEN);
  
  // Применяем стили UI
  applyUiEnhancements();
  
  // Добавляем обработчик для автоматического заполнения BPM при выборе видео
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
    const savedValue = String(settings.getFieldValue(ID_CAT_WEBM_LINK) || "");
    
    if (savedValue === "Пользовательское") {
      // Если сохранено название "Пользовательское"
      videoSelect.selectedIndex = defaultVideos.length;
      bpmInput.value = "";
    } else if (savedValue && !isNaN(parseInt(savedValue))) {
      // Если сохранён числовой индекс
      const index = parseInt(savedValue);
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

  // Применяем начальные стили сразу после рендера
  applyInitialStyles();


  applyStatusToUi();

  try {
    const container = document.getElementById(settings.settingsId);
    if (container) {
      const observer = new MutationObserver(() => {
        applyStatusToUi();
        applyUiEnhancements();
      });
      observer.observe(container, { childList: true, subtree: true });
      // Отключаем observer через 10 секунд
      setTimeout(() => observer.disconnect(), 10000);
    }
  } catch (_error) { void 0; }

  try {
    const refreshInterval = setInterval(() => {
      applyStatusToUi();
      applyUiEnhancements();
    }, 1000); // Уменьшаем частоту проверки до 1 секунды
    setTimeout(() => clearInterval(refreshInterval), 10000); // Уменьшаем время работы
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

// Функция для создания поля пароля с кнопкой показать/скрыть
function createPasswordField(fieldId: string) {
  try {
    const inputElement = document.getElementById(
      "catjam-settings." + fieldId,
    ) as HTMLInputElement | null;
    
    if (!inputElement) {
      return;
    }
    
    // Проверяем, не создано ли уже поле пароля
    if (inputElement.type === "password" && inputElement.parentElement?.querySelector('button[title*="пароль"]')) {
      return; // Поле пароля уже создано
    }
    
    // Устанавливаем тип password
    inputElement.type = "password";
    
    // Создаём контейнер для поля и кнопки
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.width = "100%";
    
    // Перемещаем input в контейнер
    inputElement.parentNode?.insertBefore(container, inputElement);
    container.appendChild(inputElement);
    
    // Создаём кнопку показать/скрыть
    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.innerHTML = "👁️";
    toggleButton.title = "Показать/скрыть пароль";
    toggleButton.style.cssText = `
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: #b3b3b3;
      cursor: pointer;
      font-size: 16px;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
      z-index: 10;
    `;
    
    // Добавляем hover эффект
    toggleButton.addEventListener("mouseenter", () => {
      toggleButton.style.color = "#fff";
      toggleButton.style.backgroundColor = "#282828";
    });
    
    toggleButton.addEventListener("mouseleave", () => {
      toggleButton.style.color = "#b3b3b3";
      toggleButton.style.backgroundColor = "transparent";
    });
    
    // Обработчик клика для показа/скрытия
    toggleButton.addEventListener("click", () => {
      if (inputElement.type === "password") {
        inputElement.type = "text";
        toggleButton.innerHTML = "🙈";
        toggleButton.title = "Скрыть пароль";
      } else {
        inputElement.type = "password";
        toggleButton.innerHTML = "👁️";
        toggleButton.title = "Показать пароль";
      }
    });
    
    // Добавляем кнопку в контейнер
    container.appendChild(toggleButton);
    
    // Устанавливаем отступ справа для input, чтобы текст не перекрывался кнопкой
    inputElement.style.paddingRight = "40px";
    
    // Добавляем обработчик для сохранения значения в настройках
    inputElement.addEventListener("input", () => {
      settings.setFieldValue(fieldId, inputElement.value);
    });
    
    // Добавляем обработчик для изменения типа (показать/скрыть)
    inputElement.addEventListener("change", () => {
      settings.setFieldValue(fieldId, inputElement.value);
    });
    
  } catch (error) {
    // Ошибки игнорируем
  }
}

// Делаем функцию очистки доступной глобально
(window as any).clearCatJamSettings = clearAllSettings;

export default main; // Export the main function for use in the application
