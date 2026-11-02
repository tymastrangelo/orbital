// ORBITAL api layer
//
// Every function in here is one row of API_PLAN.md. Right now they call the public
// feeds straight from the browser and reshape whatever comes back into the JSON my
// own backend will send later. The page scripts only ever see the planned shape,
// so when the Chronos backend exists each function body turns into one fetch()
// to /USERNAME/api/... and nothing else has to change.
//
// Everything returns a Promise. If a feed is down we fall back to the last copy we
// cached in localStorage, and if there's no cache at all we fall back to mock-data.js
// so the dashboard never shows an empty panel.

// get your own key at https://api.nasa.gov (DEMO_KEY is 30 calls/hour, 50/day per ip)
let NASA_API_KEY = "DEMO_KEY";

let FEED_URLS = {
    launches: "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=30&hide_recent_previous=true",
    iss: "https://api.wheretheiss.at/v1/satellites/25544",
    issTrack: "https://api.wheretheiss.at/v1/satellites/25544/positions?units=kilometers&timestamps=",
    issOver: "https://api.wheretheiss.at/v1/coordinates/",
    apod: "https://api.nasa.gov/planetary/apod?api_key=" + NASA_API_KEY,
    neo: "https://api.nasa.gov/neo/rest/v1/feed?api_key=" + NASA_API_KEY,
    kp: "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
    xray: "https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json",
    scales: "https://services.swpc.noaa.gov/products/noaa-scales.json",
    wind: "https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json",
    mag: "https://services.swpc.noaa.gov/products/solar-wind/mag-1-day.json"
};

// where each piece of data actually came from on this page load.
// the header LEDs and the mission log read this.
let feedStatus = {};

function setFeedStatus(feed, status, detail) {
    feedStatus[feed] = status;
    // common.js listens for this and updates the LEDs + log
    document.dispatchEvent(new CustomEvent("feedstatus", { detail: { feed: feed, status: status, text: detail } }));
}


// ---- cache + fetch ----

function readCache(key) {
    try {
        let raw = localStorage.getItem("orbital-cache-" + key);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function writeCache(key, data) {
    try {
        localStorage.setItem("orbital-cache-" + key, JSON.stringify({ time: Date.now(), data: data }));
    } catch (e) {
        // storage full or blocked, not a big deal
    }
}

// fetch json, but reuse the cached copy if it's younger than maxAgeMin.
// if the fetch fails and there's an old copy, use that instead of blowing up.
// resolves to { data, source } where source is "live", "cache" or "stale"
async function cachedFetch(key, url, maxAgeMin) {
    let cached = readCache(key);
    if (cached && Date.now() - cached.time < maxAgeMin * 60000) {
        return { data: cached.data, source: "cache", age: Date.now() - cached.time };
    }

    try {
        let res = await fetch(url);
        if (!res.ok) {
            throw new Error("HTTP " + res.status);
        }
        let data = await res.json();
        writeCache(key, data);
        return { data: data, source: "live", age: 0 };
    } catch (err) {
        if (cached) {
            return { data: cached.data, source: "stale", age: Date.now() - cached.time };
        }
        throw err;
    }
}


// ---- launches (Launch Library 2) ----
// LL2 only allows 15 calls an hour without a key so this one is cached hard.

// LL2 status abbrevs -> the status words the css knows about
function mapLaunchStatus(abbrev) {
    if (abbrev === "Go") return "go";
    if (abbrev === "TBC") return "tbc";
    if (abbrev === "Hold") return "delayed";
    if (abbrev === "In Flight") return "flight";
    if (abbrev === "Success") return "success";
    if (abbrev === "Failure" || abbrev === "Partial Failure") return "failed";
    return "tbd";
}

// LL2 doesn't tell you where the rocket is in the flow, so this guesses from
// how far out the launch is. 0 static fire, 1 rollout, 2 prop load, 3 liftoff, 4 orbit
function guessStage(launch) {
    if (launch.status === "success") return 4;
    if (launch.status === "flight") return 3;
    let hoursOut = (new Date(launch.launchDate) - Date.now()) / 3600000;
    if (hoursOut <= 0) return 3;
    if (hoursOut < 1) return 2;
    if (hoursOut < 36) return 1;
    return 0;
}

// "Cape Canaveral SFS, FL, USA" is nicer than the full LL2 location string
function shortLocation(name) {
    if (!name) return "Unknown";
    let parts = name.split(",").map(function (p) { return p.trim(); });
    if (parts.length > 2) {
        return parts.slice(0, 2).join(", ");
    }
    return name;
}

function mapLaunch(l) {
    let mission = l.mission || {};
    let pad = l.pad || {};
    let launch = {
        launchId: l.id,
        rocket: l.rocket && l.rocket.configuration ? l.rocket.configuration.name : "Unknown rocket",
        mission: mission.name || l.name.split(" | ")[1] || l.name,
        provider: l.launch_service_provider ? l.launch_service_provider.name : "Unknown",
        // LL2 gives "CASC" style abbreviations, handy when the full name is a mouthful
        providerShort: l.launch_service_provider ? (l.launch_service_provider.name.length > 22 && l.launch_service_provider.abbrev ? l.launch_service_provider.abbrev : l.launch_service_provider.name) : "Unknown",
        location: shortLocation(pad.location ? pad.location.name : ""),
        pad: pad.name || "",
        padLat: pad.latitude ? Number(pad.latitude) : null,
        padLon: pad.longitude ? Number(pad.longitude) : null,
        launchDate: l.net,
        windowStart: l.window_start,
        windowEnd: l.window_end,
        status: mapLaunchStatus(l.status ? l.status.abbrev : ""),
        statusText: l.status ? l.status.name : "Unknown",
        description: mission.description || "",
        orbit: mission.orbit ? mission.orbit.name : "",
        missionType: mission.type || "",
        probability: typeof l.probability === "number" ? l.probability : null,
        image: l.image || "",
        webcast: l.vidURLs && l.vidURLs.length ? l.vidURLs[0].url : "",
        currentStage: 0
    };
    launch.currentStage = guessStage(launch);
    return launch;
}

// GET /launches
async function getLaunchList() {
    try {
        let result = await cachedFetch("launches", FEED_URLS.launches, 20);
        let list = result.data.results.map(mapLaunch);
        setFeedStatus("launches", result.source, list.length + " launches");
        return list;
    } catch (err) {
        setFeedStatus("launches", "down", err.message);
        return launchList.map(function (l) {
            return Object.assign({}, l, { providerShort: l.provider, statusText: l.status, pad: "", image: "", description: "", orbit: "", missionType: "", probability: null, webcast: "" });
        });
    }
}

// GET /launch/:id
async function getLaunch(id) {
    let list = await getLaunchList();
    let found = list.find(function (l) { return String(l.launchId) === String(id); });
    if (!found) {
        throw new Error("Launch not found");
    }
    return found;
}


// ---- asteroids (NASA NeoWs) ----
// feed endpoint gives up to 7 days at a time

function isoDay(d) {
    return d.toISOString().substring(0, 10);
}

function mapAsteroid(a) {
    let cad = a.close_approach_data[0] || {};
    let km = a.estimated_diameter ? a.estimated_diameter.meters : { estimated_diameter_min: 0, estimated_diameter_max: 0 };
    return {
        asteroidId: Number(a.id),
        name: a.name,
        approachDate: cad.close_approach_date || "",
        approachTime: cad.close_approach_date_full || "",
        approachEpoch: cad.epoch_date_close_approach || 0,
        missDistanceKm: cad.miss_distance ? Math.round(Number(cad.miss_distance.kilometers)) : 0,
        missLunar: cad.miss_distance ? Number(cad.miss_distance.lunar) : 0,
        minDiameterM: Math.round(km.estimated_diameter_min),
        maxDiameterM: Math.round(km.estimated_diameter_max),
        speedKmh: cad.relative_velocity ? Math.round(Number(cad.relative_velocity.kilometers_per_hour)) : 0,
        speedKms: cad.relative_velocity ? Number(cad.relative_velocity.kilometers_per_second) : 0,
        hazardous: a.is_potentially_hazardous_asteroid === true,
        sentry: a.is_sentry_object === true,
        magnitude: a.absolute_magnitude_h,
        jplUrl: a.nasa_jpl_url || ""
    };
}

// GET /asteroids
async function getAsteroidList() {
    let start = new Date();
    let end = new Date(Date.now() + 7 * 86400000);
    let url = FEED_URLS.neo + "&start_date=" + isoDay(start) + "&end_date=" + isoDay(end);

    try {
        let result = await cachedFetch("neo-" + isoDay(start), url, 360);
        let list = [];
        let byDay = result.data.near_earth_objects;
        Object.keys(byDay).forEach(function (day) {
            byDay[day].forEach(function (a) {
                list.push(mapAsteroid(a));
            });
        });
        list.sort(function (a, b) { return a.approachEpoch - b.approachEpoch; });
        setFeedStatus("nasa", result.source, list.length + " objects");
        return list;
    } catch (err) {
        setFeedStatus("nasa", "down", err.message);
        return asteroidList.map(function (a) {
            return Object.assign({ approachEpoch: new Date(a.approachDate + "T12:00:00Z").getTime(), missLunar: a.missDistanceKm / 384400, speedKms: a.speedKmh / 3600, sentry: false, magnitude: 0, jplUrl: "", approachTime: "" }, a);
        });
    }
}

// GET /asteroid/:id
async function getAsteroid(id) {
    let list = await getAsteroidList();
    let found = list.find(function (a) { return String(a.asteroidId) === String(id); });
    if (!found) {
        throw new Error("Asteroid not found");
    }
    return found;
}


// ---- ISS (wheretheiss.at) ----
// live, never cached. the site asks for no more than 1 call a second.

function mapIss(p) {
    return {
        latitude: p.latitude,
        longitude: p.longitude,
        altitudeKm: Math.round(p.altitude),
        speedKmh: Math.round(p.velocity),
        visibility: p.visibility,        // "daylight" or "eclipsed"
        footprintKm: Math.round(p.footprint),
        solarLat: p.solar_lat,
        solarLon: p.solar_lon,
        timestamp: new Date(p.timestamp * 1000).toISOString(),
        over: ""
    };
}

// GET /iss
async function getIssLocation() {
    try {
        let res = await fetch(FEED_URLS.iss);
        if (!res.ok) throw new Error("HTTP " + res.status);
        let data = await res.json();
        let iss = mapIss(data);
        writeCache("iss", data);
        setFeedStatus("iss", "live", "fix " + iss.latitude.toFixed(2) + ", " + iss.longitude.toFixed(2));
        return iss;
    } catch (err) {
        setFeedStatus("iss", "down", err.message);
        let cached = readCache("iss");
        if (cached) {
            let iss = mapIss(cached.data);
            iss.stale = true;
            return iss;
        }
        return Object.assign({ visibility: "daylight", footprintKm: 4500, solarLat: 0, solarLon: 0 }, issLocation);
    }
}

// what's under the station. wheretheiss has a coordinates endpoint that gives
// a country code / timezone for a lat,lon. over the ocean there's no country.
async function getIssOver(lat, lon) {
    try {
        let res = await fetch(FEED_URLS.issOver + lat.toFixed(2) + "," + lon.toFixed(2));
        if (!res.ok) throw new Error("HTTP " + res.status);
        let data = await res.json();
        if (data.country_code && data.country_code !== "??") {
            return data.country_code + " / " + (data.timezone_id || "").replace(/_/g, " ");
        }
        return "Open ocean / " + (data.timezone_id || "").replace(/_/g, " ");
    } catch (err) {
        return "";
    }
}

// positions 45 min either side of now so the map can draw the ground track.
// the endpoint takes up to 10 timestamps per call, so this is two calls.
async function getIssTrack() {
    let now = Math.floor(Date.now() / 1000);
    let past = [];
    let future = [];
    for (let i = 9; i >= 1; i--) {
        past.push(now - i * 300);
    }
    for (let i = 1; i <= 10; i++) {
        future.push(now + i * 300);
    }

    try {
        let a = null;
        let b = null;
        // the track barely moves in a minute, don't hammer the api for it
        let cached = readCache("iss-track");
        if (cached && Date.now() - cached.time < 60000) {
            a = cached.data.past;
            b = cached.data.future;
        } else {
            let resA = await fetch(FEED_URLS.issTrack + past.join(","));
            let resB = await fetch(FEED_URLS.issTrack + future.join(","));
            if (!resA.ok || !resB.ok) throw new Error("track fetch failed");
            a = await resA.json();
            b = await resB.json();
            writeCache("iss-track", { past: a, future: b });
        }
        let toPoint = function (p) {
            return { lat: p.latitude, lon: p.longitude, t: p.timestamp };
        };
        return { past: a.map(toPoint), future: b.map(toPoint) };
    } catch (err) {
        return { past: [], future: [] };
    }
}


// ---- space weather (NOAA SWPC) ----
// five little feeds get squashed into one object

// GOES x-ray flux (watts/m2, long channel) -> flare class like "C2.4"
function flareClassFromFlux(flux) {
    if (!flux || flux <= 0) return "A0.0";
    let letters = [["X", 1e-4], ["M", 1e-5], ["C", 1e-6], ["B", 1e-7], ["A", 1e-8]];
    for (let i = 0; i < letters.length; i++) {
        if (flux >= letters[i][1]) {
            return letters[i][0] + (flux / letters[i][1]).toFixed(1);
        }
    }
    return "A" + (flux / 1e-8).toFixed(1);
}

// SWPC "products" feeds are arrays of arrays with a header row.
// this turns them into objects so the rest of the code is readable.
function rowsToObjects(rows) {
    if (!rows || !rows.length) return [];
    if (!Array.isArray(rows[0])) return rows;   // already objects
    let header = rows[0];
    let out = [];
    for (let i = 1; i < rows.length; i++) {
        let obj = {};
        for (let j = 0; j < header.length; j++) {
            obj[header[j]] = rows[i][j];
        }
        out.push(obj);
    }
    return out;
}

function lastGood(rows, field) {
    for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i][field] !== null && rows[i][field] !== undefined && rows[i][field] !== "") {
            return rows[i];
        }
    }
    return null;
}

let gScaleText = ["None", "Minor", "Moderate", "Strong", "Severe", "Extreme"];

// GET /spaceweather
async function getSpaceWeather() {
    let results = await Promise.allSettled([
        cachedFetch("kp", FEED_URLS.kp, 10),
        cachedFetch("xray", FEED_URLS.xray, 10),
        cachedFetch("scales", FEED_URLS.scales, 10),
        cachedFetch("wind", FEED_URLS.wind, 10),
        cachedFetch("mag", FEED_URLS.mag, 10)
    ]);

    let okCount = results.filter(function (r) { return r.status === "fulfilled"; }).length;
    if (okCount === 0) {
        setFeedStatus("swpc", "down", "all five feeds failed");
        return Object.assign({ kpHistory: [], scales: null, solarWindSpeed: null, solarWindDensity: null, bz: null, flareFlux: null }, spaceWeather);
    }

    let w = {
        kpIndex: null,
        kpHistory: [],
        flareClass: "",
        flareFlux: null,
        stormLevel: "None",
        scales: null,
        solarWindSpeed: null,
        solarWindDensity: null,
        bz: null,
        updated: new Date().toISOString()
    };

    // kp, last ~3 days in 3 hour steps
    if (results[0].status === "fulfilled") {
        let rows = rowsToObjects(results[0].value.data);
        rows.forEach(function (r) {
            w.kpHistory.push({ time: r.time_tag, kp: Number(r.Kp) });
        });
        let latest = lastGood(rows, "Kp");
        if (latest) {
            w.kpIndex = Number(latest.Kp);
            w.updated = latest.time_tag.endsWith("Z") ? latest.time_tag : latest.time_tag + "Z";
        }
    }

    // x-rays: the 0.1-0.8nm channel is the one flare classes are based on
    if (results[1].status === "fulfilled") {
        let longChannel = results[1].value.data.filter(function (r) { return r.energy === "0.1-0.8nm"; });
        let latest = longChannel[longChannel.length - 1];
        if (latest) {
            w.flareFlux = latest.flux;
            w.flareClass = flareClassFromFlux(latest.flux);
        }
    }

    // noaa R / S / G scales for right now
    if (results[2].status === "fulfilled") {
        let now = results[2].value.data["0"];
        if (now) {
            w.scales = {
                R: { scale: Number(now.R.Scale), text: now.R.Text },
                S: { scale: Number(now.S.Scale), text: now.S.Text },
                G: { scale: Number(now.G.Scale), text: now.G.Text }
            };
            w.stormLevel = gScaleText[Number(now.G.Scale)] || "None";
        }
    }

    // solar wind plasma
    if (results[3].status === "fulfilled") {
        let rows = rowsToObjects(results[3].value.data);
        let latest = lastGood(rows, "speed");
        if (latest) {
            w.solarWindSpeed = Math.round(Number(latest.speed));
            w.solarWindDensity = Number(latest.density);
        }
    }

    // magnetic field, bz pointing south (negative) is what lets storms in
    if (results[4].status === "fulfilled") {
        let rows = rowsToObjects(results[4].value.data);
        let latest = lastGood(rows, "bz_gsm");
        if (latest) {
            w.bz = Number(latest.bz_gsm);
        }
    }

    let source = results.some(function (r) { return r.status === "fulfilled" && r.value.source === "live"; }) ? "live" : "cache";
    setFeedStatus("swpc", source, okCount + "/5 feeds");
    return w;
}


// ---- APOD ----

// GET /apod
async function getApod() {
    try {
        let result = await cachedFetch("apod-" + isoDay(new Date()), FEED_URLS.apod, 720);
        let a = result.data;
        let isImage = a.media_type === "image";
        setFeedStatus("nasa", result.source, "APOD " + a.date);
        return {
            date: a.date,
            title: a.title,
            caption: a.copyright ? "Image credit: " + a.copyright.trim() : "NASA Astronomy Picture of the Day",
            explanation: a.explanation,
            imageUrl: isImage ? a.url : (a.thumbnail_url || ""),
            hdUrl: isImage ? (a.hdurl || a.url) : a.url,
            mediaType: a.media_type,
            link: "https://apod.nasa.gov/apod/astropix.html"
        };
    } catch (err) {
        setFeedStatus("nasa", "down", err.message);
        return Object.assign({ hdUrl: apod.imageUrl, mediaType: "image", link: "https://apod.nasa.gov/apod/astropix.html" }, apod);
    }
}


// ---- watchlist (the CRUD part) ----
// this is the data the user actually owns, so it's the one that gets the full
// create / read / update / delete set. until the backend exists it lives in
// localStorage, and each function logs the http call it will turn into.

let WATCH_KEY = "orbital-watchlist";

function loadWatchItems() {
    let raw = localStorage.getItem(WATCH_KEY);
    if (raw === null) {
        // first visit, start with the sample items from mock-data.js
        localStorage.setItem(WATCH_KEY, JSON.stringify(watchItemList));
        return watchItemList.slice();
    }
    return JSON.parse(raw);
}

function saveWatchItems(items) {
    localStorage.setItem(WATCH_KEY, JSON.stringify(items));
}

function nextWatchId(items) {
    let max = 0;
    items.forEach(function (w) {
        if (w.watchItemId > max) max = w.watchItemId;
    });
    return max + 1;
}

// GET /watchitems
async function getWatchItemList() {
    console.log("GET /watchitems");
    return loadWatchItems();
}

// GET /watchitem/:id
async function getWatchItem(id) {
    console.log("GET /watchitem/" + id);
    let found = loadWatchItems().find(function (w) { return w.watchItemId === id; });
    if (!found) {
        throw new Error("Watch item not found");
    }
    return found;
}

// POST /watchitem   (body has no id, the "backend" makes it)
async function createWatchItem(body) {
    console.log("POST /watchitem", body);
    let items = loadWatchItems();
    let item = Object.assign({ watchItemId: nextWatchId(items) }, body);
    items.push(item);
    saveWatchItems(items);
    return item;
}

// PUT /watchitem/:id
async function updateWatchItem(id, body) {
    console.log("PUT /watchitem/" + id, body);
    let items = loadWatchItems();
    let index = items.findIndex(function (w) { return w.watchItemId === id; });
    if (index === -1) {
        throw new Error("Watch item not found");
    }
    items[index] = Object.assign({}, items[index], body, { watchItemId: id });
    saveWatchItems(items);
    return items[index];
}

// DELETE /watchitem/:id
async function deleteWatchItem(id) {
    console.log("DELETE /watchitem/" + id);
    let items = loadWatchItems();
    let remaining = items.filter(function (w) { return w.watchItemId !== id; });
    if (remaining.length === items.length) {
        throw new Error("Watch item not found");
    }
    saveWatchItems(remaining);
    return id;
}

// quick lookup so the launches / asteroids pages can grey out the + Watch button
function isWatched(type, refId) {
    return loadWatchItems().some(function (w) {
        return w.type === type && String(w.refId) === String(refId);
    });
}
