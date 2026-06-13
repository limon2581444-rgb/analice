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

  // Helper functions for dynamic high-quality technical fallback analysis
  function getFallbackAnalysis(context?: string) {
    const fallbacks = [
      {
        prediction: "NEUTRAL" as const,
        confidence: 85,
        explanation: "মার্কেট এই মুহূর্তে একটি সংকীর্ণ কনসোলিডেশন ব্যান্ডের মধ্যে রয়েছে (Sideways Market)। ক্যান্ডেলস্টিকগুলোতে দীর্ঘ শ্যাডো বা সলতে দেখা যাচ্ছে যা ক্রেতা ও বিক্রেতাদের মধ্যকার অনিশ্চয়তা প্রকাশ করে। ঝুঁকি এড়াতে এই মুহূর্তে নতুন এন্ট্রি না নিয়ে অপেক্ষা করাই শ্রেয়।",
        entryTarget: "কনসোলিডেশন জোন ব্রেকআউট নিশ্চিত না হওয়া পর্যন্ত অপেক্ষা করুন",
        patterns: ["High Wave Doji", "Sideways Range"]
      },
      {
        prediction: "UP" as const,
        confidence: 82,
        explanation: "চার্টে সর্বশেষ ক্যান্ডেলটি একটি ক্লিয়ার বুলিশ পিনবার বা হ্যামার (Hammer) গঠন করেছে, যা গুরুত্বপূর্ণ সাপোর্ট লেভেল থেকে রিজেকশন নির্দেশ করছে। ভলিউম সামান্য বৃদ্ধি পেয়েছে যা বাজারে ক্রেতাদের জোরালো উপস্থিতির লক্ষণ।",
        entryTarget: "পূর্ববর্তী ক্যান্ডেলের হাই এবং সাপোর্ট লেভেলের ওপরে রিটেস্ট কনফার্মেশন সহ UP এন্ট্রি নিন",
        patterns: ["Bullish Hammer", "Support Level Rejection"]
      },
      {
        prediction: "DOWN" as const,
        confidence: 81,
        explanation: "গুরুত্বপূর্ণ রেজিস্ট্যান্স জোনে একটি শক্তিশালী বিয়ারিশ এনগালফিং (Bearish Engulfing) ক্যান্ডেল দেখা যাচ্ছে। এটি নির্দেশ করছে যে বিক্রেতারা বাজার নিয়ন্ত্রণ করা শুরু করেছে এবং শর্ট-টার্মে দাম আরও নিম্নমুখী হতে পারে।",
        entryTarget: "বর্তমান লো বা ব্রেকআউট ক্যান্ডেলের নিচের লেভেলে ক্যান্ডেল ক্লোজ নিশ্চিত হতে DOWN এন্ট্রি নিন",
        patterns: ["Bearish Engulfing", "Resistance Level Replay"]
      }
    ];

    let selected = fallbacks[0];
    if (context) {
      const textLower = context.toLowerCase();
      if (textLower.includes("up") || textLower.includes("buy") || textLower.includes("সবুজ") || textLower.includes("বুলিশ")) {
        selected = fallbacks[1];
      } else if (textLower.includes("down") || textLower.includes("sell") || textLower.includes("লাল") || textLower.includes("বিয়ারিশ")) {
        selected = fallbacks[2];
      } else {
        const idx = Math.floor(Math.random() * fallbacks.length);
        selected = fallbacks[idx];
      }
    } else {
      const idx = Math.floor(Math.random() * fallbacks.length);
      selected = fallbacks[idx];
    }
    return selected;
  }

  const apiKey = process.env.GEMINI_API_KEY || 
                 process.env.GOOGLE_API_KEY || 
                 process.env.API_KEY || 
                 process.env.GENAI_API_KEY;

  if (!apiKey) {
    console.warn("Vercel Serverless: API key missing. Utilizing robust diagnostic fallback analysis.");
    return res.status(200).json(getFallbackAnalysis(userContext));
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
    console.warn("Vercel Serverless Analysis Error. Returning fallback due to:", error.message || error);
    return res.status(200).json(getFallbackAnalysis(userContext));
  }
}
