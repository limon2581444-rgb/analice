export interface AnalysisResult {
  prediction: 'UP' | 'DOWN' | 'NEUTRAL';
  confidence: number;
  explanation: string;
  patterns: string[];
  entryTarget?: string;
}

export async function analyzeChartImage(base64Image: string, mimeType: string, userContext?: string): Promise<AnalysisResult> {
  // Check if a client-side API key is available
  const clientApiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;

  try {
    // 1. Try to use the standard server endpoint first
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        mimeType,
        userContext,
      }),
    });

    const responseText = await response.text();

    if (response.ok) {
      try {
        return JSON.parse(responseText) as AnalysisResult;
      } catch (e: any) {
        // If server succeeds but returns malformed JSON, try direct client fallback if we have a key
        if (clientApiKey) {
          console.warn("Server returned invalid JSON. Falling back to direct client-side Gemini analysis...");
          return await analyzeDirectlyOnClient(base64Image, mimeType, clientApiKey, userContext);
        }
        throw new Error(`Invalid JSON format returned by analysis server: ${responseText.substring(0, 150)}...`);
      }
    }

    // 2. If server endpoint is not found (404) or failed, and we have a Vercel-configured client-side key, fallback to direct client-side Gemini call!
    if ((response.status === 404 || responseText.includes("<!DOCTYPE html>") || responseText.includes("The page c") || !response.ok) && clientApiKey) {
      console.log("Server API not available. Utilizing direct browser-to-Gemini connection with VITE_GEMINI_API_KEY.");
      return await analyzeDirectlyOnClient(base64Image, mimeType, clientApiKey, userContext);
    }

    // Otherwise, propagate the server error
    let errorMessage = 'Failed to analyze chart';
    try {
      const errorData = JSON.parse(responseText);
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = `Server Error (${response.status}): ${responseText.substring(0, 150)}`;
    }
    throw new Error(errorMessage);

  } catch (error: any) {
    // 3. Catch all network errors (e.g., offline or backend server down), and try direct call as a last resort
    if (clientApiKey) {
      console.log("Network error encountered. Trying direct client-side fallback...");
      try {
        return await analyzeDirectlyOnClient(base64Image, mimeType, clientApiKey, userContext);
      } catch (clientErr: any) {
        throw new Error(`Both Server and Gemini client fallback failed. Error: ${clientErr.message}`);
      }
    }
    console.error("Analysis Error:", error);
    throw error;
  }
}

/**
 * Perform Gemini image analysis directly in the browser. 
 * This is highly useful when deployed to serverless environments like Vercel with no active Express server.
 */
async function analyzeDirectlyOnClient(image: string, mimeType: string, apiKey: string, userContext?: string): Promise<AnalysisResult> {
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
    7. ACCURACY & LOSS PREVENTION: To prevent users from losing trades, you must be extremely conservative. Unless you see an exceptionally strong, clean, and 90%+ reliable trend reversal or continuation pattern, default to "NEUTRAL" and advise standing aside. Boldly state that the user must NEVER enter on a running candle, and must wait for the actual candle close to avoid false breakouts.
    
    CRITICAL INSTRUCTION FOR THE EXPLANATION:
    Your "explanation" field in the JSON should contain only high-quality, professional technical reasoning in Bengali, focusing on the chart patterns, support/resistance, indicators, and breakout strategy.
    Do NOT write any introductory sentences that repeat the predicted direction (e.g., do NOT start with "পরবর্তী ক্যান্ডেল সিগন্যাল:"), confidence level, or duplicate closing targets. Dive straight into analyzing the candlestick formations, market psychology, and specific market observation details.


    SPEED & CONCISENESS REQUIREMENT:
    Write the "explanation" inside the JSON in maximum 2-3 short, clean, professional sentences (under 50 Bengali words). Focus strictly on the core technical observations and patterns without any conversational greetings or verbose filler text. Keep the "entryTarget" extremely brief (under 1 short sentence). This conciseness is critical to ensure the response is generated and delivered in under 4 seconds!

    CRITICAL: Respond ONLY in valid JSON format with the following structure:
    {
      "prediction": "UP" | "DOWN" | "NEUTRAL",
      "confidence": number (0 to 100),
      "explanation": "Detailed technical reasoning in Bengali (Bangla)",
      "entryTarget": "কত প্রাইসে বা কীভাবে ক্যান্ডেলটি ক্লোজ হলে পরবর্তী ট্রেড নেওয়া যাবে তার একদম স্পষ্ট, বড় এবং নির্দিষ্ট বাংলা নির্দেশনা (যেমন: 'অবশ্যই ক্যান্ডেল জোরালোভাবে ০.৪৭৭৯৮ উপরে ক্লোজ দেওয়ার পর তবেই এন্ট্রি বসাবেন')",
      "patterns": ["Pattern Name 1", "Pattern Name 2"]
    }

    The explanation must be professional, tech-focused, and exclusively in Bengali. Be extremely honest—if the market is volatile or unpredictable, use NEUTRAL.
  `;

  const modelsToTry = [
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite"
  ];
  
  let text = "";
  let lastError = null;
  const base64Data = image.split(',')[1] || image;

  for (const modelName of modelsToTry) {
    try {
      console.log(`Direct Client: Attempting analysis with model: ${modelName}`);
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
        throw new Error(`Direct call key validation failed on ${modelName}: ${errText}`);
      }

      const responseData = await response.json();
      const partText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!partText) {
        throw new Error(`Invalid response structure from ${modelName}`);
      }

      text = partText;
      console.log(`Direct Client: Successfully analyzed using model: ${modelName}`);
      break;
    } catch (err: any) {
      console.error(`Direct Client: attempt with ${modelName} failed:`, err.message || err);
      lastError = err;
    }
  }

  if (!text) {
    throw lastError || new Error("All direct browser-to-Gemini fallback models failed.");
  }

  // Clean up JSON if model returns it with markdown blocks
  text = text.replace(/```json\n?/, '').replace(/```\n?/, '').trim();
  
  return JSON.parse(text) as AnalysisResult;
}
