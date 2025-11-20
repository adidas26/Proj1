import React from 'react';

interface PersonalizedAlertProps {
  currentAQI: number;
  threshold: number;
  conditions: string[];
}

const PersonalizedAlert: React.FC<PersonalizedAlertProps> = ({ currentAQI, threshold, conditions }) => {
  if (currentAQI < threshold) return null;

  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm mb-6 animate-fade-in">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-lg font-bold text-amber-800">Health Alert Triggered</h3>
          <div className="mt-1 text-amber-700">
            <p>
              Current AQI ({currentAQI}) has exceeded your personal alert threshold of <strong>{threshold}</strong>.
            </p>
            {conditions.length > 0 && (
              <p className="mt-2 text-sm">
                Please take extra precautions for: <span className="font-semibold">{conditions.join(', ')}</span>.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalizedAlert;