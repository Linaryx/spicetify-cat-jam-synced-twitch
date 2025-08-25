export const DEFAULT_VIDEO_BPM = 135.48;
export const DEFAULT_MESSAGE_DELAY_MS = 5000;

export const SELECTOR_BOTTOM_PLAYER = ".main-nowPlayingBar-right";
export const SELECTOR_TRACK_NAME = ".main-trackInfo-name a";
export const SELECTOR_ARTIST_NAME = ".main-trackInfo-artists a";
export const SELECTOR_LEFT_LIBRARY = ".main-yourLibraryX-libraryItemContainer";

export const CATJAM_VIDEO_URL =
  "https://github.com/Linaryx/spicetify-cat-jam-synced-twitch/raw/5393eb68cf205af4cbeaddbc52d6e1d92977259b/src/resources/catjam.webm";

export const SETTINGS_SECTION_TITLE = "Настройки Cat-Jam";
export const SETTINGS_SECTION_ID = "catjam-settings";

export const POSITION_OPTIONS = ["Снизу (Плеер)", "Слева (Медиатека)"];
export const BPM_METHOD_OPTIONS = [
  "BPM трека",
  "Танцевальность, энергия и BPM трека",
];

export const DEFAULT_LEFT_LIBRARY_SIZE = 100;
export const VIDEO_STYLE_BOTTOM = "width: 65px; height: 65px;";

export const STYLE_DARK_BUTTON =
  "background-color:transparent !important; border:none !important; color:#b3b3b3 !important; font-size:14px !important; font-weight:400 !important; padding:0 !important; text-align:left !important; cursor:default !important; pointer-events:none !important;";
export const STYLE_RECONNECT_BUTTON =
  "background-color:transparent !important; border:1px solid #878787 !important; color:#fff !important; font-size:14px !important; font-weight:600 !important; padding:8px 16px !important; border-radius:4px !important; cursor:pointer !important; transition:all 0.1s ease !important;";
export const STYLE_HEADER_CAT =
  "background:transparent !important; border:none !important; color:#b3b3b3 !important; text-align:left !important; padding:8px 0 !important; padding-left:0 !important; font-size:13px !important; font-weight:700 !important; text-transform:uppercase !important; letter-spacing:.06em !important; margin:12px 0 6px !important; display:block !important; width:100% !important; border-bottom:1px solid #333 !important; cursor:default !important; pointer-events:none !important;";
export const STYLE_HEADER_TWITCH =
  "background:transparent !important; border:none !important; color:#b3b3b3 !important; text-align:left !important; padding:12px 0 !important; font-size:13px !important; font-weight:700 !important; text-transform:uppercase !important; letter-spacing:.06em !important; margin:16px 0 8px !important; display:block !important; width:100% !important; border-bottom:2px solid #424242 !important; cursor:default !important; pointer-events:none !important;";

export const STATUS_CONNECTED_TEXT = "\uD83D\uDFE2 Подключено";
export const STATUS_DISCONNECTED_TEXT = "\uD83D\uDD34 Отключено";

export const TWITCH_CONFIG_STORAGE_KEY = "twitch-config";
export const DEFAULT_TWITCH_MESSAGE_FORMAT =
  "{track} - {artist} | BPM: {bpm} | Ближайшее {nearest_bpm}";
export const DEFAULT_TWITCH_BPM_VALUES =
  "80,100,110,120,130,140,150,160,170,180";

export const CALC_DANCEABILITY_WEIGHT = 0.9;
export const CALC_ENERGY_WEIGHT = 0.6;
export const CALC_BPM_WEIGHT = 0.6;
export const CALC_ENERGY_THRESHOLD = 0.5;
export const CALC_DANCEABILITY_THRESHOLD = 0.5;
export const CALC_MAX_BPM = 100;
export const CALC_BPM_SLOW_THRESHOLD = 0.8;
export const CALC_MIN_BETTER_BPM = 70;

// Settings field IDs and labels
export const ID_CAT_SECTION = "cat-section";
export const TITLE_CAT_SECTION = "Настройки котика";
export const TEXT_CAT_SECTION = "———————";

export const ID_CAT_WEBM_LINK = "catjam-webm-link";
export const LABEL_CAT_WEBM_LINK =
  "Выберите видео для отображения";

export const ID_CAT_WEBM_CUSTOM_URL = "catjam-webm-custom-url";
export const LABEL_CAT_WEBM_CUSTOM_URL =
  "Пользовательская ссылка на webM видео (если выбрано 'Пользовательское')";

export const ID_CAT_WEBM_BPM = "catjam-webm-bpm";
export const LABEL_CAT_WEBM_BPM =
  "Пользовательский BPM по умолчанию для webM видео (Пример: 135.48)";

export const ID_CAT_WEBM_POSITION = "catjam-webm-position";
export const LABEL_CAT_WEBM_POSITION =
  "Позиция, где должно отображаться webM видео";

export const ID_CAT_BPM_METHOD_SLOW = "catjam-webm-bpm-method";
export const LABEL_CAT_BPM_METHOD_SLOW =
  "Метод расчета лучшего BPM для медленных песен";

export const ID_CAT_BPM_METHOD_FAST = "catjam-webm-bpm-method-faster-songs";
export const LABEL_CAT_BPM_METHOD_FAST =
  "Метод расчета лучшего BPM для быстрых песен";

export const ID_CAT_LEFT_SIZE = "catjam-webm-position-left-size";
export const LABEL_CAT_LEFT_SIZE =
  "Размер webM видео в левой медиатеке (работает только для медиатеки слева, по умолчанию: 100)";

export const ID_CAT_RELOAD = "catjam-reload";
export const TITLE_CAT_RELOAD = "Сохранить";
export const TEXT_CAT_RELOAD = "Сохранить";

export const ID_TWITCH_SECTION = "twitch-section";
export const TITLE_TWITCH_SECTION = "Twitch";
export const TEXT_TWITCH_SECTION = "———————";

export const ID_TWITCH_TOKEN = "twitch-token";
export const LABEL_TWITCH_TOKEN =
  "OAuth токен Twitch (получить на https://twitchtokengenerator.com )";

export const ID_TWITCH_CHANNEL = "twitch-channel";
export const LABEL_TWITCH_CHANNEL = "Название канала Twitch";

export const ID_TWITCH_ENABLED = "twitch-enabled";
export const LABEL_TWITCH_ENABLED = "Включить отправку в чат Twitch";

export const ID_TWITCH_MESSAGE_DELAY = "twitch-message-delay";
export const LABEL_TWITCH_MESSAGE_DELAY = "Задержка между сообщениями (мс)";

export const ID_TWITCH_MESSAGE_FORMAT = "twitch-message-format";
export const LABEL_TWITCH_MESSAGE_FORMAT =
  "Формат сообщения. Переменные: {track} {artist} {bpm} {nearest_bpm}";

export const ID_TWITCH_BPM_VALUES = "twitch-bpm-values";
export const LABEL_TWITCH_BPM_VALUES = "Значения BPM (через запятую)";

export const ID_TWITCH_STATUS_INDICATOR = "twitch-status-indicator";
export const TITLE_TWITCH_STATUS_INDICATOR = "Статус бота Twitch";

export const ID_TWITCH_RECONNECT = "twitch-reconnect";
export const TITLE_TWITCH_RECONNECT = "Переподключиться к Twitch";
export const TEXT_TWITCH_RECONNECT = "Переподключиться";
