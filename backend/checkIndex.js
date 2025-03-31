import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

dotenv.config();

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

async function checkIndex() {
  try {
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
    console.log("Index exists and is accessible:", index);
  } catch (error) {
    console.error("Error accessing Pinecone index:", error);
  }
}

checkIndex();
