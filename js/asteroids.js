// Asteroids page (asteroids.html)

let asteroids = [];
let neoFilter = "all";
let neoSort = "date";


// something to compare the size to, so "90 m" means something
function sizeCompare(maxDiameterM) {
    if (maxDiameterM <= 15) return "about the size of a car";
    if (maxDiameterM <= 30) return "about the size of a bus";
    if (maxDiameterM <= 60) return "about the size of a blue whale";
    if (maxDiameterM <= 120) return "about a football field long";
    if (maxDiameterM <= 330) return "about as tall as the Eiffel Tower";
    if (maxDiameterM <= 830) return "about as tall as the Burj Khalifa";
    return "about the size of a small mountain";
}

// size of the rock drawing in the card, just rough buckets
function rockSize(maxDiameter) {
    if (maxDiameter < 30) return 14;
    if (maxDiameter < 100) return 22;
    if (maxDiameter < 300) return 36;
    if (maxDiameter < 800) return 52;
    return 68;
}

function showStats() {
    let hazardCount = 0;
    let closest = null;
    let biggest = 0;
    let fastest = 0;

    asteroids.forEach(function (rock) {
        if (rock.hazardous) hazardCount++;
        if (closest === null || rock.missLunar < closest) closest = rock.missLunar;
        if (rock.maxDiameterM > biggest) biggest = rock.maxDiameterM;
        if (rock.speedKms > fastest) fastest = rock.speedKms;
    });

    document.getElementById("stat-tracked").textContent = asteroids.length;
    document.getElementById("stat-hazard").textContent = hazardCount;
    document.getElementById("stat-closest").textContent = closest === null ? "-" : closest.toFixed(1);
    document.getElementById("stat-biggest").textContent = fmtNum(biggest);
    document.getElementById("stat-fastest").textContent = fastest.toFixed(1);
}


// which rocks pass the search + chip filter, in the chosen order
function visibleRocks() {
    let search = document.getElementById("neo-search").value.toLowerCase().trim();

    let list = asteroids.filter(function (rock) {
        if (search !== "" && !rock.name.toLowerCase().includes(search)) return false;
        if (neoFilter === "hazard" && !rock.hazardous) return false;
        if (neoFilter === "moon" && rock.missLunar > 1) return false;
        return true;
    });

    list.sort(function (a, b) {
        if (neoSort === "distance") return a.missDistanceKm - b.missDistanceKm;
        if (neoSort === "size") return b.maxDiameterM - a.maxDiameterM;
        return a.approachEpoch - b.approachEpoch;
    });
    return list;
}


// ---- the approach chart ----
// x = when it passes (now to +7 days), y = how far (log scale, in lunar distances)

function drawChart(rocks) {
    let box = document.getElementById("neo-chart");
    let w = 960;
    let h = 300;
    let padL = 84;
    let padR = 16;
    let padT = 18;
    let padB = 34;

    let tStart = new Date();
    tStart.setHours(0, 0, 0, 0);
    let t0 = tStart.getTime();
    let t1 = t0 + 8 * 86400000;
    // the feed is 7 days, but if the data runs longer (mock fallback) stretch to fit it
    rocks.forEach(function (rock) {
        if (rock.approachEpoch + 86400000 > t1) {
            t1 = Math.ceil((rock.approachEpoch + 86400000) / 86400000) * 86400000;
        }
    });
    let dayCount = Math.round((t1 - t0) / 86400000);

    let ldMin = 0.05;    // bottom of the chart, well inside geo
    let ldMax = 200;     // top
    let logMin = Math.log10(ldMin);
    let logMax = Math.log10(ldMax);

    function xFor(t) {
        return padL + ((t - t0) / (t1 - t0)) * (w - padL - padR);
    }
    function yFor(ld) {
        let v = Math.min(ldMax, Math.max(ldMin, ld));
        let t = (Math.log10(v) - logMin) / (logMax - logMin);
        return padT + (1 - t) * (h - padT - padB);
    }

    let svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart-svg" role="img" aria-label="Close approach chart">';

    // day columns
    let labelEvery = dayCount > 12 ? Math.ceil(dayCount / 10) : 1;
    for (let d = 0; d <= dayCount; d++) {
        let t = t0 + d * 86400000;
        let x = xFor(t);
        svg += '<line class="ch-grid" x1="' + x + '" y1="' + padT + '" x2="' + x + '" y2="' + (h - padB) + '"/>';
        if (d < dayCount && d % labelEvery === 0) {
            let date = new Date(t);
            svg += '<text class="ch-label" x="' + (x + 4) + '" y="' + (h - padB + 14) + '">' + monthNames[date.getMonth()] + ' ' + date.getDate() + '</text>';
        }
    }

    // distance rows
    [[0.1, "0.1 LD"], [1, "MOON 1 LD"], [10, "10 LD"], [100, "100 LD"]].forEach(function (r) {
        let y = yFor(r[0]);
        svg += '<line class="ch-grid' + (r[0] === 1 ? ' ch-moon' : '') + '" x1="' + padL + '" y1="' + y + '" x2="' + (w - padR) + '" y2="' + y + '"/>';
        svg += '<text class="ch-label' + (r[0] === 1 ? ' ch-moon-label' : '') + '" x="' + (padL - 6) + '" y="' + (y + 3) + '" text-anchor="end">' + r[1] + '</text>';
    });
    // geo ring
    let yGeo = yFor(0.093);
    svg += '<line class="ch-grid ch-geo" x1="' + padL + '" y1="' + yGeo + '" x2="' + (w - padR) + '" y2="' + yGeo + '"/>';
    svg += '<text class="ch-label" x="' + (w - padR - 2) + '" y="' + (yGeo - 3) + '" text-anchor="end">GEO SATELLITES</text>';

    // "now" line
    let xNow = xFor(Date.now());
    svg += '<line class="ch-now" x1="' + xNow + '" y1="' + padT + '" x2="' + xNow + '" y2="' + (h - padB) + '"/>';
    svg += '<text class="ch-label ch-now-label" x="' + (xNow + 4) + '" y="' + (padT + 10) + '">NOW</text>';

    // the rocks
    rocks.forEach(function (rock) {
        let x = xFor(rock.approachEpoch);
        let y = yFor(rock.missLunar);
        let r = 3 + Math.log10(Math.max(10, rock.maxDiameterM) / 10) * 4;
        svg += '<g class="ch-rock' + (rock.hazardous ? ' ch-hazard' : '') + '" data-id="' + rock.asteroidId + '">'
            + '<circle cx="' + x + '" cy="' + y + '" r="' + Math.min(14, r).toFixed(1) + '"/>'
            + '<circle class="ch-hit" cx="' + x + '" cy="' + y + '" r="12"/>'
            + '</g>';
    });

    svg += '</svg><div class="chart-tip" id="chart-tip" hidden></div>';
    box.innerHTML = svg;

    // hover tooltip
    let tip = document.getElementById("chart-tip");
    box.querySelectorAll(".ch-rock").forEach(function (g) {
        g.addEventListener("mouseenter", function (ev) {
            let rock = asteroids.find(function (a) { return String(a.asteroidId) === g.dataset.id; });
            tip.innerHTML = '<strong>' + rock.name + '</strong>'
                + formatShort(new Date(rock.approachEpoch).toISOString()) + '<br>'
                + shortKm(rock.missDistanceKm) + ' km / ' + rock.missLunar.toFixed(2) + ' LD<br>'
                + rock.minDiameterM + ' to ' + rock.maxDiameterM + ' m, ' + rock.speedKms.toFixed(1) + ' km/s'
                + (rock.hazardous ? '<br><em>Potentially hazardous</em>' : '');
            tip.hidden = false;
            moveTip(ev);
        });
        g.addEventListener("mousemove", moveTip);
        g.addEventListener("mouseleave", function () {
            tip.hidden = true;
        });
        g.addEventListener("click", function () {
            let card = document.getElementById("rock-" + g.dataset.id);
            if (card) {
                card.scrollIntoView({ behavior: "smooth", block: "center" });
                card.classList.add("flash");
                setTimeout(function () { card.classList.remove("flash"); }, 1600);
            }
        });
    });

    function moveTip(ev) {
        let rect = box.getBoundingClientRect();
        let x = ev.clientX - rect.left + 14;
        let y = ev.clientY - rect.top + 14;
        if (x + 220 > rect.width) x = ev.clientX - rect.left - 230;
        tip.style.left = x + "px";
        tip.style.top = y + "px";
    }
}


// ---- cards ----

function showCards() {
    let grid = document.getElementById("neo-grid");
    grid.innerHTML = "";

    let matches = visibleRocks();
    drawChart(matches);

    if (matches.length === 0) {
        grid.innerHTML = '<p class="note">No asteroids match that.</p>';
        return;
    }

    matches.forEach(function (rock) {
        let sizeText = rock.minDiameterM + " to " + rock.maxDiameterM;
        let saved = isWatched("asteroid", rock.asteroidId);
        let when = rock.approachEpoch ? formatShort(new Date(rock.approachEpoch).toISOString()) : formatDate(rock.approachDate);

        let card = document.createElement("article");
        card.className = "panel neo-card";
        card.id = "rock-" + rock.asteroidId;
        if (rock.hazardous) card.classList.add("is-hazard");
        if (rock.missLunar < 1) card.classList.add("is-close");

        card.innerHTML = `
            <div class="panel-head">
                <h3>${rock.name}</h3>
                ${hazardBadge(rock.hazardous, true)}
            </div>
            <div class="neo-visual" aria-hidden="true" style="--size: ${rockSize(rock.maxDiameterM)}px">
                <span class="neo-rock"></span>
                <span class="neo-size-label">${sizeText} m</span>
                ${rock.missLunar < 1 ? '<span class="neo-flag">Inside Moon orbit</span>' : ""}
                ${rock.sentry ? '<span class="neo-flag neo-flag-bad">Sentry object</span>' : ""}
            </div>
            <dl class="readout readout-grid">
                <div><dt>Closest approach</dt><dd class="dd-text">${when}</dd></div>
                <div><dt>Miss distance</dt><dd>${shortKm(rock.missDistanceKm)} <small>km</small></dd></div>
                <div><dt>Lunar distances</dt><dd>${rock.missLunar.toFixed(2)} <small>LD</small></dd></div>
                <div><dt>Speed</dt><dd>${rock.speedKms.toFixed(1)} <small>km/s</small></dd></div>
                <div class="wide"><dt>Estimated size</dt><dd>${sizeText} <small>m</small> <span class="dd-note">${sizeCompare(rock.maxDiameterM)}</span></dd></div>
            </dl>
            <div class="neo-proximity">Proximity <span class="meter ${rock.hazardous ? "meter-warn" : ""}" style="--fill: ${proximityPercent(rock.missDistanceKm)}%"></span></div>
            <div class="card-actions">
                ${rock.jplUrl ? '<a class="btn-ghost" href="' + rock.jplUrl + '" target="_blank" rel="noopener">JPL orbit</a>' : ""}
                <button type="button" class="btn-ghost" onclick="saveAsteroid(${rock.asteroidId}, this)" ${saved ? "disabled" : ""}>${saved ? "Saved" : "+ Watch"}</button>
            </div>
        `;
        grid.appendChild(card);
    });
}


// POST /watchitem for an asteroid
async function saveAsteroid(id, button) {
    let rock = asteroids.find(function (a) { return a.asteroidId === id; });

    let body = {
        type: "asteroid",
        refId: rock.asteroidId,
        title: rock.name,
        date: rock.approachDate,
        time: rock.approachEpoch ? new Date(rock.approachEpoch).toISOString() : "",
        detail: shortKm(rock.missDistanceKm) + " km / " + rock.missLunar.toFixed(1) + " LD",
        badge: rock.hazardous ? "Hazardous" : "Safe pass",
        badgeStatus: rock.hazardous ? "warn" : "good",
        note: ""
    };

    await createWatchItem(body);
    logEvent("Added " + rock.name + " to watchlist.", "ok");
    beep("confirm");
    button.textContent = "Saved";
    button.disabled = true;
}


// ---- wiring ----

document.getElementById("neo-search").addEventListener("input", showCards);
document.getElementById("neo-search-btn").addEventListener("click", showCards);

document.querySelectorAll("#neo-chips .chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
        if (chip.dataset.filter) {
            neoFilter = chip.dataset.filter;
            document.querySelectorAll("#neo-chips [data-filter]").forEach(function (c) { c.classList.remove("chip-active"); });
        } else {
            neoSort = chip.dataset.sort;
            document.querySelectorAll("#neo-chips [data-sort]").forEach(function (c) { c.classList.remove("chip-active"); });
        }
        chip.classList.add("chip-active");
        showCards();
    });
});

getAsteroidList().then(function (list) {
    asteroids = list;
    showStats();
    showCards();

    let byDistance = asteroids.slice().sort(function (a, b) { return a.missDistanceKm - b.missDistanceKm; });
    let items = [{ label: "Objects tracked", value: asteroids.length }];
    items.push({ label: "Potentially hazardous", value: asteroids.filter(function (a) { return a.hazardous; }).length });
    byDistance.slice(0, 4).forEach(function (a) {
        items.push({ label: a.name, value: a.missLunar.toFixed(1) + " LD" });
    });
    setTicker(items);
});
