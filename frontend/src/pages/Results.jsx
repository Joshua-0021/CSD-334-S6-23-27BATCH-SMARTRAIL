import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/train.api";

export default function Results() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fareMap, setFareMap] = useState({});
    const [availMap, setAvailMap] = useState({});

    // (Removed beforeunload prompt so user can reload freely)

    // Parse query params
    const searchMode = searchParams.get("mode") || "route";
    const fromParam = searchParams.get("from") || "";
    const toParam = searchParams.get("to") || "";
    const dateParam = searchParams.get("date") || "";
    const trainQueryParam = searchParams.get("q") || "";
    const classParam = searchParams.get("class") || "General";

    // Helper to extract code from "Name (Code)"
    const extractCode = (str) => {
        const match = str.match(/\(([^)]+)\)$/);
        return match ? match[1] : str;
    };

    const getDayName = (dateStr) => {
        if (!dateStr) return "";
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[new Date(dateStr).getDay()];
    };

    useEffect(() => {
        setLoading(true);
        setError(null);

        const fetchData = async () => {
            try {
                let filtered = [];
                if (searchMode === "train") {
                    const q = trainQueryParam;
                    if (q) {
                        const apiResults = await api.searchTrains(q);

                        // Map API results
                        filtered = apiResults.map(t => ({
                            ...t,
                            // Ensure frontend compatibility
                            from_station_name: t.source,
                            to_station_name: t.destination,
                            departureTime: t.departureTime || "08:00", // Fallback
                            arrivalTime: t.arrivalTime || "16:00",
                            duration: t.duration || "8h 00m"
                        }));
                    }
                } else {
                    // Route Search
                    // Extract code from "Name (Code)" or just use value
                    const extract = (str) => {
                        const match = str.match(/\(([^)]+)\)$/);
                        return match ? match[1] : str;
                    };
                    const fromCode = extract(fromParam);
                    const toCode = extract(toParam);

                    if (fromCode && toCode) {
                        const apiResults = await api.searchTrainsBetween(fromCode, toCode, dateParam);

                        // API returns filtered list already, but we can filter by day if needed
                        if (dateParam) {
                            // Ensure date is treated accurately without local timezone shift 
                            // Using the raw string constructor 'YYYY-MM-DD' behaves differently depending on system.
                            // Convert to standardized parts
                            const dateParts = dateParam.split('-');
                            const year = parseInt(dateParts[0], 10);
                            const month = parseInt(dateParts[1], 10) - 1; // months are 0-indexed
                            const day = parseInt(dateParts[2], 10);
                            const dateObj = new Date(year, month, day);

                            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                            const shortDay = days[dateObj.getDay()];

                            filtered = apiResults.filter(t =>
                                !t.runningDays || t.runningDays.length === 0 || t.runningDays.includes(shortDay)
                            );
                        } else {
                            filtered = apiResults;
                        }

                        // Map to view model
                        filtered = filtered.map(t => ({
                            ...t,
                            departureTime: t.fromStation?.departureTime || t.fromStation?.arrivalTime || "06:00",
                            arrivalTime: t.toStation?.arrivalTime || t.toStation?.departureTime || "14:00",
                            duration: "Calculating..." // Ideally from API
                        }));
                    }
                }

                // Time filtering based on current time is disabled as requested by the user, 
                // so we can see all trains that run on the selected day regardless of current hour.
                /*
                if (dateParam && searchMode !== "train") {
                    const journeyDate = new Date(dateParam);
                    const now = new Date();
                    const isToday = journeyDate.toDateString() === now.toDateString();

                    if (isToday) {
                        const currentMinutes = now.getHours() * 60 + now.getMinutes();
                        filtered = filtered.filter(t => {
                            const depTime = t.fromStation?.departureTime || t.departureTime || "00:00";
                            const [h, m] = depTime.split(':').map(Number);
                            const depMinutes = h * 60 + m;
                            return depMinutes > currentMinutes;
                        });
                    }
                }
                */

                setResults(filtered);

                // Fetch fares and availability for all results
                const apiPromises = filtered.map(async (t) => {
                    let fares = null, distanceKm = null, availability = {};

                    const fCode = searchMode === "train" ? extractCode(t.source) : extractCode(fromParam);
                    const tCode = searchMode === "train" ? extractCode(t.destination) : extractCode(toParam);

                    try {
                        const fareData = await api.getFare(t.trainNumber, fCode, tCode);
                        fares = fareData.fares;
                        distanceKm = fareData.distanceKm;
                    } catch { }

                    try {
                        const availData = await api.checkAvailability(t.trainNumber);
                        availability = availData.availability || {};
                    } catch { }

                    return { trainNumber: t.trainNumber, fares, distanceKm, availability };
                });

                const combinedResults = await Promise.all(apiPromises);

                const fMap = {};
                const aMap = {};
                combinedResults.forEach(r => {
                    fMap[r.trainNumber] = { fares: r.fares, distanceKm: r.distanceKm };
                    aMap[r.trainNumber] = r.availability;
                });

                setFareMap(fMap);
                setAvailMap(aMap);
            } catch (err) {
                console.error("Failed to fetch trains:", err);
                setError("Unable to load trains. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [searchMode, trainQueryParam, fromParam, toParam, dateParam]);

    // Mock Availability Generator
    const getRealAvailability = (trainNo, classCode) => {
        // Deterministic mock based on train number
        const seed = trainNo.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const isAvailable = (seed % 10) > 2; // 70% chance available

        if (isAvailable) {
            const count = 20 + (seed % 100);
            return { status: "AVAILABLE", count: count, color: "text-green-600" };
        } else {
            const wl = 1 + (seed % 50);
            return { status: "WAITING LIST", count: wl, color: "text-red-600" };
        }
    };

    // Helper to calculate times/duration from API response
    const calculateTimes = (train, exactDistanceKm) => {
        if (train.fromStation && train.toStation) {
            // Use API provided station details
            const dep = train.fromStation.departureTime || train.fromStation.arrivalTime || "00:00";
            const arr = train.toStation.arrivalTime || train.toStation.departureTime || "00:00";

            // Calculate duration
            const [depH, depM] = dep.split(':').map(Number);
            const [arrH, arrM] = arr.split(':').map(Number);
            let diffMins = (arrH * 60 + arrM) - (depH * 60 + depM);
            if (diffMins < 0) diffMins += 24 * 60; // Next day

            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            const duration = `${hours}h ${mins}m`;

            // Use the accurate API backend distance from the matrix if available
            let finalDist = 0;
            if (exactDistanceKm) {
                finalDist = Number(exactDistanceKm).toFixed(2);
            } else {
                const dist = (train.toStation.distanceFromSourceKm || 0) - (train.fromStation.distanceFromSourceKm || 0);
                const rawDist = dist !== 0 ? Math.abs(dist) : Math.floor((diffMins / 60) * 55);
                finalDist = Number(rawDist).toFixed(2);
            }

            return { departure: dep, arrival: arr, duration, distance: finalDist };
        }

        // Fallback or Train Search Mode
        return {
            departure: train.departureTime || "06:00",
            arrival: train.arrivalTime || "14:00",
            duration: train.duration || "8h 00m",
            distance: train.distance || 0
        };
    };

    return (
        <div className="min-h-screen bg-gray-900 pb-10 text-gray-100 relative">
            {/* Search Header - Seamless Dark Theme, No Blue Border */}
            <div className="bg-gray-900 pt-40 pb-32 px-4">
                <div className="max-w-6xl mx-auto">
                    <button
                        onClick={() => navigate("/")}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-6"
                    >
                        ← Back to Search
                    </button>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold mb-2 text-white">
                                {searchMode === 'train' ? `Results for "${trainQueryParam}"` : `${fromParam.split('(')[0]} → ${toParam.split('(')[0]}`}
                            </h1>
                            <p className="text-gray-400">
                                {results.length} trains found • {new Date(dateParam || new Date()).toDateString()}
                            </p>
                        </div>

                        {searchMode === 'route' && (
                            <div className="bg-gray-800 rounded-lg px-4 py-2 text-sm border border-gray-700">
                                <span className="text-gray-400">Class:</span> <span className="font-semibold text-white">{classParam}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Results List */}
            <div className="max-w-6xl mx-auto px-4 -mt-24 relative z-10">
                {loading ? (
                    <div className="bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-700">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                        <p className="text-gray-400">Searching for trains...</p>
                    </div>
                ) : results.length === 0 ? (
                    <div className="bg-gray-800 rounded-2xl shadow-xl p-12 text-center border border-gray-700">
                        <h3 className="text-xl font-semibold text-white mb-2">No trains found</h3>
                        <p className="text-gray-400 mb-6">Try modifying your search criteria.</p>
                        <button
                            onClick={() => navigate("/")}
                            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                        >
                            Modify Search
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {results.map((train) => {
                            const exactDist = fareMap[train.trainNumber]?.distanceKm;
                            const times = calculateTimes(train, exactDist);

                            return (
                                <div key={train.trainNumber} className="bg-[#1D2332] rounded-2xl shadow-xl hover:shadow-2xl transition duration-300 overflow-hidden border border-white/5 group">
                                    <div className="p-4 sm:p-6">
                                        {/* Top Row: Header */}
                                        <div className="flex flex-col sm:flex-row justify-between items-start mb-4 sm:mb-6 gap-3 sm:gap-4">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-baseline gap-2 sm:gap-3 mb-1 flex-wrap">
                                                    <h3 className="text-lg sm:text-xl font-bold text-white truncate">{train.trainName}</h3>
                                                    <span className="text-gray-400 text-sm sm:text-base font-medium shrink-0">#{train.trainNumber}</span>
                                                </div>
                                                <p className="text-xs sm:text-sm text-gray-400 truncate">Runs: {train.runningDays?.length ? train.runningDays.join(', ') : 'Daily'}</p>
                                            </div>

                                            {/* Times Display */}
                                            <div className="w-full sm:w-auto">
                                                <div className="flex justify-between sm:justify-end items-center gap-4 sm:gap-6 text-white">
                                                    <div className="text-center min-w-0">
                                                        <div className="text-xl sm:text-2xl font-bold">{times.departure}</div>
                                                        <div className="text-[10px] sm:text-xs text-gray-400 font-mono tracking-wider truncate max-w-[100px] sm:max-w-none">{train.source || fromParam}</div>
                                                    </div>
                                                    <div className="flex flex-col items-center px-2 sm:px-4 shrink-0">
                                                        <div className="text-[10px] sm:text-xs text-gray-500 mb-1">{times.duration}</div>
                                                        <div className="w-12 sm:w-20 h-[2px] bg-gray-600 relative">
                                                            <div className="absolute -top-1 right-0 w-2 h-2 border-t-2 border-r-2 border-gray-600 rotate-45"></div>
                                                        </div>
                                                        <div className="text-[9px] sm:text-[10px] text-gray-500 mt-1">{times.distance} km</div>
                                                    </div>
                                                    <div className="text-center min-w-0">
                                                        <div className="text-xl sm:text-2xl font-bold">{times.arrival}</div>
                                                        <div className="text-[10px] sm:text-xs text-gray-400 font-mono tracking-wider truncate max-w-[100px] sm:max-w-none">{train.destination || toParam}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Availability - Horizontal scroll */}
                                        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                            {(fareMap[train.trainNumber]?.fares ? Object.keys(fareMap[train.trainNumber].fares) : ["SL", "3A", "2A", "1A"]).map(cls => {
                                                // Hide non-bookable classes entirely (pantry car, guard van)
                                                if (['PC', 'SLR'].includes(cls)) return null;

                                                const avail = availMap[train.trainNumber]?.[cls] || getRealAvailability(train.trainNumber, cls);
                                                const navFrom = searchMode === 'train' ? train.source : fromParam;
                                                const navTo = searchMode === 'train' ? train.destination : toParam;

                                                // GS / UR — unreserved, skip seat layout, go directly to passenger details
                                                const isUnreserved = ['GS', 'UR'].includes(cls);

                                                const handleClassClick = () => {
                                                    if (isUnreserved) {
                                                        navigate('/payment', {
                                                            state: {
                                                                train: { trainNumber: train.trainNumber, trainName: train.trainName, source: train.source, destination: train.destination },
                                                                selectedSeats: [],
                                                                classType: cls,
                                                                journeyDate: dateParam ? dateParam.split('T')[0] : new Date().toISOString().split('T')[0],
                                                                source: navFrom,
                                                                destination: navTo,
                                                                isUnreserved: true,
                                                                passengerCount: Number(searchParams.get('passengers') || 1)
                                                            }
                                                        });
                                                    } else {
                                                        navigate(`/seat-layout/${train.trainNumber}/${cls}?date=${dateParam}&from=${navFrom}&to=${navTo}&passengers=${searchParams.get('passengers') || 1}`);
                                                    }
                                                };

                                                return (
                                                    <button
                                                        key={cls}
                                                        onClick={handleClassClick}
                                                        className={`rounded-xl border p-3 flex flex-col justify-between hover:scale-105 transition duration-200 text-left cursor-pointer min-w-[120px] sm:min-w-[140px] shrink-0
                                                            ${avail.status === "AVAILABLE" ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}
                                                        `}
                                                    >
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="font-bold text-sm text-white">{cls}</span>
                                                            <span className="text-xs text-gray-400">₹{fareMap[train.trainNumber]?.fares?.[cls] || '...'}</span>
                                                        </div>
                                                        <div className={`text-sm font-bold ${avail.status === "AVAILABLE" ? "text-green-400" : "text-red-400"}`}>
                                                            {avail.status} <span className="text-xs opacity-70">({avail.count})</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
