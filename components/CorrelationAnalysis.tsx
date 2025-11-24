
import React, { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Rectangle, LineChart, Line } from 'recharts';
import { CorrelationDataPoint } from '../types';
import { calculateRegressionAnalysis, calculatePollutantLagCorrelations, getPM25Category, LAGS, pearsonCorrelation } from '../utils/statistics';

interface CorrelationAnalysisProps {
  data: CorrelationDataPoint[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as CorrelationDataPoint;
    const cat = getPM25Category(data.pm2_5);
    
    return (
      <div className="bg-slate-800 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 z-50">
        <p className="font-bold text-teal-300 mb-2 border-b border-slate-600 pb-1">{data.city} - {data.date}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-slate-400">AQI:</span>
            <span className="font-mono">{data.aqi}</span>
            
            <span className="text-slate-400">PM2.5:</span>
            <span className="font-mono">{data.pm2_5} <span className="text-[9px] text-slate-500">µg/m³</span></span>
            
            <span className="text-slate-400">Status:</span>
            <span className={`font-mono font-bold ${cat.color.split(' ')[0]}`}>{cat.label}</span>

            <span className="text-slate-400 mt-2">Admissions:</span>
            <span className="font-mono font-bold text-amber-400 mt-2">{data.admissions}</span>

            <span className="text-slate-500 pl-2">- Asthma:</span>
            <span className="font-mono text-slate-300">{data.asthma}</span>
            
            <span className="text-slate-500 pl-2">- COPD:</span>
            <span className="font-mono text-slate-300">{data.copd}</span>
            
            <span className="text-slate-500 mt-2">Temp:</span>
            <span className="font-mono text-slate-300 mt-2">{data.temperature}°C</span>
        </div>
      </div>
    );
  }
  return null;
};

const CorrelationAnalysis: React.FC<CorrelationAnalysisProps> = ({ data }) => {
  const stats = useMemo(() => calculateRegressionAnalysis(data), [data]);
  
  // Calculate specific pollutant correlations
  const pollutantLags = useMemo(() => {
    return calculatePollutantLagCorrelations(data, ['pm2_5', 'no2', 'o3'], LAGS);
  }, [data]);

  // Specific correlations for Cell 8 requirement
  const pm25CorrTemp = useMemo(() => pearsonCorrelation(data.map(d => d.pm2_5), data.map(d => d.temperature)), [data]);
  const pm25CorrHum = useMemo(() => pearsonCorrelation(data.map(d => d.pm2_5), data.map(d => d.humidity)), [data]);

  // Latest record for "Cell 8 Snapshot"
  const latest = useMemo(() => data.length > 0 ? data[data.length - 1] : null, [data]);

  // Cell 8 Warning Logic
  const getCell8Warning = (pm25: number) => {
    if (pm25 <= 30) return { 
        warn: "GOOD 😊 — Air quality is clean.", 
        impact: "No major health impact.",
        color: "text-emerald-600 bg-emerald-50 border-emerald-100"
    };
    if (pm25 <= 60) return { 
        warn: "MODERATE 🙂 — Sensitive people may feel discomfort.", 
        impact: "Minor breathing discomfort for sensitive groups.",
        color: "text-yellow-600 bg-yellow-50 border-yellow-100"
    };
    if (pm25 <= 90) return { 
        warn: "POOR 😐 — Breathing irritation likely.", 
        impact: "Coughing, throat irritation, breathing issues.",
        color: "text-orange-600 bg-orange-50 border-orange-100"
    };
    return { 
        warn: "SEVERE ⚠️ — Dangerous for health!", 
        impact: "High risk of asthma, lung stress, chest pain.",
        color: "text-red-600 bg-red-50 border-red-100"
    };
  };

  const warning = latest ? getCell8Warning(latest.pm2_5) : null;

  // Transform for Recharts Grouped Bar
  const chartData = useMemo(() => {
     return LAGS.map(lag => {
         const pm = pollutantLags.find(p => p.lagDays === lag && p.pollutant === 'pm2_5')?.correlation || 0;
         const no2 = pollutantLags.find(p => p.lagDays === lag && p.pollutant === 'no2')?.correlation || 0;
         const o3 = pollutantLags.find(p => p.lagDays === lag && p.pollutant === 'o3')?.correlation || 0;
         return {
             lagName: `Lag ${lag}`,
             'PM2.5': Number(pm.toFixed(2)),
             'NO2': Number(no2.toFixed(2)),
             'O3': Number(o3.toFixed(2))
         };
     });
  }, [pollutantLags]);

  // Calculate Risk Distribution
  const riskDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(d => {
        const cat = getPM25Category(d.pm2_5);
        counts[cat.label] = (counts[cat.label] || 0) + 1;
    });
    return counts;
  }, [data]);

  // For scatter visualization performance - limit points if dataset is massive (like All Cities)
  const displayData = data.length > 2000 ? data.filter((_, i) => i % 5 === 0) : data;
  const dataRangeLabel = data.length > 5000 ? "(Sampled View of All Cities)" : data.length > 365 ? "(Last 1 Year shown)" : "(All Data)";

  const getStrengthText = (r: number) => {
    const absR = Math.abs(r);
    if (absR > 0.7) return "Strong";
    if (absR > 0.5) return "Moderate";
    if (absR > 0.3) return "Weak";
    return "Negligible";
  };

  const correlationColor = stats.correlationCoefficient > 0 ? "text-rose-600" : "text-emerald-600";

  if (!latest) return null;

  return (
    <div className="space-y-6 mt-6">
      
      {/* SECTION 1: Latest Snapshot (Equivalent to Cell 8 HTML output) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between gap-8">
            
            {/* Left: Metrics */}
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl font-bold text-slate-900">📍 City: {latest.city}</span>
                </div>
                
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">🧪 Latest Pollution Levels</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg">
                        <span className="text-xs text-slate-500 block">PM2.5</span>
                        <span className="text-lg font-mono font-semibold text-slate-800">{latest.pm2_5}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                        <span className="text-xs text-slate-500 block">Temperature</span>
                        <span className="text-lg font-mono font-semibold text-slate-800">{latest.temperature} °C</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                        <span className="text-xs text-slate-500 block">Humidity</span>
                        <span className="text-lg font-mono font-semibold text-slate-800">{latest.humidity}%</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                        <span className="text-xs text-slate-500 block">Density</span>
                        <span className="text-lg font-mono font-semibold text-slate-800">{latest.air_density}</span>
                    </div>
                </div>
            </div>

            {/* Right: Warning & Impact */}
            <div className={`flex-1 flex flex-col justify-center p-6 rounded-xl border ${warning?.color}`}>
                <h3 className="text-sm font-bold opacity-80 uppercase tracking-wider mb-2">Warning Analysis</h3>
                <p className="text-lg font-bold mb-4">{warning?.warn}</p>
                
                <h3 className="text-sm font-bold opacity-80 uppercase tracking-wider mb-1">Health Impact</h3>
                <p className="text-md opacity-90">{warning?.impact}</p>
            </div>
        </div>
      </div>

      {/* SECTION 2: PM2.5 Trend Plot */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">PM2.5 Trend — {latest.city}</h3>
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" tick={{fontSize: 10}} hide />
                    <YAxis tick={{fontSize: 10}} label={{ value: 'PM2.5 Level', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        labelStyle={{ color: '#64748b', fontSize: '11px', fontWeight: 'bold' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="pm2_5" stroke="#0f766e" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 3: Correlation Analysis (Original Dashboard) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
              <h3 className="text-lg font-bold text-slate-800">Historical Health Impact Analysis</h3>
              <p className="text-sm text-slate-500">
                  Pollution vs. Hospital Admissions <span className="text-slate-400 text-xs ml-1">{dataRangeLabel}</span>
              </p>
          </div>
          <div className="mt-2 md:mt-0 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg">
               <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wider">Multi-Year Regression</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Scatter Plot & Risk Dist */}
          <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                          type="number" 
                          dataKey="aqi" 
                          name="AQI" 
                          unit="" 
                          label={{ value: 'Air Quality Index', position: 'insideBottom', offset: -10, fontSize: 12, fill: '#64748b' }}
                          tick={{ fontSize: 11, fill: '#94a3b8' }}
                      />
                      <YAxis 
                          type="number" 
                          dataKey="symptomSeverity" 
                          name="Severity" 
                          unit="/10" 
                          label={{ value: 'Est. Health Impact (Severity)', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#64748b' }}
                          tick={{ fontSize: 11, fill: '#94a3b8' }}
                          domain={[0, 10]}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Daily Reports" data={displayData} fill="#6366f1" fillOpacity={0.5} />
                  </ScatterChart>
                  </ResponsiveContainer>
              </div>
              
              {/* Risk Distribution Summary */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Dataset Risk Profile (Based on PM2.5)</h4>
                  <div className="flex flex-wrap gap-2">
                      {Object.entries(riskDistribution).map(([label, count]) => {
                           const sampleVal = label === "Good" ? 10 : label === "Satisfactory" ? 40 : label === "Moderate" ? 70 : label === "Poor" ? 100 : label === "Very Poor" ? 150 : 300;
                           const style = getPM25Category(sampleVal);
                           // Ensure type safety for arithmetic operation by checking data.length
                           const percent = data.length > 0 ? ((Number(count) / data.length) * 100).toFixed(1) : "0.0";
                           
                           return (
                              <div key={label} className={`px-3 py-1.5 rounded border text-xs font-semibold flex items-center gap-2 ${style.color}`}>
                                  <span>{label}</span>
                                  <span className="opacity-70 font-normal">| {percent}%</span>
                              </div>
                           );
                      })}
                  </div>
              </div>
          </div>

          {/* Right Column: Stats & Lag Analysis */}
          <div className="flex flex-col gap-6">
              
              {/* Main Stats */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Overall Correlation</h4>
                  <div className="space-y-4">
                      <div>
                          <span className="text-xs text-slate-500 block">Pearson R (AQI vs Health)</span>
                          <div className={`text-2xl font-mono font-bold ${correlationColor}`}>
                              {stats.correlationCoefficient.toFixed(3)}
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                              {getStrengthText(stats.correlationCoefficient)} Relationship
                          </p>
                      </div>
                  </div>
              </div>

              {/* Cell 8 Specific Correlations */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">📊 Correlation with PM2.5</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-600">• Temperature</span>
                        <span className="text-sm font-mono font-bold text-slate-800">{pm25CorrTemp.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-600">• Humidity</span>
                        <span className="text-sm font-mono font-bold text-slate-800">{pm25CorrHum.toFixed(2)}</span>
                    </div>
                  </div>
              </div>

              {/* Pollutant-Specific Lag Analysis Chart */}
              <div className="bg-white rounded-xl border border-slate-100 flex-grow flex flex-col p-4">
                  <div className="mb-2">
                       <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Lag Analysis (Days)</h4>
                       <p className="text-[10px] text-slate-400 leading-tight mt-1">Delayed health impact by pollutant type</p>
                  </div>
                  
                  <div className="flex-grow min-h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="lagName" tick={{fontSize: 10}} />
                              <YAxis tick={{fontSize: 10}} />
                              <Tooltip 
                                  cursor={{fill: 'transparent'}}
                                  contentStyle={{ borderRadius: '8px', fontSize: '11px' }}
                              />
                              <Legend wrapperStyle={{ fontSize: '10px' }} iconType="circle" />
                              <Bar dataKey="PM2.5" fill="#ef4444" radius={[2, 2, 0, 0]} activeBar={<Rectangle fill="#dc2626" />} />
                              <Bar dataKey="NO2" fill="#f59e0b" radius={[2, 2, 0, 0]} activeBar={<Rectangle fill="#d97706" />} />
                              <Bar dataKey="O3" fill="#3b82f6" radius={[2, 2, 0, 0]} activeBar={<Rectangle fill="#2563eb" />} />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorrelationAnalysis;
