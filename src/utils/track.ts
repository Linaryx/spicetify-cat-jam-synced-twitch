import { SELECTOR_TRACK_NAME, SELECTOR_ARTIST_NAME } from "../constants";

export type TrackDomInfo = { track: string; artist: string };

export function getTrackFromDom(): TrackDomInfo {
  let track = "Unknown Track";
  let artist = "Unknown Artist";
  try {
    const trackEl = document.querySelector(
      SELECTOR_TRACK_NAME,
    ) as HTMLElement | null;
    const artistEl = document.querySelector(
      SELECTOR_ARTIST_NAME,
    ) as HTMLElement | null;
    if (trackEl?.textContent) track = trackEl.textContent.trim();
    if (artistEl?.textContent) artist = artistEl.textContent.trim();
  } catch (_error) { void 0; }
  return { track, artist };
}
