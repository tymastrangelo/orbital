// a little equirectangular world map drawn on a canvas.
// used for the ISS tracker on the dashboard and the launch pad map on the launches page.
//
// usage:
//   let map = createWorldMap(canvasElement);
//   map.draw({ iss: {lat, lon}, past: [...], future: [...], markers: [...], footprintKm: 4500 });
//
// land comes from world-dots.js (a dot-matrix of Natural Earth land polygons) and the
// day/night shading is computed from the sun's position for the current time.

function createWorldMap(canvas) {
    let ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let land = null;        // offscreen canvas with the dots + grid, redrawn only on resize
    let state = { markers: [] };
    let frame = null;

    // colors read from css so the map matches the theme
    let styles = getComputedStyle(document.documentElement);
    let color = {
        dot: styles.getPropertyValue("--map-dot").trim() || "rgba(255,179,71,0.45)",
        grid: styles.getPropertyValue("--map-grid").trim() || "rgba(255,179,71,0.08)",
        night: styles.getPropertyValue("--map-night").trim() || "rgba(0,0,0,0.5)",
        iss: styles.getPropertyValue("--ice").trim() || "#8ad8ff",
        trail: styles.getPropertyValue("--ice").trim() || "#8ad8ff",
        amber: styles.getPropertyValue("--amber").trim() || "#ffb347",
        cream: styles.getPropertyValue("--cream").trim() || "#f3e9d2",
        sun: styles.getPropertyValue("--amber-2").trim() || "#f28c28"
    };

    function project(lat, lon) {
        return {
            x: (lon + 180) / 360 * width,
            y: (90 - lat) / 180 * height
        };
    }

    function resize() {
        let rect = canvas.getBoundingClientRect();
        let dpr = window.devicePixelRatio || 1;
        width = rect.width;
        height = rect.width / 2;            // always 2:1 like the projection
        canvas.style.height = height + "px";
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildLand(dpr);
    }

    function buildLand(dpr) {
        land = document.createElement("canvas");
        land.width = canvas.width;
        land.height = canvas.height;
        let lctx = land.getContext("2d");
        lctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // graticule every 30 degrees
        lctx.strokeStyle = color.grid;
        lctx.lineWidth = 1;
        for (let lon = -150; lon <= 150; lon += 30) {
            let p = project(0, lon);
            lctx.beginPath();
            lctx.moveTo(p.x, 0);
            lctx.lineTo(p.x, height);
            lctx.stroke();
        }
        for (let lat = -60; lat <= 60; lat += 30) {
            let p = project(lat, 0);
            lctx.beginPath();
            lctx.moveTo(0, p.y);
            lctx.lineTo(width, p.y);
            lctx.stroke();
        }
        // equator a touch brighter
        lctx.strokeStyle = color.dot;
        lctx.globalAlpha = 0.35;
        lctx.beginPath();
        lctx.moveTo(0, height / 2);
        lctx.lineTo(width, height / 2);
        lctx.stroke();
        lctx.globalAlpha = 1;

        // land dots
        let cell = width / WORLD_DOT_COLS;
        let r = Math.max(0.6, cell * 0.33);
        lctx.fillStyle = color.dot;
        for (let i = 0; i < WORLD_DOTS.length; i++) {
            let idx = WORLD_DOTS[i];
            let col = idx % WORLD_DOT_COLS;
            let row = Math.floor(idx / WORLD_DOT_COLS);
            let x = (col + 0.5) * cell;
            let y = (row + 0.5) * cell;
            lctx.beginPath();
            lctx.arc(x, y, r, 0, Math.PI * 2);
            lctx.fill();
        }
    }

    // where the sun is straight overhead right now
    function subsolarPoint(date) {
        let start = Date.UTC(date.getUTCFullYear(), 0, 0);
        let dayOfYear = (date - start) / 86400000;
        let declination = -23.44 * Math.cos((360 / 365) * (dayOfYear + 10) * Math.PI / 180);

        // equation of time, so solar noon isn't exactly 12:00 utc
        let b = (360 / 365) * (dayOfYear - 81) * Math.PI / 180;
        let eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);

        let utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
        let lon = -15 * (utcHours - 12 + eot / 60);
        while (lon < -180) lon += 360;
        while (lon > 180) lon -= 360;
        return { lat: declination, lon: lon };
    }

    function drawNight(sun) {
        let toRad = Math.PI / 180;
        let tanDec = Math.tan(sun.lat * toRad);
        ctx.fillStyle = color.night;
        ctx.beginPath();

        // the terminator curve across the whole map
        for (let lon = -180; lon <= 180; lon += 2) {
            let lat;
            if (Math.abs(tanDec) < 0.0001) {
                lat = 0;
            } else {
                lat = Math.atan(-Math.cos((lon - sun.lon) * toRad) / tanDec) / toRad;
            }
            let p = project(lat, lon);
            if (lon === -180) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        // close the shape along whichever pole is in the dark
        if (sun.lat >= 0) {
            ctx.lineTo(width, height);
            ctx.lineTo(0, height);
        } else {
            ctx.lineTo(width, 0);
            ctx.lineTo(0, 0);
        }
        ctx.closePath();
        ctx.fill();

        // little sun marker
        let s = project(sun.lat, sun.lon);
        ctx.strokeStyle = color.sun;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
        ctx.stroke();
        for (let a = 0; a < 8; a++) {
            let ang = a * Math.PI / 4;
            ctx.beginPath();
            ctx.moveTo(s.x + Math.cos(ang) * 7, s.y + Math.sin(ang) * 7);
            ctx.lineTo(s.x + Math.cos(ang) * 10, s.y + Math.sin(ang) * 10);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    // draws a line through a list of {lat, lon}, lifting the pen when it crosses the date line
    function drawTrack(points, dashed, alphaFrom, alphaTo) {
        if (!points || points.length < 2) return;
        ctx.lineWidth = 1.5;
        ctx.setLineDash(dashed ? [4, 4] : []);
        for (let i = 1; i < points.length; i++) {
            let a = points[i - 1];
            let b = points[i];
            if (Math.abs(a.lon - b.lon) > 180) continue;   // wrapped around the edge
            let t = i / points.length;
            ctx.globalAlpha = alphaFrom + (alphaTo - alphaFrom) * t;
            ctx.strokeStyle = color.trail;
            let pa = project(a.lat, a.lon);
            let pb = project(b.lat, b.lon);
            ctx.beginPath();
            ctx.moveTo(pa.x, pa.y);
            ctx.lineTo(pb.x, pb.y);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
    }

    function drawMarker(m) {
        let p = project(m.lat, m.lon);
        let c = m.color || color.amber;
        ctx.strokeStyle = c;
        ctx.fillStyle = c;
        ctx.lineWidth = 1;

        if (m.kind === "home") {
            // crosshair
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(p.x - 8, p.y); ctx.lineTo(p.x - 5, p.y);
            ctx.moveTo(p.x + 5, p.y); ctx.lineTo(p.x + 8, p.y);
            ctx.moveTo(p.x, p.y - 8); ctx.lineTo(p.x, p.y - 5);
            ctx.moveTo(p.x, p.y + 5); ctx.lineTo(p.x, p.y + 8);
            ctx.stroke();
        } else {
            // pad / generic: small diamond
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - 4);
            ctx.lineTo(p.x + 4, p.y);
            ctx.lineTo(p.x, p.y + 4);
            ctx.lineTo(p.x - 4, p.y);
            ctx.closePath();
            if (m.filled) ctx.fill(); else ctx.stroke();
        }

        if (m.label) {
            ctx.font = "600 9px 'Barlow Condensed', sans-serif";
            ctx.fillStyle = m.labelColor || c;
            ctx.globalAlpha = 0.9;
            let tx = p.x + 8;
            if (tx + 60 > width) tx = p.x - 8 - ctx.measureText(m.label).width;
            ctx.fillText(m.label, tx, p.y + 3);
            ctx.globalAlpha = 1;
        }
    }

    function drawIss(iss, footprintKm, now) {
        let p = project(iss.lat, iss.lon);

        // footprint: how much of the earth can see the station. roughly, 111 km per degree of latitude
        if (footprintKm) {
            let rLat = (footprintKm / 2) / 111;
            let r = rLat / 180 * height;
            ctx.strokeStyle = color.iss;
            ctx.globalAlpha = 0.25;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, r / Math.max(0.2, Math.cos(iss.lat * Math.PI / 180)), r, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
        }

        // pulsing ring
        let pulse = (now / 1200) % 1;
        ctx.strokeStyle = color.iss;
        ctx.globalAlpha = 1 - pulse;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 + pulse * 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // the station itself
        ctx.fillStyle = color.iss;
        ctx.shadowColor = color.iss;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.font = "700 10px 'Barlow Condensed', sans-serif";
        ctx.fillStyle = color.cream;
        let label = "ISS";
        let tx = p.x + 9;
        if (tx + 24 > width) tx = p.x - 9 - ctx.measureText(label).width;
        ctx.fillText(label, tx, p.y - 6);
    }

    function render(now) {
        if (!land) return;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(land, 0, 0, width, height);

        if (state.showNight !== false) {
            drawNight(subsolarPoint(new Date()));
        }

        drawTrack(state.past, false, 0.1, 0.9);
        drawTrack(state.future, true, 0.7, 0.2);

        (state.markers || []).forEach(drawMarker);

        if (state.iss) {
            drawIss(state.iss, state.footprintKm, now);
        }
    }

    function loop(now) {
        render(now);
        frame = requestAnimationFrame(loop);
    }

    // public bits
    let map = {
        draw: function (newState) {
            state = Object.assign({}, state, newState);
            if (!frame) {
                frame = requestAnimationFrame(loop);
            }
        },
        stop: function () {
            if (frame) cancelAnimationFrame(frame);
            frame = null;
        },
        project: project,
        subsolarPoint: subsolarPoint
    };

    resize();
    window.addEventListener("resize", function () {
        resize();
        render(performance.now());
    });

    return map;
}
