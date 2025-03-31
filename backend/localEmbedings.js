import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
dotenv.config();

// Initialize Pinecone Client
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || "default-index";
const PINECONE_NAMESPACE = process.env.PINECONE_NAMESPACE || "default-namespace";

// Function to check if the Pinecone index exists and get its stats
async function checkIndex() {
  try {
    const index = pinecone.index(PINECONE_INDEX_NAME);
    const stats = await index.describeIndexStats();
    console.log("✅ Pinecone Index Stats:", stats);
    return stats;
  } catch (error) {
    console.error("❌ Pinecone Index Error:", error);
    throw new Error("Pinecone index does not exist or is misconfigured.");
  }
}

// Dummy function to simulate text embedding (Replace with actual embedding model)
async function embedText(text) {
    return new Array(384).fill(0.5); // ✅ Corrected to 384 dimensions

}

// Function to query Pinecone
async function queryPinecone(queryText) {
  try {
    // Ensure the Pinecone index is valid
    const stats = await checkIndex();
    const expectedDimension = stats.dimension;

    const index = pinecone.index(PINECONE_INDEX_NAME);
    const queryEmbedding = await embedText(queryText);

    if (!queryEmbedding) {
      console.error("❌ Failed to generate embedding.");
      return "Error generating embedding.";
    }

    if (queryEmbedding.length !== expectedDimension) {
      console.error("❌ Embedding dimension mismatch!");
      return `Error: Expected vector dimension ${expectedDimension}, but got ${queryEmbedding.length}`;
    }

    // Query Pinecone
    const response = await index.namespace(PINECONE_NAMESPACE).query({
      topK: 3,
      vector: queryEmbedding,
      includeValues: true,
      includeMetadata: true,
    });

    // Handle undefined or empty results
    if (!response || !response.matches || response.matches.length === 0) {
      console.warn("⚠️ No relevant results found in Pinecone.");
      return "No relevant information found.";
    }

    // Extract and return relevant data
    const context = response.matches.map((match) => match.metadata?.text || "").join("\n");
   // console.log("🔍 Pinecone Query Results:", response.matches);
    return context;

  } catch (error) {
    console.error("❌ Error querying Pinecone:", error);
    return "Error querying Pinecone.";
  }
}

// Function to get an answer using Pinecone
async function getAnswer(userQuery) {
  console.log(`🤖 Processing user query: "${userQuery}"`);
  const result = await queryPinecone(userQuery);
  console.log(`✅ Response: ${result}`);
  return result;
}

// Example: Initialize and test
async function init() {
  try {
    const query = "can We  remove/hide specific sizes from the showcase?";
    const answer = await getAnswer(query);
    //console.clear()
    //console.log("💡 Final Answer: ------------------>> ", answer);
  } catch (error) {
    console.error("❌ Initialization Error:", error);
  }
}

init();
