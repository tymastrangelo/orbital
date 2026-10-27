# ORBITAL API Plan

Right now every page reads from mock JSON in `js/mock-data.js`. Each variable in that file is what one of these API calls will return once the backend is built. The page scripts (`dashboard.js`, `launches.js`, `asteroids.js`, `watchlist.js`) build the HTML from that data instead of it being hardcoded.

I'm using the same URL pattern as the Student API from class: a plural URL returns the whole list, and a singular URL with an id is one specific item. Once it's on Chronos it'll sit behind the nginx proxy at `http://chronos.cs.elon.edu/USERNAME/api/...`.

Launches, asteroids, the ISS, space weather and APOD are read only since that data comes from outside APIs (Launch Library 2, NASA NeoWs, NASA APOD, an ISS tracker). My backend grabs it and sends it back in the shape below. The watchlist is the part the user actually owns, so that's where the full CRUD is.

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
`status` is `go`, `tbd`, or `delayed`. `currentStage` is 0 to 4 (static fire, rollout, prop load, liftoff, orbit). The dashboard picks the launch with the soonest `launchDate` and runs the countdown off it.

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
Distances are plain numbers so the frontend can do the math for the proximity bar and the "3.2M" formatting.

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
  "flareClass": "M1.2",
  "stormLevel": "None",
  "updated": "2026-10-26T14:00:00Z"
}
```

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

## What's dynamic now

- **Dashboard:** next launch, live countdown, stage tracker, ISS readout, asteroid table, Kp gauge, flare/storm badges, and APOD are all built from the mock data. The header clock shows the real UTC time.
- **Launches:** table, stat boxes, and the provider filter chips are generated from the data (a new provider gets its own chip automatically). Search and the chips filter the table. "+ Watch" builds the POST body and logs it to the console.
- **Asteroids:** cards and stat boxes come from the data. The proximity bar and rock size are calculated from miss distance and diameter. Search filters the cards.
- **Watchlist:** items are built from the data and sorted by date. "Note" edits an item (PUT) and "Remove" deletes it (DELETE). For now those change the array in memory and log the call to the console.
