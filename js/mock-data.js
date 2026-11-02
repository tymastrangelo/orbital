// Mock data for ORBITAL
// Each variable below is what I expect my backend to send back for that call.
// URLs follow the same pattern as the Student API from class:
//   plural url = the whole list, singular url + id = one item
// The pages get these through api.js now. api.js calls the real public feeds and only falls
// back to these if a feed is down, so this file doubles as the spec for what my backend sends.


// GET /launches
let launchList = [
    {
        launchId: 101,
        rocket: "Falcon 9",
        mission: "Starlink Group 12-4",
        provider: "SpaceX",
        location: "Cape Canaveral SFS, FL",
        launchDate: "2026-11-20T18:30:00Z",
        status: "go",
        currentStage: 2
    },
    {
        launchId: 102,
        rocket: "Electron",
        mission: "Rocket Science Rules",
        provider: "Rocket Lab",
        location: "Mahia, New Zealand",
        launchDate: "2026-11-23T03:00:00Z",
        status: "tbd",
        currentStage: 0
    },
    {
        launchId: 103,
        rocket: "Vulcan Centaur",
        mission: "USSF-112",
        provider: "ULA",
        location: "Cape Canaveral SFS, FL",
        launchDate: "2026-11-27T21:45:00Z",
        status: "delayed",
        currentStage: 0
    },
    {
        launchId: 104,
        rocket: "Falcon Heavy",
        mission: "GPS III SV-09",
        provider: "SpaceX",
        location: "Kennedy Space Center, FL",
        launchDate: "2026-12-01T16:10:00Z",
        status: "tbd",
        currentStage: 0
    }
];


// GET /asteroids
let asteroidList = [
    {
        asteroidId: 3542519,
        name: "2026 RK4",
        approachDate: "2026-11-19",
        missDistanceKm: 3200000,
        minDiameterM: 40,
        maxDiameterM: 90,
        speedKmh: 48200,
        hazardous: false
    },
    {
        asteroidId: 2523933,
        name: "(2019 PD2)",
        approachDate: "2026-11-21",
        missDistanceKm: 7800000,
        minDiameterM: 210,
        maxDiameterM: 470,
        speedKmh: 71900,
        hazardous: true
    },
    {
        asteroidId: 3612204,
        name: "2026 SB1",
        approachDate: "2026-11-24",
        missDistanceKm: 12100000,
        minDiameterM: 15,
        maxDiameterM: 30,
        speedKmh: 33400,
        hazardous: false
    }
];


// GET /iss
let issLocation = {
    latitude: 27.4512,
    longitude: -82.1043,
    altitudeKm: 418,
    speedKmh: 27580,
    over: "Gulf of Mexico",
    visibility: "daylight",
    footprintKm: 4500,
    timestamp: "2026-10-26T14:00:00Z"
};


// GET /spaceweather
let spaceWeather = {
    kpIndex: 3,
    flareClass: "C1.2",
    stormLevel: "None",
    kpHistory: [],
    scales: null,
    solarWindSpeed: 410,
    solarWindDensity: 4.2,
    bz: -1.5,
    updated: "2026-10-26T14:00:00Z"
};


// GET /apod
let apod = {
    date: "2026-10-26",
    title: "The Pillars of Creation",
    caption: "Eagle Nebula / M16",
    explanation: "Towers of gas and dust in the Eagle Nebula where new stars are forming.",
    imageUrl: ""   // the real feed fills this in, blank shows the placeholder frame
};


// ---------- Watchlist (full CRUD) ----------

// GET /watchitems
let watchItemList = [
    {
        watchItemId: 1,
        type: "launch",
        refId: 101,
        title: "Falcon 9 | Starlink Group 12-4",
        date: "2026-11-20",
        detail: "Cape Canaveral SFS, FL",
        badge: "Go",
        badgeStatus: "good",
        note: ""
    },
    {
        watchItemId: 2,
        type: "asteroid",
        refId: 2523933,
        title: "(2019 PD2) Close Approach",
        date: "2026-11-21",
        detail: "7.8 million km",
        badge: "Hazardous",
        badgeStatus: "warn",
        note: ""
    },
    {
        watchItemId: 3,
        type: "iss",
        refId: null,
        title: "ISS Pass Over Elon, NC",
        date: "2026-11-22",
        detail: "7:42 PM EST",
        badge: "Visible",
        badgeStatus: "good",
        note: "Go outside the dorm for this one"
    }
];

// GET /watchitem/:id   (returns one item, same shape as above)
let watchItem = watchItemList[0];

// POST /watchitem   (sends the item without an id, gets it back with one)
let createdWatchItem = {
    watchItemId: 4,
    type: "launch",
    refId: 102,
    title: "Electron | Rocket Science Rules",
    date: "2026-11-23",
    detail: "Mahia, New Zealand",
    badge: "TBD",
    badgeStatus: "warn",
    note: ""
};

// PUT /watchitem/:id   (returns the updated item)
let updatedWatchItem = {
    watchItemId: 3,
    type: "iss",
    refId: null,
    title: "ISS Pass Over Elon, NC",
    date: "2026-11-22",
    detail: "7:42 PM EST",
    badge: "Visible",
    badgeStatus: "good",
    note: "Bring the camera"
};

// DELETE /watchitem/:id   (returns the id that was deleted)
let deletedWatchItemId = 2;

// any /watchitem/:id call where the id doesn't exist (status 404)
let notFoundResponse = { message: "Watch item not found" };
