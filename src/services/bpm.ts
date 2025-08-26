import {
  DEFAULT_VIDEO_BPM,
  CALC_DANCEABILITY_WEIGHT,
  CALC_ENERGY_WEIGHT,
  CALC_BPM_WEIGHT,
  CALC_ENERGY_THRESHOLD,
  CALC_DANCEABILITY_THRESHOLD,
  CALC_MAX_BPM,
  CALC_BPM_SLOW_THRESHOLD,
  CALC_MIN_BETTER_BPM,
} from "../constants";

export async function getBetterBPM(currentBPM: number): Promise<number> {
  let betterBPM = currentBPM;
  try {
    const currentSongDataUri = Spicetify.Player.data?.item?.uri;
    if (!currentSongDataUri) {
      setTimeout(getBetterBPM, 200);
      return betterBPM;
    }
    const uriFinal = currentSongDataUri.split(":")[2];
    const res = await Spicetify.CosmosAsync.get(
      "https://api.spotify.com/v1/audio-features/" + uriFinal,
    );
    const danceability = Math.round(100 * res.danceability);
    const energy = Math.round(100 * res.energy);
    betterBPM = calculateBetterBPM(danceability, energy, currentBPM);
  } catch (_error) { void 0; }
  return betterBPM;
}

export function calculateBetterBPM(
  danceability: number,
  energy: number,
  currentBPM: number,
): number {
  let danceabilityWeight = CALC_DANCEABILITY_WEIGHT;
  let energyWeight = CALC_ENERGY_WEIGHT;
  let bpmWeight = CALC_BPM_WEIGHT;
  const energyTreshold = CALC_ENERGY_THRESHOLD;
  const danceabilityTreshold = CALC_DANCEABILITY_THRESHOLD;
  const maxBPM = CALC_MAX_BPM;
  const bpmThreshold = CALC_BPM_SLOW_THRESHOLD;

  const normalizedBPM = currentBPM / 100;
  const normalizedDanceability = danceability / 100;
  const normalizedEnergy = energy / 100;

  if (normalizedDanceability < danceabilityTreshold) {
    danceabilityWeight *= normalizedDanceability;
  }
  if (normalizedEnergy < energyTreshold) {
    energyWeight *= normalizedEnergy;
  }
  if (normalizedBPM < bpmThreshold) {
    bpmWeight = 0.9;
  }

  const weightedAverage =
    (normalizedDanceability * danceabilityWeight +
      normalizedEnergy * energyWeight +
      normalizedBPM * bpmWeight) /
    (1 - danceabilityWeight + 1 - energyWeight + bpmWeight);
  let betterBPM = weightedAverage * maxBPM;

  const betterBPMForFasterSongs =
    String(
      (window as any).Spicetify?.Platform?.History ||
        (window as any).settings?.getFieldValue?.(
          "catjam-webm-bpm-method-faster-songs",
        ) ||
        "Track BPM",
    ) !== "Track BPM";
  if (betterBPM > currentBPM) {
    if (betterBPMForFasterSongs) {
      betterBPM = (betterBPM + currentBPM) / 2;
    } else {
      betterBPM = currentBPM;
    }
  }

  if (betterBPM < currentBPM) {
    betterBPM = Math.max(betterBPM, CALC_MIN_BETTER_BPM);
  }

  console.log('🎵 Нормализация BPM:', { 
    original: currentBPM, 
    danceability, 
    energy, 
    normalized: betterBPM 
  });

  return betterBPM;
}

export async function computePlaybackRate(
  audioData: any,
  settings: any,
): Promise<number> {
  let videoDefaultBPM = Number(settings.getFieldValue("catjam-webm-bpm"));
  if (!videoDefaultBPM) videoDefaultBPM = DEFAULT_VIDEO_BPM;
  if (audioData?.track?.tempo) {
    const trackBPM = audioData.track.tempo as number;
    const method = String(
      settings.getFieldValue("catjam-webm-bpm-method") || "Track BPM",
    );
    const bpm =
      method === "Track BPM" ? trackBPM : await getBetterBPM(trackBPM);
    
    // Логируем BPM трека и нормализованный BPM
    console.log('🎵 BPM трека:', trackBPM);
    console.log('🎵 Нормализованный BPM:', bpm);
    
    return (bpm || trackBPM) / videoDefaultBPM;
  }
  return 1;
}
