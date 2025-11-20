import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AQITrendPoint } from '../types';

interface TrendChartProps {
  data: AQITrendPoint[];
}

const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  // If no history, show empty state or minimal placeholder
  if (!data || data.length === 0) {
    return (
        <div className="w-full h-64 bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 text-sm">
            No history data available yet.
        </div>
    );
  }

  return (
    <div className="w-full h-64 bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Recent Trends</h3>
        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Last {data.length} Readings</span>
      </div>
      
      <div className="flex-grow min-h-0">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
                <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                interval="preserveStartEnd"
            />
            <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                domain={[0, (dataMax: number) => Math.max(dataMax + 20, 100)]}
            />
            <Tooltip 
                contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '8px 12px'
                }}
                itemStyle={{ color: '#0f766e', fontWeight: 600 }}
                cursor={{ stroke: '#0d9488', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area 
                type="monotone" 
                dataKey="aqi" 
                stroke="#0d9488" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorAqi)" 
                animationDuration={1500}
            />
            </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrendChart;