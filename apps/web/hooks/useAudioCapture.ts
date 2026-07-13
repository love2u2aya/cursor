"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export interface AudioCaptureState {
  capturing: boolean;
  audioLevel: number;
  isSpeaking: boolean;
  chunksSent: number;
  frequencyData: Uint8Array;
}

interface UseAudioCaptureOptions {
  onChunk: (base64: string, mimeType: string) => void;
  onError?: (message: string) => void;
}

const SPEAK_THRESHOLD = 0.04;

export function useAudioCapture({ onChunk, onError }: UseAudioCaptureOptions) {
  const [capturing, setCapturing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chunksSent, setChunksSent] = useState(0);
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(32));

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mimeTypeRef = useRef("audio/webm");
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const onChunkRef = useRef(onChunk);
  onChunkRef.current = onChunk;

  const stopAnalyser = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    analyserRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    setAudioLevel(0);
    setIsSpeaking(false);
    setFrequencyData(new Uint8Array(32));
  }, []);

  const startAnalyser = useCallback((stream: MediaStream) => {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.75;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const level = sum / (dataArray.length * 255);
      setAudioLevel(level);
      setIsSpeaking(level > SPEAK_THRESHOLD);
      setFrequencyData(new Uint8Array(dataArray));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      stream.getVideoTracks().forEach((track) => track.stop());

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error("音声が共有されていません。Zoomタブ共有時に「タブの音声も共有」を有効にしてください。");
      }

      streamRef.current = new MediaStream(audioTracks);
      startAnalyser(streamRef.current);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      mimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          const base64 = await blobToBase64(event.data);
          onChunkRef.current(base64, mimeType.split(";")[0]);
          setChunksSent((n) => n + 1);
        }
      };

      recorder.start(2000);
      setChunksSent(0);
      setCapturing(true);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "音声キャプチャの開始に失敗しました");
    }
  }, [onError, startAnalyser]);

  const stopCapture = useCallback(() => {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    streamRef.current = null;
    stopAnalyser();
    setCapturing(false);
  }, [stopAnalyser]);

  useEffect(() => () => stopCapture(), [stopCapture]);

  return {
    capturing,
    audioLevel,
    isSpeaking,
    chunksSent,
    frequencyData,
    startCapture,
    stopCapture,
  };
}
