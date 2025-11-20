
import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, AQITrendPoint, GroundingSource, ForecastPoint } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelId = 'gemini-2.5-flash';

export const analyzeAirQuality = async (
  locationQuery: string,
  userCoords?: { latitude: number; longitude: number },
  userConditions: string[] = []
): Promise<AnalysisResult> => {
  
  const conditionContext = userConditions.length > 0
    ? `The user has specifically indicated they have the following health conditions: ${userConditions.join(', ')}. You MUST tailor the "detailed analysis" section to specifically address risks and precautions for someone with these conditions.`
    : '';

  const prompt = `
    Find the current real-time Air Quality Index (AQI) and weather conditions for ${locationQuery}.
    
    Based on the findings, act as an Environmental Health Specialist and provide:
    1. The current AQI value.
    2. The dominant pollutant (e.g., PM2.5, Ozone).
    3. A calculated Health Risk Level (Low, Moderate, High, Hazardous).
    4. A concise summary (max 2 sentences).
    5. A detailed analysis explaining the health correlation. ${conditionContext}
    
    IMPORTANT:
    You MUST also generate a JSON code block at the very end of your response representing the estimated AQI trend for the last 12 hours up to now.
    The JSON format must be:
    \`\`\`json
    [
      { "time": "10:00 AM", "aqi": 45 },
      { "time": "11:00 AM", "aqi": 50 }
      ...
    ]
    \`\`\`
    Use realistic estimation based on the current weather patterns found if historical data isn't explicitly in the search snippet.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    
    // Extract Grounding Metadata
    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          sources.push({ uri: chunk.web.uri, title: chunk.web.title || "Source" });
        }
      });
    }

    // Extract JSON block for chart
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    let trendData: AQITrendPoint[] = [];
    let cleanText = text;

    if (jsonMatch && jsonMatch[1]) {
      try {
        trendData = JSON.parse(jsonMatch[1]);
        // Remove the JSON block from the display text
        cleanText = text.replace(jsonMatch[0], '').trim();
      } catch (e) {
        console.warn("Failed to parse trend data JSON from model response", e);
      }
    } else {
      trendData = [{ time: "Now", aqi: 50 }];
    }

    const aqiMatch = cleanText.match(/AQI.*?(\d+)/i);
    const currentAQI = aqiMatch ? parseInt(aqiMatch[1], 10) : 0;

    const pollutantMatch = cleanText.match(/pollutant.*?:?\s*([a-zA-Z0-9\.]+)/i);
    const dominantPollutant = pollutantMatch ? pollutantMatch[1] : "PM2.5";

    let healthRiskLevel: 'Low' | 'Moderate' | 'High' | 'Hazardous' = 'Low';
    if (cleanText.toLowerCase().includes('hazardous') || currentAQI > 300) healthRiskLevel = 'Hazardous';
    else if (cleanText.toLowerCase().includes('high') || cleanText.toLowerCase().includes('unhealthy') || currentAQI > 150) healthRiskLevel = 'High';
    else if (cleanText.toLowerCase().includes('moderate') || currentAQI > 50) healthRiskLevel = 'Moderate';

    return {
      location: locationQuery,
      currentAQI,
      dominantPollutant,
      healthRiskLevel,
      summary: cleanText.split('\n')[0].substring(0, 150) + "...",
      detailedAnalysis: cleanText,
      trendData,
      sources,
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to analyze air quality.");
  }
};

export const generateForecast = async (locationQuery: string): Promise<ForecastPoint[]> => {
  const prompt = `
    Act as an atmospheric scientist.
    1. Use Google Search to find the *hourly weather forecast* (wind, temperature, feels-like temperature, humidity) for ${locationQuery} for the next 24 hours.
    2. Based on these weather patterns (e.g., stagnation increases AQI, wind decreases it, rush hour increases it), ESTIMATE the hourly Air Quality Index (AQI).
    
    Return ONLY a JSON array containing exactly 8 points (one every 3 hours) for the next 24 hours.
    Format:
    \`\`\`json
    [
      { 
        "time": "2 PM", 
        "aqi": 55, 
        "condition": "Fair", 
        "temp": "72°F", 
        "feelsLike": "75°F",
        "humidity": "45%", 
        "wind": "5 mph NW",
        "aqiSummary": "Moderate air quality, safe for most."
      },
      ...
    ]
    \`\`\`
    Do not include markdown conversational text, just the JSON block.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }
    return [];
  } catch (error) {
    console.error("Forecast Error:", error);
    return [];
  }
};
