import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  cover_url: string | null;
  audio_url: string;
  duration_seconds: number | null;
};

export type RepeatMode = "off" | "all" | "one";

type PersistedState = {
  track?: Track;
  progress?: number;
  volume?: number;
  muted?: boolean;
  shuffle?: boolean;
  repeat?: RepeatMode;
};

const STORAGE_KEY = "djpakkie:player";

type PlayerCtx = {
  current: Track | null;
  queue: Track[];
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  playTrack: (track: Track, queue?: Track[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (s: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
};

const Ctx = createContext<PlayerCtx | null>(null);

function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : null;
  } catch {
    return null;
  }
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const preMuteVolumeRef = useRef(1);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const a = new Audio();
    audioRef.current = a;

    // Restore whatever was playing / configured on the last visit.
    const saved = loadPersisted();
    if (saved) {
      if (typeof saved.volume === "number") {
        a.volume = saved.volume;
        setVolumeState(saved.volume);
        preMuteVolumeRef.current = saved.volume || 1;
      }
      if (saved.muted) {
        a.volume = 0;
        setMuted(true);
      }
      if (saved.shuffle) setShuffle(true);
      if (saved.repeat) setRepeat(saved.repeat);
      if (saved.track) {
        setCurrent(saved.track);
        a.src = saved.track.audio_url;
        if (saved.progress) {
          a.currentTime = saved.progress;
          setProgress(saved.progress);
        }
      }
    }

    const onTime = () => setProgress(a.currentTime);
    const onMeta = () => setDuration(a.duration || 0);
    const onEnd = () => {
      if (repeatRef.current === "one") {
        a.currentTime = 0;
        a.play();
        return;
      }
      nextRef.current?.();
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const playTrack = useCallback((track: Track, q?: Track[]) => {
    const a = audioRef.current;
    if (!a) return;
    setCurrent(track);
    if (q) setQueue(q);
    a.src = track.audio_url;
    a.currentTime = 0;
    setProgress(0);
    a.play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, []);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    if (a.paused) {
      a.play();
      setIsPlaying(true);
    } else {
      a.pause();
      setIsPlaying(false);
    }
  }, [current]);

  const next = useCallback(() => {
    if (!current) return;
    if (repeat === "one") {
      playTrack(current, queue);
      return;
    }
    if (queue.length === 0) return;

    if (shuffle) {
      const others = queue.filter((t) => t.id !== current.id);
      if (others.length > 0) {
        const pick = others[Math.floor(Math.random() * others.length)];
        playTrack(pick, queue);
      } else if (repeat === "all") {
        playTrack(current, queue);
      }
      return;
    }

    const idx = queue.findIndex((t) => t.id === current.id);
    const nxt = queue[idx + 1];
    if (nxt) {
      playTrack(nxt, queue);
    } else if (repeat === "all" && queue[0]) {
      playTrack(queue[0], queue);
    }
  }, [current, queue, playTrack, repeat, shuffle]);

  const prev = useCallback(() => {
    if (!current || queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === current.id);
    const p = queue[idx - 1];
    if (p) playTrack(p, queue);
  }, [current, queue, playTrack]);

  const nextRef = useRef(next);
  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  const repeatRef = useRef(repeat);
  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);

  const seek = useCallback((s: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = s;
    setProgress(s);
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    const a = audioRef.current;
    if (a) a.volume = clamped;
    setVolumeState(clamped);
    if (clamped > 0) {
      preMuteVolumeRef.current = clamped;
      setMuted(false);
    } else {
      setMuted(true);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (muted) {
      const restore = preMuteVolumeRef.current || 1;
      a.volume = restore;
      setVolumeState(restore);
      setMuted(false);
    } else {
      preMuteVolumeRef.current = volume || 1;
      a.volume = 0;
      setMuted(true);
    }
  }, [muted, volume]);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));
  }, []);

  // Persist playback + preferences so a reload doesn't lose your place.
  const snapshotRef = useRef<PersistedState>({});
  useEffect(() => {
    snapshotRef.current = {
      track: current ?? undefined,
      progress,
      volume,
      muted,
      shuffle,
      repeat,
    };
  }, [current, progress, volume, muted, shuffle, repeat]);

  useEffect(() => {
    const save = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshotRef.current));
      } catch {
        // ignore quota / privacy-mode errors
      }
    };
    window.addEventListener("beforeunload", save);
    const interval = setInterval(save, 5000);
    return () => {
      window.removeEventListener("beforeunload", save);
      clearInterval(interval);
      save();
    };
  }, []);

  const value = useMemo<PlayerCtx>(
    () => ({
      current,
      queue,
      isPlaying,
      progress,
      duration,
      volume,
      muted,
      shuffle,
      repeat,
      playTrack,
      toggle,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
    }),
    [
      current,
      queue,
      isPlaying,
      progress,
      duration,
      volume,
      muted,
      shuffle,
      repeat,
      playTrack,
      toggle,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePlayer must be used inside PlayerProvider");
  return c;
}

export function formatTime(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
