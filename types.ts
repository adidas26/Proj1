
export interface AQITrendPoint {
  time: string;
  aqi: number;
}

export interface ForecastPoint {
  time: string;
  aqi: number;
  condition: string; // e.g., "Clear", "Hazy"
  temp?: string;     // e.g., "72°F"
  feelsLike?: string; // e.g., "75°F"
  humidity?: string; // e.g., "45%"
  wind?: string;     // e.g., "5 mph NW"
  aqiSummary?: string; // e.g., "Good for outdoor activities"
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface AnalysisResult {
  location: string;
  currentAQI: number;
  dominantPollutant: string;
  healthRiskLevel: 'Low' | 'Moderate' | 'High' | 'Hazardous';
  summary: string;
  detailedAnalysis: string; // Markdown/Text content
  trendData: AQITrendPoint[];
  sources: GroundingSource[];
}

export enum LoadingState {
  IDLE,
  LOADING,
  SUCCESS,
  ERROR,
}

export interface GeoCoords {
  latitude: number;
  longitude: number;
}

export interface UserProfile {
  conditions: string[];
  threshold: number;
}
