import tmi from "tmi.js";

interface TwitchConfig {
  token: string;
  channel: string;
  enabled: boolean;
  message_delay: number;
  message_format: string;
  bpm_values: string;
}

class TwitchClient {
  private client: tmi.Client | null = null;
  private config: TwitchConfig | null = null;
  private lastMessageTime: number = 0;
  private isConnected: boolean = false;
  private bpmCommandCallback: (() => Promise<void>) | null = null;
  private statusCallback: ((connected: boolean) => void) | null = null;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      const configStr = localStorage.getItem("twitch-config");
      if (configStr) {
        this.config = JSON.parse(configStr);
      } else {
        this.config = {
          token: "",
          channel: "",
          enabled: false,
          message_delay: 5000,
          message_format:
            "{track} - {artist} | BPM: {bpm} | Ближайшая цифра: {nearest_bpm}",
          bpm_values: "80,100,110,120,130,140,150,160,170,180",
        };
        this.saveConfig();
      }
    } catch (_error) {
      this.config = {
        token: "",
        channel: "",
        enabled: false,
        message_delay: 5000,
        message_format:
          "{track} - {artist} | BPM: {bpm} | Ближайшая цифра: {nearest_bpm}",
        bpm_values: "80,100,110,120,130,140,150,160,170,180",
      };
    }
  }

  private saveConfig(): void {
    if (this.config) {
      localStorage.setItem("twitch-config", JSON.stringify(this.config));
    }
  }

  public updateConfig(newConfig: Partial<TwitchConfig>): void {
    if (this.config) {
      this.config = { ...this.config, ...newConfig };
      this.saveConfig();
    }
  }

  public getConfig(): TwitchConfig | null {
    return this.config;
  }

  public async connect(): Promise<boolean> {
    if (
      !this.config ||
      !this.config.enabled ||
      !this.config.token ||
      !this.config.channel
    ) {
      return false;
    }

    try {
      const silentLogger = {
        setLevel: (_level: string) => {},
        trace: (_msg: string) => {},
        debug: (_msg: string) => {},
        info: (_msg: string) => {},
        warn: (_msg: string) => {},
        error: (_msg: string) => {},
        fatal: (_msg: string) => {},
      } as any;

      this.client = new tmi.Client({
        options: {
          debug: false,
          skipUpdatingEmotesets: true as any,
          messagesLogLevel: "error" as any,
        },
        connection: { reconnect: true, secure: true },
        identity: {
          username: this.config.channel,
          password: this.config.token,
        },
        channels: [this.config.channel],
        logger: silentLogger,
      });

      try {
        (
          this.client as unknown as { _updateEmoteset?: () => void }
        )._updateEmoteset = () => {};
        (this.client as unknown as { opts?: any }).opts =
          (this.client as any).opts || {};
        (this.client as unknown as { opts?: any }).opts.options =
          (this.client as any).opts?.options || {};
        (
          this.client as unknown as { opts?: any }
        ).opts.options.skipUpdatingEmotesets = true;
      } catch (_error) { void 0; }

      this.client.on("connected", () => {
        this.isConnected = true;
        try {
          (
            this.client as unknown as { _updateEmoteset?: () => void }
          )._updateEmoteset = () => {};
          (
            this.client as unknown as { opts?: any }
          ).opts.options.skipUpdatingEmotesets = true;
        } catch (_error) { void 0; }
        try {
          this.statusCallback?.(true);
        } catch (_error) { void 0; }
        try {
          const ev = new CustomEvent("catjam:twitch-status", {
            detail: { connected: true },
          });
          window.dispatchEvent(ev);
        } catch (_error) { void 0; }
      });

      this.client.on("disconnected", () => {
        this.isConnected = false;
        try {
          this.statusCallback?.(false);
        } catch (_error) { void 0; }
        try {
          const ev = new CustomEvent("catjam:twitch-status", {
            detail: { connected: false },
          });
          window.dispatchEvent(ev);
        } catch (_error) { void 0; }
      });

      this.client.on("error", (_error) => {
        this.isConnected = false;
        try {
          this.statusCallback?.(false);
        } catch (_error) { void 0; }
        try {
          const ev = new CustomEvent("catjam:twitch-status", {
            detail: { connected: false },
          });
          window.dispatchEvent(ev);
        } catch (_error) { void 0; }
      });

      this.client.on("message", (channel, tags, message, self) => {
        if (self) return;
        if (message.toLowerCase().trim() === "!bpm") {
          if (this.bpmCommandCallback) {
            this.bpmCommandCallback().catch(() => {});
          }
        }
      });

      await this.client.connect();
      return true;
    } catch (_error) {
      return false;
    }
  }

  public disconnect(): void {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
      this.isConnected = false;
    }
  }

  private findNearestBPM(bpm: number): number {
    if (!this.config || !this.config.bpm_values) {
      const defaultBpmValues = [
        80, 100, 110, 120, 130, 140, 150, 160, 170, 180,
      ];
      return this.findNearestFromArray(bpm, defaultBpmValues);
    }

    const bpmValuesString = this.config.bpm_values;
    const bpmValues = bpmValuesString
      .split(",")
      .map((val) => {
        const parsed = parseInt(val.trim());
        return isNaN(parsed) ? 0 : parsed;
      })
      .filter((val) => val > 0);

    if (bpmValues.length === 0) {
      const defaultBpmValues = [
        80, 100, 110, 120, 130, 140, 150, 160, 170, 180,
      ];
      return this.findNearestFromArray(bpm, defaultBpmValues);
    }

    return this.findNearestFromArray(bpm, bpmValues);
  }

  private findNearestFromArray(bpm: number, bpmValues: number[]): number {
    let nearest = bpmValues[0];
    let minDiff = Math.abs(bpm - nearest);
    for (const value of bpmValues) {
      const diff = Math.abs(bpm - value);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = value;
      }
    }
    return nearest;
  }

  public async sendTrackInfo(
    track: string,
    artist: string,
    bpm: number,
  ): Promise<boolean> {
    if (
      !this.config ||
      !this.config.enabled ||
      !this.isConnected ||
      !this.client
    ) {
      return false;
    }
    const now = Date.now();
    if (now - this.lastMessageTime < this.config.message_delay) {
      return false;
    }
    const nearestBPM = this.findNearestBPM(bpm);
    const message = this.config.message_format
      .replace("{track}", track)
      .replace("{artist}", artist)
      .replace("{bpm}", Math.round(bpm).toString())
      .replace("{nearest_bpm}", nearestBPM.toString());
    try {
      await this.client.say(this.config.channel, message);
      this.lastMessageTime = now;
      return true;
    } catch (_error) {
      return false;
    }
  }

  public isConnectedToTwitch(): boolean {
    return this.isConnected;
  }

  public setBpmCommandCallback(callback: () => Promise<void>): void {
    this.bpmCommandCallback = callback;
  }

  public setStatusCallback(callback: (connected: boolean) => void): void {
    this.statusCallback = callback;
  }
}

export default TwitchClient;
