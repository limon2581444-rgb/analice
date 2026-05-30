export interface AnalysisResult {
  prediction: 'UP' | 'DOWN' | 'NEUTRAL';
  confidence: number;
  explanation: string;
  patterns: string[];
}

export async function analyzeChartImage(base64Image: string, mimeType: string, userContext?: string): Promise<AnalysisResult> {
  try {
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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to analyze chart');
    }

    return await response.json() as AnalysisResult;
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
}
