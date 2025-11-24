
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { analyzeAirQuality, generateForecast } from './services/geminiService';
import { AnalysisResult, LoadingState, UserProfile, AQITrendPoint, ForecastPoint, CorrelationDataPoint } from './types';
import AirQualityCard from './components/AirQualityCard';
import TrendChart from './components/TrendChart';
import HealthAnalysis from './components/HealthAnalysis';
import LoadingSpinner from './components/LoadingSpinner';
import ProfileSettings from './components/ProfileSettings';
import PersonalizedAlert from './components/PersonalizedAlert';
import ForecastWidget from './components/ForecastWidget';
import CorrelationAnalysis from './components/CorrelationAnalysis';
import { generateSyntheticCityData, generateAllCitiesData, CITIES, downloadCityDataset, downloadCityReport, getPresentationBullets } from './utils/statistics';

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

  // Analytics Data
  const [analyticsData, setAnalyticsData] = useState<CorrelationDataPoint[]>([]);

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

    // Default simulated data
    setAnalyticsData(generateSyntheticCityData("Default"));
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
    
    // Check if this is a "All Cities" request - logic branch
    if (searchLoc === "All Cities") {
        setAnalyticsData(generateAllCitiesData());
        setLocation("Pan-India Analysis (Combined)");
        // We don't perform API calls for the "Combined" view as it is a statistical view
        return;
    }

    if (isBackground) {
        setIsRefreshing(true);
    } else {
        setStatus(LoadingState.LOADING);
        setErrorMsg('');
        setResult(null);
        setForecast([]); 
        setShowHistory(false); 
    }

    // Update the Historical Analysis dataset based on the city
    setAnalyticsData(generateSyntheticCityData(searchLoc));

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
      if (location && location !== "Pan-India Analysis (Combined)") performAnalysis(location);
  };

  const handleCityDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const city = e.target.value;
      if (city) {
          if (city === "All Cities") {
              // Special handling for All Cities mode
              setLocation("All Cities");
              setAnalyticsData(generateAllCitiesData());
              setResult(null); // Clear live result to focus on stats
              setStatus(LoadingState.IDLE); // Reset status
          } else {
              setLocation(city);
              handleSearch(city);
          }
      }
  };

  // Polling - Auto refresh every 15 minutes
  useEffect(() => {
    if (status !== LoadingState.SUCCESS || !location || location.includes("Combined") || location === "All Cities") return;

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
          
          // For geolocation, use "Delhi" as a proxy for the synthetic history 
          // to ensure we show something interesting
          setAnalyticsData(generateSyntheticCityData("Delhi"));

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
        <div className="space-y-4">
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
            
            {/* Indian Cities Interactive Dropdown (replacing buttons) */}
            <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm mx-1">
                <div className="flex items-center gap-2 text-slate-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <label htmlFor="city-select" className="text-sm font-bold uppercase tracking-wider">Historical Dataset:</label>
                </div>
                <div className="relative flex-grow">
                     <select
                        id="city-select"
                        className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-medium rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-2.5 pr-8 cursor-pointer hover:bg-slate-100 transition-colors"
                        onChange={handleCityDropdownChange}
                        value={CITIES.includes(location) ? location : (location === "All Cities" ? "All Cities" : "custom")}
                    >
                        <option value="custom" disabled>
                            {location && !CITIES.includes(location) && location !== "All Cities" ? `Other: ${location}` : "-- Select City to Analyze --"}
                        </option>
                        <option value="All Cities" className="font-bold text-teal-700 bg-teal-50">All Cities (Combined Analysis)</option>
                        {CITIES.map(city => (
                            <option key={city} value={city}>{city}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </div>
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
        {(status === LoadingState.SUCCESS && result) ? (
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

            {/* Statistical Correlation Section */}
            <CorrelationAnalysis data={analyticsData} />

            {/* Detailed Analysis */}
            <HealthAnalysis 
                analysis={result.detailedAnalysis} 
                sources={result.sources}
            />

            {/* Dataset Export Section (Cell 8 Equivalent) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-800">Generated Data Files</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Access the synthetic datasets used for the analysis above. These files contain daily records for 2019-2024.
                    </p>
                </div>
                
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 backdrop-blur-sm bg-slate-50/90 z-10">
                        <div className="col-span-6">Filename</div>
                        <div className="col-span-3">Type</div>
                        <div className="col-span-3 text-right">Action</div>
                    </div>

                    {/* All Cities File */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-slate-50 transition-colors">
                        <div className="col-span-6 flex items-center gap-3">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm font-medium text-slate-700">All_Cities_merged.csv</span>
                        </div>
                        <div className="col-span-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                Combined Dataset
                            </span>
                        </div>
                        <div className="col-span-3 text-right">
                             <button 
                                onClick={() => downloadCityDataset("All Cities")}
                                className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold hover:underline"
                             >
                                Download
                             </button>
                        </div>
                    </div>

                    {/* Individual City Files */}
                    {CITIES.map(city => (
                        <React.Fragment key={city}>
                            {/* CSV ROW */}
                            <div className="grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-slate-50 transition-colors">
                                <div className="col-span-6 flex items-center gap-3">
                                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-sm font-medium text-slate-700">{city.replace(/\s/g, '_')}_merged.csv</span>
                                </div>
                                <div className="col-span-3">
                                    <span className="text-xs text-slate-500">City Data</span>
                                </div>
                                <div className="col-span-3 text-right">
                                    <button 
                                        onClick={() => downloadCityDataset(city)}
                                        className="text-teal-600 hover:text-teal-800 text-sm font-semibold hover:underline"
                                    >
                                        Download
                                    </button>
                                </div>
                            </div>
                            
                            {/* MD REPORT ROW */}
                            <div className="grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-slate-50 transition-colors bg-slate-50/30">
                                <div className="col-span-6 flex items-center gap-3 pl-8">
                                    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="text-xs font-medium text-slate-600">{city.replace(/\s/g, '_')}_auto_report.md</span>
                                </div>
                                <div className="col-span-3">
                                    <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Report</span>
                                </div>
                                <div className="col-span-3 text-right">
                                    <button 
                                        onClick={() => downloadCityReport(city)}
                                        className="text-amber-600 hover:text-amber-800 text-xs font-semibold hover:underline"
                                    >
                                        Download
                                    </button>
                                </div>
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Presentation Key Points (Cell 10 Equivalent) */}
            {location && location !== "Pan-India Analysis (Combined)" && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mt-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800">Presentation Key Points</h3>
                        <button
                            onClick={() => {
                                const text = getPresentationBullets(location).join('\n');
                                navigator.clipboard.writeText(text);
                                alert("Copied to clipboard!");
                            }}
                            className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 bg-teal-50 px-3 py-1.5 rounded-lg transition-colors border border-teal-100"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                            Copy for Slides
                        </button>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-5 border border-slate-200 font-mono text-sm text-slate-700 leading-relaxed shadow-inner">
                        {getPresentationBullets(location).map((line, i) => (
                            <p key={i} className="mb-2 last:mb-0">{line}</p>
                        ))}
                    </div>
                </div>
            )}

          </div>
        ) : (
            // Empty State (or Statistical View Only)
            location === "All Cities" ? (
                <div className="space-y-8 animate-fade-in">
                    <div className="text-center pb-6 border-b border-slate-200">
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Pan-India Statistical Analysis</h2>
                        <p className="text-slate-500 mt-2">Aggregated health impact analysis across all monitored cities (2019-2024)</p>
                    </div>
                    
                    <CorrelationAnalysis data={analyticsData} />
                    
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 text-center">
                        <p className="text-slate-500 text-sm mb-4">Select a specific city from the dropdown to see live AQI and forecasts.</p>
                        <button
                             onClick={() => downloadCityDataset("All Cities")}
                             className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                             Download Master Dataset (All Cities)
                        </button>
                    </div>
                </div>
            ) : (
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
                    
                    <div className="mt-8">
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Try Historical Analysis</p>
                        {/* Replaced button list with the same dropdown for consistency even in empty state */}
                        <div className="max-w-xs mx-auto">
                            <div className="relative">
                                <select
                                    className="appearance-none w-full bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-3 pr-8 cursor-pointer shadow-sm hover:border-teal-300 transition-all"
                                    onChange={handleCityDropdownChange}
                                    value=""
                                >
                                    <option value="" disabled>-- Select a City to Start --</option>
                                    <option value="All Cities" className="font-bold text-teal-700 bg-teal-50">All Cities (Combined Analysis)</option>
                                    {CITIES.map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
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
