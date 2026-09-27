import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Octokit } from "@octokit/rest";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper function to handle temporary 503 service spikes with retries
async function generateContent(model, params, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent({ model, ...params });
    } catch (err) {
      const is503 = err.status === 503 || err.message?.includes("503") || err.message?.includes("UNAVAILABLE");
      if (is503 && i < retries - 1) {
        console.warn(`[Gemini] Server busy (503). Retrying in ${delay / 1000}s... (Attempt ${i + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw err;
      }
    }
  }
}

app.post("/api/review", async (req, res) => {
  try {
    const { owner, repo, pullNumber } = req.body;

    if (!owner || !repo || !pullNumber) {
      return res.status(400).json({ error: "Missing required fields: owner, repo, pullNumber" });
    }

    // 1. Fetch the diff from GitHub
    const { data: diff } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: Number(pullNumber),
      mediaType: { format: "diff" },
    });

    if (!diff || typeof diff !== "string") {
      return res.status(400).json({ error: "No diff content found for this PR." });
    }

    // 2. Structured prompt
    const prompt = `
You are a senior code reviewer. Analyze the following git diff and return a JSON object with these exact keys: "bugs", "styleViolations", "securityIssues", "optimizations".
Each key must contain an array of objects structured as: {"file": string, "line": string, "description": string, "severity": "low" | "medium" | "high"}.

Git Diff:
${diff.slice(0, 25000)}
    `;

    const result = await generateContent("gemini-3.8-flash", {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const structuredFeedback = JSON.parse(result.text);

    res.json({ feedback: structuredFeedback });
  } catch (err) {
    console.error("Error generating PR review:", err);

    if (err.status === 503 || err.message?.includes("UNAVAILABLE")) {
      return res.status(503).json({
        error: "Gemini AI is currently under high traffic. Please try again in a few seconds.",
      });
    }

    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));