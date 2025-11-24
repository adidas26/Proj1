
import { CorrelationDataPoint, RegressionResult, LagResult, DetailedLagResult } from "../types";

export const CITIES = ["Delhi", "Mumbai", "Kolkata", "Bengaluru", "Chennai", "Hyderabad", "Pune", "Aurangabad"];
export const LAGS = [0, 1, 3, 7, 14];

/**
 * Calculates the mean of an array of numbers.
 */
const mean = (data: number[]): number => {
  if (data.length === 0) return 0;
  return data.reduce((a, b) => a + b, 0) / data.length;
};

/**
 * Calculates Pearson correlation coefficient between two arrays.
 */
export const pearsonCorrelation = (x: number[], y: number[]): number => {
  const n = x.length;
  if (n !== y.length || n === 0) return 0;

  const xMean = mean(x);
  const yMean = mean(y);

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;
    num += xDiff * yDiff;
    denX += xDiff * xDiff;
    denY += yDiff * yDiff;
  }

  if (denX === 0 || denY === 0) return 0;
  return num / Math.sqrt(denX * denY);
};

/**
 * mimic scipy.stats.pearsonr and sklearn.linear_model.LinearRegression
 * Calculates simple linear regression and correlation stats.
 */
export const calculateRegressionAnalysis = (data: CorrelationDataPoint[]): RegressionResult => {
  const n = data.length;
  if (n === 0) {
    return { slope: 0, intercept: 0, rSquared: 0, correlationCoefficient: 0 };
  }

  const x = data.map(d => d.aqi);
  const y = data.map(d => d.symptomSeverity);

  const correlationCoefficient = pearsonCorrelation(x, y);
  const rSquared = correlationCoefficient * correlationCoefficient;

  const xMean = mean(x);
  const yMean = mean(y);

  // Slope (m) = r * (stdDevY / stdDevX)
  // Simplified OLS
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - xMean) * (y[i] - yMean);
    den += (x[i] - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  return {
    slope,
    intercept,
    rSquared,
    correlationCoefficient
  };
};

/**
 * Calculates correlation at specific time lags for general AQI.
 */
export const calculateLagCorrelations = (data: CorrelationDataPoint[], lags: number[]): LagResult[] => {
    const aqi = data.map(d => d.aqi);
    const symptoms = data.map(d => d.symptomSeverity);
    
    return lags.map(lag => {
        if (lag >= data.length) return { lagDays: lag, correlation: 0 };
        
        const x = aqi.slice(0, aqi.length - lag);
        const y = symptoms.slice(lag);
        
        return {
            lagDays: lag,
            correlation: pearsonCorrelation(x, y)
        };
    });
};

/**
 * Calculates correlation for specific pollutants at specific time lags.
 * Mimics compute_lagged_correlations from Python.
 */
export const calculatePollutantLagCorrelations = (data: CorrelationDataPoint[], pollutants: string[], lags: number[]): DetailedLagResult[] => {
    const results: DetailedLagResult[] = [];
    const health = data.map(d => d.symptomSeverity);

    pollutants.forEach(pollutant => {
        // Map string to keyof CorrelationDataPoint for typesafety
        const key = pollutant as keyof CorrelationDataPoint;
        const values = data.map(d => Number(d[key]));

        lags.forEach(lag => {
             if (lag >= data.length) return;
             
             // X = Pollutant (shifted 0 to N-lag)
             const x = values.slice(0, values.length - lag);
             // Y = Health (shifted lag to N)
             const y = health.slice(lag);
             
             const r = pearsonCorrelation(x, y);
             results.push({
                 pollutant,
                 lagDays: lag,
                 correlation: r
             });
        });
    });
    return results;
};

/**
 * Helper: PM2.5 to AQI Category (Python Logic Port)
 */
export const getPM25Category = (pm25: number) => {
    if (pm25 <= 30) return { label: "Good", desc: "🟢 Low health risk", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (pm25 <= 60) return { label: "Satisfactory", desc: "🟡 Moderate", color: "text-yellow-700 bg-yellow-50 border-yellow-200" };
    if (pm25 <= 90) return { label: "Moderate", desc: "🟠 Unhealthy for SG", color: "text-orange-700 bg-orange-50 border-orange-200" };
    if (pm25 <= 120) return { label: "Poor", desc: "🔴 Unhealthy", color: "text-red-700 bg-red-50 border-red-200" };
    if (pm25 <= 250) return { label: "Very Poor", desc: "🚨 Very Unhealthy", color: "text-purple-700 bg-purple-50 border-purple-200" };
    return { label: "Severe", desc: "☠️ Hazardous", color: "text-rose-900 bg-rose-100 border-rose-200" };
};

/**
 * Linear Congruential Generator for Seeded Randomness
 */
class LCG {
    seed: number;
    constructor(seed: number) {
        this.seed = seed;
    }
    next() {
        this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
        return this.seed / 4294967296;
    }
}

/**
 * Helper: Box-Muller transform for normal distribution
 */
function randomNormal(mean: number, stdDev: number, rng: LCG): number {
    let u = 0, v = 0;
    while(u === 0) u = rng.next(); 
    while(v === 0) v = rng.next();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    return mean + z * stdDev;
}

/**
 * Helper: Clip value
 */
function clip(val: number, min: number, max: number | null): number {
    let v = val < min ? min : val;
    if (max !== null && v > max) v = max;
    return v;
}

/**
 * Helper: Get Day of Year (1-366)
 */
function getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

/**
 * Generates synthetic multi-year data (2019-2024) for a given city.
 */
export const generateSyntheticCityData = (cityName: string): CorrelationDataPoint[] => {
    // 1. Setup Seed
    let hash = 0;
    for (let i = 0; i < cityName.length; i++) {
        hash = cityName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const rng = new LCG(Math.abs(hash));
    
    // 2. Base Profiles (from Python)
    const baseProfiles: Record<string, any> = {
        "Delhi":   {PM2_5:70, PM10:150, NO2:55, SO2:10, CO:0.9, O3:20, temp:25, hum:45},
        "Mumbai":  {PM2_5:40, PM10:80,  NO2:35, SO2:6,  CO:0.6, O3:18, temp:27, hum:70},
        "Kolkata": {PM2_5:55, PM10:110, NO2:45, SO2:8,  CO:0.8, O3:22, temp:26, hum:65},
        "Bengaluru":{PM2_5:30, PM10:60,  NO2:25, SO2:4,  CO:0.5, O3:25, temp:24, hum:60},
        "Chennai": {PM2_5:35, PM10:70,  NO2:30, SO2:5,  CO:0.6, O3:28, temp:28, hum:75},
        "Hyderabad":{PM2_5:45, PM10:90,  NO2:30, SO2:6,  CO:0.7, O3:24, temp:26, hum:60},
        "Pune":    {PM2_5:30, PM10:60,  NO2:20, SO2:3,  CO:0.4, O3:20, temp:25, hum:55},
        "Aurangabad":{PM2_5:29, PM10:70,  NO2:25, SO2:2,  CO:0.6, O3:18, temp:27, hum:51},
    };
    
    const p = baseProfiles[cityName] || baseProfiles["Delhi"];
    
    const data: CorrelationDataPoint[] = [];
    const start = new Date("2019-01-01");
    const end = new Date("2024-12-31");
    let current = new Date(start);
    
    const rawData: any[] = [];

    // 3. Generate Daily Air & Weather Data
    while (current <= end) {
        const dayOfYear = getDayOfYear(current);
        const dayOfWeek = current.getDay();

        const seasonalPM = 20 * Math.sin(2 * Math.PI * (dayOfYear + 10)/365);
        const seasonalTemp = 6 * Math.sin(2 * Math.PI * (dayOfYear - 80)/365);
        const weekly = 5 * Math.sin(2 * Math.PI * (dayOfWeek)/7);

        const noisePM = randomNormal(0, p.PM2_5 * 0.12, rng);
        
        const PM2_5 = clip(p.PM2_5 + seasonalPM + weekly + noisePM, 2, null);
        const PM10 = clip(p.PM10 + 0.8 * seasonalPM + weekly + noisePM * 0.9, 5, null);
        const NO2 = clip(p.NO2 + 5 * Math.sin(2 * Math.PI * dayOfYear / 180) + randomNormal(0, 5, rng), 2, null);
        const SO2 = clip(p.SO2 + randomNormal(0, 1.5, rng), 0.5, null);
        const CO = clip(p.CO + randomNormal(0, 0.1, rng), 0.1, null);
        const O3 = clip(p.O3 + 6 * Math.cos(2 * Math.PI * dayOfYear / 365) + randomNormal(0, 2, rng), 1, null);
        
        const temp = p.temp + seasonalTemp + randomNormal(0, 1.5, rng);
        const hum = clip(p.hum + 8 * Math.sin(2 * Math.PI * (dayOfYear + 50) / 365) + randomNormal(0, 5, rng), 10, 100);
        const air_density = clip(1.225 - (temp - 15) * 0.003 - (hum - 50) * 0.0005 + randomNormal(0, 0.002, rng), 0.9, 1.3);

        rawData.push({
            dateObj: new Date(current),
            PM2_5, PM10, NO2, SO2, CO, O3, temp, hum, air_density
        });

        current.setDate(current.getDate() + 1);
    }

    // 4. Generate Health Data (with lag)
    const baseAdm = 20;
    const sensPM = 0.03;
    const lag = 3;

    for (let i = 0; i < rawData.length; i++) {
        const d = rawData[i];
        const dayOfYear = getDayOfYear(d.dateObj);
        
        let pmLagged = d.PM2_5;
        if (i >= lag) {
            pmLagged = rawData[i - lag].PM2_5;
        }

        const seasonalHealth = 3 * Math.sin(2 * Math.PI * dayOfYear / 365);
        const tempFactor = Math.max(0, (30 - d.temp)) * 0.05;
        const humFactor = Math.max(0, (d.hum - 80)) * 0.02;

        let adm = baseAdm + seasonalHealth + sensPM * pmLagged + tempFactor + humFactor;
        adm += randomNormal(0, 4, rng);
        const admissions = Math.round(clip(adm, 0, null));

        const asthmaFactor = clip(0.45 + 0.1 * Math.sin(2 * Math.PI * dayOfYear / 365), 0.2, 0.7);
        const copdFactor = clip(0.25 + 0.05 * Math.cos(2 * Math.PI * dayOfYear / 365), 0.1, 0.5);
        
        const asthma = Math.round(admissions * asthmaFactor);
        const copd = Math.round(admissions * copdFactor);
        const bronchitis = Math.max(0, admissions - asthma - copd);

        const symptomSeverity = Math.min(10, parseFloat(((admissions / 50) * 5).toFixed(1)));

        let aqi = 0;
        if (d.PM2_5 <= 12) aqi = (50/12) * d.PM2_5;
        else if (d.PM2_5 <= 35.4) aqi = 50 + (49/23.3) * (d.PM2_5 - 12);
        else aqi = 100 + (49/20) * (d.PM2_5 - 35.5);

        data.push({
            city: cityName,
            date: d.dateObj.toISOString().split('T')[0],
            aqi: Math.round(aqi),
            pm2_5: Math.round(d.PM2_5),
            pm10: Math.round(d.PM10),
            no2: parseFloat(d.NO2.toFixed(1)),
            so2: parseFloat(d.SO2.toFixed(1)),
            co: parseFloat(d.CO.toFixed(2)),
            o3: parseFloat(d.O3.toFixed(1)),
            temperature: parseFloat(d.temp.toFixed(1)),
            humidity: Math.round(d.hum),
            air_density: parseFloat(d.air_density.toFixed(3)),
            admissions,
            asthma,
            copd,
            bronchitis,
            symptomSeverity
        });
    }

    return data;
};

/**
 * Generates and concatenates data for all cities (Equivalent to df_model in Python)
 */
export const generateAllCitiesData = (): CorrelationDataPoint[] => {
    let allData: CorrelationDataPoint[] = [];
    CITIES.forEach(city => {
        allData = allData.concat(generateSyntheticCityData(city));
    });
    return allData;
};

export const downloadCityDataset = (cityName: string) => {
  const data = cityName === "All Cities" ? generateAllCitiesData() : generateSyntheticCityData(cityName);
  if (data.length === 0) return;

  const headers = [
      "city", "date", "pm2_5", "pm10", "no2", "so2", "co", "o3", 
      "temperature", "humidity", "density", 
      "admissions", "asthma", "copd", "bronchitis"
  ].join(",");

  const rows = data.map(d => [
      d.city,
      d.date, 
      d.pm2_5, d.pm10, d.no2, d.so2, d.co, d.o3, 
      d.temperature, d.humidity, d.air_density, 
      d.admissions, d.asthma, d.copd, d.bronchitis
  ].join(","));

  const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${cityName.replace(/\s/g, '_')}_merged.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadCityReport = (cityName: string) => {
    const startDate = "2019-01-01";
    const endDate = "2024-12-31";
    
    // Mimic the exact text structure from Python Cell 9
    const lines = [
        `# Air Quality & Public Health — ${cityName}`,
        `**Date range:** ${startDate} to ${endDate}`,
        ``,
        `## Summary of findings (automatically generated)`,
        `- Synthetic dataset used for demonstration; do not claim clinical or real patient use.`,
        `- The notebook computed lagged correlations between pollutants and daily respiratory admissions.`,
        `- See generated CSV and figures for detailed values and visualizations.`
    ];

    const blob = new Blob([lines.join("\n")], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${cityName.replace(/\s/g, '_')}_auto_report.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const getPresentationBullets = (cityName: string): string[] => {
    return [
        `1. Motivation: Air pollution increases respiratory morbidity in ${cityName}; timely prediction helps hospital preparedness.`,
        `2. Data: Synthetic multi-year daily data (2019-2024) for pollutants, temperature, humidity, and admissions.`,
        `3. Key visuals: Time-series of pollutants and admissions; correlation matrix; predicted vs actual trends.`,
        `4. Key results: Analysis indicates significant correlation between PM2.5 levels and respiratory hospital admissions, particularly with a 3-day lag.`,
        `5. Alerts: System implements real-time AQI-based health advisories and personalized condition-based warnings.`,
        `6. Policy suggestions: Issue health advisories on high pollution days; coordinate hospital capacity; public mask advisories.`
    ];
};
