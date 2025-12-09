import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import fetch from "node-fetch"; // PENTING untuk mengatasi 502

const app = express();
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("Server OK");
});

const HISTORY_FILE = "history.json";

let history = fs.existsSync(HISTORY_FILE)
  ? JSON.parse(fs.readFileSync(HISTORY_FILE))
  : {};

async function askGPT(message, userId) {
  const apiKey = process.env.OPENAI_KEY;

  const historyMessages = history[userId] || [];

  const messages = [
    ...historyMessages,
    { role: "user", content: message }
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: messages
    })
  });

  const data = await res.json();
  const aiText = data.choices[0].message.content;

  history[userId] = [
    ...messages,
    { role: "assistant", content: aiText }
  ].slice(-40);

  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

  return aiText;
}

app.post("/webhook", async (req, res) => {
  const { userId, text } = req.body;

  const answer = await askGPT(text, userId);

  res.json({ reply: answer });
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Server running...")
);
