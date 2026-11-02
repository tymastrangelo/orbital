# ORBITAL

Mission control dashboard for my Web Development class at Elon. Plain HTML, CSS and JavaScript, no framework and no build step. Open `index.html` and it runs.

The look is modeled on the inside of a real ship rather than a hologram: amber instrument readouts on a dark bezel, mono numerals, scanlines, a boot sequence, and a mission log that records what the dashboard is doing.

## Pages

- **Dashboard** (`index.html`): next launch with a live countdown, ISS tracker on a dot-matrix world map with the day/night terminator and the station's ground track, near-Earth objects on a log-scale range plot, space weather (Kp gauge, NOAA R/S/G scales, GOES x-ray flux, solar wind), the mission log and NASA's picture of the day.
- **Launches** (`launches.html`): the next 30 launches worldwide from Launch Library 2, searchable and filterable by provider, with a live T- column, a map of the pads in use and a mission brief for whichever row you click.
- **Asteroids** (`asteroids.html`): every object NASA has passing Earth in the next 7 days, on a miss-distance vs time chart and as cards, with hazardous and inside-the-Moon filters.
- **Watchlist** (`watchlist.html`): the events you flagged, with notes. This is the full CRUD page.

## Data

Everything comes through `js/api.js`, which calls the public feeds and reshapes them into the JSON in `API_PLAN.md`. If a feed is down it falls back to the last cached copy, then to `js/mock-data.js`. The four LEDs in the header show which feeds are live, cached or down.

## Files

```
index.html  launches.html  asteroids.html  watchlist.html
css/styles.css          all the styling, sectioned
js/common.js            helpers, clocks (UTC / MET / Sol), feed LEDs, ticker, mission log, boot screen, sounds
js/api.js               the api layer, one function per planned endpoint
js/worldmap.js          canvas world map used by the ISS tracker and the pad map
js/world-dots.js        generated land mask (Natural Earth 110m, 1.5 degree grid)
js/mock-data.js         sample JSON for every endpoint, doubles as the offline fallback
js/dashboard.js  js/launches.js  js/asteroids.js  js/watchlist.js
API_PLAN.md             the REST plan for the backend
```

## Notes

- UI sounds are off by default. The `SND` button in the header turns them on.
- The boot screen runs once per tab session. Click or press a key to skip it.
- The MET clock counts from the day the project started. The SOL counter is Perseverance's mission sol at Jezero crater.
