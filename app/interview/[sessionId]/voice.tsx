"use client";
import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { speechMetrics } from "@/lib/speech-metrics";
export function VoiceInput({
  user,
  onTranscript,
  disabled,
}: {
  user: User;
  onTranscript: (text: string, duration: number) => void;
  disabled: boolean;
}) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(0);
  const [recording, setRecording] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [metrics, setMetrics] = useState<ReturnType<
    typeof speechMetrics
  > | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current && recorder.current.state !== "inactive") {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  async function start() {
    setMessage("");
    setMetrics(null);
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "Recording is unavailable in this browser. Use text instead.",
        );
      const type = ["audio/webm", "audio/ogg"].find((x) =>
        MediaRecorder.isTypeSupported(x),
      );
      if (!type)
        throw new Error(
          "This browser does not support a compatible recording format. Use text instead.",
        );
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const rec = new MediaRecorder(stream.current, { mimeType: type });
      recorder.current = rec;
      const chunks: Blob[] = [];
      started.current = Date.now();
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onerror = () =>
        setMessage("Recording failed. Please use text instead.");
      rec.onstop = async () => {
        if (timer.current) clearTimeout(timer.current);
        stream.current?.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setWorking(true);
        const duration = Math.max(1, (Date.now() - started.current) / 1000);
        try {
          const blob = new Blob(chunks, { type });
          if (blob.size > 5 * 1024 * 1024)
            throw new Error("Recording is too large. Please use text.");
          const token = await user.getIdToken();
          const response = await fetch("/api/transcribe", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": type },
            body: blob,
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          if (!result.text?.trim())
            throw new Error(
              "No speech was detected. Please try again or use text.",
            );
          onTranscript(result.text, duration);
          setMetrics(speechMetrics(result.text, duration));
          setMessage(
            "Transcript added to your answer. You can review and edit it.",
          );
        } catch (err) {
          setMessage(
            err instanceof Error
              ? err.message
              : "Transcription failed. Please use text.",
          );
        } finally {
          setWorking(false);
        }
      };
      rec.start();
      setRecording(true);
      timer.current = setTimeout(() => {
        if (rec.state === "recording") rec.stop();
      }, 120000);
    } catch (err) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setMessage(
        err instanceof Error
          ? err.message
          : "Microphone unavailable. Please use text.",
      );
    }
  }
  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }
  return (
    <div style={{ marginTop: 18 }}>
      <button
        type="button"
        className="button button-secondary"
        disabled={disabled || working}
        onClick={() => (recording ? stop() : void start())}
      >
        {working
          ? "Transcribing…"
          : recording
            ? "Stop recording"
            : "Record voice answer"}
      </button>
      <p className="form-hint">
        Optional · Up to 2 minutes · Text always works.
      </p>
      {message && (
        <p role="status" className="form-hint">
          {message}
        </p>
      )}
      {metrics && (
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
          <p>
            Pace: {metrics.wordsPerMinute ?? "—"} words/min · Fillers:{" "}
            {metrics.fillers} ({metrics.fillerRate ?? "—"}/min) · Avg sentence:{" "}
            {metrics.avgWordsPerSentence} words
          </p>
          <p className="form-hint">{metrics.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
