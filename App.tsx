
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { analyzeAirQuality, generateForecast } from './services/geminiService';
import { AnalysisResult, LoadingState, UserProfile, AQITrendPoint, ForecastPoint } from './types';
import AirQualityCard from './components/AirQualityCard';
import TrendChart from './components/TrendChart';
import HealthAnalysis from './components/HealthAnalysis';
import LoadingSpinner from './components/LoadingSpinner';
import ProfileSettings from './components/ProfileSettings';
import PersonalizedAlert from './components/PersonalizedAlert';
import ForecastWidget from './components/ForecastWidget';

const App: React.FC = () => {
  const [location, setLocation] = useState<string>('');
  const [status, setStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Background Refresh State
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // History State
  const [aqiHistory, setAqiHistory] = useState<AQITrendPoint[]>([]);
  const historyLocationRef = useRef<string>(''); 

  // Recent Searches State
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Forecast State
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [isForecastLoading, setIsForecastLoading] = useState(false);

  // Profile State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    conditions: [],
    threshold: 100, 
  });

  // Load Local Storage Data
  useEffect(() => {
    const savedProfile = localStorage.getItem('aeroPulseProfile');
    if (savedProfile) {
      try {
        setUserProfile(JSON.parse(savedProfile));
      } catch (e) {
        console.error("Failed to load profile", e);
      }
    }

    const savedHistory = localStorage.getItem('aeroPulseHistory');
    if (savedHistory) {
        try {
            const parsed = JSON.parse(savedHistory);
            if (Array.isArray(parsed)) setAqiHistory(parsed);
        } catch (e) {
            console.error("Failed to load history", e);
        }
    }

    const savedRecent = localStorage.getItem('aeroPulseRecentSearches');
    if (savedRecent) {
        try {
            const parsed = JSON.parse(savedRecent);
            if (Array.isArray(parsed)) setRecentSearches(parsed);
        } catch (e) {
            console.error("Failed to load recent searches", e);
        }
    }
  }, []);

  // Save Profile
  const saveProfile = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    localStorage.setItem('aeroPulseProfile', JSON.stringify(newProfile));
  };

  // Save History
  const updateHistory = (newAQI: number, loc: string) => {
    setAqiHistory(prev => {
        const isNewLocation = historyLocationRef.current && historyLocationRef.current !== loc;
        let newHistory = isNewLocation ? [] : [...prev];
        
        newHistory.push({
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            aqi: newAQI
        });

        if (newHistory.length > 10) {
            newHistory = newHistory.slice(newHistory.length - 10);
        }
        
        localStorage.setItem('aeroPulseHistory', JSON.stringify(newHistory));
        historyLocationRef.current = loc;
        return newHistory;
    });
  };

  // Save Recent Search
  const addToRecentSearches = (loc: string) => {
    // Avoid saving coordinates or "Current Location" as a text search
    if (!loc || loc === 'Current Location' || loc.includes(',')) return;

    setRecentSearches(prev => {
        // Remove duplicates (case-insensitive)
        const filtered = prev.filter(item => item.toLowerCase() !== loc.toLowerCase());
        // Add to front, limit to 5
        const updated = [loc, ...filtered].slice(0, 5);
        localStorage.setItem('aeroPulseRecentSearches', JSON.stringify(updated));
        return updated;
    });
  };

  const clearRecentSearches = (e: React.MouseEvent) => {
      e.stopPropagation();
      setRecentSearches([]);
      localStorage.removeItem('aeroPulseRecentSearches');
      setShowHistory(false);
  };

  const performAnalysis = async (searchLoc: string, isBackground: boolean = false) => {
    if (!searchLoc.trim()) return;
    
    if (isBackground) {
        setIsRefreshing(true);
    } else {
        setStatus(LoadingState.LOADING);
        setErrorMsg('');
        setResult(null);
        setForecast([]); 
        setShowHistory(false); // Close dropdown if open
    }

    try {
      // 1. Main Analysis
      const data = await analyzeAirQuality(
        searchLoc, 
        undefined, 
        userProfile.conditions
      );
      
      setResult(data);
      setLastUpdated(new Date());
      updateHistory(data.currentAQI, searchLoc);
      
      if (!isBackground) {
          setStatus(LoadingState.SUCCESS);
          addToRecentSearches(searchLoc);
      }

      // 2. Trigger Forecast separately
      await fetchForecast(searchLoc);

    } catch (err: any) {
      if (!isBackground) {
        setStatus(LoadingState.ERROR);
        setErrorMsg(err.message || "An unexpected error occurred.");
      }
    } finally {
        if (isBackground) {
            setTimeout(() => setIsRefreshing(false), 1500);
        }
    }
  };

  const fetchForecast = async (loc: string) => {
    setIsForecastLoading(true);
    try {
      const forecastData = await generateForecast(loc);
      setForecast(forecastData);
    } catch (e) {
      console.error("Forecast failed", e);
    } finally {
      setIsForecastLoading(false);
    }
  };

  const handleSearch = useCallback((searchLoc: string) => {
    performAnalysis(searchLoc);
  }, [userProfile]);

  const handleHistorySelect = (loc: string) => {
      setLocation(loc);
      handleSearch(loc);
  };

  const handleRefresh = () => {
      if (location) performAnalysis(location);
  };

  // Polling - Auto refresh every 15 minutes
  useEffect(() => {
    if (status !== LoadingState.SUCCESS || !location) return;

    const interval = setInterval(() => {
        console.log("Auto-refreshing AQI...");
        performAnalysis(location, true); 
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, [status, location, userProfile]);

  const handleGeoLocate = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }
    
    setStatus(LoadingState.LOADING);
    setErrorMsg('');
    setResult(null);
    setForecast([]);
    setShowHistory(false);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const query = `${latitude}, ${longitude}`;
          const data = await analyzeAirQuality(
            query, 
            { latitude, longitude },
            userProfile.conditions
          );
          setResult(data);
          setLastUpdated(new Date());
          setLocation("Current Location");
          updateHistory(data.currentAQI, "Current Location");
          setStatus(LoadingState.SUCCESS);
          fetchForecast("Current Location");
        } catch (err: any) {
            setStatus(LoadingState.ERROR);
            setErrorMsg("Failed to analyze location data.");
        }
      },
      () => {
        setStatus(LoadingState.IDLE);
        setErrorMsg("Unable to retrieve your location.");
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleSearch(location);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12" onClick={() => setShowHistory(false)}>
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-teal-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">AeroPulse</span>
          </div>
          
          <button 
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-full border border-transparent hover:border-teal-100 transition-all focus:outline-none"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="hidden sm:inline">Health Profile</span>
            {userProfile.conditions.length > 0 && (
              <span className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-pulse"></span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        
        {/* Search Section */}
        <div className="flex flex-col sm:flex-row gap-3 p-1 z-30 relative">
            <div className="relative flex-grow group" onClick={(e) => e.stopPropagation()}>
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input 
                    type="text" 
                    className="block w-full pl-11 pr-12 py-3.5 border border-slate-200 rounded-2xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm" 
                    placeholder="Search city, zip code, or area..." 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (recentSearches.length > 0) setShowHistory(true);
                    }}
                />
                {/* History Toggle Button */}
                <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className={`absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer transition-colors ${showHistory ? 'text-teal-600' : 'text-slate-400 hover:text-teal-600'}`}
                    title="Recent Locations"
                >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>

                {/* Recent Locations Dropdown */}
                {showHistory && recentSearches.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in z-50">
                        <div className="py-1">
                            {recentSearches.map((loc, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => handleHistorySelect(loc)}
                                    className="px-4 py-3 hover:bg-teal-50 cursor-pointer flex items-center justify-between group border-b border-slate-50 last:border-0 transition-colors"
                                >
                                    <span className="text-slate-700 font-medium group-hover:text-teal-800">{loc}</span>
                                    <svg className="w-4 h-4 text-slate-300 group-hover:text-teal-500 -ml-2 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            ))}
                        </div>
                        <div className="bg-slate-50 px-4 py-2.5 text-xs text-slate-500 border-t border-slate-100 flex justify-between items-center">
                            <span className="font-semibold uppercase tracking-wider opacity-70">Recent Searches</span>
                            <button 
                                onClick={clearRecentSearches}
                                className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Clear
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <button 
                onClick={handleGeoLocate}
                className="flex-shrink-0 px-5 py-3.5 bg-white border border-slate-200 text-slate-600 font-semibold rounded-2xl hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all shadow-sm flex items-center justify-center gap-2"
                title="Use my location"
            >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                 </svg>
            </button>
            <button 
                onClick={() => handleSearch(location)}
                disabled={status === LoadingState.LOADING || !location.trim()}
                className="flex-shrink-0 px-8 py-3.5 bg-teal-600 text-white font-semibold rounded-2xl hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
                {status === LoadingState.LOADING ? 'Scanning...' : 'Analyze'}
            </button>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl animate-fade-in shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{errorMsg}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {status === LoadingState.LOADING && (
            <LoadingSpinner />
        )}

        {/* Results Dashboard */}
        {status === LoadingState.SUCCESS && result && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Header & Refresh */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                     <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                        {result.location}
                    </h2>
                    <p className="text-slate-500 mt-1 flex items-center gap-2 text-sm">
                        {lastUpdated && (
                            <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                        )}
                        <span className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-teal-500 animate-ping' : 'bg-emerald-500'}`}></span>
                        <span className="flex items-center gap-2">
                            {isRefreshing ? (
                                <>
                                    Updating
                                    <svg className="w-3 h-3 animate-spin text-teal-600" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </>
                            ) : (
                                "Live Data"
                            )}
                        </span>
                    </p>
                </div>
                
                <button 
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition-colors ${isRefreshing ? 'text-slate-400 bg-slate-100' : 'text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100'}`}
                >
                    <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {isRefreshing ? 'Auto-Refreshing...' : 'Refresh AQI'}
                </button>
            </div>

            {/* Personalized Alert */}
            <PersonalizedAlert 
                currentAQI={result.currentAQI}
                threshold={userProfile.threshold}
                conditions={userProfile.conditions}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Card */}
                <div className="lg:col-span-1 h-full">
                    <AirQualityCard 
                        aqi={result.currentAQI}
                        pollutant={result.dominantPollutant}
                        riskLevel={result.healthRiskLevel}
                    />
                </div>
                
                {/* Charts Column */}
                <div className="lg:col-span-2 h-full flex flex-col gap-6">
                    {/* Historical Trend */}
                    <TrendChart data={aqiHistory} />
                    
                    {/* Forecast Widget */}
                    <ForecastWidget data={forecast} isLoading={isForecastLoading || isRefreshing} />
                </div>
            </div>

            {/* Detailed Analysis */}
            <HealthAnalysis 
                analysis={result.detailedAnalysis} 
                sources={result.sources}
            />
          </div>
        )}

        {/* Empty State */}
        {status === LoadingState.IDLE && !result && (
            <div className="text-center py-20">
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-lg shadow-slate-100 text-teal-500">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">Monitor Your Air Quality</h3>
                <p className="max-w-md mx-auto text-slate-500 leading-relaxed">
                    Get real-time AI analysis of pollution levels, health risks, and personalized alerts based on your conditions.
                </p>
            </div>
        )}

      </main>
      
      {/* Modals */}
      <ProfileSettings 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
        currentProfile={userProfile}
        onSave={saveProfile}
      />

      {/* Footer Disclaimer */}
      <footer className="max-w-4xl mx-auto px-4 py-6 text-center border-t border-slate-200 mt-12">
        <p className="text-xs text-slate-400">
            This app provides general health guidance based on AI analysis. Consult a doctor for specific medical concerns.
        </p>
      </footer>
    </div>
  );
};

export default App;
