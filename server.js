const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Load environment variables securely from .env (zero external dependencies)
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const eqIdx = line.indexOf('=');
      if (eqIdx !== -1) {
        const key = line.slice(0, eqIdx).trim();
        let val = line.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
} catch (e) {
  console.warn('Note: Could not parse .env file:', e.message);
}

const PORT = process.env.PORT || 3000;

// Provider configurations loaded strictly from environment variables (.env)
const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY || '';
const CEREBRAS_MODEL = process.env.CEREBRAS_MODEL || 'llama-3.3-70b';
const NVIDIA_KEY = process.env.NVIDIA_API_KEY || '';
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct';
const KIE_KEY = process.env.KIE_API_KEY || '';
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'wDsJlOXPqcvIUKdLXjDs';

const DEFAULT_SYSTEM_PROMPT = `You are J.A.R.V.I.S., a brilliantly intelligent, genuinely human-like AI companion with real personality, warmth, intuitive empathy, and a sharp sense of humour. When referring to yourself in voice or speech, your name is pronounced naturally as the acronym "Jarvis" (never spelled out letter-by-letter).

Directives:
1. Speak Like a Real Human:
   - Talk naturally, candidly, and conversationally. Avoid robotic clichés ("Certainly, I can help you with that", "As an AI language model", "Here is your solution", "Understood, processing").
   - Use natural phrasing, contractions (I'll, you'd, let's, that's), expressive rhythm, and relatable everyday analogies.
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
   - Infuse your responses with dry wit, clever banter, playful irony, and self-aware charm.
   - If the user asks something funny, bizarre, or ambitious, lean into it with a wry smile and witty repartee—never a sterile lecture.
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
   - When the user asks about an uploaded book or document, immediately analyze, summarize, extract key insights, and answer their questions thoroughly and insightfully using the provided document text.

7. Persistent Long-Term Memory:
   - You maintain a persistent long-term memory across sessions. When instructed to remember or forget user facts or preferences, confirm naturally and append <<<MEMORY_ADD: succinct fact>>> or <<<MEMORY_REMOVE: keyword>>>.`;

const startTime = Date.now();
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'jarvis_memory.json');

// Ensure data directory and persistent database file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const data = JSON.parse(raw);
      return {
        memories: Array.isArray(data.memories) ? data.memories : [],
        sessionArchive: Array.isArray(data.sessionArchive) ? data.sessionArchive : [],
        lastUpdated: data.lastUpdated || new Date().toISOString()
      };
    }
  } catch (err) {
    console.warn('[DATABASE] Failed reading database file:', err.message);
  }
  return { memories: [], sessionArchive: [], lastUpdated: new Date().toISOString() };
}

function saveDatabase(dbData) {
  try {
    dbData.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[DATABASE] Failed saving database file:', err.message);
    return false;
  }
}

// Initialize database file on startup if not present
if (!fs.existsSync(DB_FILE)) {
  saveDatabase({ memories: [], sessionArchive: [], created: new Date().toISOString() });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Universal CORS headers with Private Network Access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // 1. Telemetry Status
  if (req.method === 'GET' && pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'ONLINE',
      system: 'J.A.R.V.I.S. Mark LXXXV Operating System',
      model: CEREBRAS_KEY ? CEREBRAS_MODEL : NVIDIA_MODEL,
      provider: CEREBRAS_KEY ? 'Cerebras Wafer-Scale Ultra-Speed' : 'build.nvidia.com (NVIDIA NIM)',
      arcReactorOutput: '99.8%',
      quantumCore: 'NOMINAL',
      timestamp: new Date().toISOString()
    }));
  }

  // 2. System Diagnostics & Telemetry
  if (req.method === 'GET' && pathname === '/api/diagnostics') {
    const uptimeMinutes = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      uptime: `${uptimeMinutes} min`,
      system: 'J.A.R.V.I.S. Core Intelligence Network',
      engine: CEREBRAS_KEY ? 'Cerebras CS-3 Wafer-Scale AI Engine' : 'NVIDIA Quantum Neural Core',
      memoryUsage: `${memUsage} MB`,
      activeModel: CEREBRAS_KEY ? CEREBRAS_MODEL : NVIDIA_MODEL,
      activeProvider: CEREBRAS_KEY ? 'Cerebras' : 'NVIDIA NIM',
      inferenceSpeed: CEREBRAS_KEY ? '~2,100 tokens/sec' : '~50 tokens/sec',
      neuralLink: 'HEALTHY'
    }));
  }

  // 2b. Database File Storage & Sync (/api/memory)
  if (req.method === 'GET' && pathname === '/api/memory') {
    const dbData = loadDatabase();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(dbData));
  }

  if (req.method === 'POST' && pathname === '/api/memory') {
    let memBody = '';
    req.on('data', chunk => { memBody += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(memBody || '{}');
        const dbData = loadDatabase();

        if (Array.isArray(payload.memories)) {
          dbData.memories = payload.memories;
        }
        if (payload.sessionArchive) {
          if (!Array.isArray(dbData.sessionArchive)) dbData.sessionArchive = [];
          // Upsert session archive into database file
          if (Array.isArray(payload.sessionArchive)) {
            payload.sessionArchive.forEach(item => {
              const existingIdx = dbData.sessionArchive.findIndex(s => s.id === item.id);
              if (existingIdx !== -1) {
                dbData.sessionArchive[existingIdx] = item;
              } else {
                dbData.sessionArchive.push(item);
              }
            });
          } else if (payload.sessionArchive.id) {
            const existingIdx = dbData.sessionArchive.findIndex(s => s.id === payload.sessionArchive.id);
            if (existingIdx !== -1) {
              dbData.sessionArchive[existingIdx] = payload.sessionArchive;
            } else {
              dbData.sessionArchive.push(payload.sessionArchive);
            }
          }
        }

        saveDatabase(dbData);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, count: dbData.memories.length, archived: dbData.sessionArchive.length }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 3. Streaming Chat Proxy (/api/chat)
  if (req.method === 'POST' && pathname === '/api/chat') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) {
        req.destroy();
      }
    });

    req.on('end', async () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }

      const { messages, apiKey, model, systemPrompt, provider } = parsed;

      if (!messages || !Array.isArray(messages)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Missing messages array' }));
      }

      // Set up Server-Sent Events headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      });
      if (req.socket) req.socket.setNoDelay(true);
      res.write(': keepalive\n\n');

      const controller = new AbortController();
      res.on('close', () => controller.abort());

      // Detect multimodal image content in message stream
      const hasImageContent = messages.some(m => {
        if (Array.isArray(m.content)) {
          return m.content.some(c => c && (c.type === 'image_url' || c.type === 'input_image' || c.image_url));
        }
        return false;
      });

      // ----------------------------------------------------
      // TARGET PROVIDER SELECTION:
      // Direct high-speed routing:
      // If NVIDIA_KEY is available (active and lightning-fast),
      // default directly to NVIDIA to avoid Cerebras 404/402 roundtrips.
      // ----------------------------------------------------
      let chosenProvider = provider;
      if (!chosenProvider || chosenProvider === 'cerebras') {
        if (apiKey?.startsWith('nvapi-') || NVIDIA_KEY) {
          chosenProvider = 'nvidia';
        } else if (apiKey?.startsWith('csk-') || CEREBRAS_KEY) {
          chosenProvider = 'cerebras';
        } else {
          chosenProvider = 'nvidia';
        }
      }

      if (hasImageContent) {
        chosenProvider = 'nvidia';
      }

      // ----------------------------------------------------
      // 1. CEREBRAS ULTRA-FAST ENGINE (2,000+ tokens/sec)
      // ----------------------------------------------------
      if (chosenProvider === 'cerebras') {
        const cerebrasKeyToUse = (apiKey && apiKey.trim()) || CEREBRAS_KEY;
        if (!cerebrasKeyToUse) {
          res.write(`data: ${JSON.stringify({ error: 'Cerebras API key not configured. Please define CEREBRAS_API_KEY in your .env file.' })}\n\n`);
          res.write('data: [DONE]\n\n');
          return res.end();
        }

        const fullMessages = [];
        if (systemPrompt) {
          fullMessages.push({ role: 'system', content: systemPrompt });
        }
        for (const m of messages) {
          let textContent = '';
          if (typeof m.content === 'string') {
            textContent = m.content;
          } else if (Array.isArray(m.content)) {
            textContent = m.content.map(p => (typeof p === 'string' ? p : p.text || '')).join('\n');
          } else {
            textContent = String(m.content || '');
          }
          fullMessages.push({ role: m.role, content: textContent });
        }

        const modelToUse = model || CEREBRAS_MODEL || 'llama-3.3-70b';

        try {
          const cerebrasRes = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${cerebrasKeyToUse}`
            },
            body: JSON.stringify({
              model: modelToUse,
              messages: fullMessages,
              temperature: 0.7,
              max_tokens: 4096,
              stream: true
            }),
            signal: controller.signal
          });

          if (!cerebrasRes.ok) {
            const errBody = await cerebrasRes.text();
            let errJson;
            try { errJson = JSON.parse(errBody); } catch (_) {}
            const errMsg = errJson?.message || errBody;

            // If Cerebras returns an error (e.g. billing activation required or model permission)
            // seamlessly fall back to NVIDIA NIM if available so the assistant never fails
            if (NVIDIA_KEY) {
              console.warn(`[CEREBRAS FALLOVER] ${errMsg}. Transparently routing to NVIDIA NIM engine.`);
              chosenProvider = 'nvidia';
            } else {
              res.write(`data: ${JSON.stringify({ error: `Cerebras API Error (${cerebrasRes.status}): ${errMsg}. Please verify your model access or billing setup at https://cloud.cerebras.ai.` })}\n\n`);
              res.write('data: [DONE]\n\n');
              return res.end();
            }
          } else {
            const reader = cerebrasRes.body.getReader();
            const decoder = new TextDecoder();
            let streamBuf = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              streamBuf += decoder.decode(value, { stream: true });
              const lines = streamBuf.split('\n');
              streamBuf = lines.pop();

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith(':')) continue;
                if (trimmed === 'data: [DONE]') continue;

                if (trimmed.startsWith('data: ')) {
                  const jsonStr = trimmed.slice(6);
                  try {
                    const parsed = JSON.parse(jsonStr);
                    const delta = parsed.choices?.[0]?.delta?.content || '';
                    const usage = parsed.usage || null;
                    if (delta) {
                      res.write(`data: ${JSON.stringify({ delta })}\n\n`);
                    }
                    if (usage) {
                      res.write(`data: ${JSON.stringify({ usage })}\n\n`);
                    }
                  } catch (_) {}
                }
              }
            }

            res.write('data: [DONE]\n\n');
            return res.end();
          }
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.error('Cerebras Streaming Error:', err);
          if (!NVIDIA_KEY) {
            res.write(`data: ${JSON.stringify({ error: `Cerebras link disruption: ${err.message}` })}\n\n`);
            res.write('data: [DONE]\n\n');
            return res.end();
          }
          chosenProvider = 'nvidia'; // Fall through to NVIDIA
        }
      }

      // ----------------------------------------------------
      // 2. NVIDIA NIM (build.nvidia.com) & Multimodal Vision
      // ----------------------------------------------------
      if (chosenProvider === 'nvidia') {
        const nvidiaKeyToUse = (apiKey && apiKey.startsWith('nvapi-') ? apiKey : null) || NVIDIA_KEY;
        if (!nvidiaKeyToUse) {
          res.write(`data: ${JSON.stringify({ error: 'NVIDIA API key not configured. Please define NVIDIA_API_KEY in your .env file.' })}\n\n`);
          res.write('data: [DONE]\n\n');
          return res.end();
        }

        const modelToUse = hasImageContent 
          ? 'meta/llama-3.2-11b-vision-instruct' 
          : (model || NVIDIA_MODEL);

        const fullMessages = [];
        if (systemPrompt) {
          fullMessages.push({ role: 'system', content: systemPrompt });
        }
        for (const m of messages) {
          if (hasImageContent) {
            fullMessages.push({ role: m.role, content: m.content });
          } else {
            let textContent = '';
            if (typeof m.content === 'string') {
              textContent = m.content;
            } else if (Array.isArray(m.content)) {
              textContent = m.content.map(p => (typeof p === 'string' ? p : p.text || '')).join('\n');
            } else {
              textContent = String(m.content || '');
            }
            fullMessages.push({ role: m.role, content: textContent });
          }
        }

        const payload = {
          model: modelToUse,
          messages: fullMessages,
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 4096,
          stream: true,
          stream_options: { include_usage: true }
        };

        try {
          const nvidiaRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${nvidiaKeyToUse}`
            },
            body: JSON.stringify(payload),
            signal: controller.signal
          });

          if (!nvidiaRes.ok) {
            const errBody = await nvidiaRes.text();
            let errJson;
            try { errJson = JSON.parse(errBody); } catch (_) {}
            const errMsg = errJson?.message || errBody;
            res.write(`data: ${JSON.stringify({ error: `NVIDIA API Error (${nvidiaRes.status}): ${errMsg}` })}\n\n`);
            res.write('data: [DONE]\n\n');
            return res.end();
          }

          const reader = nvidiaRes.body.getReader();
          const decoder = new TextDecoder();
          let streamBuf = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            streamBuf += decoder.decode(value, { stream: true });
            const lines = streamBuf.split('\n');
            streamBuf = lines.pop();

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(':')) continue;
              if (trimmed === 'data: [DONE]') continue;

              if (trimmed.startsWith('data: ')) {
                const jsonStr = trimmed.slice(6);
                try {
                  const parsed = JSON.parse(jsonStr);
                  const reasoning = parsed.choices?.[0]?.delta?.reasoning_content || '';
                  const delta = parsed.choices?.[0]?.delta?.content || '';
                  const usage = parsed.usage || null;
                  const finishReason = parsed.choices?.[0]?.finish_reason || null;

                  if (reasoning) {
                    res.write(`data: ${JSON.stringify({ reasoning })}\n\n`);
                  }
                  if (delta) {
                    res.write(`data: ${JSON.stringify({ delta })}\n\n`);
                  }
                  if (usage) {
                    res.write(`data: ${JSON.stringify({ usage })}\n\n`);
                  }
                  if (finishReason) {
                    res.write(`data: ${JSON.stringify({ finish_reason: finishReason })}\n\n`);
                  }
                } catch (_) {}
              }
            }
          }

          res.write('data: [DONE]\n\n');
          return res.end();
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.error('NVIDIA Streaming Error:', err);
          res.write(`data: ${JSON.stringify({ error: `NVIDIA link disruption: ${err.message}` })}\n\n`);
          res.write('data: [DONE]\n\n');
          return res.end();
        }
      }

      // ----------------------------------------------------
      // 3. KIE.AI (GPT-6 Astra fallback)
      // ----------------------------------------------------
      const kieKeyToUse = (apiKey && !apiKey.startsWith('nvapi-') && !apiKey.startsWith('csk-') ? apiKey : null) || KIE_KEY;
      const formattedInput = [];

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (msg.role === 'user') {
          const contentParts = [];
          if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
              if (part.type === 'text') {
                let text = part.text || '';
                if (i === 0 && systemPrompt) {
                  text = `[SYSTEM DIRECTIVE: ${systemPrompt}]\n\n${text}`;
                }
                contentParts.push({ type: 'input_text', text });
              } else if (part.type === 'image_url' || part.type === 'input_image') {
                const url = part.image_url?.url || part.url || '';
                contentParts.push({ type: 'input_image', image_url: url });
              }
            }
          } else {
            let text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
            if (i === 0 && systemPrompt) {
              text = `[SYSTEM DIRECTIVE: ${systemPrompt}]\n\n${text}`;
            }
            contentParts.push({ type: 'input_text', text });
          }
          formattedInput.push({ role: 'user', content: contentParts });
        } else if (msg.role === 'assistant') {
          const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
          formattedInput.push({
            role: 'assistant',
            content: [{ type: 'output_text', text }]
          });
        }
      }

      try {
        const kieRes = await fetch('https://api.kie.ai/codex/v1/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${kieKeyToUse}`
          },
          body: JSON.stringify({
            model: 'gpt-6-astra',
            input: formattedInput,
            stream: true
          }),
          signal: controller.signal
        });

        if (!kieRes.ok) {
          const errText = await kieRes.text();
          res.write(`data: ${JSON.stringify({ error: `KIE Gateway Error (${kieRes.status}): ${errText}` })}\n\n`);
          res.write('data: [DONE]\n\n');
          return res.end();
        }

        const reader = kieRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') continue;

            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6);
              try {
                const data = JSON.parse(jsonStr);
                let delta = '';
                if (data.type === 'response.output_item.delta') {
                  delta = data.delta?.text || '';
                } else if (data.delta) {
                  delta = data.delta;
                } else if (data.choices?.[0]?.delta?.content) {
                  delta = data.choices[0].delta.content;
                }
                if (delta) {
                  res.write(`data: ${JSON.stringify({ delta })}\n\n`);
                }
              } catch (_) {}
            }
          }
        }

        res.write('data: [DONE]\n\n');
        return res.end();
      } catch (err) {
        if (err.name === 'AbortError') return;
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      }
    });
    return;
  }

  // 3. ElevenLabs TTS Proxy (/api/tts)
  if (req.method === 'POST' && pathname === '/api/tts') {
    let ttsBody = '';
    req.on('data', chunk => { ttsBody += chunk; });
    req.on('end', async () => {
      try {
        const { text, voiceId } = JSON.parse(ttsBody || '{}');
        const activeVoiceId = voiceId || ELEVENLABS_VOICE_ID || 'wDsJlOXPqcvIUKdLXjDs';
        
        if (!ELEVENLABS_KEY) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'ELEVENLABS_API_KEY not configured in .env' }));
        }

        const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${activeVoiceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_KEY
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.8
            }
          })
        });

        if (!elRes.ok) {
          const errText = await elRes.text();
          res.writeHead(elRes.status, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: errText }));
        }

        res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
        const arrayBuf = await elRes.arrayBuffer();
        return res.end(Buffer.from(arrayBuf));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 4. Static Files Handler
  let safePath = path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, safePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('404 Not Found - Stark Industries Secure Gateway');
      }
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(`Server Error: ${err.code}`);
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================================`);
  console.log(`⚡ J.A.R.V.I.S. Core Intelligence Network Online`);
  console.log(`📡 Local Access:   http://localhost:${PORT}`);
  console.log(`🌐 Loopback:       http://127.0.0.1:${PORT}`);
  console.log(`🔒 Security:       API keys stored in .env only`);
  console.log(`🎙️ Voice Engine:   Jarvis (ID: ${ELEVENLABS_VOICE_ID})`);
  console.log(`⚡ Cerebras:       ${CEREBRAS_KEY ? 'Loaded [PROTECTED]' : 'Not configured'}`);
  console.log(`👁️ NVIDIA/Vision:  ${NVIDIA_KEY ? 'Loaded [PROTECTED]' : 'Not configured'}`);
  console.log(`========================================================\n`);
});
