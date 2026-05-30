import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import fs from "fs";

// Load dotenv with override enabled
dotenv.config({ override: true });

// Manually parse .env to force-override any environment variables already set in the container
try {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        process.env[key] = value.trim();
      }
    });
  }
} catch (e) {
  console.error("Manual .env parse failed:", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 images
  app.use(express.json({ limit: '10mb' }));

  // API routes
  app.post("/api/analyze", async (req, res) => {
    const { image, mimeType, userContext } = req.body;

    const apiKey = process.env.GEMINI_API_KEY || 
                   process.env.GOOGLE_API_KEY || 
                   process.env.API_KEY || 
                   process.env.GENAI_API_KEY;
    
    if (apiKey) {
      console.log(`[API key resolving] Using key starting with: ${apiKey.substring(0, 12)}... ending with: ${apiKey.slice(-5)} (Length: ${apiKey.length})`);
    } else {
      console.warn("[API key resolving] No API Key detected in process.env");
    }
    
    if (!apiKey) {
      console.error("Missing API Key. Available keys:", Object.keys(process.env).filter(k => k.includes("API") || k.includes("KEY")));
      return res.status(500).json({ 
        error: "GEMINI_API_KEY is missing on the server. Please go to Settings (⚙️ icon at bottom left) -> Environment Variables, and add a Key named 'GEMINI_API_KEY' with your API key value." 
      });
    }

    try {
      const prompt = `
        You are a professional trading chart analyst expert in candlestick patterns and market psychology.
        Analyze this trading chart screenshot and provide a high-probability technical prediction for the direction of the NEXT candle.
        ${userContext ? `The user also provided this additional context/question: "${userContext}"` : ""}
        
        ANALYSIS GUIDELINES:
        1. Identify key candlestick patterns (e.g., Hammer, Engulfing, Doji).
        2. Detect current trend (Uptrend/Downtrend/Sideways).
        3. Look for Support and Resistance levels directly above/below the current price.
        4. Observe RSI, Volume, or EMA indicators if visible.
        5. Include breakout strategy in your Bengali explanation: explain that if the price goes above this candle's top/high, go UP, and if it goes below this candle's bottom/low, go DOWN, indicating that waiting for such confirmations before entering a trade minimizes risk.
        6. CRITICAL ENTRY REQUIREMENT: Identify the current price/level and explicitly state at what exact level or condition the candle needs to close (কত প্রাইসে ক্যান্ডেলটি ক্লোজ হলে পরবর্তী ট্রেড নেওয়া যাবে) to validate the trade direction securely. Mention this closing target level explicitly in Bengali so the user knows exactly where the candle must close to confirm their entry.
        
        CRITICAL PROMPT INSTRUCTION FOR THE EXPLANATION:
        Your "explanation" field in the JSON MUST begin with a prominent sentence stating the next candle's trade direction and the exact confidence percentage in Bengali, matching your "prediction" and "confidence" fields.
        Example of the first sentence:
        - If prediction is "UP" and confidence is 85: "পরবর্তী ক্যান্ডেল সিগন্যাল: UP (সবুজ), নিশ্চয়তা বা শিউরিটি: ৮৫%। ক্যান্ডেল ক্লোজিং টার্গেট: [এখানে নির্দিষ্ট প্রাইস/লেভেল উল্লেখ করুন] এর উপরে ক্লোজ হলে ট্রেড নিন। [বাকি বিশ্লেষণ নিচে দেওয়া হলো...]"
        - If prediction is "DOWN" and confidence is 75: "পরবর্তী ক্যান্ডেল সিগন্যাল: DOWN (লাল), নিশ্চয়তা বা শিউরিটি: ৭৫%। ক্যান্ডেল ক্লোজিং টার্গেট: [এখানে নির্দিষ্ট প্রাইস/লেভেল উল্লেখ করুন] এর নিচে ক্লোজ হলে ট্রেড নিন। [বাকি বিশ্লেষণ নিচে দেওয়া হলো...]"
        - If prediction is "NEUTRAL" and confidence is 50: "পরবর্তী ক্যান্ডেল সিগন্যাল: NEUTRAL (কোনো ট্রেড নিবেন না), নিশ্চয়তা বা শিউরিটি: ৫০%। এই মুহূর্তে সঠিক ক্লোজিং নিশ্চিত নয়। [বাকি বিশ্লেষণ নিচে দেওয়া হলো...]"
        This is highly important for the user. Then write the rest of the detailed technical analysis, highlighting the precise entry trigger prices/conditions.

        CRITICAL: Respond ONLY in valid JSON format with the following structure:
        {
          "prediction": "UP" | "DOWN" | "NEUTRAL",
          "confidence": number (0 to 100),
          "explanation": "Detailed technical reasoning in Bengali (Bangla)",
          "entryTarget": "কত প্রাইসে বা কীভাবে ক্যান্ডেলটি ক্লোজ হলে পরবর্তী ট্রেড নেওয়া যাবে তার একদম স্পষ্ট, বড় এবং নির্দিষ্ট বাংলা নির্দেশনা (যেমন: '০.৪৭৭৯৮ লেভেলের অত্যন্ত জোরালোভাবে উপরে ক্লোজ দিতে হবে')",
          "patterns": ["Pattern Name 1", "Pattern Name 2"]
        }

        The explanation must be professional, tech-focused, and exclusively in Bengali. Be extremely honest—if the market is volatile or unpredictable, use NEUTRAL.
      `;

      const modelsToTry = [
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-flash-latest"
      ];
      let text = "";
      let lastError = null;
      const base64Data = image.split(',')[1] || image;

      for (const modelName of modelsToTry) {
        try {
          console.log(`Attempting analysis via direct REST with model: ${modelName}`);
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    { text: prompt },
                    {
                      inlineData: {
                        data: base64Data,
                        mimeType,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
              }
            })
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`REST key validation failed on ${modelName}: ${errText}`);
          }

          const responseData = await response.json();
          const partText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!partText) {
            throw new Error(`Invalid candidate structure from ${modelName}`);
          }

          text = partText;
          console.log(`Successfully completed analysis using REST model: ${modelName}`);
          break; // Exit loop on successful query
        } catch (err: any) {
          console.error(`REST attempt with ${modelName} failed:`, err.message || err);
          lastError = err;
        }
      }

      if (!text) {
        throw lastError || new Error("All REST API analysis models failed.");
      }

      // Clean up JSON if model returns it with markdown blocks
      text = text.replace(/```json\n?/, '').replace(/```\n?/, '').trim();
      
      const analysisResult = JSON.parse(text);
      res.json(analysisResult);
    } catch (error: any) {
      console.error("Analysis Error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze image" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
