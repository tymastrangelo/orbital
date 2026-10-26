// Mock data for ORBITAL
// Each variable below is what I expect my backend to send back for that endpoint.
// For now the pages read these directly. Later I'll swap them out for fetch() calls.


// GET /api/launches
let launchesResponse = {
    count: 4,
    launches: [
        {
            id: 101,
            rocket: "Falcon 9",
            mission: "Starlink Group 12-4",
            provider: "SpaceX",
            location: "Cape Canaveral SFS, FL",
            launch_date: "2026-11-02T18:30:00Z",
            status: "go",
            current_stage: 2
        },
        {
            id: 102,
            rocket: "Electron",
            mission: "Rocket Science Rules",
            provider: "Rocket Lab",
            location: "Mahia, New Zealand",
            launch_date: "2026-11-05T03:00:00Z",
            status: "tbd",
            current_stage: 0
        },
        {
            id: 103,
            rocket: "Vulcan Centaur",
            mission: "USSF-112",
            provider: "ULA",
            location: "Cape Canaveral SFS, FL",
            launch_date: "2026-11-09T21:45:00Z",
            status: "delayed",
            current_stage: 0
        },
        {
            id: 104,
            rocket: "Falcon Heavy",
            mission: "GPS III SV-09",
            provider: "SpaceX",
            location: "Kennedy Space Center, FL",
            launch_date: "2026-11-12T16:10:00Z",
            status: "tbd",
            current_stage: 0
        }
    ]
};


// GET /api/iss
let issResponse = {
    latitude: 27.4512,
    longitude: -82.1043,
    altitude_km: 418,
    speed_kmh: 27580,
    over: "Gulf of Mexico",
    timestamp: "2026-10-26T14:00:00Z"
};


// GET /api/asteroids
let asteroidsResponse = {
    count: 3,
    asteroids: [
        {
            id: 3542519,
            name: "2026 RK4",
            approach_date: "2026-10-28",
            miss_distance_km: 3200000,
            diameter_min_m: 40,
            diameter_max_m: 90,
            speed_kmh: 48200,
            hazardous: false
        },
        {
            id: 2523933,
            name: "(2019 PD2)",
            approach_date: "2026-10-30",
            miss_distance_km: 7800000,
            diameter_min_m: 210,
            diameter_max_m: 470,
            speed_kmh: 71900,
            hazardous: true
        },
        {
            id: 3612204,
            name: "2026 SB1",
            approach_date: "2026-11-01",
            miss_distance_km: 12100000,
            diameter_min_m: 15,
            diameter_max_m: 30,
            speed_kmh: 33400,
            hazardous: false
        }
    ]
};


// GET /api/space-weather
let weatherResponse = {
    kp_index: 3,
    flare_class: "M1.2",
    storm_level: "None",
    updated: "2026-10-26T14:00:00Z"
};


// GET /api/apod
let apodResponse = {
    date: "2026-10-26",
    title: "The Pillars of Creation",
    caption: "Eagle Nebula / M16",
    explanation: "Towers of gas and dust in the Eagle Nebula where new stars are forming.",
    image_url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRd8AxBhrGZi9-sER9MBxH6jvnUi_nzfIsP14J4i9I4WwlH866-x1qMJ34&s=10"
};


// GET /api/watchlist
let watchlistResponse = {
    count: 3,
    items: [
        {
            id: 1,
            type: "launch",
            ref_id: 101,
            title: "Falcon 9 | Starlink Group 12-4",
            date: "2026-11-02",
            detail: "Cape Canaveral SFS, FL",
            badge: "Go",
            badge_status: "good",
            note: ""
        },
        {
            id: 2,
            type: "asteroid",
            ref_id: 2523933,
            title: "(2019 PD2) Close Approach",
            date: "2026-10-30",
            detail: "7.8 million km",
            badge: "Hazardous",
            badge_status: "warn",
            note: ""
        },
        {
            id: 3,
            type: "iss",
            ref_id: null,
            title: "ISS Pass Over Elon, NC",
            date: "2026-10-31",
            detail: "7:42 PM EDT",
            badge: "Visible",
            badge_status: "good",
            note: "Go outside the dorm for this one"
        }
    ]
};


// POST /api/watchlist   (what comes back after saving something)
let addWatchResponse = {
    success: true,
    item: {
        id: 4,
        type: "launch",
        ref_id: 102,
        title: "Electron | Rocket Science Rules",
        date: "2026-11-05",
        detail: "Mahia, New Zealand",
        badge: "TBD",
        badge_status: "warn",
        note: ""
    }
};


// PUT /api/watchlist/:id   (updating the note on a saved item)
let updateWatchResponse = {
    success: true,
    item: {
        id: 3,
        note: "Bring the camera"
    }
};


// DELETE /api/watchlist/:id
let deleteWatchResponse = {
    success: true,
    deleted_id: 2
};
