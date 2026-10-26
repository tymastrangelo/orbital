// Dashboard page (index.html)
// builds every panel from the mock data in mock-data.js

let stageNames = ["Static fire", "Rollout", "Prop load", "Liftoff", "Orbit"];
let nextLaunch;


// ---- next launch ----
function findNextLaunch(launches) {
    let soonest = launches[0];
    for (let i = 1; i < launches.length; i++) {
        if (new Date(launches[i].launch_date) < new Date(soonest.launch_date)) {
            soonest = launches[i];
        }
    }
    return soonest;
}

function showNextLaunch() {
    nextLaunch = findNextLaunch(launchesResponse.launches);

    document.getElementById("launch-name").innerHTML = nextLaunch.rocket + " <span>|</span> " + nextLaunch.mission;
    document.getElementById("launch-meta").textContent = nextLaunch.provider + " / " + nextLaunch.location;
    document.getElementById("launch-status").innerHTML = "Status " + launchBadge(nextLaunch.status);

    let stagesHtml = "";
    for (let i = 0; i < stageNames.length; i++) {
        let cls = "";
        if (i < nextLaunch.current_stage) {
            cls = "done";
        } else if (i === nextLaunch.current_stage) {
            cls = "current";
        }
        stagesHtml += '<li class="' + cls + '">' + stageNames[i] + '</li>';
    }
    document.getElementById("stage-track").innerHTML = stagesHtml;

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    let msLeft = new Date(nextLaunch.launch_date) - new Date();
    if (msLeft < 0) {
        msLeft = 0;
    }

    let totalSeconds = Math.floor(msLeft / 1000);
    let days = Math.floor(totalSeconds / 86400);
    let hours = Math.floor((totalSeconds % 86400) / 3600);
    let mins = Math.floor((totalSeconds % 3600) / 60);
    let secs = totalSeconds % 60;

    document.getElementById("cd-days").textContent = pad(days);
    document.getElementById("cd-hours").textContent = pad(hours);
    document.getElementById("cd-mins").textContent = pad(mins);
    document.getElementById("cd-secs").textContent = pad(secs);

    document.getElementById("countdown").setAttribute("aria-label",
        "T minus " + days + " days, " + hours + " hours, " + mins + " minutes, " + secs + " seconds");
}


// ---- ISS ----
function showIss() {
    let iss = issResponse;
    document.getElementById("iss-readout").innerHTML = `
        <div><dt>Latitude</dt><dd>${iss.latitude.toFixed(4)}</dd></div>
        <div><dt>Longitude</dt><dd>${iss.longitude.toFixed(4)}</dd></div>
        <div><dt>Altitude</dt><dd>${iss.altitude_km} <small>km</small></dd></div>
        <div><dt>Speed</dt><dd>${iss.speed_kmh.toLocaleString()} <small>km/h</small></dd></div>
        <div class="wide"><dt>Currently over</dt><dd>${iss.over}</dd></div>
    `;
}


// ---- asteroids table ----
function showAsteroids() {
    let tbody = document.getElementById("neo-table-body");
    tbody.innerHTML = "";

    asteroidsResponse.asteroids.forEach(function (rock) {
        let meterClass = rock.hazardous ? "meter meter-warn" : "meter";
        let row = document.createElement("tr");
        row.innerHTML = `
            <td class="obj-name" data-label="Name">${rock.name}</td>
            <td data-label="Miss Distance">${(rock.miss_distance_km / 1000000).toFixed(1)} million km</td>
            <td data-label="Proximity"><span class="${meterClass}" style="--fill: ${proximityPercent(rock.miss_distance_km)}%"></span></td>
            <td data-label="Hazard">${hazardBadge(rock.hazardous, false)}</td>
        `;
        tbody.appendChild(row);
    });
}


// ---- space weather ----
function showWeather() {
    let w = weatherResponse;

    let gauge = document.getElementById("kp-gauge");
    gauge.style.setProperty("--value", w.kp_index);
    document.getElementById("kp-num").innerHTML = w.kp_index + "<small>/9</small>";

    // M and X class flares are the big ones
    let flareStatus = "status-good";
    if (w.flare_class.startsWith("M") || w.flare_class.startsWith("X")) {
        flareStatus = "status-warn";
    }
    let stormStatus = w.storm_level === "None" ? "status-good" : "status-bad";

    document.getElementById("weather-list").innerHTML = `
        <li><span>Solar flare</span><span class="badge ${flareStatus}">${w.flare_class} Class</span></li>
        <li><span>Geomagnetic storm</span><span class="badge ${stormStatus}">${w.storm_level}</span></li>
    `;

    let updated = new Date(w.updated);
    document.getElementById("weather-updated").textContent = "Last updated: " + formatDate(w.updated)
        + " " + pad(updated.getUTCHours()) + ":" + pad(updated.getUTCMinutes()) + " UTC";
}


// ---- APOD ----
function showApod() {
    let a = apodResponse;
    let img = document.getElementById("apod-image");
    img.src = a.image_url;
    img.alt = a.title;
    document.getElementById("apod-caption").textContent = a.caption;
    document.getElementById("apod-date").textContent = "Image for " + formatDate(a.date);
    document.getElementById("apod-title").textContent = a.title;
    document.getElementById("apod-text").textContent = a.explanation;
}


showNextLaunch();
showIss();
showAsteroids();
showWeather();
showApod();
