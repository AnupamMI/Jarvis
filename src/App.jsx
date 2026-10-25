import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import Settings from './components/Settings';
import ArcReactor from './components/ArcReactor';
import Terminal from './components/Terminal';
import SystemMonitor from './components/SystemMonitor';
import WeatherWidget from './components/WeatherWidget';
import Directives from './components/Directives';
import AlertOverlay from './components/AlertOverlay';

import { playClick, playError, stopAlarm } from './utils/audio';
import { askGroq, askGroqToolFollowup } from './utils/groq';

// Safety net: even if the model slips a raw URL into a spoken reply,
// never read it out letter-by-letter — strip it before it reaches TTS.
// (The Activity log still shows the full, unmodified text.)
function sanitizeForSpeech(text) {
  if (!text) return text;
  return text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/[:\-–]\s*(?=[.!?]|$)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export default function App() {
  const [theme, setTheme] = useState('cyan'); // cyan, red, gold, green
  const [groqKey, setGroqKey] = useState('');
  const [groqModel, setGroqModel] = useState('openai/gpt-oss-20b');
  const [reactorState, setReactorState] = useState('idle'); // idle, listening, speaking, alert
  const [activeAlertMode, setActiveAlertMode] = useState(null); // null, 'red_alert', 'self_destruct'
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [handsFree, setHandsFree] = useState(false);

  const isSpeakingRef = useRef(false);
  const handsFreeRef = useRef(handsFree);

  // Conversation history for tool calling
  const [conversationHistory, setConversationHistory] = useState([]);
  const MAX_HISTORY_TURNS = 8; // user+assistant pairs

  // Time HUD
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  // Voice Speech settings
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [voiceRate, setVoiceRate] = useState(1.0);
  const [voicePitch, setVoicePitch] = useState(1.0);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [micSupported, _setMicSupported] = useState(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  const [micError, setMicError] = useState(null);
  const [micVolume, setMicVolume] = useState(0);

  // Terminal log state
  const [logs, setLogs] = useState([]);
  const micCleanupRef = useRef(null);
  const recognitionRef = useRef(null);
  const handleDirectiveRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const silenceTimerRef = useRef(null);

  // Entity corrections for speech recognition
  const correctEntities = useCallback((text) => {
    const entityCorrections = {
      'priyam innovations': 'Ayukriyam Innovations',
      'aayu cream innovations': 'Ayukriyam Innovations',
      'aayu cream': 'Ayukriyam',
    };
    let corrected = text;
    for (const [wrong, right] of Object.entries(entityCorrections)) {
      corrected = corrected.replace(new RegExp(wrong, 'gi'), right);
    }
    return corrected;
  }, []);

  // Mic stream volume level extractor
  const startMicVolumeStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioCtxClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      analyser.fftSize = 64;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const interval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i];
        }
        setMicVolume(total / bufferLength);
      }, 70);

      micCleanupRef.current = () => {
        clearInterval(interval);
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
      };
    } catch (err) {
      console.warn("Telemetry mic stream blocked:", err);
    }
  }, []);

  const stopMicVolumeStream = useCallback(() => {
    if (micCleanupRef.current) {
      micCleanupRef.current();
      micCleanupRef.current = null;
    }
    setMicVolume(0);
  }, []);

  useEffect(() => {
    handsFreeRef.current = handsFree;
    if (handsFree && micSupported && !isListening && !isSpeakingRef.current && recognitionRef.current) {
      try {
        recognitionRef.current.start();
        startMicVolumeStream();
      } catch (e) {
        console.warn("Hands-free auto-start failed:", e);
      }
    } else if (!handsFree && !isListening) {
      setTimeout(() => stopMicVolumeStream(), 0);
    }
  }, [handsFree, isListening, micSupported, startMicVolumeStream, stopMicVolumeStream]);

  // Initialize clock
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString());
      setDateStr(d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Monitor user preference for reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Write a system log
  const addLog = useCallback((text, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { timestamp, text, type }]);
  }, []);

  // Tool executor: maps a tool call to actual app behavior, returns a short string result
  const executeToolCall = useCallback((name, args) => {
    switch (name) {
      case 'search_web': {
        const engine = args.engine === 'youtube' ? 'youtube' : 'google';
        const query = (args.query || '').trim();
        if (!query) {
          window.open(engine === 'youtube' ? 'https://www.youtube.com' : 'https://www.google.com', '_blank');
          addLog(`Opening ${engine === 'youtube' ? 'YouTube' : 'Google'}, Sir.`, "success");
          return `Opened ${engine} homepage.`;
        }
        const url = engine === 'youtube'
          ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}` 
          : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        window.open(url, '_blank');
        addLog(`Searching ${engine === 'youtube' ? 'YouTube' : 'Google'} for "${query}"`, "success");
        return `Opened ${engine} search for "${query}".`;
      }
      case 'draft_email': {
        const recipient = (args.recipient || '').trim();
        const subject = (args.subject || '').trim();
        const body = (args.body || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
          addLog("I need a valid recipient email address before creating the draft.", "warning");
          return "A valid recipient email address is required. No draft was opened.";
        }
        const composeUrl = `https://mail.google.com/mail/u/0/?view=cm&fs=1&tf=1&to=${encodeURIComponent(recipient)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(composeUrl, '_blank', 'noopener,noreferrer');
        addLog(`Gmail draft opened for ${recipient}. Nothing was sent.`, "success");
        return `Email draft opened for ${recipient}. It has not been sent.`;
      }
      case 'open_whatsapp': {
        const phone = (args.phone || '').replace(/[^\d+]/g, '');
        if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) {
          addLog("Use an international WhatsApp number beginning with + and country code.", "warning");
          return "I need a valid international phone number. No WhatsApp chat was opened.";
        }
        const url = phone ? `https://wa.me/${phone.slice(1)}` : 'https://web.whatsapp.com/';
        window.open(url, '_blank', 'noopener,noreferrer');
        addLog(phone ? `WhatsApp chat opened for ${phone}. Nothing was sent.` : "WhatsApp Web opened. Nothing was sent.", "success");
        return phone ? `WhatsApp chat opened for ${phone}.` : "WhatsApp Web opened.";
      }
      case 'set_theme': {
        const validThemes = ['cyan', 'red', 'gold', 'green'];
        const theme = validThemes.includes(args.theme) ? args.theme : 'cyan';
        setTheme(theme);
        addLog(`Theme changed to ${theme}.`, "success");
        return `Theme set to ${theme}.`;
      }
      case 'trigger_red_alert': {
        setTheme('red');
        setActiveAlertMode('red_alert');
        addLog("Red alert engaged. Lockdown active.", "error");
        return "Red alert engaged.";
      }
      case 'trigger_self_destruct': {
        setActiveAlertMode('self_destruct');
        addLog("Self-destruct sequence engaged.", "error");
        return "Self destruct sequence started.";
      }
      case 'run_diagnostics': {
        addLog("Sweeping core systems...", "warning");
        setTimeout(() => addLog("Firewall check complete — 0 threats.", "success"), 500);
        setTimeout(() => addLog("Reactor integrity — 99.8% stable.", "success"), 1000);
        setTimeout(() => addLog("Memory leaks — 0.00%.", "success"), 1500);
        setTimeout(() => addLog("Telemetry links balanced.", "success"), 2000);
        return "Diagnostics complete, all systems nominal.";
      }
      case 'clear_logs': {
        setLogs([]);
        return "Logs cleared.";
      }
      default:
        return "Unknown command.";
    }
  }, [addLog, setTheme, setActiveAlertMode, setLogs]);

  // Trigger boot sequence logs on mount
  useEffect(() => {
    const bootLogs = [
      { text: "Boot sequence started.", type: "info", delay: 0 },
      { text: "Loading neural pathways...", type: "info", delay: 600 },
      { text: "Voice synthesis library synced.", type: "success", delay: 1200 },
      { text: "Core calibrated at 1.21 gigawatts.", type: "success", delay: 1800 },
      { text: "Standing by for a voice directive, Sir.", type: "success", delay: 2400 }
    ];

    const bootTimeoutIds = bootLogs.map(log => setTimeout(() => addLog(log.text, log.type), log.delay));

    // Check speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      const SILENCE_MS = 1400; // real pause before we treat the sentence as finished

      rec.onstart = () => {
        finalTranscriptRef.current = '';
        setIsListening(true);
        setReactorState('listening');
        setMicError(null);
        addLog("Listening...", "info");
      };

      rec.onresult = (event) => {
        let finalChunk = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript;
          }
        }
        if (finalChunk) {
          finalTranscriptRef.current += finalChunk;
        }

        // Any speech — interim or final — resets the "are they done talking" clock.
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          try { recognitionRef.current?.stop(); } catch {}
        }, SILENCE_MS);
      };

      rec.onerror = (event) => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        setIsListening(false);
        setReactorState('idle');
        setMicError(event.error);
        addLog(`Speech recognition error: ${event.error}`, "error");
        playError();
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setHandsFree(false);
          addLog("Hands-free mode disabled — mic access blocked.", "warning");
        }
      };

      rec.onend = () => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        const completeText = finalTranscriptRef.current.trim();
        finalTranscriptRef.current = '';

        if (completeText) {
          const resultText = correctEntities(completeText);
          addLog(`Heard: "${resultText}"`, "user");
          handleDirectiveRef.current?.(resultText);
        }

        if (handsFreeRef.current && !isSpeakingRef.current) {
          setTimeout(() => {
            try {
              if (handsFreeRef.current && !isSpeakingRef.current) {
                recognitionRef.current.start();
              }
            } catch (e) {
              console.warn("Failed to restart hands-free listening loop:", e);
              setIsListening(false);
              setReactorState('idle');
            }
          }, 350);
        } else {
          setIsListening(false);
          setReactorState('idle');
        }
      };

      recognitionRef.current = rec;
    } else {
      setTimeout(() => addLog("Speech recognition isn't supported in this browser.", "warning"), 100);
    }

    // Load synth voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);

      const preferred = availableVoices.find(v =>
        v.name.toLowerCase().includes('google uk english male') ||
        v.name.toLowerCase().includes('uk english male') ||
        v.name.toLowerCase().includes('daniel') ||
        v.lang.toLowerCase().includes('en-gb')
      ) || availableVoices[0];

      setSelectedVoice(preferred);
    };

    if ('speechSynthesis' in window) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      bootTimeoutIds.forEach(id => clearTimeout(id));
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      stopMicVolumeStream();
    };
  }, [addLog, stopMicVolumeStream, correctEntities]);

  // Text-To-Speech Speak Helper
  const speak = useCallback((text) => {
    if (!('speechSynthesis' in window) || !text) return;

    const spokenText = sanitizeForSpeech(text);
    if (!spokenText) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spokenText);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = voiceRate;
    utterance.pitch = voicePitch;

    utterance.onstart = () => {
      isSpeakingRef.current = true;
      setReactorState('speaking');
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
    utterance.onend = () => {
      isSpeakingRef.current = false;
      setReactorState('idle');
      if (handsFreeRef.current && recognitionRef.current) {
        setTimeout(() => {
          try {
            if (handsFreeRef.current && !isSpeakingRef.current) {
              recognitionRef.current.start();
            }
          } catch (e) {
            console.warn("Failed to restart hands-free listening:", e);
          }
        }, 350);
      }
    };
    utterance.onerror = () => {
      isSpeakingRef.current = false;
      setReactorState('idle');
      if (handsFreeRef.current && recognitionRef.current) {
        setTimeout(() => {
          try {
            if (handsFreeRef.current && !isSpeakingRef.current) {
              recognitionRef.current.start();
            }
          } catch {}
        }, 350);
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [selectedVoice, voiceRate, voicePitch]);

  // Activate / stop listening
  const handleMicToggle = useCallback(() => {
    if (!micSupported) {
      addLog("Mic isn't available. Use text input instead.", "error");
      playError();
      return;
    }

    if (isListening) {
      if (handsFreeRef.current) {
        setHandsFree(false);
      }
      recognitionRef.current.stop();
    } else {
      window.speechSynthesis.cancel();
      try {
        recognitionRef.current.start();
      } catch {
        addLog("Couldn't access the mic. Check browser permissions.", "error");
        playError();
      }
    }
  }, [micSupported, isListening, addLog, setHandsFree]);

  // Listen to spacebar for voice activate
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' &&
          document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'SELECT' &&
          document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        handleMicToggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMicToggle]);

  useEffect(() => {
    const handleButtonPress = (event) => {
      if (event.target.closest('button') && !event.target.closest('button').disabled) {
        playClick();
      }
    };
    document.addEventListener('click', handleButtonPress);
    return () => document.removeEventListener('click', handleButtonPress);
  }, []);

  // Conversational response mappings
  const offlineConversations = useMemo(() => ({
    "hello": "Hello Sir. System online.",
    "hi": "Hello Sir. Standing by.",
    "how are you": "Operating at maximum calibration efficiency, Sir.",
    "who are you": "I am JARVIS, your intelligent assistant.",
    "good morning": "Good morning, Sir. Reactor core thermal stability is optimal.",
    "good night": "Good night, Sir. I'll keep watch.",
    "thank you": "My pleasure. Anything else, Sir?",
    "who created you": "You built me in your lab, Sir.",
    "make me a sandwich": "My actuators are offline. I'd suggest ordering out.",
    "play music": "Engaging audio synthesis.",
    "stop music": "Muting synthesizer loops."
  }), []);

  // Command handler
  const handleDirective = useCallback(async (inputStr) => {
    const query = inputStr.toLowerCase().trim();

    if (query === 'clear' || query === 'clear logs') {
      setLogs([]);
      return;
    }

    if (query === 'open email' || query === 'open mail' || query === 'compose email') {
      window.open('https://mail.google.com/mail/u/0/#inbox', '_blank', 'noopener,noreferrer');
      addLog("Gmail inbox opened.", "success");
      speak("Your Gmail inbox is open.");
      return;
    }

    if (query === 'open whatsapp' || query === 'open whats app' || query === 'whatsapp') {
      executeToolCall('open_whatsapp', {});
      speak("WhatsApp Web is open. I will not send anything.");
      return;
    }

    const whatsappMatch = inputStr.match(/(?:open|message|chat|whatsapp)\s+(?:a\s+)?(?:whatsapp\s+)?(?:chat\s+)?(?:with\s+)?(\+?[\d\s().-]{8,})$/i);
    if (whatsappMatch) {
      const phone = whatsappMatch[1].replace(/[\s().-]/g, '');
      const result = executeToolCall('open_whatsapp', { phone });
      speak(result);
      return;
    }

    if (/(?:search|find|open)\s+(?:my\s+)?whatsapp\s+contact/i.test(inputStr)) {
      executeToolCall('open_whatsapp', {});
      const message = "WhatsApp Web is open. Please use its contact search for the person's name; I will not send anything.";
      addLog(message, "info");
      speak(message);
      return;
    }

    if (query === 'help' || query === 'list commands') {
      addLog("Available commands:", "success");
      addLog("• 'system status' or 'diagnostics' — run a system check", "info");
      addLog("• 'red alert' — engage warning mode", "info");
      addLog("• 'self destruct' — trigger countdown", "info");
      addLog("• 'classic mode', 'stealth mode', 'red alert theme' — switch theme", "info");
      addLog("• 'clear logs' — clear the activity log", "info");
      addLog("• 'search for [query]' — open a Google search", "info");
      addLog("• 'youtube [query]' — open a YouTube search", "info");
      addLog("• 'open google' or 'open youtube' — open the site", "info");
      addLog("• 'draft email to name@example.com subject ... body ...' — open an unsent email draft", "info");
      speak("Command list displayed on screen, Sir.");
      return;
    }

    const emailMatch = inputStr.match(/(?:draft|write|compose|create)\s+(?:an?\s+)?email\s+to\s+([^\s]+)(?:\s+subject\s*[:=-]?\s*(.*?))?(?:\s+body\s*[:=-]?\s*(.*))?$/i);
    if (emailMatch) {
      const [, recipient, subject = '', body = ''] = emailMatch;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
        const message = "Please provide the recipient's email address so I can open the draft safely.";
        addLog(message, "warning");
        speak(message);
        return;
      }
      executeToolCall('draft_email', { recipient, subject, body });
      speak("The email draft is open and ready for your review. I did not send it.");
      return;
    }

    if (query === 'diagnostics' || query === 'system status' || query === 'status') {
      speak("Running diagnostics. Sweeping local servers.");
      addLog("Sweeping core systems...", "warning");
      setTimeout(() => addLog("Firewall check complete — 0 threats.", "success"), 500);
      setTimeout(() => addLog("Reactor integrity — 99.8% stable.", "success"), 1000);
      setTimeout(() => addLog("Memory leaks — 0.00%.", "success"), 1500);
      setTimeout(() => addLog("Telemetry links balanced.", "success"), 2000);
      return;
    }

    if (query === 'classic mode' || query === 'standard mode' || query === 'classic theme') {
      setTheme('cyan');
      addLog("Theme changed to Cyan.", "success");
      speak("Standard colors applied, Sir.");
      return;
    }
    if (query === 'stealth mode' || query === 'stealth theme') {
      setTheme('green');
      addLog("Theme changed to Stealth Green.", "success");
      speak("Stealth configuration active.");
      return;
    }
    if (query === 'hulkbuster mode' || query === 'gold theme' || query === 'gold titan') {
      setTheme('gold');
      addLog("Theme changed to Gold.", "success");
      speak("Armor core interface updated.");
      return;
    }
    if (query === 'red alert' || query === 'red alert theme' || query === 'activate hulkbuster' || query === 'alarm') {
      setTheme('red');
      setActiveAlertMode('red_alert');
      addLog("Red alert engaged. Lockdown active.", "error");
      speak("Red Alert protocol authorized, Sir.");
      return;
    }

    if (query === 'self destruct' || query === 'destroy system') {
      setActiveAlertMode('self_destruct');
      addLog("Self-destruct sequence engaged.", "error");
      speak("Self destruct sequence authorized. T minus ten seconds.");
      return;
    }

    let foundOfflineReply = null;
    for (const key in offlineConversations) {
      const pattern = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (pattern.test(query)) {
        foundOfflineReply = offlineConversations[key];
        break;
      }
    }

    if (foundOfflineReply) {
      addLog(`JARVIS: ${foundOfflineReply}`, "jarvis");
      speak(foundOfflineReply);
      return;
    }

    if (groqKey) {
      addLog("Sending prompt to Groq...", "info");
      try {
        const result = await askGroq(inputStr, groqKey, groqModel, conversationHistory);

        if (result.type === 'tool_calls') {
          const toolResults = result.toolCalls.map(tc => ({
            id: tc.id,
            name: tc.name,
            result: executeToolCall(tc.name, tc.args)
          }));

          const followupText = await askGroqToolFollowup(
            groqKey, groqModel, conversationHistory, result.assistantMessage, toolResults
          );

          addLog(`JARVIS: ${followupText}`, "jarvis");
          speak(followupText);

          setConversationHistory(prev => {
            const next = [...prev,
              { role: "user", content: inputStr },
              result.assistantMessage,
              ...toolResults.map(tr => ({ role: "tool", tool_call_id: tr.id, name: tr.name, content: tr.result })),
              { role: "assistant", content: followupText }
            ];
            return next.slice(-MAX_HISTORY_TURNS * 2);
          });
        } else {
          addLog(`JARVIS: ${result.text}`, "jarvis");
          speak(result.text);
          setConversationHistory(prev => {
            const next = [...prev,
              { role: "user", content: inputStr },
              { role: "assistant", content: result.text }
            ];
            return next.slice(-MAX_HISTORY_TURNS * 2);
          });
        }
      } catch (err) {
        addLog(`Uplink error: ${err.message}`, "error");
        speak("Apologies Sir, I hit a communication error with the neural network.");
        playError();
      }
    } else {
      const encodedQuery = encodeURIComponent(inputStr);
      window.open(`https://www.google.com/search?q=${encodedQuery}`, '_blank');
      addLog(`Searching Google for "${inputStr}"`, "success");
      speak(`Searching Google for ${inputStr}, Sir.`);
    }
  }, [groqKey, groqModel, offlineConversations, speak, addLog, setTheme, setActiveAlertMode, setLogs, executeToolCall, conversationHistory]);

  useEffect(() => {
    handleDirectiveRef.current = handleDirective;
  }, [handleDirective]);

  const handleAbortAlerts = () => {
    stopAlarm();
    setActiveAlertMode(null);
    setTheme('cyan');
    addLog("System secured. Theme reset to default.", "success");
    speak("Danger cleared. System has been stabilized.");
  };

  return (
    <div className={`app-shell theme-${theme}`} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      <AlertOverlay
        activeMode={activeAlertMode}
        onAbort={handleAbortAlerts}
        prefersReducedMotion={prefersReducedMotion}
      />

      {/* Header */}
      <header
        className="app-header"
        style={{
          borderBottom: '1px solid var(--border)',
          padding: '16px 28px',
          background: 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          zIndex: 900,
          boxShadow: '0 4px 24px rgba(34, 43, 56, 0.1)'
        }}
      >
        <div className="brand-lockup" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="brand-mark"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: 'var(--accent-soft)',
              border: '1px solid var(--accent-line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Sparkles size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="brand-copy">
            <h1 style={{ fontSize: '0.95rem', fontWeight: '700', letterSpacing: '-0.01em', color: 'var(--text)' }}>
              Jarvis
            </h1>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>
              Personal systems console
            </span>
          </div>
        </div>

        {/* Status pill */}
        <div
          className="connection-status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.72rem',
            fontWeight: 500,
            background: 'var(--surface-2)',
            padding: '7px 14px',
            border: '1px solid var(--border)',
            borderRadius: '999px',
            color: groqKey ? 'var(--text)' : 'var(--text-muted)'
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: groqKey ? 'var(--success)' : 'var(--text-faint)',
              boxShadow: groqKey ? '0 0 8px var(--success)' : 'none'
            }}
          />
          {groqKey ? 'Connected · Groq' : 'Offline mode'}
        </div>

        {/* Clock */}
        <div className="clock-readout" style={{ textAlign: 'right', minWidth: '150px' }}>
          <div className="hud-mono-val" style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text)' }}>
            {timeStr}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '2px' }}>
            {dateStr}
          </div>
        </div>
      </header>

      {/* Main grid */}
      <main
        className="app-grid"
        style={{
          flex: 1,
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: 'minmax(240px, 0.8fr) minmax(500px, 1.8fr) minmax(280px, 0.9fr)',
          gap: '18px',
          alignItems: 'stretch',
          maxWidth: '1600px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <section className="app-column app-column-left" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="rail-module rail-resources" style={{ flex: 'none' }}>
            <SystemMonitor prefersReducedMotion={prefersReducedMotion} />
          </div>
          <div className="rail-module rail-weather" style={{ flex: 'none' }}>
            <WeatherWidget />
          </div>
        </section>

        <section className="app-column app-column-center" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="center-module" style={{ flex: 'none' }}>
            <ArcReactor
              state={reactorState}
              volume={micVolume}
              onClickMic={handleMicToggle}
              micSupported={micSupported}
              micError={micError}
              prefersReducedMotion={prefersReducedMotion}
              theme={theme}
            />
          </div>
        </section>

        <section className="app-column app-column-right" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="rail-module rail-log" style={{ flex: 'none' }}>
            <Terminal
              logs={logs}
              onSendCommand={handleDirective}
              isOfflineMode={!groqKey}
            />
          </div>
          <div className="rail-module rail-directives" style={{ flex: 'none' }}>
            <Directives />
          </div>
        </section>

        <section className="settings-landscape">
          <Settings
            theme={theme}
            setTheme={setTheme}
            groqKey={groqKey}
            setGroqKey={setGroqKey}
            groqModel={groqModel}
            setGroqModel={setGroqModel}
            voiceRate={voiceRate}
            setVoiceRate={setVoiceRate}
            voicePitch={voicePitch}
            setVoicePitch={voicePitch}
            selectedVoice={selectedVoice}
            setSelectedVoice={setSelectedVoice}
            voices={voices}
            isOfflineMode={!groqKey}
            handsFree={handsFree}
            setHandsFree={setHandsFree}
          />
        </section>
      </main>
    </div>
  );
}
