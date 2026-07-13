"use client";

import { useCallback, useRef, useState } from "react";

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

interface UseAudioCaptureOptions {
  onChunk: (base64: string, mimeType: string) => void;
  onError?: (message: string) => void;
}

export function useAudioCapture({ onChunk, onError }: UseAudioCaptureOptions) {
  const [capturing, setCapturing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mimeTypeRef = useRef("audio/webm");

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
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      mimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          const base64 = await blobToBase64(event.data);
          onChunk(base64, mimeType.split(";")[0]);
        }
      };

      recorder.start(5000);
      setCapturing(true);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "音声キャプチャの開始に失敗しました");
    }
  }, [onChunk, onError]);

  const stopCapture = useCallback(() => {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    streamRef.current = null;
    setCapturing(false);
  }, []);

  return { capturing, startCapture, stopCapture };
}
