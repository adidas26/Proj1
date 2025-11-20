
import React from 'react';

interface AirQualityCardProps {
  aqi: number;
  pollutant: string;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Hazardous';
}

const AirQualityCard: React.FC<AirQualityCardProps> = ({ aqi, pollutant, riskLevel }) => {
  
  const getTheme = (level: string) => {
    switch (level) {
      case 'Low': return { 
        bg: 'bg-emerald-50', 
        text: 'text-emerald-900', 
        subtext: 'text-emerald-700',
        border: 'border-emerald-100', 
        stroke: 'text-emerald-500', 
        badge: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
        needle: 'bg-emerald-600'
      };
      case 'Moderate': return { 
        bg: 'bg-yellow-50', 
        text: 'text-yellow-900', 
        subtext: 'text-yellow-700',
        border: 'border-yellow-100', 
        stroke: 'text-yellow-500',
        badge: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
        needle: 'bg-yellow-600'
      };
      case 'High': return { 
        bg: 'bg-orange-50', 
        text: 'text-orange-900', 
        subtext: 'text-orange-700',
        border: 'border-orange-100', 
        stroke: 'text-orange-500',
        badge: 'bg-orange-100 text-orange-800 ring-orange-200',
        needle: 'bg-orange-600'
      };
      case 'Hazardous': return { 
        bg: 'bg-rose-50', 
        text: 'text-rose-900', 
        subtext: 'text-rose-700',
        border: 'border-rose-100', 
        stroke: 'text-rose-600',
        badge: 'bg-rose-100 text-rose-800 ring-rose-200',
        needle: 'bg-rose-600'
      };
      default: return { 
        bg: 'bg-slate-50', 
        text: 'text-slate-900', 
        subtext: 'text-slate-700',
        border: 'border-slate-200', 
        stroke: 'text-slate-500',
        badge: 'bg-slate-100 text-slate-800 ring-slate-200',
        needle: 'bg-slate-600'
      };
    }
  };

  const theme = getTheme(riskLevel);
  
  // Circular Gauge Calculations
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const maxVal = 300; 
  const normalizedAqi = Math.min(aqi, maxVal);
  const offset = circumference - (normalizedAqi / maxVal) * circumference;

  // Linear Scale Calculations
  const scalePercentage = Math.min((aqi / 300) * 100, 100);

  // Placeholder Concentration Logic
  const placeholderConcentration = (aqi * 0.45).toFixed(1);

  // Helper to get icon based on pollutant string
  const getPollutantIcon = () => {
    const p = pollutant.toLowerCase();
    const iconClass = `w-6 h-6 ${theme.text}`;

    if (p.includes('ozone') || p.includes('o3')) {
        // Sun Icon
        return (
            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        );
    }
    if (p.includes('pm') || p.includes('dust')) {
         // Cloud with particles
         return (
            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                <circle cx="8" cy="10" r="0.5" fill="currentColor" />
                <circle cx="10" cy="12" r="0.5" fill="currentColor" />
                <circle cx="14" cy="11" r="0.5" fill="currentColor" />
                <circle cx="12" cy="14" r="0.5" fill="currentColor" />
            </svg>
         );
    }
    if (p.includes('co') || p.includes('monoxide')) {
         // Fire/Flame Icon
         return (
            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
            </svg>
         );
    }
    if (p.includes('no2') || p.includes('so2') || p.includes('nitrogen') || p.includes('sulfur')) {
         // Factory/Industrial Icon
         return (
            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
         );
    }
    // Default Wind
    return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
  };

  return (
    <div className={`h-full relative overflow-hidden p-8 rounded-3xl border ${theme.bg} ${theme.border} shadow-sm transition-all duration-500 group`}>
      
      <div className="flex flex-col items-center justify-between h-full gap-4">
        
        {/* Top: Icon & Badge */}
        <div className="w-full flex flex-col items-center gap-3">
             {/* Pollutant Icon Container */}
             <div className={`p-3 rounded-full bg-white/60 border ${theme.border} shadow-sm backdrop-blur-sm transition-colors duration-500 flex items-center justify-center`}>
                {getPollutantIcon()}
             </div>
             
             <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase ring-1 ${theme.badge} shadow-sm transition-colors duration-500`}>
                {riskLevel}
            </span>
        </div>

        {/* Middle: Circular Gauge */}
        <div className="relative flex-shrink-0 my-2">
            {/* Pulse Effect for High Risk */}
            {(riskLevel === 'High' || riskLevel === 'Hazardous') && (
                <div className="absolute inset-0 bg-red-400 rounded-full opacity-20 animate-ping scale-90"></div>
            )}
            
            <svg className="transform -rotate-90 w-48 h-48 drop-shadow-md">
                <circle
                    cx="96"
                    cy="96"
                    r={radius * 2}
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-black/5"
                />
                <circle
                    cx="96"
                    cy="96"
                    r={radius * 2}
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={circumference * 2}
                    strokeDashoffset={offset * 2}
                    strokeLinecap="round"
                    className={`${theme.stroke} transition-all duration-1000 ease-out`}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-6xl font-extrabold ${theme.text}`}>{aqi}</span>
                <span className={`text-sm font-bold uppercase tracking-wider opacity-60 ${theme.subtext} mt-1`}>US AQI</span>
            </div>
        </div>

        {/* Bottom: Info & Linear Scale */}
        <div className="w-full text-center space-y-4">
            <div className="flex flex-col items-center">
                <p className={`text-xs font-bold uppercase tracking-wider opacity-50 ${theme.subtext}`}>Dominant Pollutant</p>
                <div className="flex flex-col items-center mt-1">
                    <p className={`text-2xl font-bold ${theme.text}`}>{pollutant}</p>
                    {/* Concentration Breakdown Section */}
                    <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium ${theme.subtext} bg-white/40 border ${theme.border} shadow-sm`}>
                        <span className="opacity-70">Concentration:</span>
                        <span className="font-bold">{placeholderConcentration} µg/m³</span>
                    </div>
                </div>
            </div>

            <div className="w-full px-2">
                <div className="relative pt-4 pb-2">
                    <div className="h-3 w-full bg-white/60 rounded-full overflow-hidden flex ring-1 ring-black/5">
                        <div className="h-full bg-emerald-400 w-[16.6%]" title="Good"></div> 
                        <div className="h-full bg-yellow-400 w-[16.6%]" title="Moderate"></div>
                        <div className="h-full bg-orange-400 w-[16.6%]" title="Unhealthy SG"></div>
                        <div className="h-full bg-red-500 w-[16.6%]" title="Unhealthy"></div>
                        <div className="h-full bg-purple-500 w-[16.6%]" title="Very Unhealthy"></div>
                        <div className="h-full bg-rose-900 w-[17%]" title="Hazardous"></div>
                    </div>
                    {/* Indicator Needle */}
                    <div 
                        className={`absolute top-2 w-4 h-4 -ml-2 bg-white rounded-full border-4 ${theme.border} shadow-md transition-all duration-700 ease-out`}
                        style={{ left: `${scalePercentage}%`, borderColor: 'white', backgroundColor: 'currentColor' }}
                    ></div>
                </div>
                <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 mt-1">
                    <span>Good</span>
                    <span>Hazardous</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AirQualityCard;
