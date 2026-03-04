
import { dataStore } from '../services/train.service.js';
import { generateSeats } from '../services/seatLayout.service.js';

// Classes that are not bookable and should be hidden from seat layout/availability
const NON_BOOKABLE = new Set(['SLR', 'PANTRY', 'GS', 'UR']);

// External API endpoints fallback removed
export async function getTrainDetails(req, res) {
    try {
        const { trainNumber } = req.params;
        const train = dataStore.trains.find(t => t.trainNumber === trainNumber);

        if (train) {
            return res.json({ success: true, source: 'local', data: train });
        } else {
            return res.status(404).json({ success: false, error: 'Train not found in local database' });
        }
    } catch (err) {
        return res.status(502).json({ success: false, error: err.message });
    }
}

export async function getTrainSchedule(req, res) {
    try {
        const { trainNumber } = req.params;
        const train = dataStore.trains.find(t => t.trainNumber === trainNumber);

        if (train && train.schedule) {
            return res.json({ success: true, source: 'local', data: train.schedule });
        } else {
            return res.status(404).json({ success: false, error: 'Train schedule not found in local database' });
        }
    } catch (err) {
        return res.status(502).json({ success: false, error: err.message });
    }
}

export async function getTrainsBetween(req, res) {
    try {
        const source = req.query.source || req.query.from;
        const destination = req.query.destination || req.query.to;
        const date = req.query.date;

        if (!source || !destination) {
            return res.status(400).json({ success: false, error: 'Require source and destination' });
        }

        const matchStation = (s, codeOrName) => {
            let query = codeOrName.toLowerCase();
            const sCode = s.stationCode.toLowerCase();

            if (query.length <= 4) return sCode === query;
            return sCode === query || s.stationName.toLowerCase().includes(query);
        };

        const results = dataStore.trains.filter(train => {
            if (!train.schedule) return false;

            // Get all possible source indices (rare, but maybe it visits multiple sister stations)
            let sourceIndices = [];
            let destIndices = [];

            train.schedule.forEach((s, i) => {
                if (matchStation(s, source)) sourceIndices.push(i);
                if (matchStation(s, destination)) destIndices.push(i);
            });

            // Find at least one valid combination where source logic comes before dest
            for (let src of sourceIndices) {
                for (let dst of destIndices) {
                    if (src < dst) return true;
                }
            }
            return false;
        });

        // 1. Local Database Results
        let mappedResults = results.map(t => {
            const sourceStation = t.schedule.find(s => matchStation(s, source));
            const destStation = t.schedule.find(s => matchStation(s, destination));
            return {
                trainNumber: t.trainNumber,
                trainName: t.trainName,
                trainSource: t.source,
                trainDestination: t.destination,
                fromStation: sourceStation,
                toStation: destStation,
                runningDays: t.runningDays || []
            };
        });

        // 2. Sort chronologically
        mappedResults.sort((a, b) => {
            const timeA = a.fromStation?.departureTime || a.fromStation?.arrivalTime || "23:59";
            const timeB = b.fromStation?.departureTime || b.fromStation?.arrivalTime || "23:59";
            return timeA.localeCompare(timeB);
        });

        return res.json(mappedResults);
    } catch (err) {
        return res.status(502).json({ success: false, error: err.message });
    }
}

export async function searchTrains(req, res) {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Query parameter 'q' is required" });

    // The frontend sends format like "Train Name (12345)" or just "12345"
    // Extract numbers if present to do an exact match, otherwise fallback to text match
    const match = query.match(/\((\d+)\)$/);
    const extractedNumber = match ? match[1] : query.replace(/\D/g, '');

    const lowerQuery = query.toLowerCase();

    const results = dataStore.trains.filter(train => {
        if (extractedNumber && train.trainNumber === extractedNumber) return true;
        return train.trainNumber.toLowerCase().includes(lowerQuery) ||
            train.trainName.toLowerCase().includes(lowerQuery) ||
            // Fallback if the raw query happens to be contained entirely (e.g. "Rajdhani Exp")
            query.includes(train.trainNumber) ||
            lowerQuery.includes(train.trainName.toLowerCase());
    });

    res.json(results.map(t => ({
        trainNumber: t.trainNumber,
        trainName: t.trainName,
        source: t.source,
        destination: t.destination,
        runningDays: t.runningDays
    })));
}

export async function searchStations(req, res) {
    const query = req.query.q;
    if (!query || query.length < 2) return res.status(400).json({ error: "Query min 2 chars" });

    const lowerQuery = query.toLowerCase();

    const exactMatches = [];
    const startsWithMatches = [];
    const includesMatches = [];

    for (const station of dataStore.stationsMap.values()) {
        const lowerCode = station.code.toLowerCase();
        const lowerName = station.name ? station.name.toLowerCase() : "";

        if (lowerCode === lowerQuery) {
            exactMatches.push(station);
        } else if (lowerCode.startsWith(lowerQuery) || lowerName.startsWith(lowerQuery)) {
            startsWithMatches.push(station);
        } else if (lowerCode.includes(lowerQuery) || lowerName.includes(lowerQuery)) {
            includesMatches.push(station);
        }
    }

    // Sort to prioritize exact matches > starts with > includes
    let results = [...exactMatches, ...startsWithMatches, ...includesMatches];

    // Limit to top 20 results
    results = results.slice(0, 20);

    res.json(results);
}

export async function getStationDetails(req, res) {
    const station = dataStore.stationsMap.get(req.params.stationCode.toUpperCase());
    if (!station) return res.status(404).json({ error: "Station not found" });
    res.json(station);
}

export async function getSeatLayout(req, res) {
    const layout = dataStore.seatLayouts.find(t => t.trainNumber === req.params.trainNumber);
    if (!layout) return res.status(404).json({ error: "Layout not found" });

    const processedCoaches = layout.coaches
        .filter(coach => !NON_BOOKABLE.has(coach.classCode))
        .map(coach => {
            // Resolve type info from coachTypesMap
            const coachType = coach.coachTypeId
                ? dataStore.coachTypesMap.get(coach.coachTypeId)
                : null;
            const totalSeats = coach.totalSeats ?? coachType?.totalSeats ?? 0;

            // Expose rowStructure so the frontend can render accurate berth rows
            const rowStructure = coachType?.layout?.rowStructure ?? null;

            const seats = (coach.seats && coach.seats.length > 0)
                ? coach.seats
                : generateSeats(coach);

            return {
                coachId: coach.coachId || coach.coachNumber,
                classCode: coach.classCode,
                coachTypeId: coach.coachTypeId,
                totalSeats,
                rowStructure,   // ← NEW: array of rows from coachTypes.json
                seats
            };
        })
        .filter(coach => coach.seats.length > 0);

    res.json({ ...layout, coaches: processedCoaches });
}

export async function getAvailability(req, res) {
    const layout = dataStore.seatLayouts.find(t => t.trainNumber === req.params.trainNumber);
    if (!layout) {
        return res.json({ trainNumber: req.params.trainNumber, availability: {} });
    }

    const availabilityMap = {};
    layout.coaches
        .filter(coach => !NON_BOOKABLE.has(coach.classCode))
        .forEach(coach => {
            const cls = coach.classCode;
            if (!cls) return;

            if (!availabilityMap[cls]) {
                availabilityMap[cls] = { total: 0, booked: 0, available: 0 };
            }

            const seats = (coach.seats && coach.seats.length > 0)
                ? coach.seats
                : generateSeats(coach);

            if (seats && seats.length > 0) {
                const total = seats.length;
                const booked = seats.filter(s => s.isBooked).length;
                availabilityMap[cls].total += total;
                availabilityMap[cls].booked += booked;
                availabilityMap[cls].available += (total - booked);
            }
        });

    const availability = {};
    for (const [cls, stats] of Object.entries(availabilityMap)) {
        if (stats.available > 0) {
            availability[cls] = { status: "AVAILABLE", count: stats.available };
        } else {
            availability[cls] = { status: "WAITING LIST", count: Math.abs(stats.available) + 1 };
        }
    }

    res.json({
        trainNumber: req.params.trainNumber,
        availability: availability
    });
}

export async function getFare(req, res) {
    const { trainNumber } = req.params;
    let distanceKm = req.query.distanceKm ? Number(req.query.distanceKm) : null;
    let source = req.query.source;
    let destination = req.query.destination;

    // ── Resolve distance from schedule ──────────────────────────────────────
    if (!distanceKm && source && destination) {
        const train = dataStore.trains.find(t => t.trainNumber === trainNumber);

        const strictMatch = (s, q) => {
            const sCode = s.stationCode ? s.stationCode.toLowerCase() : '';
            return sCode === q.toLowerCase();
        };

        if (train && train.schedule) {
            const srcNode = train.schedule.find(s => strictMatch(s, source));
            const dstNode = train.schedule.find(s => strictMatch(s, destination));
            if (srcNode && dstNode && dstNode.distanceFromSourceKm >= 0 && srcNode.distanceFromSourceKm >= 0) {
                distanceKm = Math.abs(dstNode.distanceFromSourceKm - srcNode.distanceFromSourceKm);
            }
        }
    }
    if (!distanceKm || distanceKm <= 0) distanceKm = 800; // sensible fallback

    // --- Train Type Detection ---
    const trainObj = dataStore.trains.find(t => t.trainNumber === trainNumber);
    const tName = trainObj ? (trainObj.trainName || "").toUpperCase() : "";
    const isOrdinary = tName.includes("MEMU") || tName.includes("PASSENGER") || tName.includes("DEMU");
    const isSF = tName.includes("SF ") || tName.includes("SUPERFAST") || /^12|^22/.test(trainNumber);

    // --- Distance-Based Base Fare Computation ---
    const getOrdinaryBase = (dist) => {
        if (dist <= 15) return 5;
        if (dist <= 45) return 10;
        if (dist <= 65) return 15;
        if (dist <= 100) return 20;
        if (dist <= 130) return 25;
        if (dist <= 165) return 30;
        if (dist <= 200) return 35;
        if (dist <= 300) return 45;
        if (dist <= 400) return 55;
        if (dist <= 500) return 65;

        let f = 75, r = dist - 500;
        if (r > 0) { let c = Math.min(250, r); f += Math.ceil(c / 100) * 10; r -= c; }
        if (r > 0) { let c = Math.min(250, r); f += Math.ceil(c / 100) * 15; r -= c; }
        if (r > 0) { let c = Math.min(500, r); f += Math.ceil(c / 100) * 20; r -= c; }
        if (r > 0) { f += Math.ceil(r / 100) * 25; }
        return f;
    };

    const getReservedBase = (dist, cls) => {
        const maps = {
            'SL': { base: [130, 170, 210, 250, 290], add: [60, 80, 100, 120, 140, 2] },
            '3A': { base: [430, 530, 650, 750, 860], add: [110, 150, 190, 230, 270, 4] },
            '2A': { base: [730, 730, 900, 1040, 1190], add: [160, 210, 270, 330, 390, 6] },
            '1A': { base: [1030, 1030, 1270, 1470, 1680], add: [230, 300, 380, 470, 560, 8] },
            'CC': { base: [300, 400, 500, 580, 660], add: [110, 150, 190, 230, 270, 4] }
        };
        let targetCls = maps[cls] ? cls : 'SL';
        if (cls === '3E') targetCls = '3A';
        if (cls === 'EC') targetCls = '1A';

        const { base, add } = maps[targetCls];
        if (dist <= 100) return base[0];
        if (dist <= 200) return base[1];
        if (dist <= 300) return base[2];
        if (dist <= 400) return base[3];
        if (dist <= 500) return base[4];

        let f = base[4], r = dist - 500;
        if (r > 0) { let c = Math.min(250, r); f += Math.ceil(c / 100) * add[0]; r -= c; }
        if (r > 0) { let c = Math.min(250, r); f += Math.ceil(c / 100) * add[1]; r -= c; }
        if (r > 0) { let c = Math.min(500, r); f += Math.ceil(c / 100) * add[2]; r -= c; }
        if (r > 0) { let c = Math.min(1000, r); f += Math.ceil(c / 100) * add[3]; r -= c; }
        if (r > 0) { let c = Math.min(2500, r); f += Math.ceil(c / 100) * add[4]; r -= c; }
        if (r > 0) { f += r * add[5]; }

        if (cls === '3E') f = Math.round(f * 0.95);
        if (cls === 'EC') f = Math.round(f * 0.8);
        return f;
    };

    // ── Determine which classes this train actually has ──────────────────────
    const layout = dataStore.seatLayouts.find(t => t.trainNumber === trainNumber);
    let classes = ['SL', '3A', '2A', '1A']; // default
    if (layout) {
        const layoutClasses = [...new Set(
            layout.coaches
                .filter(c => !NON_BOOKABLE.has(c.classCode) || ['GS', 'UR', '2S'].includes(c.classCode))
                .map(c => c.classCode)
                .filter(Boolean)
        )];
        if (layoutClasses.length > 0) classes = layoutClasses;
    }

    const fareDetails = {};
    const fares = {};           // backward-compat flat map  { cls: totalFare }

    classes.forEach(cls => {
        let baseFare = 0;
        let resCharge = 0;
        const isAC = ['1A', '2A', '3A', '3E', 'CC', 'EC'].includes(cls);

        if (['GS', 'UR', '2S'].includes(cls)) {
            const ordBase = getOrdinaryBase(distanceKm);
            baseFare = isOrdinary ? ordBase : Math.round(ordBase * 1.5);
            resCharge = (cls === '2S') ? 15 : (isOrdinary ? 0 : 15);
        } else {
            baseFare = getReservedBase(distanceKm, cls);
            resCharge = (cls === 'SL' || cls === '2S') ? 20 : 40;
        }

        const sfCharge = isSF ? Math.round(baseFare * 0.30) : 0;
        const fuelAdjustment = 0; // Standardized out based on updated table 

        const preTax = baseFare + sfCharge + resCharge;
        const gst = isAC ? Math.round(preTax * 0.05) : 0;  // 5% GST on AC

        const totalFare = Math.max((['GS', 'UR'].includes(cls) && isOrdinary) ? 10 : 50, Math.ceil((preTax + gst) / 5) * 5); // round to ₹5

        let ratePerKm = (totalFare / distanceKm).toFixed(2);

        fareDetails[cls] = {
            label: cls,
            distanceKm: Math.round(distanceKm),
            ratePerKm: Number(ratePerKm),
            baseFare,
            fuelAdjustment,
            reservationCharge: resCharge,
            superfastCharge: sfCharge,
            gst,
            totalFare
        };
        fares[cls] = totalFare;
    });

    res.json({
        trainNumber,
        source: source || 'UNKNOWN',
        destination: destination || 'UNKNOWN',
        distanceKm: Math.round(distanceKm),
        fares,          // flat { cls: totalFare }  ← backward compatible
        fareDetails     // full breakdown per class  ← new
    });
}

