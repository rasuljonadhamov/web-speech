import { useState } from "react";
import { useVoiceTranslate } from "./hook/useVoiceTranslate";

function App() {
  const [targetLang, setTargetLang] = useState<string>("en");

  const {
    error,
    setError,
    connectionStatus,
    isRecording,
    startRecording,
    stopRecording,
    items,
  } = useVoiceTranslate({
    targetLang,
  });

  return (
    <div className="wrapper">
      <header>
        <h1>Web speech api</h1>
        <div className="select">
          <select
            id="targetLang"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="uz">Uzbek</option>
            <option value="ru">Russian</option>
          </select>
        </div>
      </header>

      <main>
        {error && <div className="error">{error}</div>}
        <div className="status">
          <div>
            <p>Connection status</p>
            <span>{connectionStatus} </span>
          </div>

          <div>
            Recording
            <span>{isRecording ? "Yes" : "No"}</span>
          </div>
        </div>

        <div className="actions-btn">
          <button
            className="start-btn"
            onClick={startRecording}
            disabled={isRecording}
          >
            Start Recording
          </button>
          <button
            className="stop-btn"
            onClick={stopRecording}
            disabled={!isRecording}
          >
            Stop Recording
          </button>
        </div>
      </main>

      <div className="card-grid">
        {items.map((item: any) => (
          <div key={item.id} className="card">
            <div>
              <h3>Original</h3>
              <p>{item.text}</p>
            </div>
            <div>
              <h3>Translated</h3>
              <p>{item.translation}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
