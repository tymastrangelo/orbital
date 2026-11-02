# ORBITAL API Plan

Every page gets its data through `js/api.js`. Each function in that file is one row of the table below and returns a Promise of the JSON shape documented here. Right now those functions call the public feeds straight from the browser and reshape the answer into my planned format. When the backend exists on Chronos each function body becomes a single `fetch()` to my own URL and nothing in the page scripts changes.

`js/mock-data.js` still holds the sample JSON for every call. It is the spec for what the backend must send, and it is also the fallback: if a feed is down and there is no cached copy, `api.js` hands back the mock so the dashboard never goes blank. Cached copies live in localStorage (`orbital-cache-*`) with a max age per feed, mostly because Launch Library only allows 15 calls an hour.

I'm using the same URL pattern as the Student API from class: a plural URL returns the whole list, and a singular URL with an id is one specific item. Once it's on Chronos it'll sit behind the nginx proxy at `http://chronos.cs.elon.edu/USERNAME/api/...`.

Launches, asteroids, the ISS, space weather and APOD are read only since that data comes from outside APIs (Launch Library 2, NASA NeoWs, NASA APOD, an ISS tracker). My backend grabs it and sends it back in the shape below. The watchlist is the part the user actually owns, so that's where the full CRUD is.

## Where the data comes from today

| My call | Public feed | Cache |
|---|---|---|
| `/launches` | Launch Library 2 `launch/upcoming/?limit=30` | 20 min |
| `/asteroids` | NASA NeoWs `neo/rest/v1/feed` (today to +7 days) | 6 hours |
| `/iss` | wheretheiss.at `satellites/25544` (plus `/positions` for the ground track and `/coordinates` for what it is over) | live, polled every 5 s |
| `/spaceweather` | NOAA SWPC: planetary K index, GOES x-ray flux, NOAA scales, solar wind plasma + mag | 10 min |
| `/apod` | NASA APOD | 12 hours |
| `/watchitems` and friends | localStorage (`orbital-watchlist`) until the backend exists; every call logs the HTTP request it will become | n/a |

The NASA calls use `DEMO_KEY` (30/hour, 50/day). Swap in a real key at the top of `api.js`.

## API Calls

| Function | HTTP Method | URL | CRUD | Mock variable |
|---|---|---|---|---|
| getLaunchList | GET | /launches | Read | `launchList` |
| getLaunch | GET | /launch/:id | Read | (one item from `launchList`) |
| getAsteroidList | GET | /asteroids | Read | `asteroidList` |
| getAsteroid | GET | /asteroid/:id | Read | (one item from `asteroidList`) |
| getIssLocation | GET | /iss | Read | `issLocation` |
| getSpaceWeather | GET | /spaceweather | Read | `spaceWeather` |
| getApod | GET | /apod | Read | `apod` |
| getWatchItemList | GET | /watchitems | Read | `watchItemList` |
| getWatchItem | GET | /watchitem/:id | Read | `watchItem` |
| createWatchItem | POST | /watchitem | Create | `createdWatchItem` |
| updateWatchItem | PUT | /watchitem/:id | Update | `updatedWatchItem` |
| deleteWatchItem | DELETE | /watchitem/:id | Delete | `deletedWatchItemId` |

If an id can't be found, the `/launch/:id`, `/asteroid/:id` and `/watchitem/:id` calls return a 404 with:
```json
{ "message": "Watch item not found" }
```

## JSON Returned

### GET /launches
Returns an array of launches. `GET /launch/:id` returns one of these objects.
```json
[
  {
    "launchId": 101,
    "rocket": "Falcon 9",
    "mission": "Starlink Group 12-4",
    "provider": "SpaceX",
    "location": "Cape Canaveral SFS, FL",
    "launchDate": "2026-11-02T18:30:00Z",
    "status": "go",
    "currentStage": 2
  }
]
```
`status` is `go`, `tbc`, `tbd`, `delayed` (LL2 "Hold"), `flight`, `success` or `failed`. `currentStage` is 0 to 4 (static fire, rollout, prop load, liftoff, orbit); LL2 does not expose this so the frontend guesses it from how far out the launch is. The live mapping also adds `pad`, `padLat`, `padLon`, `windowStart`, `windowEnd`, `statusText`, `description`, `orbit`, `missionType`, `probability`, `image`, `webcast` and `providerShort`, all pulled from the LL2 object. The dashboard picks the soonest launch that has not already flown and runs the countdown off it.

### GET /asteroids
Returns an array of asteroids. `GET /asteroid/:id` returns one of these objects.
```json
[
  {
    "asteroidId": 3542519,
    "name": "2026 RK4",
    "approachDate": "2026-10-28",
    "missDistanceKm": 3200000,
    "minDiameterM": 40,
    "maxDiameterM": 90,
    "speedKmh": 48200,
    "hazardous": false
  }
]
```
Distances are plain numbers so the frontend can do the math for the proximity bar and the "3.2M" formatting. The live mapping also adds `missLunar` (lunar distances), `speedKms`, `approachTime`, `approachEpoch` (ms, used for the approach chart), `sentry`, `magnitude` and `jplUrl`.

### GET /iss
```json
{
  "latitude": 27.4512,
  "longitude": -82.1043,
  "altitudeKm": 418,
  "speedKmh": 27580,
  "over": "Gulf of Mexico",
  "timestamp": "2026-10-26T14:00:00Z"
}
```

### GET /spaceweather
```json
{
  "kpIndex": 3,
  "kpHistory": [{ "time": "2026-10-26T12:00:00", "kp": 2.67 }],
  "flareClass": "C1.2",
  "flareFlux": 1.2e-6,
  "stormLevel": "None",
  "scales": { "R": { "scale": 0, "text": "none" }, "S": { "scale": 0, "text": "none" }, "G": { "scale": 0, "text": "none" } },
  "solarWindSpeed": 410,
  "solarWindDensity": 4.2,
  "bz": -1.5,
  "updated": "2026-10-26T14:00:00Z"
}
```
`flareClass` comes from the GOES long-channel x-ray flux (A/B/C/M/X, each a factor of 10). `stormLevel` is the NOAA G scale as a word.

### GET /apod
```json
{
  "date": "2026-10-26",
  "title": "The Pillars of Creation",
  "caption": "Eagle Nebula / M16",
  "explanation": "Towers of gas and dust in the Eagle Nebula where new stars are forming.",
  "imageUrl": "https://..."
}
```

### GET /watchitems
Returns an array. `GET /watchitem/:id` returns one of these objects.
```json
[
  {
    "watchItemId": 1,
    "type": "launch",
    "refId": 101,
    "title": "Falcon 9 | Starlink Group 12-4",
    "date": "2026-11-02",
    "detail": "Cape Canaveral SFS, FL",
    "badge": "Go",
    "badgeStatus": "good",
    "note": ""
  }
]
```
`type` is `launch`, `asteroid`, or `iss`. `refId` points back to the `launchId` or `asteroidId`. `badgeStatus` is `good`, `warn`, or `bad` so it lines up with the badge classes in my CSS.

### POST /watchitem
Body (same object, no `watchItemId` because the backend makes that, like createStudent):
```json
{
  "type": "launch",
  "refId": 102,
  "title": "Electron | Rocket Science Rules",
  "date": "2026-11-05",
  "detail": "Mahia, New Zealand",
  "badge": "TBD",
  "badgeStatus": "warn",
  "note": ""
}
```
Returns the new item with its `watchItemId` filled in (`"watchItemId": 4`).

### PUT /watchitem/:id
Body is the full watch item with the changed values (for example a new `note`). Returns the updated item.

### DELETE /watchitem/:id
Returns the id that was deleted:
```json
2
```

## What's live now

- **Dashboard:** next launch, live countdown, stage tracker, ISS readout, asteroid table, Kp gauge, flare/storm badges, and APOD are all built from the mock data. The header clock shows the real UTC time.
- **Launches:** table, stat boxes, and the provider filter chips are generated from the data (a new provider gets its own chip automatically). Search and the chips filter the table. "+ Watch" builds the POST body and logs it to the console.
- **Asteroids:** cards and stat boxes come from the data. The proximity bar and rock size are calculated from miss distance and diameter. Search filters the cards.
- **Watchlist:** items are built from the data and sorted by date. "Note" edits an item (PUT) and "Remove" deletes it (DELETE). For now those change the array in memory and log the call to the console.
