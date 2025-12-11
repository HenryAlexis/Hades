// server/src/deepseekClient.js
import OpenAI from "openai";
import "dotenv/config";

const apiKey = process.env.DEEPSEEK_API_KEY;

if (!apiKey) {
  console.error(
    "[deepseekClient] WARNING: DEEPSEEK_API_KEY is not set in environment variables."
  );
}

export const deepseek = new OpenAI({
  apiKey,
  baseURL: "https://api.deepseek.com" // official base URL
});