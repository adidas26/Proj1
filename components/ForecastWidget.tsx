
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ForecastPoint } from '../types';

interface ForecastWidgetProps {
  data: ForecastPoint[];
  isLoading: boolean;
}

const ForecastWidget: React.FC<ForecastWidgetProps> = ({ data, isLoading }) => {
  const [selectedPoint, setSelectedPoint] = useState<ForecastPoint | null>(null);

  const getBarColor = (aqi: number) => {
    if (aqi > 200) return '#e11d48'; // Hazardous (Rose)
    if (aqi > 150) return '#ef4444'; // Unhealthy (Red)
    if (aqi > 100) return '#f97316'; // Sensitive (Orange)
    if (aqi > 50) return '#eab308';  // Moderate (Yellow)
    return '#10b981';                // Good (Emerald)
  };

  const handleBarClick = (data: any) => {
    if (data) {
      // Toggle selection: if clicking the same bar, deselect it
      if (selectedPoint && selectedPoint.time === data.time) {
        setSelectedPoint(null);
      } else {
        setSelectedPoint(data);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-64 bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col">
        <div className="flex justify-between items-center mb-6 animate-pulse">
            <div className="h-4 w-32 bg-slate-200 rounded"></div>
            <div className="h-5 w-20 bg-slate-100 rounded-full"></div>
        </div>
        <div className="flex-grow flex items-end justify-between gap-2 px-2">
            {[...Array(8)].map((_, i) => (
                <div 
                    key={i} 
                    className="w-full bg-slate-100 rounded-t-md animate-pulse" 
                    style={{ 
                        height: `${[40, 60, 75, 50, 80, 45, 55, 30][i]}%`,
                        animationDelay: `${i * 100}ms`
                    }}
                ></div>
            ))}
        </div>
        <div className="h-3 w-full bg-slate-50 mt-2 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <div className="w-full h-64 bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col relative group">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">24-Hour Forecast</h3>
        <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-1 rounded-full border border-teal-100">
            {selectedPoint ? 'Click again to close' : 'Tap bar for details'}
        </span>
      </div>

      {/* Detail Popup Overlay */}
      {selectedPoint && (
        <div className="absolute top-14 left-1/2 transform -translate-x-1/2 z-20 bg-slate-800/95 backdrop-blur-md text-white p-4 rounded-xl shadow-xl border border-slate-600 w-72 animate-fade-in transition-all">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-600">
             <div>
               <span className="block text-sm font-bold text-teal-300">{selectedPoint.time}</span>
               <span className="text-xs text-slate-400">Forecast Details</span>
             </div>
             <button 
               onClick={(e) => { e.stopPropagation(); setSelectedPoint(null); }}
               className="text-slate-400 hover:text-white transition-colors bg-white/10 rounded-full p-1"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
               </svg>
             </button>
          </div>
          
          <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
             <div className="flex flex-col">
               <span className="text-slate-400">AQI</span>
               <span className="font-bold text-lg" style={{ color: getBarColor(selectedPoint.aqi) }}>{selectedPoint.aqi}</span>
             </div>
             <div className="flex flex-col">
               <span className="text-slate-400">Condition</span>
               <span className="font-medium text-slate-200">{selectedPoint.condition}</span>
             </div>
             
             {selectedPoint.temp && (
                <div className="flex flex-col">
                  <span className="text-slate-400">Temp</span>
                  <span className="font-medium text-slate-200 flex items-center gap-1">
                    {selectedPoint.temp}
                    {selectedPoint.feelsLike && <span className="text-[10px] text-slate-400 opacity-80">({selectedPoint.feelsLike})</span>}
                  </span>
                </div>
             )}
             {selectedPoint.humidity && (
                <div className="flex flex-col">
                  <span className="text-slate-400">Humidity</span>
                  <span className="font-medium text-slate-200">{selectedPoint.humidity}</span>
                </div>
             )}
             {selectedPoint.wind && (
                <div className="col-span-2 flex flex-col border-t border-slate-700/50 pt-2">
                   <div className="flex justify-between">
                        <span className="text-slate-400">Wind</span>
                        <span className="font-medium text-slate-200">{selectedPoint.wind}</span>
                   </div>
                </div>
             )}
             {selectedPoint.aqiSummary && (
                 <div className="col-span-2 mt-1 bg-slate-700/50 p-2 rounded-lg border border-slate-600/30">
                     <p className="text-slate-300 italic leading-relaxed text-center">{selectedPoint.aqiSummary}</p>
                 </div>
             )}
          </div>
          {/* Arrow pointing down to the chart */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-slate-800 rotate-45 border-r border-b border-slate-600"></div>
        </div>
      )}

      <div className="flex-grow min-h-0" onClick={() => setSelectedPoint(null)}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            onClick={(data) => {
                if (data && data.activePayload && data.activePayload.length > 0) {
                    // Prevent bubbling to the container onClick
                    handleBarClick(data.activePayload[0].payload);
                }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="time" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#94a3b8' }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#94a3b8' }}
            />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              content={() => null} // Completely hide default tooltip
            />
            <Bar 
                dataKey="aqi" 
                radius={[4, 4, 0, 0]} 
                animationDuration={1000}
                className="cursor-pointer"
            >
              {data.map((entry, index) => {
                const isSelected = selectedPoint?.time === entry.time;
                const isDimmed = selectedPoint && !isSelected;
                
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getBarColor(entry.aqi)} 
                    fillOpacity={isDimmed ? 0.3 : 1}
                    stroke={isSelected ? '#0f172a' : 'none'}
                    strokeWidth={isSelected ? 2 : 0}
                    className="transition-all duration-300 ease-in-out hover:opacity-90"
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ForecastWidget;
