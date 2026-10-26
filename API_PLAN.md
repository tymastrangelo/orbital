# ORBITAL API Plan

Right now every page reads from mock JSON in `js/mock-data.js`. Each variable in that file matches what one of these endpoints will return once I build the backend. The page scripts (`dashboard.js`, `launches.js`, `asteroids.js`, `watchlist.js`) build the HTML from that data instead of having it hardcoded.

Most of the data (launches, asteroids, ISS, weather, APOD) is read only since it comes from outside APIs (Launch Library 2, NASA NeoWs, NASA APOD, an ISS tracker). My backend will grab it, clean it up, and send it back in the shape below. The watchlist is the part users actually own, so that's where the full CRUD happens.

## Endpoints

| Method | Endpoint | CRUD | Used on | Mock variable |
|---|---|---|---|---|
| GET | /api/launches | Read | Dashboard, Launches | `launchesResponse` |
| GET | /api/asteroids | Read | Dashboard, Asteroids | `asteroidsResponse` |
| GET | /api/iss | Read | Dashboard | `issResponse` |
| GET | /api/space-weather | Read | Dashboard | `weatherResponse` |
| GET | /api/apod | Read | Dashboard | `apodResponse` |
| GET | /api/watchlist | Read | Watchlist | `watchlistResponse` |
| POST | /api/watchlist | Create | Launches ("+ Watch" button) | `addWatchResponse` |
| PUT | /api/watchlist/:id | Update | Watchlist ("Note" button) | `updateWatchResponse` |
| DELETE | /api/watchlist/:id | Delete | Watchlist ("Remove" button) | `deleteWatchResponse` |

## JSON returned

### GET /api/launches
```json
{
  "count": 4,
  "launches": [
    {
      "id": 101,
      "rocket": "Falcon 9",
      "mission": "Starlink Group 12-4",
      "provider": "SpaceX",
      "location": "Cape Canaveral SFS, FL",
      "launch_date": "2026-11-02T18:30:00Z",
      "status": "go",
      "current_stage": 2
    }
  ]
}
```
`status` is `go`, `tbd`, or `delayed`. `current_stage` is 0 to 4 (static fire, rollout, prop load, liftoff, orbit). The dashboard picks the launch with the soonest `launch_date` and runs the countdown off it.

### GET /api/asteroids
```json
{
  "count": 3,
  "asteroids": [
    {
      "id": 3542519,
      "name": "2026 RK4",
      "approach_date": "2026-10-28",
      "miss_distance_km": 3200000,
      "diameter_min_m": 40,
      "diameter_max_m": 90,
      "speed_kmh": 48200,
      "hazardous": false
    }
  ]
}
```
Distances come back as plain numbers so the frontend can do the math for the proximity bar and the "3.2M" formatting.

### GET /api/iss
```json
{
  "latitude": 27.4512,
  "longitude": -82.1043,
  "altitude_km": 418,
  "speed_kmh": 27580,
  "over": "Gulf of Mexico",
  "timestamp": "2026-10-26T14:00:00Z"
}
```

### GET /api/space-weather
```json
{
  "kp_index": 3,
  "flare_class": "M1.2",
  "storm_level": "None",
  "updated": "2026-10-26T14:00:00Z"
}
```

### GET /api/apod
```json
{
  "date": "2026-10-26",
  "title": "The Pillars of Creation",
  "caption": "Eagle Nebula / M16",
  "explanation": "Towers of gas and dust in the Eagle Nebula where new stars are forming.",
  "image_url": "https://..."
}
```

### GET /api/watchlist
```json
{
  "count": 3,
  "items": [
    {
      "id": 1,
      "type": "launch",
      "ref_id": 101,
      "title": "Falcon 9 | Starlink Group 12-4",
      "date": "2026-11-02",
      "detail": "Cape Canaveral SFS, FL",
      "badge": "Go",
      "badge_status": "good",
      "note": ""
    }
  ]
}
```
`type` is `launch`, `asteroid`, or `iss`. `ref_id` points back to the launch or asteroid id. `badge_status` is `good`, `warn`, or `bad` so it lines up with my badge classes in the CSS.

### POST /api/watchlist
Request body:
```json
{ "type": "launch", "ref_id": 102 }
```
Response:
```json
{
  "success": true,
  "item": { "id": 4, "type": "launch", "ref_id": 102, "title": "Electron | Rocket Science Rules", "date": "2026-11-05", "detail": "Mahia, New Zealand", "badge": "TBD", "badge_status": "warn", "note": "" }
}
```

### PUT /api/watchlist/:id
Request body:
```json
{ "note": "Bring the camera" }
```
Response:
```json
{ "success": true, "item": { "id": 3, "note": "Bring the camera" } }
```

### DELETE /api/watchlist/:id
Response:
```json
{ "success": true, "deleted_id": 2 }
```

## What's dynamic now

- **Dashboard:** next launch, live countdown, stage tracker, ISS readout, asteroid table, Kp gauge, flare/storm badges, and APOD are all built from the mock data. The header clock shows the real UTC time.
- **Launches:** table, stat boxes, and the provider filter chips are all generated from the data (a new provider gets its own chip automatically). Search and the chips actually filter now. "+ Watch" logs the POST it would send.
- **Asteroids:** cards and stat boxes come from the data. The proximity bar and rock size are calculated from miss distance and diameter. Search filters the cards.
- **Watchlist:** items are built from the data and sorted by date. "Note" edits an item (PUT) and "Remove" deletes it (DELETE). For now those just change the array in memory and log the request to the console.
