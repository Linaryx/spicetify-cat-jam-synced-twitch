export const DEFAULT_VIDEO_BPM = 135.48;
export const DEFAULT_MESSAGE_DELAY_MS = 5000;

export const SELECTOR_BOTTOM_PLAYER = ".main-nowPlayingBar-right";
export const SELECTOR_TRACK_NAME = ".main-trackInfo-name a";
export const SELECTOR_ARTIST_NAME = ".main-trackInfo-artists a";
export const SELECTOR_LEFT_LIBRARY = ".main-yourLibraryX-libraryItemContainer";

export const CATJAM_VIDEO_URL =
  "https://github.com/BlafKing/spicetify-cat-jam-synced/raw/main/src/resources/catjam.webm";

export const SETTINGS_SECTION_TITLE = "Cat-Jam Settings";
export const SETTINGS_SECTION_ID = "catjam-settings";

export const POSITION_OPTIONS = ["Bottom (Player)", "Left (Library)"];
export const BPM_METHOD_OPTIONS = [
  "Track BPM",
  "Danceability, Energy and Track BPM",
];

export const DEFAULT_LEFT_LIBRARY_SIZE = 100;
export const VIDEO_STYLE_BOTTOM = "width: 65px; height: 65px;";

export const STYLE_DARK_BUTTON =
  "background-color:#000; color:#b3b3b3; border:1px solid #333;";
export const STYLE_RECONNECT_BUTTON =
  "background-color:#000; border:1px solid #000;";
export const STYLE_HEADER_CAT =
  "background:transparent; border:none; color:#fff; text-align:left; padding-left:0; font-size:16px; font-weight:700; margin:8px 0 4px;";
export const STYLE_HEADER_TWITCH =
  "background:transparent; border:none; color:#fff; text-align:left; padding-left:0; font-size:16px; font-weight:700; margin:12px 0 4px;";

export const STATUS_CONNECTED_TEXT = "\uD83D\uDFE2 Connected";
export const STATUS_DISCONNECTED_TEXT = "\uD83D\uDD34 Disconnected";

export const TWITCH_CONFIG_STORAGE_KEY = "twitch-config";
export const DEFAULT_TWITCH_MESSAGE_FORMAT =
  "{track} - {artist} | BPM: {bpm} | Nearest {nearest_bpm}";
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
export const TITLE_CAT_SECTION = "Cat Settings";
export const TEXT_CAT_SECTION = "— Cat Settings —";

export const ID_CAT_WEBM_LINK = "catjam-webm-link";
export const LABEL_CAT_WEBM_LINK =
  "Custom webM video URL (Link does not work if no video shows)";

export const ID_CAT_WEBM_BPM = "catjam-webm-bpm";
export const LABEL_CAT_WEBM_BPM =
  "Custom default BPM of webM video (Example: 135.48)";

export const ID_CAT_WEBM_POSITION = "catjam-webm-position";
export const LABEL_CAT_WEBM_POSITION =
  "Position where webM video should be rendered";

export const ID_CAT_BPM_METHOD_SLOW = "catjam-webm-bpm-method";
export const LABEL_CAT_BPM_METHOD_SLOW =
  "Method to calculate better BPM for slower songs";

export const ID_CAT_BPM_METHOD_FAST = "catjam-webm-bpm-method-faster-songs";
export const LABEL_CAT_BPM_METHOD_FAST =
  "Method to calculate better BPM for faster songs";

export const ID_CAT_LEFT_SIZE = "catjam-webm-position-left-size";
export const LABEL_CAT_LEFT_SIZE =
  "Size of webM video on the left library (Only works for left library, Default: 100)";

export const ID_CAT_RELOAD = "catjam-reload";
export const TITLE_CAT_RELOAD = "Save and reload";
export const TEXT_CAT_RELOAD = "Save and reload";

export const ID_TWITCH_SECTION = "twitch-section";
export const TITLE_TWITCH_SECTION = "Twitch";
export const TEXT_TWITCH_SECTION = "— Twitch —";

export const ID_TWITCH_TOKEN = "twitch-token";
export const LABEL_TWITCH_TOKEN =
  "Twitch OAuth Token (get on https://twitchtokengenerator.com )";

export const ID_TWITCH_CHANNEL = "twitch-channel";
export const LABEL_TWITCH_CHANNEL = "Twitch Channel Name";

export const ID_TWITCH_ENABLED = "twitch-enabled";
export const LABEL_TWITCH_ENABLED = "Enable sending to Twitch chat";

export const ID_TWITCH_MESSAGE_DELAY = "twitch-message-delay";
export const LABEL_TWITCH_MESSAGE_DELAY = "Delay between messages (ms)";

export const ID_TWITCH_MESSAGE_FORMAT = "twitch-message-format";
export const LABEL_TWITCH_MESSAGE_FORMAT =
  "Message format. Constants: {track} {artist} {bpm} {nearest_bpm}";

export const ID_TWITCH_BPM_VALUES = "twitch-bpm-values";
export const LABEL_TWITCH_BPM_VALUES = "BPM values (comma separated)";

export const ID_TWITCH_STATUS_INDICATOR = "twitch-status-indicator";
export const TITLE_TWITCH_STATUS_INDICATOR = "Twitch bot status";

export const ID_TWITCH_RECONNECT = "twitch-reconnect";
export const TITLE_TWITCH_RECONNECT = "Reconnect to Twitch";
export const TEXT_TWITCH_RECONNECT = "Reconnect";
