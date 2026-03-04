const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'full_trains_database.json');

// Define exactly what the user wants to map
const stationLinks = {
    // Ernakulam
    'ERS': ['ERN'],
    'ERN': ['ERS'],
    // Thiruvananthapuram
    'TVC': ['KCVL', 'TVP'],
    'KCVL': ['TVC', 'TVP'],
    'TVP': ['TVC', 'KCVL'],
    // Tiruvalla
    'TRVL': ['TVLA'],
    'TVLA': ['TRVL'],
    // Chengannur / Changanassery (sometimes confused or grouped)
    'CNGR': ['CGY'],
    'CGY': ['CNGR'],
    // Aluva
    'AWY': ['ALUVA'],
    'ALUVA': ['AWY'],
    // Thrissur
    'TCR': ['PNQ'],
    'PNQ': ['TCR'],
    // Palakkad
    'PGT': ['PGTN'],
    'PGTN': ['PGT'],
    // Kollam
    'QLN': ['KOLLAM'],
    'KOLLAM': ['QLN'],
    // Kozhikode
    'CLT': ['CALICUT'],
    'CALICUT': ['CLT'],
    // Kannur
    'CAN': ['CANNANORE'],
    'CANNANORE': ['CAN'],
    // Kottayam
    'KTYM': ['KOTTAYAM'],
    'KOTTAYAM': ['KTYM']
};

const stationNames = {
    'ERS': 'Ernakulam Jn (South)',
    'ERN': 'Ernakulam Town (North)',
    'TVC': 'Thiruvananthapuram Central',
    'KCVL': 'Kochuveli',
    'TVP': 'Thiruvananthapuram Pettah',
    'TRVL': 'Tiruvalla',
    'TVLA': 'Tiruvalla',
    'CNGR': 'Chengannur',
    'CGY': 'Changanassery',
    'AWY': 'Aluva',
    'ALUVA': 'Aluva',
    'TCR': 'Thrissur',
    'PNQ': 'Thrissur Punkunnam',
    'PGT': 'Palakkad Jn',
    'PGTN': 'Palakkad Town',
    'QLN': 'Kollam Jn',
    'KOLLAM': 'Kollam Jn',
    'CLT': 'Kozhikode Main',
    'CALICUT': 'Kozhikode Main',
    'CAN': 'Kannur',
    'CANNANORE': 'Kannur',
    'KTYM': 'Kottayam',
    'KOTTAYAM': 'Kottayam'
};

async function processDatabase() {
    console.log("Reading full_trains_database.json...");
    let rawData;
    try {
        rawData = fs.readFileSync(dbPath, 'utf8');
    } catch (e) {
        console.error("Failed to read database file:", e.message);
        return;
    }

    const trains = JSON.parse(rawData);
    let modifiedTrainsCount = 0;

    for (let train of trains) {
        if (!train.schedule || !Array.isArray(train.schedule)) continue;

        let modified = false;

        for (const [targetCode, triggers] of Object.entries(stationLinks)) {
            // Does the train already have the target code?
            const hasTarget = train.schedule.some(s => s.stationCode && s.stationCode.toUpperCase() === targetCode);
            if (hasTarget) continue;

            // Does it have one of the triggers?
            const triggerIdx = train.schedule.findIndex(s => s.stationCode && triggers.includes(s.stationCode.toUpperCase()));

            if (triggerIdx !== -1) {
                // Yes, inject the target code
                const triggerStation = train.schedule[triggerIdx];

                const newStation = {
                    ...triggerStation,
                    stationCode: targetCode,
                    stationName: stationNames[targetCode] || triggerStation.stationName,
                    // Slightly offset the distance/day so it acts perfectly as a sister station during routing
                    distanceFromSourceKm: triggerStation.distanceFromSourceKm,
                };

                // Insert the new station right after the trigger station so routing chronological order works
                train.schedule.splice(triggerIdx + 1, 0, newStation);
                modified = true;
            }
        }

        if (modified) {
            modifiedTrainsCount++;
        }
    }

    console.log(`Updated ${modifiedTrainsCount} trains with sister-station stops.`);

    fs.writeFileSync(dbPath, JSON.stringify(trains, null, 2), 'utf8');
    console.log("Successfully wrote updated full_trains_database.json");
}

processDatabase();
