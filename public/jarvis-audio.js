/**
 * J.A.R.V.I.S. Audio & Speech Controller
 * Pure Web Audio API Sound Synthesizer + Web Speech API (TTS & STT)
 * Zero external audio file dependencies.
 */

class JarvisAudioSystem {
  constructor() {
    this.audioCtx = null;
    this.sfxEnabled = true;
    this.voiceEnabled = true;
    this.speechSynth = window.speechSynthesis || null;
    this.currentUtterance = null;
    this.selectedVoice = null;
    this.voicePitch = 1.0;
    this.voiceRate = 1.35;
    this.voiceVolumeBoost = 4.0; // 400% Volume Output Boost via Web Audio GainNode & DynamicsCompressor
    this.isSpeaking = false;
    this.recognition = null;
    this.isListening = false;

    this.onSpeechStart = null;
    this.onSpeechEnd = null;
    this.onTranscript = null;
    this.onListeningChange = null;

    this.initAudioContext();
    this.initSpeechSynthesis();
    this.initSpeechRecognition();
  }

  // Initialize Web Audio Context lazily on first user interaction
  initAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      // Create context if unlocked
      const unlockAudio = () => {
        if (!this.audioCtx) {
          this.audioCtx = new AudioContextClass();
        }
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('click', unlockAudio);
      window.addEventListener('keydown', unlockAudio);
    }
  }

  ensureAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // ==========================================
  // HUD SOUND SYNTHESIZER (WEB AUDIO API)
  // ==========================================

  playStartup() {
    if (!this.sfxEnabled) return;
    this.ensureAudioContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Harmonic triad boot sequence (Stark HUD activation)
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.08 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.55);
    });
  }

  playBlip() {
    if (!this.sfxEnabled) return;
    this.ensureAudioContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  playReceive() {
    if (!this.sfxEnabled) return;
    this.ensureAudioContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(987.77, now);
    osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.1);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.19);
  }

  playSuccess() {
    if (!this.sfxEnabled) return;
    this.ensureAudioContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    [587.33, 880, 1174.66].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.06);

      gain.gain.setValueAtTime(0.08, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.26);
    });
  }

  playPulse() {
    if (!this.sfxEnabled) return;
    this.ensureAudioContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Sub-bass arc reactor resonance pulse
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.45);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.52);
  }

  playClick() {
    if (!this.sfxEnabled) return;
    this.ensureAudioContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.03);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  }

  playAlert() {
    if (!this.sfxEnabled) return;
    this.ensureAudioContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    [750, 450].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now + i * 0.12);

      gain.gain.setValueAtTime(0.1, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.17);
    });
  }

  // ==========================================
  // SPEECH SYNTHESIS (JARVIS VOICE)
  // ==========================================

  initSpeechSynthesis() {
    this.elevenLabsVoiceId = 'wDsJlOXPqcvIUKdLXjDs';
    this.activeAudioElement = null;

    if (!this.speechSynth) return;

    const populateVoices = () => {
      const voices = this.speechSynth.getVoices();
      if (!voices || !voices.length) return;

      // 1. Check if user previously picked a custom voice in Settings
      try {
        const savedVoiceURI = localStorage.getItem('jarvis_selected_voice');
        if (savedVoiceURI && savedVoiceURI !== 'Jarvis' && savedVoiceURI !== 'Eric') {
          const saved = voices.find(v => v.voiceURI === savedVoiceURI || v.name === savedVoiceURI);
          if (saved) {
            this.selectedVoice = saved;
            return;
          }
        }
      } catch (e) {}

      // 2. Primary Default Voice: Eric - English (United States)
      // High-priority search for Microsoft Eric, Eric Neural, or any Eric (en-US) voice
      const ericVoice = voices.find(v => {
        const name = v.name.toLowerCase();
        const isUS = v.lang === 'en-US' || v.lang.includes('US') || (v.lang && v.lang.startsWith('en'));
        return name.includes('eric') && isUS;
      }) || voices.find(v => v.name.toLowerCase().includes('eric'));

      if (ericVoice) {
        this.selectedVoice = ericVoice;
        try {
          localStorage.setItem('jarvis_selected_voice', ericVoice.voiceURI || ericVoice.name);
        } catch (e) {}
        return;
      }

      // 3. Fallback: Natural, warm, highly human English voice
      // Search for natural/online neural voices first (e.g. Natural, Neural, Online, Google, Daniel, Arthur, Andrew, Guy)
      const naturalVoice = voices.find(v => {
        const name = v.name.toLowerCase();
        const isEnglish = v.lang && (v.lang.startsWith('en') || v.lang.includes('US') || v.lang.includes('GB'));
        return isEnglish && (name.includes('natural') || name.includes('neural') || name.includes('online') || name.includes('multilingual'));
      });

      if (naturalVoice) {
        this.selectedVoice = naturalVoice;
        return;
      }

      // British / UK natural male voices (Classic Jarvis tone: Daniel, Oliver, George, Arthur)
      const britishVoice = voices.find(v => {
        const name = v.name.toLowerCase();
        const isGB = v.lang === 'en-GB' || v.lang.includes('GB');
        return isGB && (name.includes('daniel') || name.includes('oliver') || name.includes('george') || name.includes('arthur') || name.includes('male'));
      }) || voices.find(v => v.lang === 'en-GB' || v.lang.includes('GB'));

      if (britishVoice) {
        this.selectedVoice = britishVoice;
        return;
      }

      const andrewVoice = voices.find(v => 
        v.name.toLowerCase().includes('andrew') && (v.lang === 'en-US' || v.lang.includes('US') || v.lang.startsWith('en'))
      ) || voices.find(v => v.name.toLowerCase().includes('andrew'));

      if (andrewVoice) {
        this.selectedVoice = andrewVoice;
        return;
      }

      // 3. Fallback: US English natural/male voices
      const usVoices = voices.filter(v => 
        (v.lang === 'en-US' || v.lang.includes('en-US') || v.name.toLowerCase().includes('united states') || v.name.toLowerCase().includes('us'))
      );

      const usMaleVoice = usVoices.find(v => {
        const name = v.name.toLowerCase();
        return name.includes('natural') || name.includes('guy') || name.includes('david') || 
               name.includes('christopher') || name.includes('roger') || name.includes('male');
      });

      if (usMaleVoice) {
        this.selectedVoice = usMaleVoice;
      } else if (usVoices.length > 0) {
        this.selectedVoice = usVoices[0];
      } else {
        const anyEn = voices.find(v => v.lang.startsWith('en'));
        this.selectedVoice = anyEn || voices[0];
      }
    };

    populateVoices();
    if (this.speechSynth.onvoiceschanged !== undefined) {
      this.speechSynth.onvoiceschanged = () => {
        populateVoices();
        if (window.Jarvis && typeof window.Jarvis.populateVoiceSettings === 'function') {
          window.Jarvis.populateVoiceSettings();
        }
      };
    }
  }

  getAvailableVoices() {
    if (!this.speechSynth) return [];
    const all = this.speechSynth.getVoices() || [];
    
    // Filter to English voices for Jarvis assistant persona
    const englishVoices = all.filter(v => v.lang && (v.lang.startsWith('en') || v.lang.includes('en-')));
    const list = englishVoices.length > 0 ? englishVoices : all;

    return list.sort((a, b) => {
      const aEric = a.name.toLowerCase().includes('eric') ? 1 : 0;
      const bEric = b.name.toLowerCase().includes('eric') ? 1 : 0;
      if (aEric !== bEric) return bEric - aEric;

      const aAndrew = a.name.toLowerCase().includes('andrew') ? 1 : 0;
      const bAndrew = b.name.toLowerCase().includes('andrew') ? 1 : 0;
      if (aAndrew !== bAndrew) return bAndrew - aAndrew;

      const aUs = a.lang === 'en-US' || a.lang.includes('US') ? 1 : 0;
      const bUs = b.lang === 'en-US' || b.lang.includes('US') ? 1 : 0;
      if (aUs !== bUs) return bUs - aUs;

      const aGb = a.lang === 'en-GB' || a.lang.includes('GB') ? 1 : 0;
      const bGb = b.lang === 'en-GB' || b.lang.includes('GB') ? 1 : 0;
      if (aGb !== bGb) return bGb - aGb;

      return a.name.localeCompare(b.name);
    });
  }

  setVoice(voiceURI) {
    if (voiceURI === 'Eric') {
      try {
        localStorage.setItem('jarvis_selected_voice', 'Eric');
      } catch (e) {}
      const voices = this.speechSynth ? this.speechSynth.getVoices() : [];
      const eric = voices.find(v => {
        const name = v.name.toLowerCase();
        const isUS = v.lang === 'en-US' || v.lang.includes('US') || (v.lang && v.lang.startsWith('en'));
        return name.includes('eric') && isUS;
      }) || voices.find(v => v.name.toLowerCase().includes('eric'));
      if (eric) {
        this.selectedVoice = eric;
      }
      return;
    }
    if (voiceURI === 'Jarvis') {
      try {
        localStorage.setItem('jarvis_selected_voice', 'Jarvis');
      } catch (e) {}
      const voices = this.speechSynth ? this.speechSynth.getVoices() : [];
      const andrew = voices.find(v => v.name.toLowerCase().includes('andrew'));
      if (andrew) this.selectedVoice = andrew;
      return;
    }
    if (!this.speechSynth) return;
    const voices = this.speechSynth.getVoices();
    const found = voices.find(v => v.voiceURI === voiceURI || v.name === voiceURI);
    if (found) {
      this.selectedVoice = found;
      try {
        localStorage.setItem('jarvis_selected_voice', found.voiceURI || found.name);
      } catch (e) {}
    }
  }

  async speak(text, onStart, onEnd) {
    if (!this.voiceEnabled) return;

    // Clean markdown symbols, code blocks, URLs for speech read-out
    const cleanText = text
      .replace(/```[\s\S]*?```/g, ' I have put the code snippet on your display, Sir. ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^[\s*•\-–—]+\s*/gm, '')
      .replace(/[#*_~>]/g, '')
      // Pronounce J.A.R.V.I.S. as the natural acronym/word "Jarvis" rather than individual letters
      .replace(/J\s*\.\s*A\s*\.\s*R\s*\.\s*V\s*\.\s*I\s*\.\s*S\.(?=\s|[A-Z]|$)/gi, 'Jarvis.')
      .replace(/J\s*\.\s*A\s*\.\s*R\s*\.\s*V\s*\.\s*I\s*\.\s*S\.?/gi, 'Jarvis')
      .replace(/J-A-R-V-I-S/gi, 'Jarvis')
      .replace(/J_A_R_V_I_S/gi, 'Jarvis')
      .replace(/\bJARVIS\b/g, 'Jarvis')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    this.stopSpeaking();

    // 1. If ElevenLabs voice is active / configured, try high-fidelity ElevenLabs synthesis first
    const savedVoice = localStorage.getItem('jarvis_selected_voice') || 'Eric';
    if (savedVoice === 'Jarvis') {
      try {
        const ttsRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleanText,
            voiceId: this.elevenLabsVoiceId || 'wDsJlOXPqcvIUKdLXjDs'
          })
        });

        if (ttsRes.ok) {
          const audioBlob = await ttsRes.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          this.activeAudioElement = audio;

          // Apply 1.35x speech rate and boost sound volume by 400%
          audio.playbackRate = this.voiceRate || 1.35;

          // Web Audio API GainNode for 400% volume boost with DynamicsCompressor to prevent clipping
          this.ensureAudioContext();
          if (this.audioCtx) {
            try {
              const source = this.audioCtx.createMediaElementSource(audio);
              const gainNode = this.audioCtx.createGain();
              gainNode.gain.setValueAtTime(this.voiceVolumeBoost || 4.0, this.audioCtx.currentTime);

              const compressor = this.audioCtx.createDynamicsCompressor();
              compressor.threshold.setValueAtTime(-12, this.audioCtx.currentTime);
              compressor.knee.setValueAtTime(30, this.audioCtx.currentTime);
              compressor.ratio.setValueAtTime(12, this.audioCtx.currentTime);
              compressor.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
              compressor.release.setValueAtTime(0.25, this.audioCtx.currentTime);

              source.connect(gainNode);
              gainNode.connect(compressor);
              compressor.connect(this.audioCtx.destination);
            } catch (gainErr) {
              // Standard playback if MediaElementSource was previously bound
              audio.volume = 1.0;
            }
          }

          audio.onplay = () => {
            this.isSpeaking = true;
            if (this.onSpeechStart) this.onSpeechStart();
            if (onStart) onStart();
          };

          audio.onended = () => {
            this.isSpeaking = false;
            this.activeAudioElement = null;
            URL.revokeObjectURL(audioUrl);
            if (this.onSpeechEnd) this.onSpeechEnd();
            if (onEnd) onEnd();
          };

          audio.onerror = () => {
            this.isSpeaking = false;
            this.activeAudioElement = null;
            URL.revokeObjectURL(audioUrl);
            this.speakWithSpeechSynthesis(cleanText, onStart, onEnd);
          };

          await audio.play();
          return;
        }
      } catch (err) {
        // Fallback to local SpeechSynthesis
      }
    }

    // 2. SpeechSynthesis Fallback
    this.speakWithSpeechSynthesis(cleanText, onStart, onEnd);
  }

  speakWithSpeechSynthesis(cleanText, onStart, onEnd) {
    if (!this.speechSynth) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.pitch = this.voicePitch;
    utterance.rate = this.voiceRate;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (this.onSpeechStart) this.onSpeechStart();
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (this.onSpeechEnd) this.onSpeechEnd();
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (this.onSpeechEnd) this.onSpeechEnd();
      if (onEnd) onEnd();
    };

    this.currentUtterance = utterance;
    this.speechSynth.speak(utterance);
  }

  stopSpeaking() {
    if (this.activeAudioElement) {
      this.activeAudioElement.pause();
      this.activeAudioElement = null;
    }
    if (this.speechSynth) {
      this.speechSynth.cancel();
      this.currentUtterance = null;
    }
    this.isSpeaking = false;
    if (this.onSpeechEnd) this.onSpeechEnd();
  }

  // ==========================================
  // SPEECH RECOGNITION (VOICE INPUT)
  // ==========================================

  initSpeechRecognition() {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      console.warn('SpeechRecognition API not available in this browser environment.');
      return;
    }

    this.recognition = new SpeechRecognitionClass();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      this.playBlip();
      if (this.onListeningChange) this.onListeningChange(true);
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (this.onTranscript) {
        this.onTranscript(finalTranscript || interimTranscript, !!finalTranscript);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      this.playAlert();
      if (this.onListeningChange) this.onListeningChange(false);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onListeningChange) this.onListeningChange(false);
    };
  }

  startListening() {
    if (!this.recognition) {
      alert('Speech Recognition is not supported by your browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    if (this.isSpeaking) {
      this.stopSpeaking();
    }
    try {
      this.recognition.start();
    } catch (e) {
      console.error('Recognition already started:', e);
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      if (this.onListeningChange) this.onListeningChange(false);
    }
  }
}

window.JarvisAudio = new JarvisAudioSystem();
