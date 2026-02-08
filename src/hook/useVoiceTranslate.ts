import { useRef, useState } from "react";

type ConnectionStatus = "connected" | "disconnected" | "connecting" | "error";

export const useVoiceTranslate = (params: { targetLang: string }) => {
  // target lang
  const { targetLang } = params;

  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [items, setItems] = useState<any>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // ref
  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChanksRef = useRef<Blob[]>([]);
  const nextIdRef = useRef(1);
  const isStoppingRef = useRef(false);
  const isRecordingRef = useRef(false);

  const connectWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus("connecting");
    const ws = new WebSocket("ws://localhost:8080");
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("connected");
    };

    ws.onclose = () => {
      setConnectionStatus("disconnected");
    };

    ws.onerror = (error) => {
      setConnectionStatus("error");
      setError("WebSocket error occurred");
    };

    ws.onmessage = (event) => {
      console.log("ws message received:", event.data);

      try {
        const message = JSON.parse(event.data);
        console.log("parsed message:", message);

        if (message.type !== "translation") {
          return;
        }

        setItems((prev: any) =>
          prev.map((item: any) =>
            item.id === message.id
              ? { ...item, translation: message.text, status: "done" }
              : item,
          ),
        );
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    };
  };

  const setupRecorder = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    const recorder = new MediaRecorder(stream);

    mediaRecorderRef.current = recorder;
    audioChanksRef.current = [];

    // collect audio
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChanksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(audioChanksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      stream.getTracks().forEach((track) => track.stop());
    };
    // 250ms
    recorder.start(250);
  };

  const getSpeechRecognitionCtor = () => {
    // @ts-ignore
    return window.SpeechRecognition || window.webkitSpeechRecognition;
  };

  const markItemStatus = (id: string, status: "sending" | "done" | "error") => {
    setItems((prev: any) =>
      prev.map((item: any) => (item.id === id ? { ...item, status } : item)),
    );
  };

  const endSendToServer = (text: string) => {
    const id = String(nextIdRef.current++);

    setItems((prev: any) => [{ id, text, status: "sending" }, ...prev]);

    const ws = wsRef.current;

    if (!ws && ws?.readyState !== WebSocket.OPEN) {
      markItemStatus(id, "error");
      setError("WebSocket is not connected");
      return;
    }

    const payload = {
      id,
      type: "translate",
      text,
      target: targetLang,
    };
    console.log(payload);

    ws.send(JSON.stringify(payload));
  };

  const setupSpeechRecognition = () => {
    const speechRecognitionCtor = getSpeechRecognitionCtor();

    // browser support check
    if (!speechRecognitionCtor) {
      setError("Speech recognition is not supported in this browser");
      return null;
    }

    const recognition = new speechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const resoult = event.results[i];
        if (resoult.isFinal) {
          const text = resoult[0].transcript.trim();
          if (text) {
            // sent to socket
            endSendToServer(text);
            console.log("sent to socket", text);
          }
        }
      }
    };

    return recognition;
  };

  const startRecording = async () => {
    setError(null);

    // connecting websocket
    connectWebSocket();

    // clearing audion previous

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    try {
      // setup audio recording
      await setupRecorder();
      // setup speech recognition
      const recognition = setupSpeechRecognition();
      if (!recognition) {
        return;
      }

      recognition.start();
      setIsRecording(true);
      // start speech recognition
    } catch (error) {
      console.error("Failed to revoke object URL:", error);
      setError("Failed to revoke object URL");
    }
  };

  const stopRecording = () => {
    isStoppingRef.current = true;

    setIsRecording(false);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  };

  return {
    error,
    setError,
    connectionStatus,
    setConnectionStatus,
    isRecording,
    setIsRecording,
    startRecording,
    stopRecording,
    items,
  };
};
