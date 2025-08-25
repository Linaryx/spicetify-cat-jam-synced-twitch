import { SELECTOR_BOTTOM_PLAYER, CATJAM_VIDEO_URL } from "../constants";
import { waitForElement } from "../utils/dom";

export async function ensureCatVideo(
  fetchAudioData: () => Promise<any>,
  getPlaybackRate: (audioData: any) => Promise<number>,
): Promise<void> {
  const target = await waitForElement(SELECTOR_BOTTOM_PLAYER);
  const existing = document.getElementById("catjam-webm");
  if (existing) existing.remove();

  const video = document.createElement("video");
  video.setAttribute("loop", "true");
  video.setAttribute("autoplay", "true");
  video.setAttribute("muted", "true");
  video.setAttribute("style", "width: 65px; height: 65px;");
  video.src = CATJAM_VIDEO_URL;
  video.id = "catjam-webm";

  const audioData = await fetchAudioData();
  video.playbackRate = await getPlaybackRate(audioData);

  if (target.firstChild) target.insertBefore(video, target.firstChild);
  else target.appendChild(video);

  if ((window as any).Spicetify?.Player?.isPlaying()) video.play();
  else video.pause();
}
