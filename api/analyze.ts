import dotenv from "dotenv";

dotenv.config();

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { image, mimeType, userContext } = req.body || {};

  if (!image) {
    return res.status(400).json({ error: "Image is required" });
  }

  const apiKey = process.env.GEMINI_API_KEY || 
                 process.env.GOOGLE_API_KEY || 
                 process.env.API_KEY || 
                 process.env.GENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is missing on the server. Please check your Vercel Environment Variables and add the key."
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
      
      CRITICAL: Respond ONLY in valid JSON format with the following structure:
      {
        "prediction": "UP" | "DOWN" | "NEUTRAL",
        "confidence": number (0 to 100),
        "explanation": "Detailed technical reasoning in Bengali (Bangla)",
        "patterns": ["Pattern Name 1", "Pattern Name 2"]
      }

      The explanation must be professional, tech-focused, and exclusively in Bengali. Be extremely honest—if the market is volatile or unpredictable, use NEUTRAL.
    `;

    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-3.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-flash-latest"
    ];

    let text = "";
    let lastError = null;
    const base64Data = image.split(',')[1] || image;

    for (const modelName of modelsToTry) {
      try {
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
                      mimeType: mimeType || "image/png",
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
        break; // Exit loop on success
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!text) {
      throw lastError || new Error("All REST API analysis models failed on Vercel handler.");
    }

    // Clean up JSON if model returns it with markdown blocks
    text = text.replace(/```json\n?/, '').replace(/```\n?/, '').trim();
    
    const analysisResult = JSON.parse(text);
    return res.status(200).json(analysisResult);
  } catch (error: any) {
    console.error("Vercel Serverless Analysis Error:", error);
    return res.status(500).json({ error: error.message || "Failed to analyze image" });
  }
}
