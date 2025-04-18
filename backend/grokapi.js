import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { Groq } from "groq-sdk";

dotenv.config();

const app = express();
app.use(express.json());

// ✅ Allow only specific origins
const allowedOrigins = [
  "http://127.0.0.1:5500", // Local frontend
  "https://creative.exponential.com",
  "https://chatagentgroq-production.up.railway.app", // Ensure the deployed domain is allowed
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "OPTIONS"], // ✅ Ensure OPTIONS is allowed
    allowedHeaders: ["Content-Type", "Authorization"], // ✅ Allow necessary headers
    credentials: true,
  })
);

// ✅ Handle preflight requests explicitly
app.options("*", cors());

// ✅ Initialize OpenAI (for embeddings)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ Initialize Groq (for text generation)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ✅ Initialize Pinecone
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

const INDEX_NAME = "dc-api-docs";
const EMBEDDING_MODEL = "text-embedding-ada-002";
const LLM_MODEL = "llama3-8b-8192"; // Groq model
const DEFAULT_QUERY = "Tell me about hybrid gallery limitation";

// ✅ Convert query to embedding using OpenAI
const getEmbedding = async (text) => {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });
    return response.data[0].embedding; // Returns a valid numerical array
  } catch (error) {
    console.error("❌ Error generating embedding:", error);
    return null;
  }
};

// ✅ Search Pinecone for relevant results
const queryPinecone = async (queryEmbedding) => {
  try {
    const index = pinecone.index(INDEX_NAME);
    console.log("🔍 Querying Pinecone with embedding:", queryEmbedding);

    const response = await index.query({
      topK: 5,
      vector: queryEmbedding,
      includeValues: false,
      includeMetadata: true,
    });

    console.log("🟢 Pinecone response:", response);

    return response.matches.map((match) => match.metadata.text);
  } catch (error) {
    console.error("❌ Error querying Pinecone:", error);
    return [];
  }
};

// ✅ Refine response using Groq's LLM
const refineResponse = async (query, context) => {
  try {
    const prompt = `You are an AI assistant that answers queries based on the given context.\n\nQuery: ${query}\n\nContext:\n${context.join("\n")}\n\nProvide a well-structured and concise answer.`;

    console.log("data for Groq:::: ======================================\n"+prompt+"\n:::==========================================\n\n")

    const response = await groq.chat.completions.create({
      model: LLM_MODEL, // Groq's LLM
      messages: [{ role: "system", content: prompt }],
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("❌ Error refining response:", error);
    return "Error generating a refined response.";
  }
};

// ✅ API endpoint for querying
app.post("/ask", async (req, res) => {
  const query = req.body.question || req.body.query || DEFAULT_QUERY;
  console.log(`🔍 Searching for: "${query}"`);

  const queryEmbedding = await getEmbedding(query);
  if (!queryEmbedding) {
    return res.status(500).json({ error: "Failed to generate query embedding." });
  }

  const results = await queryPinecone(queryEmbedding);
  if (results.length === 0) {
    return res.json({ message: "No relevant results found." });
  }

  const refinedAnswer = await refineResponse(query, results);
  res.json({ query, refinedAnswer });
});

// ✅ Start Express server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`); 
});
