import { Groq } from "groq-sdk";
import dotenv from "dotenv";

// Load API key from .env file (recommended)
dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY, // Add your API key in .env
});

async function askGroq() {
  const response = await groq.chat.completions.create({
    model: "llama3-8b-8192",  // Models: "llama3-8b-8192" or "mixtral-8x7b-32768"
    messages: [{ role: "user", content: "What is the capital of India?" }],
  });

  console.log(response.choices[0].message.content);
}

askGroq();
