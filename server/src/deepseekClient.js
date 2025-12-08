import OpenAI from "openai";
import "dotenv/config";

export const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com" // official base URL
});