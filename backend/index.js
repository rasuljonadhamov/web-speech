import http from "http";
import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK");
});

const wss = new WebSocketServer({ server });

function mockTranslation(text, target) {
  // TODO: Implement actual translation logic
  return `${text} (translated to ${target})`; // For now, return the original text with a note
}

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (message) => {
    try {
      const payload = JSON.parse(message.toString());
      const { id, type, text, target } = payload;

      const translatedText = mockTranslation(text, target);

      const response = {
        type: "translation",
        id,
        text: translatedText,
      };

      ws.send(JSON.stringify(response));
    } catch (error) {
      return ws.send(JSON.stringify({ error: "Invalid message format" }));
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
