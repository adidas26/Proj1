import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
  onSave: (profile: UserProfile) => void;
}

const AVAILABLE_CONDITIONS = [
  "Asthma",
  "Seasonal Allergies",
  "Heart Disease",
  "Pregnancy",
  "Elderly",
  "Children/Infants",
  "Active Outdoors"
];

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ isOpen, onClose, currentProfile, onSave }) => {
  const [conditions, setConditions] = useState<string[]>([]);
  const [threshold, setThreshold] = useState<number>(100);

  useEffect(() => {
    if (isOpen) {
      setConditions(currentProfile.conditions);
      setThreshold(currentProfile.threshold);
    }
  }, [isOpen, currentProfile]);

  const toggleCondition = (condition: string) => {
    setConditions(prev => 
      prev.includes(condition)
        ? prev.filter(c => c !== condition)
        : [...prev, condition]
    );
  };

  const handleThresholdChange = (val: string) => {
    const num = parseInt(val);
    if (!isNaN(num)) {
      setThreshold(Math.max(0, Math.min(500, num)));
    } else if (val === '') {
        // Allow empty string while typing, effectively treating as 0 for logic but visual empty
        setThreshold(0); 
    }
  };

  const handleSave = () => {
    onSave({ conditions, threshold });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Health Alerts Profile</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Conditions */}
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">My Conditions</h3>
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_CONDITIONS.map(condition => (
                <label 
                  key={condition} 
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                    conditions.includes(condition) 
                      ? 'bg-teal-50 border-teal-500 text-teal-900' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input 
                    type="checkbox" 
                    className="hidden"
                    checked={conditions.includes(condition)}
                    onChange={() => toggleCondition(condition)}
                  />
                  <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${
                    conditions.includes(condition) ? 'bg-teal-500 border-teal-500' : 'border-slate-300'
                  }`}>
                    {conditions.includes(condition) && (
                       <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                       </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium">{condition}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Threshold */}
          <div>
            <div className="flex justify-between items-end mb-2">
                <label htmlFor="aqi-threshold" className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Alert Threshold</label>
                <div className="flex items-baseline gap-1">
                    <input 
                        id="aqi-threshold"
                        type="number" 
                        min="0" 
                        max="500"
                        value={threshold}
                        onChange={(e) => handleThresholdChange(e.target.value)}
                        className="w-20 p-1 text-right text-2xl font-bold text-teal-600 border-b-2 border-teal-100 focus:border-teal-500 focus:outline-none bg-transparent"
                    />
                    <span className="text-sm font-normal text-slate-400">AQI</span>
                </div>
            </div>
            <input 
              type="range" 
              min="0" 
              max="300" 
              step="5"
              value={threshold > 300 ? 300 : threshold} 
              onChange={(e) => setThreshold(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-2">
                <span>Good (0)</span>
                <span>Unhealthy (150)</span>
                <span>Hazardous (300+)</span>
            </div>
            <p className="text-xs text-slate-500 mt-3 bg-slate-50 p-3 rounded-lg">
                We will alert you if the Air Quality Index exceeds <strong>{threshold}</strong>. 
                {threshold < 50 ? " This is a very strict threshold." : threshold > 150 ? " This is a high threshold." : ""}
            </p>
          </div>

        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:text-slate-800">Cancel</button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;