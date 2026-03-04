import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const trainsDataPath = path.join(__dirname, '../../data', 'full_trains_database.json');
const seatLayoutDataPath = path.join(__dirname, '../../data', 'smartRailTrainsLayout.json');
const coachTypesPath = path.join(__dirname, '../../data', 'coachTypes.json');

const dataStore = {
    trains: [],
    seatLayouts: [],
    // Map<coachTypeId, coachTypeEntry> — e.g. "SL-72" -> { totalSeats, layout: { rowStructure } }
    coachTypesMap: new Map(),
    stationsMap: new Map()
};

const loadData = () => {
    try {
        if (fs.existsSync(trainsDataPath)) {
            const rawTrainData = fs.readFileSync(trainsDataPath, 'utf8');
            dataStore.trains = JSON.parse(rawTrainData);
            console.log(`[DataLoader] Loaded ${dataStore.trains.length} trains.`);

            dataStore.stationsMap.clear();
            dataStore.trains.forEach(train => {
                if (train.schedule) {
                    train.schedule.forEach(stop => {
                        if (stop.stationCode && !dataStore.stationsMap.has(stop.stationCode)) {
                            dataStore.stationsMap.set(stop.stationCode, {
                                code: stop.stationCode,
                                name: stop.stationName
                            });
                        }
                    });
                }
            });



            console.log(`[DataLoader] Extracted ${dataStore.stationsMap.size} unique stations.`);
        } else {
            console.warn(`[DataLoader] Warning: ${trainsDataPath} not found.`);
        }

        if (fs.existsSync(seatLayoutDataPath)) {
            const rawLayout = fs.readFileSync(seatLayoutDataPath, 'utf8');
            dataStore.seatLayouts = JSON.parse(rawLayout);
            console.log(`[DataLoader] Loaded ${dataStore.seatLayouts.length} seat layouts.`);
        }

        if (fs.existsSync(coachTypesPath)) {
            const rawTypes = fs.readFileSync(coachTypesPath, 'utf8');
            const coachTypesArray = JSON.parse(rawTypes);
            dataStore.coachTypesMap.clear();
            coachTypesArray.forEach(ct => {
                dataStore.coachTypesMap.set(ct.coachTypeId, ct);
            });
            console.log(`[DataLoader] Loaded ${dataStore.coachTypesMap.size} coach types.`);
        }

    } catch (err) {
        console.error("[DataLoader] Error loading data:", err);
    }
};

// Load immediately
loadData();

export {
    dataStore,
    loadData
};

