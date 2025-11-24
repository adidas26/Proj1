
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

export interface CorrelationDataPoint {
  city: string; // Added to support merged datasets
  date: string;
  aqi: number;
  symptomSeverity: number; // 0-10 scale (normalized from admissions)
  
  // Detailed Pollutants
  pm2_5: number;
  pm10: number;
  no2: number;
  so2: number;
  co: number;
  o3: number;
  
  // Weather
  temperature: number; // Renamed from temp to match Python script intent
  humidity: number;
  air_density: number; 
  
  // Detailed Health
  admissions: number;
  asthma: number;
  copd: number;
  bronchitis: number;
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  correlationCoefficient: number;
}

export interface LagResult {
  lagDays: number;
  correlation: number;
}

export interface DetailedLagResult {
  pollutant: string;
  lagDays: number;
  correlation: number;
}
