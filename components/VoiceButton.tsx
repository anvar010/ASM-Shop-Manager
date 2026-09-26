"use client";

import { useEffect, useRef, useState } from "react";
import { parseSpeech, type Heard } from "@/lib/voice";

/* The browser's own recognizer. Chrome, Edge and Safari have it; Firefox does
   not, and there the button simply is not shown. */
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const PROBLEMS: Record<string, string> = {
  "not-allowed": "Allow the microphone to use voice entry.",
  "service-not-allowed": "Allow the microphone to use voice entry.",
  "no-speech": "Nothing was heard. Try again.",
  network: "Voice entry needs an internet connection.",
};

/**
 * A microphone that listens in Malayalam and hands back an amount and some
 * words. What to do with them is the form's business.
 */
export default function VoiceButton({
  onHeard,
  className,
}: {
  onHeard: (heard: Heard) => void;
  className?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState("");
  const rec = useRef<Recognition | null>(null);

  useEffect(() => {
    setSupported(ctor() !== null);
    return () => rec.current?.stop();
  }, []);

  if (!supported) return null;

  function toggle() {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const Ctor = ctor();
    if (!Ctor) return;

    const r = new Ctor();
    r.lang = "ml-IN";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      const heard = parseSpeech(transcript);
      if (!heard.text && !heard.amount) {
        setNote("Nothing was heard. Try again.");
        return;
      }
      setNote(heard.amount ? "" : "No amount heard — type it in.");
      onHeard(heard);
    };
    r.onerror = (e) => setNote(PROBLEMS[e.error] ?? "Voice entry did not work. Try again.");
    r.onend = () => setListening(false);

    setNote("");
    try {
      r.start();
      rec.current = r;
      setListening(true);
    } catch {
      setNote("Voice entry did not work. Try again.");
    }
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={toggle}
        aria-pressed={listening}
        aria-label={listening ? "Stop listening" : "Speak the entry in Malayalam"}
        title={listening ? "Listening… tap to stop" : "Speak in Malayalam"}
        style={
          listening
            ? { background: "var(--danger-bg)", color: "var(--danger)", borderColor: "var(--danger)" }
            : undefined
        }
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
      </button>
      {note && (
        <div role="status" style={{ flexBasis: "100%", fontSize: 11, color: "var(--text-faint)", fontWeight: 600 }}>
          {note}
        </div>
      )}
    </>
  );
}
