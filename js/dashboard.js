// Dashboard page (index.html)
// every panel asks api.js for its data and builds its own html

let stageNames = ["Static fire", "Rollout", "Prop load", "Liftoff", "Orbit"];
let nextLaunch = null;
let dashLaunches = [];
let dashAsteroids = [];
let dashWeather = null;
let dashIss = null;
let countdownTimer = null;

// what the ticker shows, each panel fills in its own slot
let tickerSlots = {};

function refreshTicker() {
    let items = [];
    ["launch", "iss1", "iss2", "kp", "flare", "neo", "apod"].forEach(function (key) {
        if (tickerSlots[key]) items.push(tickerSlots[key]);
    });
    if (items.length) setTicker(items);
}


// ---- next launch ----

function pickNextLaunch(launches) {
    let future = launches.filter(function (l) {
        return l.status !== "success" && l.status !== "failed";
    });
    future.sort(function (a, b) {
        return new Date(a.launchDate) - new Date(b.launchDate);
    });
    return future.length ? future[0] : launches[0];
}

function showNextLaunch(launches) {
    dashLaunches = launches;
    nextLaunch = pickNextLaunch(launches);
    let panel = document.getElementById("panel-launch");

    document.getElementById("launch-name").innerHTML = nextLaunch.rocket + " <span>|</span> " + nextLaunch.mission;
    document.getElementById("launch-meta").textContent = nextLaunch.provider + " / " + nextLaunch.location + (nextLaunch.pad ? " / " + nextLaunch.pad : "");

    // stage tracker
    let stagesHtml = "";
    for (let i = 0; i < stageNames.length; i++) {
        let cls = "";
        if (i < nextLaunch.currentStage) {
            cls = "done";
        } else if (i === nextLaunch.currentStage) {
            cls = "current";
        }
        stagesHtml += '<li class="' + cls + '"><span>' + stageNames[i] + '</span></li>';
    }
    document.getElementById("stage-track").innerHTML = stagesHtml;

    // the little readout under the countdown
    let readout = '<div><dt>Status</dt><dd>' + launchBadge(nextLaunch.status) + '</dd></div>';
    readout += '<div><dt>NET (local)</dt><dd class="dd-text">' + formatShort(nextLaunch.launchDate) + '</dd></div>';
    readout += '<div><dt>NET (UTC)</dt><dd>' + formatUtcTime(nextLaunch.launchDate) + '</dd></div>';
    if (nextLaunch.probability !== null) {
        readout += '<div><dt>Go probability</dt><dd>' + nextLaunch.probability + '<small>%</small></dd></div>';
    }
    if (nextLaunch.orbit) {
        readout += '<div><dt>Target orbit</dt><dd class="dd-text">' + nextLaunch.orbit + '</dd></div>';
    }
    if (nextLaunch.missionType) {
        readout += '<div><dt>Mission type</dt><dd class="dd-text">' + nextLaunch.missionType + '</dd></div>';
    }
    document.getElementById("launch-readout").innerHTML = readout;

    // rocket photo as a faded backdrop on the right
    let art = document.getElementById("launch-art");
    if (nextLaunch.image) {
        art.style.backgroundImage = "url('" + nextLaunch.image + "')";
        art.classList.add("has-image");
    }

    // the next few after this one
    let others = launches.filter(function (l) {
        return l.launchId !== nextLaunch.launchId && l.status !== "success" && l.status !== "failed";
    }).slice(0, 3);
    let listHtml = "";
    others.forEach(function (l) {
        listHtml += '<li><span class="un-date">' + formatShort(l.launchDate) + '</span>'
            + '<span class="un-name">' + l.rocket + ' <em>|</em> ' + l.mission + '</span>'
            + '<span class="un-cd" data-date="' + l.launchDate + '">' + formatCountdown(new Date(l.launchDate) - Date.now()) + '</span>'
            + launchBadge(l.status) + '</li>';
    });
    document.getElementById("up-next-list").innerHTML = listHtml || '<li class="log-empty">Nothing else scheduled.</li>';

    updateCountdown();
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(updateCountdown, 1000);
    panel.classList.add("loaded");
}

function updateCountdown() {
    let msLeft = new Date(nextLaunch.launchDate) - new Date();
    let c = countdownParts(msLeft);
    let box = document.getElementById("countdown");

    document.getElementById("cd-prefix").textContent = c.past ? "T+" : "T-";
    document.getElementById("cd-days").textContent = pad(c.days);
    document.getElementById("cd-hours").textContent = pad(c.hours);
    document.getElementById("cd-mins").textContent = pad(c.mins);
    document.getElementById("cd-secs").textContent = pad(c.secs);

    // goes hot inside the last hour
    box.classList.toggle("cd-hot", !c.past && msLeft < 3600000);
    box.classList.toggle("cd-past", c.past);
    box.setAttribute("aria-label", (c.past ? "T plus " : "T minus ") + c.days + " days, " + c.hours + " hours, " + c.mins + " minutes, " + c.secs + " seconds");

    document.querySelectorAll("#up-next-list .un-cd").forEach(function (span) {
        span.textContent = formatCountdown(new Date(span.dataset.date) - Date.now());
    });

    tickerSlots.launch = { label: nextLaunch.rocket, value: formatCountdown(msLeft) };
    if (c.secs % 10 === 0) refreshTicker();
}


// ---- ISS ----

let issMap = null;
let issTrail = [];       // fixes we've actually seen this session
let issTrack = { past: [], future: [] };
let issOverText = "";
let lastOverCheck = 0;

function showIss(iss) {
    dashIss = iss;
    let lat = iss.latitude;
    let lon = iss.longitude;

    issTrail.push({ lat: lat, lon: lon });
    if (issTrail.length > 120) issTrail.shift();

    let past = issTrack.past.concat(issTrail);
    issMap.draw({
        iss: { lat: lat, lon: lon },
        past: past,
        future: issTrack.future,
        footprintKm: iss.footprintKm,
        markers: [{ lat: HOME.lat, lon: HOME.lon, label: HOME.label, kind: "home" }]
    });

    let range = distanceKm(lat, lon, HOME.lat, HOME.lon);
    let lit = iss.visibility === "eclipsed" ? "In Earth's shadow" : "In sunlight";
    let litClass = iss.visibility === "eclipsed" ? "status-dim" : "status-good";

    document.getElementById("iss-readout").innerHTML = `
        <div><dt>Latitude</dt><dd>${Math.abs(lat).toFixed(3)}<small>${lat >= 0 ? "N" : "S"}</small></dd></div>
        <div><dt>Longitude</dt><dd>${Math.abs(lon).toFixed(3)}<small>${lon >= 0 ? "E" : "W"}</small></dd></div>
        <div><dt>Altitude</dt><dd>${iss.altitudeKm} <small>km</small></dd></div>
        <div><dt>Velocity</dt><dd>${fmtNum(iss.speedKmh)} <small>km/h</small></dd></div>
        <div><dt>Range to Elon</dt><dd>${fmtNum(range)} <small>km</small></dd></div>
        <div><dt>Footprint</dt><dd>${fmtNum(iss.footprintKm)} <small>km</small></dd></div>
        <div><dt>Lighting</dt><dd><span class="badge ${litClass}">${lit}</span></dd></div>
        <div><dt>Over</dt><dd class="dd-text">${issOverText || "Resolving..."}</dd></div>
    `;

    let fixTime = new Date(iss.timestamp);
    document.getElementById("iss-foot").textContent = (iss.stale ? "Feed down, showing last fix from " : "Fix at ")
        + pad(fixTime.getUTCHours()) + ":" + pad(fixTime.getUTCMinutes()) + ":" + pad(fixTime.getUTCSeconds()) + " UTC. "
        + (range < 2300 ? "Station is within line of sight of Elon right now." : "Updates every 5 seconds.");

    tickerSlots.iss1 = { label: "ISS altitude", value: iss.altitudeKm + " km" };
    tickerSlots.iss2 = { label: "ISS range to Elon", value: fmtNum(range) + " km" };

    document.querySelector(".panel-iss").classList.add("loaded");
}

async function pollIss() {
    let iss = await getIssLocation();
    showIss(iss);

    // what's underneath, every 30s
    if (Date.now() - lastOverCheck > 30000 && !iss.stale) {
        lastOverCheck = Date.now();
        let over = await getIssOver(iss.latitude, iss.longitude);
        if (over) {
            issOverText = over;
            let dd = document.querySelector("#iss-readout .dd-text");
            if (dd) dd.textContent = over;
        }
    }
}

async function loadIssTrack() {
    issTrack = await getIssTrack();
    if (dashIss) showIss(dashIss);
}


// ---- asteroids ----

function sizeRadius(maxDiameterM) {
    // 10 m rock -> 2.5px, 1 km rock -> 9px
    let r = 2.5 + Math.log10(Math.max(10, maxDiameterM) / 10) * 3.2;
    return Math.min(10, r);
}

// the horizontal range plot: earth on the left, log distance going right
function drawRangePlot(rocks) {
    let box = document.getElementById("neo-range");
    let w = 600;
    let h = 150;
    let left = 34;
    let right = w - 14;
    let logMin = Math.log10(20000);
    let logMax = Math.log10(80000000);

    function xFor(km) {
        let t = (Math.log10(Math.max(20000, km)) - logMin) / (logMax - logMin);
        return left + t * (right - left);
    }

    let svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" class="range-svg" role="img" aria-label="Asteroid miss distances on a log scale">';

    // reference rings as vertical lines
    let refs = [[35786, "GEO"], [384400, "MOON"], [1000000, "1M km"], [10000000, "10M km"]];
    refs.forEach(function (r) {
        let x = xFor(r[0]);
        svg += '<line class="rp-ref' + (r[1] === "MOON" ? " rp-moon" : "") + '" x1="' + x + '" y1="18" x2="' + x + '" y2="' + (h - 18) + '"/>';
        svg += '<text class="rp-label" x="' + x + '" y="12" text-anchor="middle">' + r[1] + '</text>';
    });

    // earth
    svg += '<circle class="rp-earth" cx="' + (left - 24) + '" cy="' + (h / 2) + '" r="30"/>';
    svg += '<text class="rp-label" x="' + (left - 10) + '" y="' + (h - 4) + '">EARTH</text>';

    // one dot per rock, staggered vertically so they don't pile up
    let lanes = 5;
    rocks.forEach(function (rock, i) {
        let x = xFor(rock.missDistanceKm);
        let y = 32 + (i % lanes) * ((h - 56) / (lanes - 1));
        let r = sizeRadius(rock.maxDiameterM);
        let cls = rock.hazardous ? "rp-rock rp-hazard" : "rp-rock";
        svg += '<g class="' + cls + '"><circle cx="' + x + '" cy="' + y + '" r="' + r.toFixed(1) + '">'
            + '<title>' + rock.name + ' / ' + shortKm(rock.missDistanceKm) + ' km / ' + rock.maxDiameterM + ' m</title></circle>';
        if (i < 3) {
            svg += '<text class="rp-name" x="' + (x + r + 4) + '" y="' + (y + 3) + '">' + rock.name.replace(/[()]/g, "") + '</text>';
        }
        svg += '</g>';
    });

    svg += '</svg>';
    box.innerHTML = svg;
}

function showAsteroids(rocks) {
    dashAsteroids = rocks.slice().sort(function (a, b) {
        return a.missDistanceKm - b.missDistanceKm;
    });
    document.getElementById("neo-count").textContent = rocks.length;

    drawRangePlot(dashAsteroids.slice(0, 15));

    let tbody = document.getElementById("neo-table-body");
    tbody.innerHTML = "";
    dashAsteroids.slice(0, 5).forEach(function (rock) {
        let meterClass = rock.hazardous ? "meter meter-warn" : "meter";
        let when = rock.approachEpoch ? formatShort(new Date(rock.approachEpoch).toISOString()) : formatDate(rock.approachDate);
        let row = document.createElement("tr");
        row.innerHTML = `
            <td class="obj-name" data-label="Object">${rock.name}</td>
            <td data-label="Approach">${when}</td>
            <td data-label="Miss distance">${shortKm(rock.missDistanceKm)} km <small>${rock.missLunar.toFixed(1)} LD</small></td>
            <td data-label="Proximity"><span class="${meterClass}" style="--fill: ${proximityPercent(rock.missDistanceKm)}%"></span></td>
            <td data-label="PHA">${hazardBadge(rock.hazardous, false)}</td>
        `;
        tbody.appendChild(row);
    });

    let closest = dashAsteroids[0];
    if (closest) {
        tickerSlots.neo = { label: "Closest NEO", value: closest.name + " / " + closest.missLunar.toFixed(1) + " LD" };
        if (closest.hazardous) logEvent("PHA " + closest.name + " passing at " + closest.missLunar.toFixed(1) + " lunar distances.", "warn");
    }
    refreshTicker();
    document.querySelector(".panel-neo").classList.add("loaded");
}


// ---- space weather ----

function scaleClass(n) {
    if (n >= 3) return "status-bad";
    if (n >= 1) return "status-warn";
    return "status-good";
}

function drawSparkline(history) {
    let svg = document.getElementById("kp-spark");
    let points = history.slice(-24);
    if (points.length < 2) {
        svg.innerHTML = "";
        return;
    }
    let w = 240;
    let h = 48;
    let step = w / (points.length - 1);
    let coords = points.map(function (p, i) {
        let y = h - 4 - (p.kp / 9) * (h - 8);
        return (i * step).toFixed(1) + "," + y.toFixed(1);
    });
    let html = '<line class="sp-ref" x1="0" y1="' + (h - 4 - (5 / 9) * (h - 8)) + '" x2="' + w + '" y2="' + (h - 4 - (5 / 9) * (h - 8)) + '"/>';
    html += '<polyline class="sp-area" points="0,' + h + ' ' + coords.join(" ") + ' ' + w + ',' + h + '"/>';
    html += '<polyline class="sp-line" points="' + coords.join(" ") + '"/>';
    let last = coords[coords.length - 1].split(",");
    html += '<circle class="sp-dot" cx="' + last[0] + '" cy="' + last[1] + '" r="2.5"/>';
    svg.innerHTML = html;
}

function showWeather(w) {
    dashWeather = w;
    let kp = w.kpIndex === null ? 0 : w.kpIndex;

    let gauge = document.getElementById("kp-gauge");
    gauge.style.setProperty("--value", kp);
    gauge.className = "gauge " + (kp >= 5 ? "gauge-bad" : kp >= 4 ? "gauge-warn" : "");
    document.getElementById("kp-num").innerHTML = (w.kpIndex === null ? "-" : kp.toFixed(kp % 1 ? 2 : 0)) + "<small>/9</small>";

    // R S G pills
    let scalesHtml = "";
    if (w.scales) {
        [["R", "Radio blackout"], ["S", "Solar radiation"], ["G", "Geomagnetic"]].forEach(function (s) {
            let v = w.scales[s[0]];
            scalesHtml += '<div class="scale ' + scaleClass(v.scale) + '"><span class="scale-code">' + s[0] + v.scale + '</span><span class="scale-name">' + s[1] + '</span><span class="scale-text">' + v.text + '</span></div>';
        });
    } else {
        scalesHtml = '<p class="note">NOAA scales unavailable.</p>';
    }
    document.getElementById("noaa-scales").innerHTML = scalesHtml;

    drawSparkline(w.kpHistory || []);
    document.querySelector(".sparkline-wrap").hidden = !(w.kpHistory && w.kpHistory.length > 1);

    // flare class: C is routine, M is a real flare, X is a big one
    let flareStatus = "status-good";
    if (w.flareClass.startsWith("M")) flareStatus = "status-warn";
    if (w.flareClass.startsWith("X")) flareStatus = "status-bad";
    let stormStatus = w.stormLevel === "None" ? "status-good" : (w.stormLevel === "Minor" ? "status-warn" : "status-bad");

    let list = '<li><span>X-ray flux (GOES)</span><span class="badge ' + flareStatus + '">' + (w.flareClass || "n/a") + ' class</span></li>';
    list += '<li><span>Geomagnetic storm</span><span class="badge ' + stormStatus + '">' + w.stormLevel + '</span></li>';
    if (w.solarWindSpeed !== null) {
        let windStatus = w.solarWindSpeed > 600 ? "status-warn" : "status-dim";
        list += '<li><span>Solar wind speed</span><span class="badge ' + windStatus + '">' + fmtNum(w.solarWindSpeed) + ' km/s</span></li>';
    }
    if (w.solarWindDensity !== null) {
        list += '<li><span>Proton density</span><span class="badge status-dim">' + w.solarWindDensity.toFixed(1) + ' p/cm³</span></li>';
    }
    if (w.bz !== null) {
        // a strongly southward field (negative bz) is what opens the door for storms
        let bzStatus = w.bz < -5 ? "status-warn" : "status-dim";
        list += '<li><span>IMF Bz</span><span class="badge ' + bzStatus + '">' + (w.bz > 0 ? "+" : "") + w.bz.toFixed(1) + ' nT</span></li>';
    }
    document.getElementById("weather-list").innerHTML = list;

    document.getElementById("weather-updated").textContent = "Kp as of " + formatDate(w.updated) + " " + formatUtcTime(w.updated) + ". Kp 5 or higher is a geomagnetic storm.";

    tickerSlots.kp = { label: "Kp index", value: w.kpIndex === null ? "n/a" : "" + kp };
    tickerSlots.flare = { label: "X-ray flux", value: w.flareClass || "n/a" };
    if (kp >= 5) logEvent("Geomagnetic storm in progress, Kp " + kp + ".", "warn");
    refreshTicker();
    document.querySelector(".panel-weather").classList.add("loaded");
}


// ---- APOD ----

function showApod(a) {
    let img = document.getElementById("apod-image");
    if (a.imageUrl) {
        img.src = a.imageUrl;
        img.alt = a.title;
    } else if (a.mediaType === "video") {
        img.remove();
        document.getElementById("apod-link").innerHTML = '<span class="apod-video">Today\'s APOD is a video. Open it on apod.nasa.gov.</span>';
    } else {
        img.remove();
        document.getElementById("apod-link").innerHTML = '<span class="apod-video">No image on file. Open APOD.</span>';
    }
    document.getElementById("apod-link").href = a.hdUrl || a.link;
    document.getElementById("apod-hd").href = a.hdUrl || a.link;
    document.getElementById("apod-caption").textContent = a.caption;
    document.getElementById("apod-date").textContent = "Image for " + formatDate(a.date);
    document.getElementById("apod-title").textContent = a.title;
    document.getElementById("apod-text").textContent = a.explanation;

    tickerSlots.apod = { label: "APOD", value: a.title };
    refreshTicker();
    document.querySelector(".panel-apod").classList.add("loaded");
}


// ---- kick everything off ----
// each panel loads on its own so a slow feed doesn't hold up the others

issMap = createWorldMap(document.getElementById("iss-map"));
issMap.draw({ markers: [{ lat: HOME.lat, lon: HOME.lon, label: HOME.label, kind: "home" }] });

logEvent("Command center online.", "info");

getLaunchList().then(showNextLaunch);
getAsteroidList().then(showAsteroids);
getSpaceWeather().then(showWeather);
getApod().then(showApod);

pollIss();
loadIssTrack();
setInterval(pollIss, 5000);
setInterval(loadIssTrack, 60000);
