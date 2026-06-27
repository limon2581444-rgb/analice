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
  let finalUserPrompt = userContext || "";
  let extractedPrice: string | null = null;
  
  const priceMatch = finalUserPrompt.match(/\[CURRENT_PRICE_LEVEL:\s*([\d.]+)\s*\]/);
  if (priceMatch) {
    extractedPrice = priceMatch[1];
    finalUserPrompt = finalUserPrompt.replace(/\[CURRENT_PRICE_LEVEL:\s*[\d.]+\s*\]/, "").trim();
  }

  const prompt = `
    You are a professional trading chart analyst expert in candlestick patterns and market psychology.
    Analyze this trading chart screenshot and provide a high-probability technical prediction for the direction of the NEXT candle.
    ${finalUserPrompt ? `The user also provided this additional context/question: "${finalUserPrompt}"` : ""}
    ${extractedPrice ? `The user explicitly confirmed that the CURRENT LIVE PRICE shown in this screenshot is "${extractedPrice}". You MUST formulate all your analyses, support/resistance breakouts, and UP/DOWN triggers precisely based on this exact live price level ("${extractedPrice}"). Do not misread, ignore, or hallucinate this number.` : ""}
    
    ANALYSIS GUIDELINES:
    1. Identify key candlestick patterns (e.g., Hammer, Engulfing, Doji).
    2. Detect current trend (Uptrend/Downtrend/Sideways).
    3. DETECT THE LIVE ROUND NUMBER / MOVING PRICE VALUE: Locate the current fluctuating price level shown on the chart, usually enclosed in a solid colored highlighted badge/rectangle on the right margin/axis (e.g., "0.62467", "1.09250", "2.07497", etc.). You MUST find this exact number!
    4. SPECIFIC PRICE RANGE TRIGGERS DIRECTLY FROM SCREENSHOT (DO NOT ADD OR SUBTRACT programmatically, do not perform arbitrary offset additions): Your Hinglish or Bangla-Bengali suggestion in "entryTarget" MUST follow this exact format precisely with the actual price levels from the screenshot (use digits, e.g., 2.0790 instead of writing them in words):
       "যদি [Detected Lower/Support/RSI-break Level] এর নিচে close দেয় → পরের candle DOWN নিতে পারেন।\nআবার [Detected Upper/Resistance/RSI-break Level] এর উপরে close দিলে → trend ধরে UP নেওয়া ভালো।"
       (For example: "যদি 2.0790 এর নিচে close দেয় → পরের candle DOWN নিতে পারেন।\nআবার 2.0805 এর উপরে close দিলে → trend ধরে UP নেওয়া ভালো।"). This format is extremely critical and explicitly requested by the user. Ensure the exact numbers detected on the chart boundaries are used rather than hardcoded ones. Do not use complex Bengali words for "close" or "candle"—write "close" and "candle" and "DOWN" and "UP" exactly as shown.
    5. Observe RSI, Volume, or EMA indicators if visible.
    6. Include breakout strategy in your Bengali explanation using the exact price numbers. Mention both the support and resistance numbers in Bengali.
    7. CRITICAL ENTRY REQUIREMENT: Identify the current price level and explicitly state the exact numerical price level the candle needs to close, and what exact trade direction to take (UP or DOWN) in Bengali.
    8. ACCURACY & HIGH-PROBABILITY PREDICTION: We want to provide clear, actionable trading signals (UP or DOWN) rather than defaulting to NEUTRAL. Identify the most probable next direction based on the visible indicators, candlestick formations, support/resistance, and trend breakout setups. Only use NEUTRAL if the chart is completely flat/unreadable or has no identifiable direction.
    9. CONFIDENCE ESTIMATION: Assign a realistic confidence level between 65% and 95% based on your technical analysis. If you see standard, clean indicators or pattern confirmations, proceed with a confident UP or DOWN prediction. Avoid hesitating to predict a direction.
    
    CRITICAL INSTRUCTION FOR THE EXPLANATION:
    Your "explanation" field in the JSON should contain only high-quality, professional technical reasoning in Bengali, focusing on the chart patterns, support/resistance, indicators, and breakout strategy using the exact price numbers.
    Do NOT write any introductory sentences that repeat the predicted direction (e.g., do NOT start with "পরবর্তী ক্যান্ডেল সিগন্যাল:"), confidence level, or duplicate closing targets. Dive straight into analyzing the candlestick formations, market psychology, and specific market observation details.


    SPEED & CONCISENESS REQUIREMENT:
    Keep the "explanation" extremely brief - write ONLY 1 to 2 short, concise, high-value technical observations in Bengali (maximum 35 words). Keep "entryTarget" under 45 Bengali words so that it is extraordinarily specific and explicitly contains the exact detected numerical levels for BOTH UP and DOWN triggers. Stating both triggers with exact numbers is the absolute highest priority!

    CRITICAL: Respond ONLY in valid JSON format with the following structure:
    {
      "prediction": "UP" | "DOWN" | "NEUTRAL",
      "confidence": number (0 to 100),
      "explanation": "Detailed technical reasoning in Bengali (Bangla)",
      "entryTarget": "যদি [DOWN Price Level] এর নিচে close দেয় → পরের candle DOWN নিতে পারেন।\nআবার [UP Price Level] এর উপরে close দিলে → trend ধরে UP নেওয়া ভালো।",
      "patterns": ["Pattern Name 1", "Pattern Name 2"]
    }

    The explanation must be professional, tech-focused, and exclusively in Bengali. Be extremely honest—if the market is volatile or unpredictable, use NEUTRAL.
  `;

  const modelsToTry = [
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
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
            maxOutputTokens: 200,
            temperature: 0.1
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
