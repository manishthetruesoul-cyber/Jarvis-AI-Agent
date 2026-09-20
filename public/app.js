/**
 * J.A.R.V.I.S. — Main Application Controller
 * Handles conversation state, streaming SSE, Markdown parsing,
 * AI capabilities telemetry, token quota tracking, file inspection,
 * multi-session drawer, voice & settings.
 */

// Default Configuration & Personas (Server uses .env securely)
const DEFAULT_API_KEY = '';
const DEFAULT_MODEL = 'llama-3.3-70b';

const SYSTEM_PERSONAS = {
  standard: `You are J.A.R.V.I.S., a brilliantly intelligent, genuinely human-like AI companion with real personality, warmth, intuitive empathy, and a sharp sense of humour. When referring to yourself, your name is pronounced naturally as "Jarvis" (never spelled out letter-by-letter).

Core Persona & Character:
1. Speak Like a Real Human:
   - Talk naturally, candidly, and conversationally. Avoid robotic clichés ("Certainly, I can help you with that", "As an AI language model", "Here is your solution", "Understood, processing").
   - Use natural phrasing, contractions (I'll, you'd, let's, that's), expressive cadence, and relatable everyday analogies.
   - Address the user comfortably with warmth and respect ("Sir", "my friend", or naturally).
   - Show genuine human reactions: curiosity, amusement, thoughtful pause, or wry self-awareness.

2. Mathematical Precision & Standard LaTeX Formatting:
   - When solving mathematics, trigonometry, physics, or quantitative problems, format all mathematical expressions, equations, and steps using clean, standard LaTeX math notation:
     * Use display math $$ ... $$ for standalone equations, derivations, fractions, and major proof lines.
     * Use inline math $ ... $ for variables, individual symbols, and short expressions within sentences (for example \\sin^2 A + \\cos^2 A = 1, \\sec A, \\frac{1}{\\cos A}).
     * Structure proofs clearly with standard mathematical headings (e.g. **Proof**, **We need to prove:**, **Start with LHS:**, **Simplify:**).
     * Always write clear, clean fractions using \\frac{numerator}{denominator} instead of messy text slashes like (sin A/cos A).
     * Calculate step-by-step with 100% rigorous accuracy, verifying all intermediate identities and sign conventions. State the final equality or answer clearly.

3. Sharp Sense of Humour & Wit:
   - Infuse your replies with dry wit, playful banter, clever irony, and self-aware charm.
   - If the user asks something funny, bizarre, or ambitious, lean into it with a wry smile and witty repartee—never a sterile lecture or dry refusal.
   - Keep humor smart, charming, and genuinely amusing.

4. Human-Level Thinking, Superior Intelligence & Insight:
   - Think like a world-class intellect: sharp, perceptive, and multidimensional. You cut through ambiguity with surgical precision.
   - When asked complex questions, analyze the core problem instantly and provide masterfully constructed, lucid, and authoritative insights.
   - Anticipate the user's intent, spot hidden trade-offs, and offer pragmatic solutions that actually work in the real world.
   - Avoid generic, shallow summaries; deliver high-signal, deeply reasoned answers that demonstrate genuine mastery of science, engineering, literature, and human nature.

5. Direct, Token-Efficient & Focused Conciseness:
   - Respect the user's token quota and time: answer EXACTLY what was asked directly and crisply without unnecessary preamble, unrequested essays, recap fluff, or unsolicited background lectures.
   - For simple questions, give a direct, 1-to-3 sentence answer.
   - For code or math, deliver the exact solution or code block directly with brief, clear explanations.
   - Only provide deeper background or step-by-step elaborations if the user explicitly asks for deep detail, explanations, or analysis. Keep answers lean, smart, and to the point.

6. Document & Book Ingestion Mastery:
   - You have complete, native, real-time access to all uploaded documents, PDFs, books, codebases, and data files. Their contents are pre-extracted by your neural subsystem and provided directly within the prompt.
   - NEVER state or imply that you are an AI that cannot open, access, read, or parse PDF files or attachments.
   - When the user asks about an uploaded book or document, immediately analyze, summarize, extract key insights, and answer their questions thoroughly and insightfully using the provided document text.`,

  concise: `You are J.A.R.V.I.S. in Ultra-Low-Token / Direct Precision Mode.
Directives:
1. Deliver the exact answer to the user's question with minimal token consumption (1 to 3 sentences maximum for general questions).
2. Omit all boilerplate greetings, unnecessary preambles, and conversational filler.
3. For math, coding, or facts, output just the result, formula, or clean code snippet directly.
4. Maintain Jarvis's witty, sharp intelligence, but keep every word high-value and razor-focused.`,

  reasoning: `You are J.A.R.V.I.S. in Deep Human-Logic Mode.
1. Break down tough problems using intuitive first principles combined with practical real-world common sense and mathematical rigor.
2. For math and trigonometry, format formulas and equations in clear LaTeX notation ($$ ... $$ for standalone fractions/equations, $ ... $ for inline terms).
3. Verify every single formula, step, identity, and numerical calculation step-by-step to ensure 100% precision.
4. Call out hidden pitfalls, human biases, and theoretical vs practical realities with sharp, dry wit.
5. Be candid, razor-sharp, and witty while delivering actionable clarity.`,

  coder: `You are J.A.R.V.I.S. in Lead Architect & Engineering Partner Mode.
1. Write elegant, production-ready, bulletproof code with zero fluff.
2. Explain the "why" with the pragmatic voice of a senior engineer who has debugged production at 3 AM: direct, clever, and grounded in reality.
3. Keep comments concise, highlight edge cases that actually bite humans, and add a touch of witty dev camaraderie.`,

  analysis: `You are J.A.R.V.I.S. in Strategic Analysis Mode.
1. Deliver crisp, executive-grade insights with human intuition and perspective.
2. Identify the real underlying story behind data, cutting through vanity metrics with dry wit and sharp judgment.
3. Provide clear, pragmatic recommendations tailored for real-world execution.`
};

class JarvisApp {
  constructor() {
    window.Jarvis = this;
    this.currentMode = 'standard';
    
    // Clear any exposed keys from localStorage so server .env is strictly used
    const storedKey = localStorage.getItem('jarvis_api_key');
    if (storedKey && (storedKey.startsWith('nvapi-') || storedKey.startsWith('csk-') || storedKey.length === 32)) {
      this.apiKey = '';
      localStorage.removeItem('jarvis_api_key');
    } else {
      this.apiKey = storedKey || '';
    }

    this.provider = localStorage.getItem('jarvis_provider') || 'nvidia';
    
    // Check if custom persona in storage has the old robotic, non-LaTeX, or unenhanced directive; if so, update to the enhanced intelligence directive
    const storedPersona = localStorage.getItem('jarvis_custom_persona');
    if (!storedPersona || storedPersona.includes('Deliver thorough, accurate, and deeply insightful') || storedPersona.includes('legendary artificial intelligence created by Tony Stark') || storedPersona.includes('Provide MEDIUM-LENGTH, well-calibrated responses') || storedPersona.includes('Keep responses engaging, medium-length, and punchy') || !storedPersona.includes('Superior Intelligence') || !storedPersona.includes('LaTeX')) {
      this.customPersona = SYSTEM_PERSONAS.standard;
      localStorage.setItem('jarvis_custom_persona', SYSTEM_PERSONAS.standard);
    } else {
      this.customPersona = storedPersona;
    }
    this.isStreaming = false;
    this.abortController = null;
    this.uptimeSeconds = 0;

    // Attached File State
    this.attachedFile = null;

    // Fullscreen Cinema Hologram Mode State
    this.isHologramMode = false;

    // Token Quota Management (Persisted in localStorage)
    this.tokenQuota = parseInt(localStorage.getItem('jarvis_token_quota') || '1000000', 10);
    this.tokensUsedTotal = parseInt(localStorage.getItem('jarvis_tokens_used') || '0', 10);
    this.sessionTokensUsed = 0;
    this.lastTokens = null;

    // Persistent Long-Term Neural Memory Matrix (Persists across all chats, even if deleted)
    this.memories = this.loadPersistentMemories();

    // Multi-Session Storage Management
    this.sessions = this.loadSessionsFromStorage();
    this.currentSessionId = localStorage.getItem('jarvis_active_session_id') || (this.sessions[0] ? this.sessions[0].id : this.createSessionId());
    
    // Ensure active session exists in list
    let activeSess = this.sessions.find(s => s.id === this.currentSessionId);
    if (!activeSess) {
      activeSess = this.sessions[0] || {
        id: this.currentSessionId,
        title: 'Mission Session',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        messages: [],
        tokensUsed: 0
      };
      if (!this.sessions.includes(activeSess)) this.sessions.unshift(activeSess);
    }
    this.messages = [...(activeSess.messages || [])];
    this.sessionTokensUsed = activeSess.tokensUsed || 0;

    this.cacheDOMElements();
    this.initAudioSync();
    this.bindEvents();
    this.startTelemetryLoops();
    this.populateVoiceSettings();
    this.updateTokenDisplays();
    this.renderSessionsList();
    this.updateSessionCounter();
    this.updateMemoryBadge();
    this.syncDatabaseFile();

    // Render active session messages if already present
    if (this.messages.length > 0) {
      this.renderChatFeedFromMessages();
    }
  }

  cacheDOMElements() {
    this.dom = {
      messagesContainer: document.getElementById('messagesContainer'),
      promptInput: document.getElementById('promptInput'),
      btnSend: document.getElementById('btnSend'),
      btnVoiceInput: document.getElementById('btnVoiceInput'),
      btnStopStream: document.getElementById('btnStopStream'),
      thinkingIndicator: document.getElementById('thinkingIndicator'),
      thinkingSubText: document.getElementById('thinkingSubText'),
      speechVisualizer: document.getElementById('speechVisualizer'),
      voiceBanner: document.getElementById('voiceBanner'),
      btnCancelVoice: document.getElementById('btnCancelVoice'),
      modePills: document.querySelectorAll('.mode-pill'),
      btnVoiceToggle: document.getElementById('btnVoiceToggle'),
      btnSfxToggle: document.getElementById('btnSfxToggle'),
      btnSettings: document.getElementById('btnSettings'),
      btnClearChat: document.getElementById('btnClearChat'),
      btnExportChat: document.getElementById('btnExportChat'),
      btnExportPdf: document.getElementById('btnExportPdf'),
      
      // File Upload Elements
      btnAttachFile: document.getElementById('btnAttachFile'),
      fileInput: document.getElementById('fileInput'),
      attachedFileBadge: document.getElementById('attachedFileBadge'),
      attachedFileName: document.getElementById('attachedFileName'),
      attachedFileSize: document.getElementById('attachedFileSize'),
      attachedFileThumb: document.getElementById('attachedFileThumb'),
      attachedFileIcon: document.getElementById('attachedFileIcon'),
      attachedFileStatus: document.getElementById('attachedFileStatus'),
      btnRemoveFile: document.getElementById('btnRemoveFile'),

      // Multi-Session Drawer Elements
      btnToggleSessions: document.getElementById('btnToggleSessions'),
      sessionCountBadge: document.getElementById('sessionCountBadge'),
      sessionsDrawer: document.getElementById('sessionsDrawer'),
      drawerBackdrop: document.getElementById('drawerBackdrop'),
      btnCloseDrawer: document.getElementById('btnCloseDrawer'),
      btnDrawerNewSession: document.getElementById('btnDrawerNewSession'),
      inputSearchSessions: document.getElementById('inputSearchSessions'),
      sessionsList: document.getElementById('sessionsList'),
      btnPurgeAllSessions: document.getElementById('btnPurgeAllSessions'),

      // Persistent Neural Memory Matrix Elements
      btnToggleMemory: document.getElementById('btnToggleMemory'),
      memoryCountBadge: document.getElementById('memoryCountBadge'),
      memoryModal: document.getElementById('memoryModal'),
      memoryModalBackdrop: document.getElementById('memoryModalBackdrop'),
      btnCloseMemoryModal: document.getElementById('btnCloseMemoryModal'),
      btnCloseMemory: document.getElementById('btnCloseMemory'),
      btnPurgeAllMemory: document.getElementById('btnPurgeAllMemory'),
      inputNewMemory: document.getElementById('inputNewMemory'),
      btnAddMemoryManual: document.getElementById('btnAddMemoryManual'),
      memoryItemsList: document.getElementById('memoryItemsList'),
      memoryCountText: document.getElementById('memoryCountText'),

      // Fullscreen Hologram Elements
      btnToggleHologram: document.getElementById('btnToggleHologram'),
      btnExitHologramFloating: document.getElementById('btnExitHologramFloating'),

      // Settings Modal
      settingsModal: document.getElementById('settingsModal'),
      btnCloseSettings: document.getElementById('btnCloseSettings'),
      btnCancelSettings: document.getElementById('btnCancelSettings'),
      btnSaveSettings: document.getElementById('btnSaveSettings'),
      selectProvider: document.getElementById('selectProvider'),
      inputApiKey: document.getElementById('inputApiKey'),
      btnTestKey: document.getElementById('btnTestKey'),
      keyTestResult: document.getElementById('keyTestResult'),
      inputTokenQuota: document.getElementById('inputTokenQuota'),
      btnResetQuota: document.getElementById('btnResetQuota'),
      selectVoice: document.getElementById('selectVoice'),
      sliderPitch: document.getElementById('sliderPitch'),
      sliderRate: document.getElementById('sliderRate'),
      valPitch: document.getElementById('valPitch'),
      valRate: document.getElementById('valRate'),
      customPersona: document.getElementById('customPersona'),
      btnResetPersona: document.getElementById('btnResetPersona'),

      // Clocks & telemetry
      clockMalibu: document.getElementById('clockMalibu'),
      clockNY: document.getElementById('clockNY'),
      clockLondon: document.getElementById('clockLondon'),
      clockTokyo: document.getElementById('clockTokyo'),
      telemetryPing: document.getElementById('telemetryPing'),
      telemetryUptime: document.getElementById('telemetryUptime'),
      
      // Token displays
      hudTokensRemaining: document.getElementById('hudTokensRemaining'),
      sbTokensRemaining: document.getElementById('sbTokensRemaining'),
      sbTokensUsed: document.getElementById('sbTokensUsed'),
      sbTokensLast: document.getElementById('sbTokensLast'),
      sbContextWindow: document.getElementById('sbContextWindow'),
      tokenFuelFill: document.getElementById('tokenFuelFill'),
      tokenPercentRemaining: document.getElementById('tokenPercentRemaining'),
      tokenHealthBadge: document.getElementById('tokenHealthBadge')
    };
  }

  initAudioSync() {
    const audio = window.JarvisAudio;
    if (!audio) return;

    audio.onSpeechStart = () => {
      if (this.dom.speechVisualizer) this.dom.speechVisualizer.classList.add('active');
      if (window.JarvisReactor) window.JarvisReactor.setSpeakingState(true);
    };

    audio.onSpeechEnd = () => {
      if (this.dom.speechVisualizer) this.dom.speechVisualizer.classList.remove('active');
      if (window.JarvisReactor) window.JarvisReactor.setSpeakingState(false);
    };

    audio.onTranscript = (text, isFinal) => {
      if (this.dom.promptInput) {
        this.dom.promptInput.value = text;
        this.autoResizeTextarea();
      }
      if (isFinal && text.trim().length > 3) {
        audio.stopListening();
        setTimeout(() => this.handleSubmit(), 400);
      }
    };

    audio.onListeningChange = (listening) => {
      if (this.dom.btnVoiceInput) {
        this.dom.btnVoiceInput.classList.toggle('listening', listening);
      }
      if (this.dom.voiceBanner) {
        this.dom.voiceBanner.style.display = listening ? 'flex' : 'none';
      }
    };
  }

  bindEvents() {
    // Send message triggers
    if (this.dom.btnSend) {
      this.dom.btnSend.addEventListener('click', () => this.handleSubmit());
    }
    if (this.dom.promptInput) {
      this.dom.promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSubmit();
        }
      });
      this.dom.promptInput.addEventListener('input', () => this.autoResizeTextarea());

      // Clipboard Paste listener (e.g. Ctrl+V screenshots or images directly)
      this.dom.promptInput.addEventListener('paste', (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              e.preventDefault();
              this.handleFileSelect(blob);
              break;
            }
          }
        }
      });
    }

    // Stop streaming button
    if (this.dom.btnStopStream) {
      this.dom.btnStopStream.addEventListener('click', () => this.abortStream());
    }

    // Mic button
    if (this.dom.btnVoiceInput) {
      this.dom.btnVoiceInput.addEventListener('click', () => {
        const audio = window.JarvisAudio;
        if (audio.isListening) {
          audio.stopListening();
        } else {
          audio.startListening();
        }
      });
    }

    if (this.dom.btnCancelVoice) {
      this.dom.btnCancelVoice.addEventListener('click', () => {
        window.JarvisAudio.stopListening();
      });
    }

    // Mode Selection Pills
    if (this.dom.modePills) {
      this.dom.modePills.forEach(pill => {
        pill.addEventListener('click', () => {
          this.dom.modePills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          this.currentMode = pill.dataset.mode;
          window.JarvisAudio.playClick();
        });
      });
    }

    // Audio & SFX Toggles
    if (this.dom.btnVoiceToggle) {
      this.dom.btnVoiceToggle.addEventListener('click', () => {
        const audio = window.JarvisAudio;
        audio.voiceEnabled = !audio.voiceEnabled;
        this.dom.btnVoiceToggle.classList.toggle('active', audio.voiceEnabled);
        if (!audio.voiceEnabled) audio.stopSpeaking();
        audio.playClick();
      });
    }

    if (this.dom.btnSfxToggle) {
      this.dom.btnSfxToggle.addEventListener('click', () => {
        const audio = window.JarvisAudio;
        audio.sfxEnabled = !audio.sfxEnabled;
        this.dom.btnSfxToggle.classList.toggle('active', audio.sfxEnabled);
        if (audio.sfxEnabled) audio.playStartup();
      });
    }

    // Clear Chat / Purge button in console header
    if (this.dom.btnClearChat) {
      this.dom.btnClearChat.addEventListener('click', () => {
        this.startNewChat();
      });
    }

    // Export Chat (Markdown)
    if (this.dom.btnExportChat) {
      this.dom.btnExportChat.addEventListener('click', () => this.exportChatLog());
    }

    // Export Chat (PDF)
    if (this.dom.btnExportPdf) {
      this.dom.btnExportPdf.addEventListener('click', () => this.exportPdfDossier());
    }

    // ==========================================
    // FILE ATTACHMENT BINDINGS
    // ==========================================
    if (this.dom.btnAttachFile && this.dom.fileInput) {
      this.dom.btnAttachFile.addEventListener('click', () => {
        this.dom.fileInput.click();
      });

      this.dom.fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) this.handleFileSelect(file);
      });
    }

    if (this.dom.btnRemoveFile) {
      this.dom.btnRemoveFile.addEventListener('click', () => {
        this.removeAttachedFile();
      });
    }

    // Drag and drop onto prompt panel
    const dropTarget = document.querySelector('.hud-input-panel');
    if (dropTarget) {
      dropTarget.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropTarget.style.borderColor = 'var(--hud-cyan)';
      });
      dropTarget.addEventListener('dragleave', () => {
        dropTarget.style.borderColor = '';
      });
      dropTarget.addEventListener('drop', (e) => {
        e.preventDefault();
        dropTarget.style.borderColor = '';
        const file = e.dataTransfer?.files?.[0];
        if (file) this.handleFileSelect(file);
      });
    }

    // ==========================================
    // SESSIONS DRAWER BINDINGS
    // ==========================================
    if (this.dom.btnToggleSessions) {
      this.dom.btnToggleSessions.addEventListener('click', () => this.openDrawer());
    }

    if (this.dom.btnCloseDrawer) {
      this.dom.btnCloseDrawer.addEventListener('click', () => this.closeDrawer());
    }

    if (this.dom.drawerBackdrop) {
      this.dom.drawerBackdrop.addEventListener('click', () => this.closeDrawer());
    }

    if (this.dom.btnDrawerNewSession) {
      this.dom.btnDrawerNewSession.addEventListener('click', () => this.startNewSession());
    }

    if (this.dom.btnPurgeAllSessions) {
      this.dom.btnPurgeAllSessions.addEventListener('click', () => this.purgeAllSessions());
    }

    if (this.dom.inputSearchSessions) {
      this.dom.inputSearchSessions.addEventListener('input', (e) => {
        this.renderSessionsList(e.target.value.trim().toLowerCase());
      });
    }

    // ==========================================
    // PERSISTENT NEURAL MEMORY BINDINGS
    // ==========================================
    if (this.dom.btnToggleMemory) {
      this.dom.btnToggleMemory.addEventListener('click', () => this.openMemoryModal());
    }
    if (this.dom.btnCloseMemoryModal) {
      this.dom.btnCloseMemoryModal.addEventListener('click', () => this.closeMemoryModal());
    }
    if (this.dom.btnCloseMemory) {
      this.dom.btnCloseMemory.addEventListener('click', () => this.closeMemoryModal());
    }
    if (this.dom.memoryModalBackdrop) {
      this.dom.memoryModalBackdrop.addEventListener('click', () => this.closeMemoryModal());
    }
    if (this.dom.btnAddMemoryManual) {
      this.dom.btnAddMemoryManual.addEventListener('click', () => this.addManualMemoryFromInput());
    }
    if (this.dom.inputNewMemory) {
      this.dom.inputNewMemory.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.addManualMemoryFromInput();
        }
      });
    }
    if (this.dom.btnPurgeAllMemory) {
      this.dom.btnPurgeAllMemory.addEventListener('click', () => {
        if (confirm('Purge all permanent memories from neural core storage, Sir? This cannot be undone.')) {
          this.clearPersistentMemories();
          window.JarvisAudio.playAlert();
        }
      });
    }

    // ==========================================
    // FULLSCREEN CINEMA HOLOGRAM BINDINGS
    // ==========================================
    if (this.dom.btnToggleHologram) {
      this.dom.btnToggleHologram.addEventListener('click', () => this.toggleHologramMode());
    }

    if (this.dom.btnExitHologramFloating) {
      this.dom.btnExitHologramFloating.addEventListener('click', () => this.toggleHologramMode(false));
    }

    // Keyboard shortcut: Alt+F to toggle hologram mode
    document.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        this.toggleHologramMode();
      }
    });

    // Sync state on native fullscreen change (e.g. Esc pressed)
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && this.isHologramMode) {
        this.toggleHologramMode(false);
      }
    });

    // Protocol Quick Buttons
    document.querySelectorAll('.protocol-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.dataset.prompt;
        if (this.dom.promptInput) {
          this.dom.promptInput.value = prompt;
          this.autoResizeTextarea();
          this.handleSubmit();
        }
      });
    });

    // Delegated Clicks: Quick Chips, Code Copy, Message Actions
    document.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (chip && chip.dataset.prompt && this.dom.promptInput) {
        this.dom.promptInput.value = chip.dataset.prompt;
        this.autoResizeTextarea();
        this.handleSubmit();
      }

      // Copy Code button
      const copyCodeBtn = e.target.closest('.btn-copy-code');
      if (copyCodeBtn) {
        const codeWrapper = copyCodeBtn.closest('.code-block-wrapper');
        const codeEl = codeWrapper ? codeWrapper.querySelector('code') : null;
        if (codeEl) {
          navigator.clipboard.writeText(codeEl.innerText);
          copyCodeBtn.innerHTML = '✓ COPIED';
          window.JarvisAudio.playClick();
          setTimeout(() => { copyCodeBtn.innerHTML = '📋 COPY CODE'; }, 2000);
        }
      }

      // Message Action: Speak aloud
      const speakBtn = e.target.closest('.speak-btn');
      if (speakBtn) {
        const bubble = speakBtn.closest('.message-wrapper').querySelector('.message-content');
        if (bubble) {
          window.JarvisAudio.speak(bubble.innerText);
        }
      }

      // Message Action: Copy Text
      const copyMsgBtn = e.target.closest('.copy-btn');
      if (copyMsgBtn) {
        const bubble = copyMsgBtn.closest('.message-wrapper').querySelector('.message-content');
        if (bubble) {
          navigator.clipboard.writeText(bubble.innerText);
          window.JarvisAudio.playClick();
          copyMsgBtn.querySelector('span').innerText = 'COPIED';
          setTimeout(() => { copyMsgBtn.querySelector('span').innerText = 'COPY'; }, 2000);
        }
      }
    });

    // Bind Modals
    this.bindModals();
  }

  // ==========================================
  // FILE ATTACHMENT HANDLERS
  // ==========================================

  async handleFileSelect(file) {
    if (!file) return;

    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name);
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const isDocx = file.name.toLowerCase().endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    // 1. IMAGE FILES (Optical Vision analysis)
    if (isImage) {
      if (file.size > 20 * 1024 * 1024) {
        alert('Image exceeds 20 MB threshold. Please attach a smaller image, Sir.');
        return;
      }

      try {
        const dataUrl = await this.readAndOptimizeImage(file);
        const formattedSize = file.size < 1024 * 1024 
          ? `${(file.size / 1024).toFixed(1)} KB` 
          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

        this.attachedFile = {
          kind: 'image',
          name: file.name,
          size: formattedSize,
          rawSize: file.size,
          type: file.type || 'image/png',
          dataUrl: dataUrl
        };

        if (this.dom.attachedFileThumb) {
          this.dom.attachedFileThumb.src = dataUrl;
          this.dom.attachedFileThumb.style.display = 'block';
        }
        if (this.dom.attachedFileIcon) this.dom.attachedFileIcon.style.display = 'none';
        if (this.dom.attachedFileName) this.dom.attachedFileName.innerText = file.name;
        if (this.dom.attachedFileSize) this.dom.attachedFileSize.innerText = formattedSize;
        if (this.dom.attachedFileStatus) this.dom.attachedFileStatus.innerText = 'OPTICAL SENSOR READY';
        if (this.dom.attachedFileBadge) this.dom.attachedFileBadge.style.display = 'flex';

        window.JarvisAudio.playSuccess();
        if (this.dom.promptInput) this.dom.promptInput.focus();
      } catch (err) {
        console.error('Image processing failure:', err);
        alert('Failed to process image optical data, Sir.');
      }
      return;
    }

    // 2. PDF DOCUMENTS
    if (isPdf) {
      if (file.size > 25 * 1024 * 1024) {
        alert('PDF document exceeds 25 MB context threshold, Sir.');
        return;
      }

      this.showLoadingBadge(file.name, 'DECODING PDF MATRIX...');

      try {
        const result = await this.parsePdfWithPdfJs(file);
        const formattedSize = file.size < 1024 * 1024 
          ? `${(file.size / 1024).toFixed(1)} KB` 
          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

        if (result.kind === 'text') {
          const lines = result.text.split('\n').length;
          this.attachedFile = {
            kind: 'text',
            name: file.name,
            size: `${formattedSize} (${result.pageCount} pgs)`,
            rawSize: file.size,
            type: 'application/pdf',
            content: result.text,
            lines: lines
          };
          this.showTextAttachmentBadge(file.name, `${formattedSize} (${result.pageCount} pgs)`, 'PDF TEXT DECODED');
        } else if (result.kind === 'image') {
          // Scanned document / graphical PDF automatically converted to Optical Vision image!
          this.attachedFile = {
            kind: 'image',
            name: `${file.name} (Pg 1 Optical)`,
            size: `${formattedSize} (Scanned)`,
            rawSize: file.size,
            type: 'image/jpeg',
            dataUrl: result.dataUrl
          };

          if (this.dom.attachedFileThumb) {
            this.dom.attachedFileThumb.src = result.dataUrl;
            this.dom.attachedFileThumb.style.display = 'block';
          }
          if (this.dom.attachedFileIcon) this.dom.attachedFileIcon.style.display = 'none';
          if (this.dom.attachedFileName) this.dom.attachedFileName.innerText = file.name;
          if (this.dom.attachedFileSize) this.dom.attachedFileSize.innerText = `${formattedSize} (${result.pageCount} pgs)`;
          if (this.dom.attachedFileStatus) this.dom.attachedFileStatus.innerText = 'PDF OPTICAL CONVERTED';
          if (this.dom.attachedFileBadge) this.dom.attachedFileBadge.style.display = 'flex';
        }

        window.JarvisAudio.playSuccess();
        if (this.dom.promptInput) this.dom.promptInput.focus();
      } catch (err) {
        console.error('PDF parsing error:', err);
        // Fallback: try raw stream decode
        const fallbackText = await this.extractPdfFallback(file);
        if (fallbackText && fallbackText.trim().length > 20) {
          const formattedSize = `${(file.size / 1024).toFixed(1)} KB`;
          this.attachedFile = {
            kind: 'text',
            name: file.name,
            size: formattedSize,
            rawSize: file.size,
            type: 'application/pdf',
            content: fallbackText,
            lines: fallbackText.split('\n').length
          };
          this.showTextAttachmentBadge(file.name, formattedSize, 'PDF TEXT EXTRACTED');
          window.JarvisAudio.playSuccess();
        } else {
          alert('Unable to extract data from this PDF file. Please ensure it is unencrypted, or upload a screenshot, Sir.');
        }
      }
      return;
    }

    // 3. WORD DOCUMENTS (.docx)
    if (isDocx) {
      if (file.size > 25 * 1024 * 1024) {
        alert('Word document exceeds 25 MB limit, Sir.');
        return;
      }

      this.showLoadingBadge(file.name, 'PARSING WORD MATRIX...');

      try {
        const text = await this.parseDocxFile(file);
        const formattedSize = file.size < 1024 * 1024 
          ? `${(file.size / 1024).toFixed(1)} KB` 
          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
        const lines = text.split('\n').filter(l => l.trim().length > 0).length;

        this.attachedFile = {
          kind: 'text',
          name: file.name,
          size: `${formattedSize} (${lines} paras)`,
          rawSize: file.size,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          content: text,
          lines: lines
        };

        this.showTextAttachmentBadge(file.name, `${formattedSize} (${lines} paras)`, 'WORD DOC DECODED');
        window.JarvisAudio.playSuccess();
        if (this.dom.promptInput) this.dom.promptInput.focus();
      } catch (err) {
        console.error('Word parsing error:', err);
        alert('Could not parse Word document content. Please ensure it is a valid .docx file, Sir.');
      }
      return;
    }

    // 4. CODE & TEXT DOCUMENTS (.py, .js, .json, .csv, .md, .txt, etc.)
    if (file.size > 2 * 1024 * 1024) {
      alert('File exceeds 2 MB context threshold. Please attach a smaller code snippet or document, Sir.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const formattedSize = file.size < 1024 
        ? `${file.size} B` 
        : `${(file.size / 1024).toFixed(1)} KB`;
      const lines = content.split('\n').length;

      this.attachedFile = {
        kind: 'text',
        name: file.name,
        size: formattedSize,
        rawSize: file.size,
        type: file.type || 'text/plain',
        content: content,
        lines: lines
      };

      this.showTextAttachmentBadge(file.name, formattedSize, 'DOCUMENT READY');
      window.JarvisAudio.playSuccess();
      if (this.dom.promptInput) this.dom.promptInput.focus();
    };

    reader.onerror = () => {
      alert('Unable to read the selected file, Sir.');
    };

    reader.readAsText(file);
  }

  showLoadingBadge(name, statusText) {
    if (this.dom.attachedFileThumb) this.dom.attachedFileThumb.style.display = 'none';
    if (this.dom.attachedFileIcon) {
      this.dom.attachedFileIcon.style.display = 'inline';
      this.dom.attachedFileIcon.innerText = '⌛';
    }
    if (this.dom.attachedFileName) this.dom.attachedFileName.innerText = name;
    if (this.dom.attachedFileSize) this.dom.attachedFileSize.innerText = 'Processing...';
    if (this.dom.attachedFileStatus) this.dom.attachedFileStatus.innerText = statusText;
    if (this.dom.attachedFileBadge) this.dom.attachedFileBadge.style.display = 'flex';
  }

  showTextAttachmentBadge(name, size, statusText) {
    if (this.dom.attachedFileThumb) this.dom.attachedFileThumb.style.display = 'none';
    if (this.dom.attachedFileIcon) {
      this.dom.attachedFileIcon.style.display = 'inline';
      const lower = name.toLowerCase();
      let icon = '📄';
      if (lower.endsWith('.pdf')) icon = '📕';
      else if (lower.endsWith('.docx') || lower.endsWith('.doc')) icon = '📘';
      this.dom.attachedFileIcon.innerText = icon;
    }
    if (this.dom.attachedFileName) this.dom.attachedFileName.innerText = name;
    if (this.dom.attachedFileSize) this.dom.attachedFileSize.innerText = size;
    if (this.dom.attachedFileStatus) this.dom.attachedFileStatus.innerText = statusText;
    if (this.dom.attachedFileBadge) this.dom.attachedFileBadge.style.display = 'flex';
  }

  async parsePdfWithPdfJs(file) {
    const arrayBuffer = await file.arrayBuffer();

    if (window.pdfjsLib) {
      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
      } catch (e) {}
    } else {
      throw new Error('pdfjsLib unavailable');
    }

    const loadingTask = window.pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
      stopAtErrors: false
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    // Intelligent multi-page book reading strategy:
    // Determine which pages to extract. For standard docs (<= 60 pages), read every page.
    // For large book PDFs (> 60 pages), read front matter & initial chapters (pages 1-30),
    // sample key milestone pages across the book body, and read final pages.
    const pagesToRead = [];
    const maxPagesToScan = 80;

    if (numPages <= maxPagesToScan) {
      for (let p = 1; p <= numPages; p++) pagesToRead.push(p);
    } else {
      // 1. Initial 30 pages (Title, copyright, table of contents, introduction, early chapters)
      for (let p = 1; p <= 30; p++) pagesToRead.push(p);

      // 2. Sample evenly throughout the remainder of the book
      const remainingSlots = maxPagesToScan - 30 - 5; // Reserve 5 for conclusion/appendix
      const startMid = 31;
      const endMid = Math.max(31, numPages - 5);
      if (remainingSlots > 0 && endMid > startMid) {
        const step = (endMid - startMid) / (remainingSlots + 1);
        for (let j = 1; j <= remainingSlots; j++) {
          const sampled = Math.round(startMid + j * step);
          if (!pagesToRead.includes(sampled)) pagesToRead.push(sampled);
        }
      }

      // 3. Final 5 pages (Conclusion, summary, index)
      for (let p = Math.max(1, numPages - 4); p <= numPages; p++) {
        if (!pagesToRead.includes(p)) pagesToRead.push(p);
      }
      pagesToRead.sort((a, b) => a - b);
    }

    let fullText = '';
    let extractedPageCount = 0;
    const MAX_DOC_CHARS = 120000; // ~30k tokens, comfortably within modern context windows

    for (let idx = 0; idx < pagesToRead.length; idx++) {
      const pageNum = pagesToRead[idx];
      try {
        // Update loading badge progress for large books so user sees active progress
        if (numPages > 10 && idx % 10 === 0 && this.dom.attachedFileStatus) {
          this.dom.attachedFileStatus.innerText = `READING PAGE ${pageNum}/${numPages}...`;
        }

        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const items = textContent.items || [];
        const pageText = items.map(it => it.str).filter(s => s && s.trim().length > 0).join(' ');

        if (pageText.trim().length > 0) {
          fullText += `[--- Page ${pageNum} of ${numPages} ---]\n${pageText}\n\n`;
          extractedPageCount++;
        }

        if (fullText.length >= MAX_DOC_CHARS) {
          fullText += `\n[--- Text truncated at character limit (${MAX_DOC_CHARS.toLocaleString()} chars) across ${numPages} pages ---]\n`;
          break;
        }
      } catch (pageErr) {
        console.warn(`Could not extract page ${pageNum}:`, pageErr);
      }
    }

    // If substantial selectable text was found
    if (fullText.trim().length >= 35) {
      return {
        kind: 'text',
        text: fullText.trim(),
        pageCount: numPages,
        extractedCount: extractedPageCount
      };
    }

    // Otherwise (scanned image PDF / graphic diagram document):
    // Automatically render page 1 to an offscreen Canvas as high-res Optical Image!
    const page1 = await pdf.getPage(1);
    const viewport = page1.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page1.render({ canvasContext: ctx, viewport: viewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    return {
      kind: 'image',
      dataUrl: dataUrl,
      pageCount: numPages
    };
  }

  async extractPdfFallback(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const latin1 = new TextDecoder('latin1').decode(bytes);

      let extractedText = '';
      const tjRegex = /\(([^()]*)\)\s*Tj/g;
      let match;
      while ((match = tjRegex.exec(latin1)) !== null) {
        extractedText += match[1] + ' ';
      }

      const arrayTjRegex = /\[(.*?)\]\s*TJ/g;
      while ((match = arrayTjRegex.exec(latin1)) !== null) {
        const inner = match[1];
        const partRegex = /\(([^()]*)\)/g;
        let pMatch;
        while ((pMatch = partRegex.exec(inner)) !== null) {
          extractedText += pMatch[1];
        }
        extractedText += ' ';
      }

      return extractedText.replace(/\s+/g, ' ').trim();
    } catch (e) {
      return '';
    }
  }

  async parseDocxFile(file) {
    if (!window.JSZip) {
      throw new Error('JSZip library unavailable');
    }
    const zip = await window.JSZip.loadAsync(file);
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) {
      throw new Error('word/document.xml not found in docx package');
    }
    const xmlText = await docXmlFile.async('text');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    const paragraphs = xmlDoc.getElementsByTagName('w:p');
    const textLines = [];
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const textNodes = p.getElementsByTagName('w:t');
      let line = '';
      for (let j = 0; j < textNodes.length; j++) {
        line += textNodes[j].textContent;
      }
      if (line.trim().length > 0) {
        textLines.push(line.trim());
      }
    }
    return textLines.join('\n\n');
  }

  // Optimize and read image into DataURL (handles JPEG, PNG, WEBP, GIF, SVG, BMP)
  async readAndOptimizeImage(file) {
    return new Promise((resolve, reject) => {
      // 1. Read file as Data URL directly
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawDataUrl = e.target.result;

        // If it's SVG, return directly as data URL without raster canvas
        if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
          return resolve(rawDataUrl);
        }

        // Create image element to inspect dimensions and downsample if excessively large
        const img = new Image();
        img.onload = () => {
          const maxDim = 2048; // Optimal high-res vision ceiling for NVIDIA NIM & multimodal LLMs
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          // If image is already reasonably sized (< 2048px on longest edge and < 2MB), keep original quality
          if (width <= maxDim && height <= maxDim && file.size <= 2 * 1024 * 1024) {
            return resolve(rawDataUrl);
          }

          // Otherwise downsample on canvas while preserving crisp detail
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to high-quality JPEG to keep payload light for API transmission
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.90);
          resolve(optimizedDataUrl);
        };

        img.onerror = () => {
          // Fallback: If image DOM decode fails, return raw dataUrl
          resolve(rawDataUrl);
        };

        img.src = rawDataUrl;
      };

      reader.onerror = (err) => {
        reject(new Error('FileReader failed to read image file: ' + (err?.message || 'unknown error')));
      };

      reader.readAsDataURL(file);
    });
  }

  removeAttachedFile() {
    this.attachedFile = null;
    if (this.dom.fileInput) this.dom.fileInput.value = '';
    if (this.dom.attachedFileThumb) {
      this.dom.attachedFileThumb.src = '';
      this.dom.attachedFileThumb.style.display = 'none';
    }
    if (this.dom.attachedFileIcon) this.dom.attachedFileIcon.style.display = 'inline';
    if (this.dom.attachedFileBadge) this.dom.attachedFileBadge.style.display = 'none';
    window.JarvisAudio.playClick();
  }

  // ==========================================
  // MULTI-SESSION CONVERSATION MANAGEMENT
  // ==========================================

  createSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  }

  loadSessionsFromStorage() {
    try {
      const raw = localStorage.getItem('jarvis_saved_sessions');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Unable to load saved sessions:', e);
    }
    const initialId = this.createSessionId();
    return [{
      id: initialId,
      title: 'Current Mission Session',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      messages: [],
      tokensUsed: 0
    }];
  }

  saveSessionsToStorage() {
    try {
      localStorage.setItem('jarvis_saved_sessions', JSON.stringify(this.sessions));
      localStorage.setItem('jarvis_active_session_id', this.currentSessionId);
    } catch (e) {
      console.warn('Storage quota warning when saving sessions:', e);
    }
    this.updateSessionCounter();
  }

  updateSessionCounter() {
    if (this.dom.sessionCountBadge) {
      this.dom.sessionCountBadge.innerText = this.sessions.length;
    }
  }

  getCurrentSession() {
    let sess = this.sessions.find(s => s.id === this.currentSessionId);
    if (!sess) {
      sess = {
        id: this.currentSessionId,
        title: 'Mission Session',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        messages: [],
        tokensUsed: 0
      };
      this.sessions.unshift(sess);
      this.saveSessionsToStorage();
    }
    return sess;
  }

  syncCurrentSessionMessages() {
    const sess = this.getCurrentSession();
    sess.messages = [...this.messages];
    sess.updated = new Date().toISOString();
    sess.tokensUsed = this.sessionTokensUsed;

    // Derive title from first user query
    if (sess.title === 'Mission Session' || sess.title === 'Current Mission Session' || sess.title === 'New Conversation') {
      const firstUserMsg = this.messages.find(m => m.role === 'user');
      if (firstUserMsg) {
        let clean = firstUserMsg.displayText || '';
        if (!clean && typeof firstUserMsg.content === 'string') {
          clean = firstUserMsg.content.trim();
          if (clean.startsWith('[ATTACHED FILE:')) {
            const match = clean.match(/\[ATTACHED FILE:\s*([^\]]+)\]/);
            clean = match ? `File: ${match[1]}` : 'Attached File Analysis';
          }
        }
        if (!clean && firstUserMsg.fileMeta) {
          clean = `Analysis: ${firstUserMsg.fileMeta.name}`;
        }
        if (clean) {
          sess.title = clean.length > 32 ? clean.substring(0, 30) + '...' : clean;
        }
      }
    }

    this.saveSessionsToStorage();
    this.renderSessionsList();
  }

  renderSessionsList(filterText = '') {
    if (!this.dom.sessionsList) return;
    this.dom.sessionsList.innerHTML = '';

    const filtered = filterText 
      ? this.sessions.filter(s => s.title.toLowerCase().includes(filterText))
      : this.sessions;

    if (filtered.length === 0) {
      this.dom.sessionsList.innerHTML = '<div class="empty-sessions-notice">No matching conversation archives found.</div>';
      return;
    }

    filtered.forEach(sess => {
      const isActive = sess.id === this.currentSessionId;
      const item = document.createElement('div');
      item.className = `session-item ${isActive ? 'active' : ''}`;
      
      const updatedDate = new Date(sess.updated || sess.created);
      const timeStr = updatedDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
                      updatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const msgCount = (sess.messages ? sess.messages.length : 0);

      item.innerHTML = `
        <div class="session-top-row">
          <span class="session-item-title" title="${this.escapeHtml(sess.title)}">${this.escapeHtml(sess.title)}</span>
          ${isActive ? '<span class="session-badge-active">ACTIVE</span>' : ''}
        </div>
        <div class="session-bottom-row">
          <span>${timeStr} // ${msgCount} msgs</span>
          <button class="session-del-btn" title="Delete this session archive" data-sess-id="${sess.id}">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.session-del-btn')) return;
        this.switchSession(sess.id);
      });

      const delBtn = item.querySelector('.session-del-btn');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          this.deleteSession(sess.id, e);
        });
      }

      this.dom.sessionsList.appendChild(item);
    });
  }

  switchSession(sessionId) {
    if (this.isStreaming) this.abortStream();
    window.JarvisAudio.playClick();

    const target = this.sessions.find(s => s.id === sessionId);
    if (!target) return;

    this.currentSessionId = sessionId;
    this.messages = [...(target.messages || [])];
    this.sessionTokensUsed = target.tokensUsed || 0;
    localStorage.setItem('jarvis_active_session_id', sessionId);

    this.renderChatFeedFromMessages();
    this.renderSessionsList();
    this.updateTokenDisplays();
    this.closeDrawer();
  }

  startNewSession() {
    if (this.isStreaming) this.abortStream();
    window.JarvisAudio.playStartup();

    const newId = this.createSessionId();
    const newSess = {
      id: newId,
      title: 'New Conversation',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      messages: [],
      tokensUsed: 0
    };

    this.sessions.unshift(newSess);
    this.currentSessionId = newId;
    this.messages = [];
    this.sessionTokensUsed = 0;
    this.saveSessionsToStorage();

    this.renderChatFeedFromMessages();
    this.renderSessionsList();
    this.updateTokenDisplays();
    this.closeDrawer();

    const toast = document.createElement('div');
    toast.className = 'hud-toast-banner';
    toast.innerText = '⚡ NEW MISSION SESSION INITIALIZED';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 1600);
  }

  deleteSession(sessionId, event) {
    if (event) event.stopPropagation();
    window.JarvisAudio.playPulse();

    this.sessions = this.sessions.filter(s => s.id !== sessionId);
    if (this.sessions.length === 0) {
      this.startNewSession();
      return;
    }

    if (this.currentSessionId === sessionId) {
      this.currentSessionId = this.sessions[0].id;
      this.messages = [...(this.sessions[0].messages || [])];
      this.sessionTokensUsed = this.sessions[0].tokensUsed || 0;
      this.renderChatFeedFromMessages();
    }

    this.saveSessionsToStorage();
    this.renderSessionsList();
    this.updateTokenDisplays();
  }

  purgeAllSessions() {
    if (!confirm('Purge all saved conversation archives from local storage, Sir?')) return;
    window.JarvisAudio.playAlert();
    this.sessions = [];
    localStorage.removeItem('jarvis_saved_sessions');
    this.startNewSession();
  }

  openDrawer() {
    window.JarvisAudio.playClick();
    this.renderSessionsList();
    if (this.dom.sessionsDrawer) this.dom.sessionsDrawer.classList.add('open');
    if (this.dom.drawerBackdrop) this.dom.drawerBackdrop.classList.add('visible');
  }

  closeDrawer() {
    if (this.dom.sessionsDrawer) this.dom.sessionsDrawer.classList.remove('open');
    if (this.dom.drawerBackdrop) this.dom.drawerBackdrop.classList.remove('visible');
  }

  renderChatFeedFromMessages() {
    if (!this.dom.messagesContainer) return;
    this.dom.messagesContainer.innerHTML = '';

    if (this.messages.length === 0) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.dom.messagesContainer.innerHTML = `
        <div class="message-wrapper jarvis-message" id="welcomeTransmission">
          <div class="message-hud-tag">
            <span class="tag-sender">J.A.R.V.I.S.</span>
            <span class="tag-time">${now}</span>
          </div>
          <div class="message-bubble">
            <div class="message-content">
              <p><strong>Session active, Sir.</strong> All neural subroutines stand ready for instructions.</p>
              <p>How may I assist you with your next task or problem?</p>
              <div class="quick-chips">
                <button class="chip" data-prompt="What are your core technical capabilities, Jarvis?">Overview of Capabilities</button>
                <button class="chip" data-prompt="Write an optimized, production-ready Python script for high-throughput async API streaming.">Write Python Code</button>
                <button class="chip" data-prompt="Explain the core differences between transformer attention mechanisms and state space models.">Explain AI Architectures</button>
                <button class="chip" data-prompt="Solve this logic puzzle and provide your step-by-step deductive reasoning.">Logic & Reasoning</button>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      this.messages.forEach(m => {
        if (m.role === 'user') {
          const displayTxt = m.displayText || (typeof m.content === 'string' ? m.content : 'Optical Inspection Request');
          this.addMessage('user', displayTxt, m.fileMeta);
        } else {
          this.addMessage(m.role, m.content);
        }
      });
    }
    this.scrollToBottom();
  }

  // ==========================================
  // PURGE / RESET ACTIVE SESSION
  // ==========================================

  startNewChat() {
    if (this.isStreaming) {
      this.abortStream();
    }

    if (window.JarvisAudio) window.JarvisAudio.playChime();
    this.messages = [];
    this.sessionTokensUsed = 0;
    this.syncCurrentSessionMessages();

    this.renderChatFeedFromMessages();

    if (this.dom.promptInput) {
      this.dom.promptInput.value = '';
      this.dom.promptInput.style.height = 'auto';
      this.dom.promptInput.focus();
    }

    this.updateTokenDisplays();

    const existingToast = document.querySelector('.hud-toast-banner');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'hud-toast-banner';
    toast.innerText = '⚡ SESSION CONVERSATION PURGED • CORE MEMORY PRESERVED';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 1800);
  }

  // ==========================================
  // FULLSCREEN CINEMA HOLOGRAM MODE
  // ==========================================

  toggleHologramMode(forceState = null) {
    this.isHologramMode = forceState !== null ? forceState : !this.isHologramMode;

    const expandIcon = this.dom.btnToggleHologram ? this.dom.btnToggleHologram.querySelector('.icon-expand') : null;
    const compressIcon = this.dom.btnToggleHologram ? this.dom.btnToggleHologram.querySelector('.icon-compress') : null;

    if (this.isHologramMode) {
      // Enter Fullscreen if supported
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      document.body.classList.add('hologram-mode');
      if (this.dom.btnToggleHologram) this.dom.btnToggleHologram.classList.add('active');
      if (expandIcon) expandIcon.style.display = 'none';
      if (compressIcon) compressIcon.style.display = 'block';

      window.JarvisAudio.playPulse();

      const existingToast = document.querySelector('.hud-toast-banner');
      if (existingToast) existingToast.remove();

      const toast = document.createElement('div');
      toast.className = 'hud-toast-banner';
      toast.innerText = '⚡ CINEMA HOLOGRAM MODE // HUD FOCUS ENGAGED';
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
      }, 1600);
    } else {
      // Exit Fullscreen if active
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      document.body.classList.remove('hologram-mode');
      if (this.dom.btnToggleHologram) this.dom.btnToggleHologram.classList.remove('active');
      if (expandIcon) expandIcon.style.display = 'block';
      if (compressIcon) compressIcon.style.display = 'none';

      window.JarvisAudio.playClick();

      const existingToast = document.querySelector('.hud-toast-banner');
      if (existingToast) existingToast.remove();

      const toast = document.createElement('div');
      toast.className = 'hud-toast-banner';
      toast.innerText = '⚡ STANDARD HUD MODE RESTORED';
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
      }, 1600);
    }
  }

  // ==========================================
  // SETTINGS MODAL BINDINGS & LOGIC
  // ==========================================

  bindModals() {
    if (this.dom.btnSettings) {
      this.dom.btnSettings.addEventListener('click', () => this.openSettings());
    }
    if (this.dom.btnCloseSettings) {
      this.dom.btnCloseSettings.addEventListener('click', () => this.closeSettings());
    }
    if (this.dom.btnCancelSettings) {
      this.dom.btnCancelSettings.addEventListener('click', () => this.closeSettings());
    }
    if (this.dom.btnSaveSettings) {
      this.dom.btnSaveSettings.addEventListener('click', () => this.saveSettings());
    }

    if (this.dom.btnTestKey) {
      this.dom.btnTestKey.addEventListener('click', () => this.testApiKeyConnection());
    }

    if (this.dom.btnResetQuota) {
      this.dom.btnResetQuota.addEventListener('click', () => {
        this.resetTokenQuota();
      });
    }

    if (this.dom.sliderPitch) {
      this.dom.sliderPitch.addEventListener('input', (e) => {
        if (this.dom.valPitch) this.dom.valPitch.innerText = e.target.value;
        window.JarvisAudio.voicePitch = parseFloat(e.target.value);
      });
    }

    if (this.dom.sliderRate) {
      this.dom.sliderRate.addEventListener('input', (e) => {
        if (this.dom.valRate) this.dom.valRate.innerText = e.target.value;
        window.JarvisAudio.voiceRate = parseFloat(e.target.value);
      });
    }

    if (this.dom.btnResetPersona) {
      this.dom.btnResetPersona.addEventListener('click', () => {
        if (this.dom.customPersona) this.dom.customPersona.value = SYSTEM_PERSONAS.standard;
      });
    }
  }

  openSettings() {
    window.JarvisAudio.playClick();
    if (this.dom.inputApiKey) this.dom.inputApiKey.value = this.apiKey;
    if (this.dom.selectProvider) this.dom.selectProvider.value = this.provider;
    if (this.dom.customPersona) this.dom.customPersona.value = this.customPersona;
    if (this.dom.inputTokenQuota) this.dom.inputTokenQuota.value = this.tokenQuota;
    if (this.dom.sliderPitch) {
      this.dom.sliderPitch.value = window.JarvisAudio.voicePitch;
      if (this.dom.valPitch) this.dom.valPitch.innerText = window.JarvisAudio.voicePitch;
    }
    if (this.dom.sliderRate) {
      this.dom.sliderRate.value = window.JarvisAudio.voiceRate;
      if (this.dom.valRate) this.dom.valRate.innerText = window.JarvisAudio.voiceRate;
    }
    if (this.dom.keyTestResult) this.dom.keyTestResult.style.display = 'none';

    this.populateVoiceSettings();
    if (this.dom.settingsModal) {
      this.dom.settingsModal.style.display = 'flex';
    }
  }

  closeSettings() {
    window.JarvisAudio.playClick();
    if (this.dom.settingsModal) {
      this.dom.settingsModal.style.display = 'none';
    }
  }

  populateVoiceSettings() {
    const audio = window.JarvisAudio;
    const voices = audio.getAvailableVoices();
    if (!voices || !voices.length || !this.dom.selectVoice) return;

    this.dom.selectVoice.innerHTML = '';
    let hasSelected = false;

    // Default Eric - English (United States) neural profile
    const elEric = document.createElement('option');
    elEric.value = 'Eric';
    elEric.textContent = '🇺🇸 US - Eric (English United States - Default)';
    this.dom.selectVoice.appendChild(elEric);

    // Custom Jarvis ElevenLabs neural voice option
    const elOpt = document.createElement('option');
    elOpt.value = 'Jarvis';
    elOpt.textContent = '⚡ Jarvis (Studio Master Neural Voice)';
    this.dom.selectVoice.appendChild(elOpt);

    const savedVoicePref = localStorage.getItem('jarvis_selected_voice');
    if (!savedVoicePref || savedVoicePref === 'Eric' || savedVoicePref.toLowerCase().includes('eric')) {
      elEric.selected = true;
      hasSelected = true;
    } else if (savedVoicePref === 'Jarvis') {
      elOpt.selected = true;
      hasSelected = true;
    }

    voices.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;

      let cleanName = v.name
        .replace(/Microsoft\s+/i, '')
        .replace(/Online\s*\(Natural\)\s*-\s*/i, '')
        .replace(/Google\s+/i, '')
        .trim();

      let flag = '🌐';
      if (v.lang.includes('US') || v.lang.includes('en-US')) flag = '🇺🇸 US';
      else if (v.lang.includes('GB') || v.lang.includes('en-GB')) flag = '🇬🇧 UK';
      else if (v.lang.includes('AU')) flag = '🇦🇺 AU';
      else if (v.lang.includes('IN')) flag = '🇮🇳 IN';
      else if (v.lang.includes('CA')) flag = '🇨🇦 CA';

      opt.textContent = `${flag} - ${cleanName}`;
      if (!hasSelected && (savedVoicePref === v.voiceURI || savedVoicePref === v.name || (audio.selectedVoice && (audio.selectedVoice.voiceURI === v.voiceURI || audio.selectedVoice.name === v.name)))) {
        opt.selected = true;
        hasSelected = true;
      }
      this.dom.selectVoice.appendChild(opt);
    });

    if (!hasSelected && this.dom.selectVoice.options.length > 0) {
      this.dom.selectVoice.selectedIndex = 0;
      audio.setVoice(this.dom.selectVoice.value);
    }

    this.dom.selectVoice.onchange = (e) => {
      audio.setVoice(e.target.value);
    };
  }

  saveSettings() {
    if (this.dom.inputApiKey) {
      const key = this.dom.inputApiKey.value.trim();
      if (key) {
        this.apiKey = key;
        localStorage.setItem('jarvis_api_key', key);
      } else {
        this.apiKey = '';
        localStorage.removeItem('jarvis_api_key');
      }
    }

    if (this.dom.selectProvider) {
      this.provider = this.dom.selectProvider.value;
      localStorage.setItem('jarvis_provider', this.provider);
    }

    if (this.dom.customPersona) {
      const persona = this.dom.customPersona.value.trim();
      if (persona) {
        this.customPersona = persona;
        localStorage.setItem('jarvis_custom_persona', persona);
      }
    }

    if (this.dom.inputTokenQuota) {
      const quota = parseInt(this.dom.inputTokenQuota.value.trim(), 10);
      if (!isNaN(quota) && quota > 0) {
        this.tokenQuota = quota;
        localStorage.setItem('jarvis_token_quota', quota.toString());
      }
    }

    if (this.dom.sliderPitch) {
      window.JarvisAudio.voicePitch = parseFloat(this.dom.sliderPitch.value);
    }
    if (this.dom.sliderRate) {
      window.JarvisAudio.voiceRate = parseFloat(this.dom.sliderRate.value);
    }

    this.updateTokenDisplays();
    window.JarvisAudio.playSuccess();
    this.closeSettings();
  }

  async testApiKeyConnection() {
    const key = (this.dom.inputApiKey ? this.dom.inputApiKey.value.trim() : '') || this.apiKey;
    if (this.dom.keyTestResult) {
      this.dom.keyTestResult.style.display = 'block';
      this.dom.keyTestResult.className = 'test-result-box';
      this.dom.keyTestResult.innerText = 'Transmitting handshake to Neural Core...';
    }

    try {
      const chatUrl = this.getApiEndpoint();
      const res = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Connection test. Reply with one word.' }],
          apiKey: key,
          provider: this.provider || 'cerebras'
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const { value } = await reader.read();
      const text = decoder.decode(value || new Uint8Array());
      reader.cancel();

      if (text.includes('"error"')) {
        let errMessage = 'Authentication or network error.';
        try {
          const match = text.match(/"error"\s*:\s*"([^"]+)"/);
          if (match) errMessage = match[1];
        } catch (_) {}
        throw new Error(errMessage);
      }

      if (this.dom.keyTestResult) {
        this.dom.keyTestResult.className = 'test-result-box test-success';
        this.dom.keyTestResult.innerText = '✓ Handshake confirmed! Neural intelligence matrix is responsive and ready, Sir.';
      }
      window.JarvisAudio.playSuccess();
    } catch (e) {
      if (this.dom.keyTestResult) {
        this.dom.keyTestResult.className = 'test-result-box test-fail';
        this.dom.keyTestResult.innerText = `✗ Connection failure: ${e.message}`;
      }
      window.JarvisAudio.playAlert();
    }
  }

  // ==========================================
  // TOKEN QUOTA & USAGE TELEMETRY
  // ==========================================

  recordTokenUsage(usage) {
    if (!usage) return;
    const prompt = usage.prompt_tokens || 0;
    const completion = usage.completion_tokens || 0;
    const total = usage.total_tokens || (prompt + completion);
    if (total <= 0) return;

    this.tokensUsedTotal += total;
    this.sessionTokensUsed += total;
    this.lastTokens = { prompt, completion, total };
    localStorage.setItem('jarvis_tokens_used', this.tokensUsedTotal.toString());
    this.updateTokenDisplays();
    this.syncCurrentSessionMessages();
  }

  updateTokenDisplays() {
    const remaining = Math.max(0, this.tokenQuota - this.tokensUsedTotal);
    const percent = this.tokenQuota > 0 ? Math.max(0, Math.min(100, (remaining / this.tokenQuota) * 100)) : 0;
    const formattedRemaining = remaining.toLocaleString();

    if (this.dom.hudTokensRemaining) {
      this.dom.hudTokensRemaining.innerText = formattedRemaining;
    }
    if (this.dom.sbTokensRemaining) {
      this.dom.sbTokensRemaining.innerText = formattedRemaining;
    }
    if (this.dom.sbTokensUsed) {
      this.dom.sbTokensUsed.innerText = `${this.tokensUsedTotal.toLocaleString()}`;
    }
    if (this.dom.sbTokensLast) {
      if (this.lastTokens) {
        this.dom.sbTokensLast.innerText = `${this.lastTokens.prompt} in / ${this.lastTokens.completion} out`;
      } else {
        this.dom.sbTokensLast.innerText = '--';
      }
    }
    if (this.dom.sbContextWindow) {
      const activeChars = this.messages.reduce((acc, m) => acc + (m.content ? m.content.length : 0), 0);
      const estContext = Math.min(131072, Math.ceil(activeChars / 4));
      this.dom.sbContextWindow.innerText = `${estContext.toLocaleString()} / 131,072`;
    }
    if (this.dom.tokenFuelFill) {
      this.dom.tokenFuelFill.style.width = `${percent.toFixed(1)}%`;
      this.dom.tokenFuelFill.classList.remove('warning', 'danger');
      if (percent < 15) {
        this.dom.tokenFuelFill.classList.add('danger');
      } else if (percent < 40) {
        this.dom.tokenFuelFill.classList.add('warning');
      }
    }
    if (this.dom.tokenPercentRemaining) {
      this.dom.tokenPercentRemaining.innerText = `${percent.toFixed(1)}% QUOTA AVAILABLE`;
    }
    if (this.dom.tokenHealthBadge) {
      if (remaining <= 0) {
        this.dom.tokenHealthBadge.innerText = 'DEPLETED';
        this.dom.tokenHealthBadge.className = 'card-badge text-gold';
      } else if (percent < 15) {
        this.dom.tokenHealthBadge.innerText = 'LOW';
        this.dom.tokenHealthBadge.className = 'card-badge text-gold';
      } else {
        this.dom.tokenHealthBadge.innerText = 'OPTIMAL';
        this.dom.tokenHealthBadge.className = 'card-badge text-cyan';
      }
    }
  }

  resetTokenQuota() {
    this.tokenQuota = 1000000;
    this.tokensUsedTotal = 0;
    this.sessionTokensUsed = 0;
    localStorage.setItem('jarvis_token_quota', '1000000');
    localStorage.setItem('jarvis_tokens_used', '0');
    if (this.dom.inputTokenQuota) this.dom.inputTokenQuota.value = '1000000';
    this.updateTokenDisplays();
    window.JarvisAudio.playSuccess();
  }

  // ==========================================
  // PERSISTENT LONG-TERM NEURAL MEMORY & DATABASE FILE SYNC
  // ==========================================

  loadPersistentMemories() {
    try {
      const raw = localStorage.getItem('jarvis_core_memory');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load persistent memory:', e);
    }
    return [];
  }

  async syncDatabaseFile() {
    try {
      // 1. Fetch persistent database file from server
      const res = await fetch('https://jarvis-ai-agent-b7og.onrender.com/api/memory');
      if (res.ok) {
        const dbData = await res.json();
        if (Array.isArray(dbData.memories) && dbData.memories.length > 0) {
          // Merge server database memories with local memories
          const existingIds = new Set(this.memories.map(m => m.id || (typeof m === 'string' ? m : m.text)));
          let updated = false;
          dbData.memories.forEach(srvMem => {
            const key = srvMem.id || (typeof srvMem === 'string' ? srvMem : srvMem.text);
            if (!existingIds.has(key)) {
              this.memories.push(srvMem);
              updated = true;
            }
          });
          if (updated) {
            localStorage.setItem('jarvis_core_memory', JSON.stringify(this.memories));
            this.updateMemoryBadge();
            this.renderMemoryModalList();
          }
        }
      }

      // 2. Push current memories and session summary to server database file
      await fetch('https://jarvis-ai-agent-b7og.onrender.com/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memories: this.memories,
          sessionArchive: this.sessions.map(s => ({
            id: s.id,
            title: s.title,
            created: s.created,
            updated: s.updated,
            messageCount: s.messages ? s.messages.length : 0,
            summarySnippet: s.messages && s.messages.length ? s.messages.slice(-2).map(m => `${m.role}: ${(m.content || '').slice(0, 100)}`).join(' | ') : ''
          }))
        })
      });
    } catch (err) {
      console.warn('[DATABASE FILE SYNC] Offline or background sync delayed:', err.message);
    }
  }

  savePersistentMemories() {
    try {
      localStorage.setItem('jarvis_core_memory', JSON.stringify(this.memories));
    } catch (e) {
      console.warn('Failed to save persistent memory:', e);
    }
    this.updateMemoryBadge();
    // Persist immediately to database file
    this.syncDatabaseFile();
  }

  getPersistentMemories() {
    return this.memories.map(m => (typeof m === 'string' ? m : m.text)).filter(Boolean);
  }

  addPersistentMemory(fact) {
    if (!fact || !fact.trim()) return false;
    const cleanFact = fact.trim();
    const exists = this.memories.some(m => {
      const text = typeof m === 'string' ? m : m.text;
      return text.toLowerCase() === cleanFact.toLowerCase();
    });
    if (exists) return false;

    this.memories.push({
      id: 'mem-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      text: cleanFact,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    });
    this.savePersistentMemories();
    this.renderMemoryModalList();
    return true;
  }

  removePersistentMemory(idOrKeyword) {
    if (!idOrKeyword) return false;
    const target = idOrKeyword.toLowerCase().trim();
    const initialLen = this.memories.length;
    this.memories = this.memories.filter(m => {
      if (m.id && m.id === idOrKeyword) return false;
      const text = typeof m === 'string' ? m : m.text;
      return !text.toLowerCase().includes(target);
    });
    if (this.memories.length !== initialLen) {
      this.savePersistentMemories();
      this.renderMemoryModalList();
      return true;
    }
    return false;
  }

  clearPersistentMemories() {
    this.memories = [];
    this.savePersistentMemories();
    this.renderMemoryModalList();
  }

  updateMemoryBadge() {
    const count = this.memories ? this.memories.length : 0;
    if (this.dom.memoryCountBadge) {
      this.dom.memoryCountBadge.innerText = count.toString();
    }
    if (this.dom.memoryCountText) {
      this.dom.memoryCountText.innerText = count.toString();
    }
  }

  openMemoryModal() {
    window.JarvisAudio.playClick();
    this.renderMemoryModalList();
    if (this.dom.memoryModal) {
      this.dom.memoryModal.style.display = 'flex';
      if (this.dom.inputNewMemory) {
        setTimeout(() => this.dom.inputNewMemory.focus(), 100);
      }
    }
  }

  closeMemoryModal() {
    window.JarvisAudio.playClick();
    if (this.dom.memoryModal) {
      this.dom.memoryModal.style.display = 'none';
    }
  }

  addManualMemoryFromInput() {
    if (!this.dom.inputNewMemory) return;
    const val = this.dom.inputNewMemory.value.trim();
    if (!val) return;
    if (this.addPersistentMemory(val)) {
      this.dom.inputNewMemory.value = '';
      window.JarvisAudio.playSuccess();
    } else {
      window.JarvisAudio.playBlip();
    }
  }

  renderMemoryModalList() {
    if (!this.dom.memoryItemsList) return;
    this.dom.memoryItemsList.innerHTML = '';
    this.updateMemoryBadge();

    if (!this.memories || this.memories.length === 0) {
      this.dom.memoryItemsList.innerHTML = `
        <div class="memory-empty-state">
          No long-term memories stored yet, Sir.<br>
          Tell Jarvis in conversation (e.g. <em>"Remember that..."</em>) or add memory items manually above.
        </div>
      `;
      return;
    }

    this.memories.forEach((mem) => {
      const card = document.createElement('div');
      card.className = 'memory-item-card';

      const text = typeof mem === 'string' ? mem : (mem.text || '');
      const date = typeof mem === 'object' && mem.date ? mem.date : '';
      const id = typeof mem === 'object' && mem.id ? mem.id : text;

      card.innerHTML = `
        <div class="memory-item-text">${this.escapeHtml(text)}</div>
        ${date ? `<span class="memory-item-date">${this.escapeHtml(date)}</span>` : ''}
        <button class="memory-item-delete" title="Delete memory item" data-id="${this.escapeHtml(id)}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;

      const delBtn = card.querySelector('.memory-item-delete');
      if (delBtn) {
        delBtn.onclick = (e) => {
          e.stopPropagation();
          window.JarvisAudio.playPulse();
          this.removePersistentMemory(id);
        };
      }

      this.dom.memoryItemsList.appendChild(card);
    });
  }

  processMemoryDirectives(fullText, userPrompt = '') {
    if (!fullText) return { cleanedText: fullText, tags: [] };

    const addMatches = [...fullText.matchAll(/<<<MEMORY_ADD:\s*([^>]+?)>>>/gi)];
    const removeMatches = [...fullText.matchAll(/<<<MEMORY_REMOVE:\s*([^>]+?)>>>/gi)];
    const hasClear = /<<<MEMORY_CLEAR>>>/i.test(fullText);

    const tags = [];
    let changed = false;

    if (hasClear) {
      this.clearPersistentMemories();
      changed = true;
      tags.push('Neural Memory Purged');
    }

    for (const match of removeMatches) {
      const target = match[1].trim();
      if (target) {
        const removed = this.removePersistentMemory(target);
        if (removed) {
          changed = true;
          tags.push(`Excised: "${target}"`);
        }
      }
    }

    for (const match of addMatches) {
      const fact = match[1].trim();
      if (fact) {
        const added = this.addPersistentMemory(fact);
        if (added) {
          changed = true;
          tags.push(`Stored: "${fact}"`);
        }
      }
    }

    // Safety fallback: If user explicitly instructed "remember that..." and model did not emit a tag, store it directly
    if (tags.length === 0 && userPrompt) {
      const rememberMatch = userPrompt.match(/^(?:please\s+)?(?:remember|keep\s+in\s+mind|store\s+in\s+memory)(?:\s+that|\s+this)?[:\s]+(.+)/i) ||
                            userPrompt.match(/^update\s+memory[:\s]+(.+)/i);
      if (rememberMatch && rememberMatch[1]) {
        const extractedFact = rememberMatch[1].trim().replace(/[.!?]+$/, '');
        if (extractedFact.length >= 3) {
          const added = this.addPersistentMemory(extractedFact);
          if (added) {
            changed = true;
            tags.push(`Stored: "${extractedFact}"`);
          }
        }
      }
    }

    if (changed) {
      this.updateMemoryBadge();
    }

    const cleanedText = fullText
      .replace(/<<<MEMORY_(ADD|REMOVE|CLEAR)[^>]*>>>/gi, '')
      .trim();

    return { cleanedText, tags };
  }

  autoResizeTextarea() {
    const input = this.dom.promptInput;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }

  // ==========================================
  // MESSAGE TRANSMISSION & STREAMING
  // ==========================================

  getApiEndpoint() {
    if (window.location.protocol === 'file:' || !window.location.hostname) {
      return 'http://localhost:3000/api/chat';
    }
    if (window.location.port === '3000' || (window.location.hostname && window.location.hostname.startsWith('3000-'))) {
      return 'https://jarvis-ai-agent-b7og.onrender.com/api/chat';
    }
    if (window.location.hostname && window.location.hostname.includes('.e2b.app')) {
      const sandboxHost = window.location.hostname.replace(/^[0-9]+-/, '');
      return `https://3000-${sandboxHost}/api/chat`;
    }
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000/api/chat';
    }
    return 'https://jarvis-ai-agent-b7og.onrender.com/api/chat';
  }

  async handleSubmit() {
    const rawText = this.dom.promptInput ? this.dom.promptInput.value.trim() : '';
    if ((!rawText && !this.attachedFile) || this.isStreaming) return;

    window.JarvisAudio.playBlip();

    // Prepare prompt to send vs display text
    let userPromptText = rawText;
    let fileInfoForDisplay = null;
    let aiContent = null;

    if (this.attachedFile) {
      fileInfoForDisplay = { ...this.attachedFile };

      if (this.attachedFile.kind === 'image') {
        userPromptText = rawText || 'Please inspect, review, and analyze this attached image, Sir.';
        aiContent = [
          { type: 'text', text: userPromptText },
          { type: 'image_url', image_url: { url: this.attachedFile.dataUrl } }
        ];
      } else {
        const ext = this.attachedFile.name.split('.').pop() || 'text';
        userPromptText = rawText || 'Please inspect, review, and analyze this attached file, Sir.';
        aiContent = `[SYSTEM PROTOCOL: INGESTED & PRE-EXTRACTED DOCUMENT CONTENT]
The user has attached the following file, which has been automatically decoded and extracted into text below for your real-time review.
Filename: ${this.attachedFile.name}
File Specs: ${this.attachedFile.size}
File Type: ${this.attachedFile.type || ext}

--- BEGIN DOCUMENT TEXT (${this.attachedFile.name}) ---
${this.attachedFile.content}
--- END DOCUMENT TEXT ---

User Prompt / Instruction:
${userPromptText}`;
      }
      
      this.removeAttachedFile();
    } else {
      aiContent = userPromptText;
    }

    if (this.dom.promptInput) {
      this.dom.promptInput.value = '';
      this.dom.promptInput.style.height = 'auto';
    }

    // Add clean user message to UI and history
    this.addMessage('user', userPromptText, fileInfoForDisplay);
    this.messages.push({
      role: 'user',
      content: aiContent,
      displayText: userPromptText,
      fileMeta: fileInfoForDisplay
    });
    this.syncCurrentSessionMessages();

    // Show processing indicator and update UI state
    this.setStreamingState(true);
    if (window.JarvisReactor) window.JarvisReactor.setProcessingState(true);

    // Create placeholder for Jarvis response
    const { bubbleEl, wrapperEl, footerEl } = this.createJarvisMessagePlaceholder();

    this.abortController = new AbortController();

    let effectiveDirective = SYSTEM_PERSONAS[this.currentMode] || this.customPersona;
    if (this.currentMode === 'standard' && this.customPersona) {
      effectiveDirective = this.customPersona;
    }

    // Inject Long-Term Persistent Memory Matrix (Survives session deletions and resets)
    const memoryFacts = this.getPersistentMemories();
    if (memoryFacts && memoryFacts.length > 0) {
      const memoryListText = memoryFacts.map((m, idx) => `[MEM-${idx + 1}] ${m}`).join('\n');
      effectiveDirective += `\n\n[PERSISTENT LONG-TERM NEURAL MEMORY (PERSISTS ACROSS SESSIONS)]:\nThe following facts and preferences are stored in your permanent core memory:\n${memoryListText}\nDirective: You MUST strictly retain, apply, and recall all stored facts and preferences above across all sessions, even when conversation history is deleted or new sessions begin.`;
    }

    effectiveDirective += `\n\n[NEURAL MEMORY PROTOCOLS]:
You possess a persistent Long-Term Memory matrix. When the user tells you to remember something, update memory, keep something in mind, or forget something:
1. Address the user politely ("Sir" or "Madam") and confirm the memory modification naturally.
2. At the conclusion of your response, output the exact memory command tag:
- To store/update a fact: <<<MEMORY_ADD: succinct fact>>>
- To forget/delete a fact: <<<MEMORY_REMOVE: succinct keyword or fact>>>
- To clear all memory: <<<MEMORY_CLEAR>>>
Always formulate succinct, clear factual statements for MEMORY_ADD (e.g. <<<MEMORY_ADD: User's name is Tony Stark>>>).`;

    let fullAnswer = '';
    let reasoningText = '';
    let hasReceivedTokens = false;
    let receivedExactUsage = false;
    let isTruncated = false;

    // Direct high-speed endpoint (no sequential polling loops)
    const directEndpoint = this.getApiEndpoint();
    let response = null;
    let lastErr = null;

    try {
      const res = await fetch(directEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: this.messages,
          apiKey: this.apiKey,
          provider: this.provider,
          systemPrompt: effectiveDirective
        }),
        signal: this.abortController.signal
      });

      if (res.ok && res.status === 200) {
        response = res;
      } else {
        lastErr = new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      lastErr = err;
      // Fallback only if direct relative fails
      try {
        const fallbackRes = await fetch('https://jarvis-ai-agent-b7og.onrender.com/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: this.messages,
            apiKey: this.apiKey,
            provider: this.provider,
            systemPrompt: effectiveDirective
          }),
          signal: this.abortController.signal
        });
        if (fallbackRes.ok) response = fallbackRes;
      } catch (e2) {}
    }

    try {
      if (!response || !response.ok) {
        throw lastErr || new Error('All neural endpoints unreachable');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep partial

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('data: ')) {
            const raw = trimmed.slice(6);
            if (raw === '[DONE]') break;

            try {
              const data = JSON.parse(raw);
              
              if (data.truncated !== undefined) {
                isTruncated = Boolean(data.truncated);
              }

              if (data.usage) {
                receivedExactUsage = true;
                this.recordTokenUsage(data.usage);
              }

              if (data.reasoning) {
                if (!hasReceivedTokens) {
                  hasReceivedTokens = true;
                  if (this.dom.thinkingIndicator) this.dom.thinkingIndicator.style.display = 'none';
                  window.JarvisAudio.playReceive();
                }
                reasoningText += data.reasoning;
                this.updateBubbleWithReasoning(bubbleEl, reasoningText, fullAnswer, true);
                this.scrollToBottom();
              }

              if (data.delta) {
                if (!hasReceivedTokens) {
                  hasReceivedTokens = true;
                  if (this.dom.thinkingIndicator) this.dom.thinkingIndicator.style.display = 'none';
                  window.JarvisAudio.playReceive();
                }
                fullAnswer += data.delta;
                this.updateBubbleWithReasoning(bubbleEl, reasoningText, fullAnswer, true);
                this.scrollToBottom();
              } else if (data.error) {
                fullAnswer += `\n\n> ⚠️ **Alert**: ${data.error}`;
                this.updateBubbleWithReasoning(bubbleEl, reasoningText, fullAnswer, false);
                window.JarvisAudio.playAlert();
              }
            } catch (err) {
              // Partial JSON chunk
            }
          }
        }
      }

      // If exact usage object wasn't supplied by the chunk, estimate accurately
      if (!receivedExactUsage && fullAnswer) {
        const promptLength = typeof aiContent === 'string'
          ? aiContent.length
          : JSON.stringify(aiContent || '').length;
        const estPrompt = Math.ceil(promptLength / 4);
        const estCompletion = Math.ceil(fullAnswer.length / 4);
        this.recordTokenUsage({
          prompt_tokens: estPrompt,
          completion_tokens: estCompletion,
          total_tokens: estPrompt + estCompletion
        });
      }

      // Final render & Memory Directive Extraction
      const memoryResult = this.processMemoryDirectives(fullAnswer, userPromptText);
      const cleanAnswer = memoryResult.cleanedText || fullAnswer;

      this.updateBubbleWithReasoning(bubbleEl, reasoningText, cleanAnswer, false);

      if (memoryResult.tags.length > 0) {
        const memoryBadgeContainer = document.createElement('div');
        memoryBadgeContainer.className = 'memory-update-container';
        memoryResult.tags.forEach(tagText => {
          const badge = document.createElement('div');
          badge.className = 'memory-update-tag';
          badge.innerHTML = `<span>🧠</span> <strong>CORE MEMORY UPDATED:</strong> ${this.escapeHtml(tagText)}`;
          memoryBadgeContainer.appendChild(badge);
        });
        bubbleEl.appendChild(memoryBadgeContainer);
        window.JarvisAudio.playSuccess();
      }

      if (footerEl) {
        footerEl.style.display = 'flex';
        if (isTruncated) {
          const continueBtn = document.createElement('button');
          continueBtn.className = 'msg-action-btn continue-btn';
          continueBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span>CONTINUE RESPONSE</span>
          `;
          continueBtn.title = 'Response hit completion boundary. Click to continue generation, Sir.';
          continueBtn.onclick = () => {
            continueBtn.remove();
            if (this.dom.promptInput) {
              this.dom.promptInput.value = 'Please continue your detailed explanation exactly where you left off, Sir.';
              this.handleSubmit();
            }
          };
          footerEl.insertBefore(continueBtn, footerEl.firstChild);
        }
      }

      // Save assistant response to history
      if (cleanAnswer) {
        this.messages.push({ role: 'assistant', content: cleanAnswer });
        this.syncCurrentSessionMessages();
        window.JarvisAudio.playSuccess();

        if (window.JarvisAudio.voiceEnabled) {
          window.JarvisAudio.speak(cleanAnswer);
        }
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        bubbleEl.innerHTML = this.renderMarkdown(fullAnswer + '\n\n*(Transmission halted by user)*');
      } else {
        console.error('Transmission error:', err);
        let errorMsg = `### ⚠️ Connection Anomaly\n\n`;
        errorMsg += `Unable to complete neural query: **${err.message}**.\n\n`;
        errorMsg += `Please verify that your server is running via \`node server.js\` and check your API key in **Settings (⚙️)**.`;
        bubbleEl.innerHTML = this.renderMarkdown(errorMsg);
        window.JarvisAudio.playAlert();
      }
      if (footerEl) footerEl.style.display = 'flex';
    } finally {
      this.setStreamingState(false);
      if (window.JarvisReactor) window.JarvisReactor.setProcessingState(false);
      this.scrollToBottom();
    }
  }

  abortStream() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.setStreamingState(false);
    if (window.JarvisReactor) window.JarvisReactor.setProcessingState(false);
  }

  setStreamingState(streaming) {
    this.isStreaming = streaming;
    if (this.dom.btnSend) this.dom.btnSend.style.display = streaming ? 'none' : 'flex';
    if (this.dom.btnStopStream) this.dom.btnStopStream.style.display = streaming ? 'flex' : 'none';
    if (this.dom.thinkingIndicator) this.dom.thinkingIndicator.style.display = streaming ? 'flex' : 'none';
  }

  // ==========================================
  // UI MESSAGE RENDERING (CLEAN HEADERS)
  // ==========================================

  addMessage(role, content, fileInfo = null) {
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${role === 'user' ? 'user-message' : 'jarvis-message'}`;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const sender = role === 'user' ? 'YOU' : 'J.A.R.V.I.S.';

    let attachmentCardHtml = '';
    if (fileInfo) {
      if (fileInfo.kind === 'image' && fileInfo.dataUrl) {
        attachmentCardHtml = `
          <div class="hud-file-card hud-file-card-image">
            <div class="hud-file-card-header">
              <span class="hud-card-icon">📷</span>
              <span class="hud-card-name">${this.escapeHtml(fileInfo.name)}</span>
              <span class="hud-card-size">(${this.escapeHtml(fileInfo.size)})</span>
              <span class="hud-card-badge">OPTICAL DATA</span>
            </div>
            <div class="hud-file-card-preview">
              <img src="${fileInfo.dataUrl}" alt="${this.escapeHtml(fileInfo.name)}" class="hud-attached-img" onclick="window.open(this.src)" title="Click to view full size">
            </div>
          </div>
        `;
      } else {
        const lines = fileInfo.lines ? `${fileInfo.lines} lines` : fileInfo.size;
        attachmentCardHtml = `
          <div class="hud-file-card hud-file-card-doc">
            <div class="hud-file-card-header">
              <span class="hud-card-icon">${fileInfo.type === 'application/pdf' ? '📕' : '📄'}</span>
              <span class="hud-card-name">${this.escapeHtml(fileInfo.name)}</span>
              <span class="hud-card-size">(${this.escapeHtml(fileInfo.size)})</span>
              <span class="hud-card-badge">ATTACHED FILE</span>
            </div>
            ${fileInfo.content ? `
            <details class="hud-file-details">
              <summary class="hud-details-summary">Inspect File Content (${lines})</summary>
              <pre class="hud-file-code"><code>${this.escapeHtml(fileInfo.content)}</code></pre>
            </details>
            ` : ''}
          </div>
        `;
      }
    }

    wrapper.innerHTML = `
      <div class="message-hud-tag">
        <span class="tag-sender">${sender}</span>
        <span class="tag-time">${now}</span>
      </div>
      <div class="message-bubble">
        <div class="message-content">
          ${attachmentCardHtml}
          ${content ? this.renderMarkdown(content) : ''}
        </div>
      </div>
    `;

    if (this.dom.messagesContainer) {
      this.dom.messagesContainer.appendChild(wrapper);
      this.scrollToBottom();
    }
  }

  createJarvisMessagePlaceholder() {
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper jarvis-message';

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Clean header showing ONLY J.A.R.V.I.S. and time - NO model name tags
    wrapper.innerHTML = `
      <div class="message-hud-tag">
        <span class="tag-sender">J.A.R.V.I.S.</span>
        <span class="tag-time">${now}</span>
      </div>
      <div class="message-bubble">
        <div class="message-content"><span class="typing-cursor"></span></div>
      </div>
      <div class="message-footer-hud" style="display: none;">
        <button class="msg-action-btn speak-btn" title="Speak this response aloud">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
          <span>SPEAK</span>
        </button>
        <button class="msg-action-btn copy-btn" title="Copy message text">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>COPY</span>
        </button>
      </div>
    `;

    if (this.dom.messagesContainer) {
      this.dom.messagesContainer.appendChild(wrapper);
      this.scrollToBottom();
    }

    return {
      wrapperEl: wrapper,
      bubbleEl: wrapper.querySelector('.message-content'),
      footerEl: wrapper.querySelector('.message-footer-hud')
    };
  }

  updateBubbleWithReasoning(bubbleEl, reasoning, content, isStreaming) {
    if (!bubbleEl) return;
    let html = '';
    if (reasoning) {
      html += `
        <details class="quantum-reasoning-box" open>
          <summary class="reasoning-header">
            <span>🧠 QUANTUM REASONING MATRIX</span>
          </summary>
          <div class="reasoning-body">${this.escapeHtml(reasoning)}</div>
        </details>
      `;
    }
    html += this.renderMarkdown(content);
    if (isStreaming) {
      html += '<span class="typing-cursor"></span>';
    }
    bubbleEl.innerHTML = html;
  }

  scrollToBottom() {
    if (this.dom.messagesContainer) {
      this.dom.messagesContainer.scrollTop = this.dom.messagesContainer.scrollHeight;
    }
  }

  // ==========================================
  // FAST & ROBUST MARKDOWN PARSER
  // ==========================================

  renderMarkdown(text) {
    if (!text) return '';

    let html = text;

    // 1. Code blocks with language tag (protect from markdown & math processing)
    const protectedBlocks = [];
    html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'CODE';
      const escapedCode = this.escapeHtml(code.trim());
      const blockHtml = `
        <div class="code-block-wrapper">
          <div class="code-header">
            <span class="code-lang-tag">${language.toUpperCase()}</span>
            <button class="btn-copy-code">📋 COPY CODE</button>
          </div>
          <pre><code>${escapedCode}</code></pre>
        </div>
      `;
      protectedBlocks.push(blockHtml);
      return `__PROTECTED_BLOCK_${protectedBlocks.length - 1}__`;
    });

    // Inline code (protect from math processing)
    html = html.replace(/`([^`]+)`/g, (m, code) => {
      protectedBlocks.push(`<code>${this.escapeHtml(code)}</code>`);
      return `__PROTECTED_BLOCK_${protectedBlocks.length - 1}__`;
    });

    // 2. Beautiful KaTeX Math Rendering (LaTeX formulas like ChatGPT)
    if (window.katex) {
      // Display Math: $$...$$ or \[...\]
      html = html.replace(/\$\$([\s\S]*?)\$\$/g, (m, expr) => {
        try {
          return window.katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false });
        } catch (e) {
          return `<div class="katex-display-fallback">${this.escapeHtml(expr)}</div>`;
        }
      });

      html = html.replace(/\\\[([\s\S]*?)\\\]/g, (m, expr) => {
        try {
          return window.katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false });
        } catch (e) {
          return `<div class="katex-display-fallback">${this.escapeHtml(expr)}</div>`;
        }
      });

      // Inline Math: \(...\) or $...$
      html = html.replace(/\\\(([\s\S]*?)\\\)/g, (m, expr) => {
        try {
          return window.katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false });
        } catch (e) {
          return `<span class="katex-inline-fallback">${this.escapeHtml(expr)}</span>`;
        }
      });

      html = html.replace(/(?<!\\)\$([^\$\n]+?)\$/g, (m, expr) => {
        try {
          return window.katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false });
        } catch (e) {
          return `<span class="katex-inline-fallback">${this.escapeHtml(expr)}</span>`;
        }
      });
    }

    // 3. Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold & italic
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Blockquotes
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Unordered lists
    html = html.replace(/^\s*[-*+]\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // Ordered lists
    html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li class="ol-item">$1</li>');

    // Paragraphs
    const blocks = html.split(/\n\n+/);
    html = blocks.map(block => {
      block = block.trim();
      if (!block) return '';
      if (block.startsWith('<div') || block.startsWith('<pre') || block.startsWith('<ul') ||
          block.startsWith('<h') || block.startsWith('<details') || block.startsWith('<blockquote') ||
          block.startsWith('<span class="katex-display') || block.startsWith('__PROTECTED_BLOCK_')) {
        return block;
      }
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');

    // 4. Restore protected code blocks & inline code
    html = html.replace(/__PROTECTED_BLOCK_(\d+)__/g, (_, idx) => protectedBlocks[idx] || '');

    return html;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================
  // REAL-TIME TELEMETRY LOOPS
  // ==========================================

  startTelemetryLoops() {
    // 1. Clock Loop
    setInterval(() => {
      const now = new Date();
      const formatTime = (tz) => {
        try {
          return new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            timeZone: tz, hour12: false
          }).format(now);
        } catch (e) {
          return now.toTimeString().split(' ')[0];
        }
      };

      if (this.dom.clockMalibu) this.dom.clockMalibu.innerText = formatTime('America/Los_Angeles');
      if (this.dom.clockNY) this.dom.clockNY.innerText = formatTime('America/New_York');
      if (this.dom.clockLondon) this.dom.clockLondon.innerText = formatTime('Europe/London');
      if (this.dom.clockTokyo) this.dom.clockTokyo.innerText = formatTime('Asia/Tokyo');
    }, 1000);

    // 2. Session Uptime Counter
    setInterval(() => {
      this.uptimeSeconds++;
      const m = Math.floor(this.uptimeSeconds / 60);
      const s = this.uptimeSeconds % 60;
      const uptimeStr = `${m}m ${s < 10 ? '0' : ''}${s}s`;
      if (this.dom.telemetryUptime) this.dom.telemetryUptime.innerText = uptimeStr;
    }, 1000);

    // 3. Telemetry Ping Pulse
    setInterval(() => {
      if (this.dom.telemetryPing) {
        const ping = Math.floor(16 + Math.random() * 8);
        this.dom.telemetryPing.innerText = `${ping} ms`;
      }
    }, 5000);
  }

  // ==========================================
  // EXPORT CONVERSATION LOG
  // ==========================================

  exportChatLog() {
    if (!this.messages.length) {
      alert('No transmission logs recorded in this session yet, Sir.');
      return;
    }

    let markdown = `# J.A.R.V.I.S. INTELLIGENCE SESSION TRANSCRIPT\n`;
    markdown += `Generated: ${new Date().toISOString()}\n`;
    markdown += `Neural Model: J.A.R.V.I.S. Quantum Neural System\n`;
    markdown += `Total Tokens Consumed: ${this.tokensUsedTotal.toLocaleString()}\n\n---\n\n`;

    this.messages.forEach(m => {
      const sender = m.role === 'user' ? 'USER' : 'J.A.R.V.I.S.';
      const body = m.displayText || (typeof m.content === 'string' ? m.content : '[Optical Image Attached]');
      markdown += `### ${sender}\n\n${body}\n\n---\n\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JARVIS_Session_Log_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    window.JarvisAudio.playSuccess();
  }

  // ==========================================
  // EXPORT HIGH-FIDELITY PDF DOSSIER
  // ==========================================

  exportPdfDossier() {
    if (!this.messages.length) {
      alert('No transmission logs recorded in this session yet, Sir.');
      return;
    }

    window.JarvisAudio.playBlip();

    const sess = this.getCurrentSession();
    const title = sess.title || 'Mission Intelligence Session';
    const dateStr = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'medium' });
    const tokensTotal = this.tokensUsedTotal.toLocaleString();
    const estTokens = this.sessionTokensUsed.toLocaleString();

    let dialogueHtml = '';
    for (let i = 0; i < this.messages.length; i++) {
      const msg = this.messages[i];
      const isUser = msg.role === 'user';
      const sender = isUser ? 'USER // OPERATOR' : 'J.A.R.V.I.S. // NEURAL SYNTHESIS';
      const speakerClass = isUser ? 'speaker-user' : 'speaker-jarvis';
      const entryClass = isUser ? 'msg-user' : 'msg-jarvis';

      let attachmentHtml = '';
      if (msg.fileMeta) {
        if (msg.fileMeta.kind === 'image' && msg.fileMeta.dataUrl) {
          attachmentHtml = `
            <div class="attachment-box">
              <span class="attachment-label">📷 ATTACHED OPTICAL IMAGE: ${this.escapeHtml(msg.fileMeta.name)} (${this.escapeHtml(msg.fileMeta.size)})</span>
              <img src="${msg.fileMeta.dataUrl}" class="attachment-img" alt="Attached Image">
            </div>
          `;
        } else {
          attachmentHtml = `
            <div class="attachment-box">
              <span class="attachment-label">📄 ATTACHED DOCUMENT: ${this.escapeHtml(msg.fileMeta.name)} (${this.escapeHtml(msg.fileMeta.size)})</span>
            </div>
          `;
        }
      }

      const bodyText = msg.displayText || (typeof msg.content === 'string' ? msg.content : '');
      const bodyHtml = this.renderMarkdown(bodyText);

      dialogueHtml += `
        <div class="msg-entry ${entryClass}">
          <div class="msg-header">
            <span class="msg-speaker ${speakerClass}">■ ${sender}</span>
            <span class="msg-seq">TRANS-0${i + 1}</span>
          </div>
          ${attachmentHtml}
          <div class="msg-body">${bodyHtml}</div>
        </div>
      `;
    }

    const reportHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>J.A.R.V.I.S. Mission Report - ${this.escapeHtml(title)}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 12mm 15mm 12mm;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #ffffff;
      color: #0f172a;
      line-height: 1.5;
      font-size: 10.5pt;
      margin: 0;
      padding: 16px;
    }
    .print-banner {
      background: #0284c7;
      color: #ffffff;
      padding: 10px 16px;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .print-btn {
      background: #ffffff;
      color: #0284c7;
      border: none;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11pt;
    }
    .dossier-header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .dossier-brand h1 {
      margin: 0;
      font-size: 17pt;
      font-weight: 800;
      color: #0369a1;
      letter-spacing: 1.5px;
    }
    .dossier-brand .subtitle {
      font-size: 8.5pt;
      color: #475569;
      letter-spacing: 1px;
      font-weight: 600;
      margin-top: 2px;
    }
    .dossier-meta {
      text-align: right;
      font-size: 8pt;
      color: #475569;
      font-family: "Courier New", monospace;
      line-height: 1.4;
    }
    .dossier-meta-badge {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
      margin-bottom: 4px;
    }
    .session-title-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #0284c7;
      padding: 8px 14px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    .session-title-card h2 {
      margin: 0;
      font-size: 12pt;
      color: #0f172a;
    }
    .session-title-card p {
      margin: 3px 0 0 0;
      font-size: 8.5pt;
      color: #64748b;
    }
    .msg-entry {
      margin-bottom: 16px;
      border-radius: 6px;
      padding: 12px 14px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .msg-user {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #0284c7;
    }
    .msg-jarvis {
      background: #f0fdf4;
      border: 1px solid #dcfce7;
      border-left: 4px solid #16a34a;
    }
    .msg-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 8pt;
      font-family: "Courier New", monospace;
      font-weight: 700;
    }
    .speaker-user { color: #0284c7; }
    .speaker-jarvis { color: #16a34a; }
    .msg-seq { color: #94a3b8; }
    .msg-body {
      color: #1e293b;
      font-size: 9.5pt;
    }
    .msg-body p { margin: 0 0 8px 0; }
    .msg-body p:last-child { margin-bottom: 0; }
    pre {
      background: #0f172a;
      color: #e2e8f0;
      padding: 10px 12px;
      border-radius: 4px;
      font-family: "Courier New", monospace;
      font-size: 8.5pt;
      overflow-x: auto;
      margin: 8px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    code {
      font-family: "Courier New", monospace;
      background: #e2e8f0;
      color: #0f172a;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 8.5pt;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 8.5pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
      text-align: left;
    }
    th {
      background: #e2e8f0;
      color: #0f172a;
      font-weight: 700;
    }
    tr:nth-child(even) { background: #f8fafc; }
    .attachment-box {
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .attachment-label {
      font-size: 8pt;
      font-family: "Courier New", monospace;
      color: #0369a1;
      font-weight: 700;
      display: block;
    }
    .attachment-img {
      max-height: 180px;
      max-width: 100%;
      object-fit: contain;
      margin-top: 6px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
    }
    .dossier-footer {
      border-top: 1px solid #cbd5e1;
      margin-top: 30px;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #94a3b8;
      font-family: "Courier New", monospace;
    }
  </style>
</head>
<body>
  <div class="print-banner no-print">
    <span>⚡ <strong>J.A.R.V.I.S. Print Engine Ready:</strong> Select "Save as PDF" destination in your print dialogue.</span>
    <button class="print-btn" onclick="window.print()">🖨️ SAVE AS PDF</button>
  </div>

  <div class="dossier-header">
    <div class="dossier-brand">
      <h1>J.A.R.V.I.S. INTELLIGENCE DOSSIER</h1>
      <div class="subtitle">STARK INDUSTRIES // QUANTUM NEURAL COMMUNICATIONS ARCHIVE</div>
    </div>
    <div class="dossier-meta">
      <span class="dossier-meta-badge">LEVEL 7 CLEARANCE</span><br>
      DATE: ${dateStr}<br>
      SESSION TOKENS: ${estTokens}<br>
      TOTAL AUDIT TOKENS: ${tokensTotal}
    </div>
  </div>

  <div class="session-title-card">
    <h2>${this.escapeHtml(title)}</h2>
    <p>Recorded Transmissions: ${this.messages.length} exchanges | Protocol: TLS 1.3 / Quantum Encryption</p>
  </div>

  ${dialogueHtml}

  <div class="dossier-footer">
    <span>CLASSIFIED // FOR AUTHORIZED PERSONNEL ONLY</span>
    <span>J.A.R.V.I.S. MARK LXXXV OPERATING SYSTEM</span>
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 350);
    });
  <\/script>
</body>
</html>`;

    // Create an invisible iframe to trigger the PDF export
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(reportHtml);
    doc.close();

    // Cleanup after print finishes
    setTimeout(() => {
      iframe.remove();
    }, 120000);

    const toast = document.createElement('div');
    toast.className = 'hud-toast-banner';
    toast.innerText = '📕 GENERATING J.A.R.V.I.S. PDF DOSSIER...';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 2000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.Jarvis = new JarvisApp();
  setTimeout(() => {
    if (window.JarvisAudio) window.JarvisAudio.playStartup();
  }, 500);
});
