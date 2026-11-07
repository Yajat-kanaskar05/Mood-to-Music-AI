/**
 * Audio Player Utility for Mood-to-Music AI
 * Supports:
 * 1. 30-second real studio preview streaming via public music search APIs (iTunes)
 * 2. Harmonic Web Audio synthesizer fallback matching song BPM, energy & valence
 * 3. Singleton playback control (playing one song stops all others)
 */

let currentAudio = null;
let currentSynth = null;
let activeTrackId = null;

// Stop all playing audio
export function stopAllAudio() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.src = '';
    } catch {
      // ignore
    }
    currentAudio = null;
  }

  if (currentSynth) {
    try {
      currentSynth.stop();
    } catch {
      // ignore
    }
    currentSynth = null;
  }

  activeTrackId = null;
}

// Check if a specific track is currently playing
export function isCurrentTrack(trackIdentifier) {
  return activeTrackId === trackIdentifier;
}

// Fetch 30-second audio preview from iTunes Search API
async function fetchPreviewUrl(trackName, artists) {
  try {
    const query = encodeURIComponent(`${trackName} ${artists}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=1`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0 && data.results[0].previewUrl) {
      return data.results[0].previewUrl;
    }
  } catch (err) {
    console.warn('[AudioPlayer] Could not fetch iTunes preview stream:', err.message);
  }
  return null;
}

// Synthesize pleasant acoustic preview matching track tempo and valence
function startAcousticSynth(tempo = 120, energy = 0.5, valence = 0.5) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  try {
    const ctx = new AudioCtx();
    const bpm = Math.max(65, Math.min(Number(tempo) || 120, 175));
    const beatSec = 60 / bpm;

    // Scale selection: Major pentatonic for high valence, Minor for lower valence
    const scale = valence >= 0.5
      ? [261.63, 293.66, 329.63, 392.00, 440.00, 523.25] // C Major
      : [220.00, 246.94, 261.63, 293.66, 329.63, 392.00]; // A Minor

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.12, ctx.currentTime);
    masterGain.connect(ctx.destination);

    const intervalId = setInterval(() => {
      if (ctx.state === 'closed') {
        clearInterval(intervalId);
        return;
      }

      const freq = scale[Math.floor(Math.random() * scale.length)];
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = energy > 0.65 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      noteGain.gain.setValueAtTime(0.12, ctx.currentTime);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + beatSec * 0.9);

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start();
      osc.stop(ctx.currentTime + beatSec * 0.9);
    }, (beatSec * 1000) / 2);

    return {
      stop: () => {
        clearInterval(intervalId);
        try {
          masterGain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
          setTimeout(() => {
            if (ctx.state !== 'closed') ctx.close();
          }, 150);
        } catch {
          // ignore
        }
      }
    };
  } catch (err) {
    console.warn('[AudioPlayer] Web Audio synth not available:', err);
    return null;
  }
}

/**
 * Play audio for a song:
 * Attempts 30s studio audio preview first. If unavailable, seamlessly falls back to acoustic synthesizer.
 */
export async function playTrack(song, onStateChange) {
  const trackId = song.track_id || `${song.track_name}-${song.artists}`;

  // If already playing this track, stop it (toggle behavior)
  if (activeTrackId === trackId) {
    stopAllAudio();
    if (onStateChange) onStateChange({ isPlaying: false });
    return false;
  }

  // Stop any other currently playing song
  stopAllAudio();
  activeTrackId = trackId;

  if (onStateChange) {
    onStateChange({ isPlaying: true, status: 'loading', mode: 'connecting' });
  }

  // Try real 30s studio preview first
  const previewUrl = await fetchPreviewUrl(song.track_name, song.artists);

  // Check if user cancelled while fetching
  if (activeTrackId !== trackId) return false;

  if (previewUrl) {
    const audio = new Audio(previewUrl);
    currentAudio = audio;
    audio.volume = 0.85;

    audio.onended = () => {
      stopAllAudio();
      if (onStateChange) onStateChange({ isPlaying: false, status: 'ended' });
    };

    audio.onerror = () => {
      console.warn('[AudioPlayer] Audio preview stream error, switching to synth fallback');
      currentAudio = null;
      startSynthFallback();
    };

    try {
      await audio.play();
      if (onStateChange) {
        onStateChange({
          isPlaying: true,
          status: 'playing',
          mode: 'studio',
          message: 'Playing 30s studio preview'
        });
      }
      return true;
    } catch (err) {
      console.warn('[AudioPlayer] Autoplay was blocked or failed, falling back:', err);
    }
  }

  // Fallback: Web Audio synthesizer
  function startSynthFallback() {
    const synth = startAcousticSynth(song.tempo, song.energy, song.valence);
    if (synth) {
      currentSynth = synth;
      if (onStateChange) {
        onStateChange({
          isPlaying: true,
          status: 'playing',
          mode: 'synth',
          message: `Acoustic synth preview (${Math.round(song.tempo || 120)} BPM)`
        });
      }
      return true;
    }
    return false;
  }

  return startSynthFallback();
}

