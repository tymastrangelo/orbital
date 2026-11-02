// stuff every page uses: formatting helpers, the header clocks, feed LEDs,
// the ticker, the mission log, the boot screen and the (optional) sounds

let monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// when the ORBITAL "mission" started. the MET clock counts up from here.
let MISSION_EPOCH = new Date("2026-09-24T14:00:00Z");

// Perseverance touched down in Jezero crater on this date. a martian day (sol) is
// 24h 39m 35.244s, so dividing the time since landing by that gives the rover's sol.
let PERSEVERANCE_LANDING = new Date("2021-02-18T20:55:00Z");
let SOL_SECONDS = 88775.244;

// where the home station is (Elon, NC) for distance readouts and the map marker
let HOME = { lat: 36.1035, lon: -79.5048, label: "ELON NC" };


// ---- formatting ----

function pad(num) {
    if (num < 10) {
        return "0" + num;
    }
    return "" + num;
}

// "2026-11-02T18:30:00Z" -> "11/02/2026"
function formatDate(dateString) {
    if (dateString.length === 10) {
        dateString = dateString + "T12:00:00";   // no time means local noon so it doesn't shift a day
    }
    let d = new Date(dateString);
    return pad(d.getMonth() + 1) + "/" + pad(d.getDate()) + "/" + d.getFullYear();
}

// "18:30 UTC"
function formatUtcTime(dateString) {
    let d = new Date(dateString);
    return pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + " UTC";
}

// "2:30 PM EST" in whatever zone the browser is in
function formatLocalTime(dateString) {
    let d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}

// "Nov 2, 2:30 PM"
function formatShort(dateString) {
    let d = new Date(dateString);
    return monthNames[d.getMonth()] + " " + d.getDate() + ", " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// 3200000 -> "3.2M"
function shortKm(km) {
    if (km >= 1000000) {
        return (km / 1000000).toFixed(1) + "M";
    }
    if (km >= 1000) {
        return Math.round(km / 1000) + "K";
    }
    return "" + km;
}

function fmtNum(n) {
    return Number(n).toLocaleString();
}

// closer pass = fuller bar. this is on a log scale now so the moon's distance
// (384,400 km) sits around 60% and 50 million km is almost empty
function proximityPercent(km) {
    if (km <= 0) return 100;
    let logMin = Math.log10(20000);      // basically touching
    let logMax = Math.log10(80000000);   // way out there
    let t = (Math.log10(km) - logMin) / (logMax - logMin);
    let percent = Math.round(100 - t * 100);
    if (percent < 4) percent = 4;
    if (percent > 100) percent = 100;
    return percent;
}

// ms -> { days, hours, mins, secs, past }
function countdownParts(msLeft) {
    let past = msLeft < 0;
    let totalSeconds = Math.floor(Math.abs(msLeft) / 1000);
    return {
        past: past,
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        mins: Math.floor((totalSeconds % 3600) / 60),
        secs: totalSeconds % 60
    };
}

// "T-02:14:36" or "T-3d 04:12:09" or "T+00:03:10"
function formatCountdown(msLeft) {
    let c = countdownParts(msLeft);
    let sign = c.past ? "T+" : "T-";
    let hms = pad(c.hours) + ":" + pad(c.mins) + ":" + pad(c.secs);
    if (c.days > 0) {
        return sign + c.days + "d " + hms;
    }
    return sign + hms;
}

// "4 min ago"
function timeAgo(ms) {
    let s = Math.round(ms / 1000);
    if (s < 60) return s + "s ago";
    let m = Math.round(s / 60);
    if (m < 60) return m + " min ago";
    let h = Math.round(m / 60);
    if (h < 48) return h + " hr ago";
    return Math.round(h / 24) + " days ago";
}

// great circle distance between two points, in km
function distanceKm(lat1, lon1, lat2, lon2) {
    let toRad = Math.PI / 180;
    let dLat = (lat2 - lat1) * toRad;
    let dLon = (lon2 - lon1) * toRad;
    let a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}


// ---- badges ----

let statusWords = {
    go: ["Go", "status-good"],
    tbc: ["TBC", "status-warn"],
    tbd: ["TBD", "status-warn"],
    delayed: ["Hold", "status-bad"],
    flight: ["In flight", "status-live"],
    success: ["Success", "status-good"],
    failed: ["Failed", "status-bad"]
};

// turns "go" / "tbd" / "delayed" / ... into the css class + text for a badge
function launchBadge(status) {
    let w = statusWords[status] || statusWords.tbd;
    return '<span class="badge ' + w[1] + '">' + w[0] + '</span>';
}

function hazardBadge(hazardous, longText) {
    if (hazardous) {
        return '<span class="badge status-warn">' + (longText ? "Hazardous" : "PHA") + '</span>';
    }
    return '<span class="badge status-good">' + (longText ? "Not hazardous" : "No") + '</span>';
}

// what to put in a watch item's badge for a launch
function launchBadgeInfo(status) {
    let w = statusWords[status] || statusWords.tbd;
    return { badge: w[0], badgeStatus: w[1].replace("status-", "") };
}


// ---- header clocks ----

function updateClock() {
    let now = new Date();

    let clock = document.getElementById("clock-utc");
    if (clock) {
        clock.textContent = pad(now.getUTCHours()) + ":" + pad(now.getUTCMinutes()) + ":" + pad(now.getUTCSeconds());
    }
    let dateEl = document.getElementById("clock-date");
    if (dateEl) {
        dateEl.textContent = now.getUTCFullYear() + "." + pad(now.getUTCMonth() + 1) + "." + pad(now.getUTCDate());
    }

    // mission elapsed time
    let met = document.getElementById("clock-met");
    if (met) {
        let c = countdownParts(MISSION_EPOCH - now);
        met.textContent = (c.past ? "+" : "-") + pad(c.days) + ":" + pad(c.hours) + ":" + pad(c.mins) + ":" + pad(c.secs);
    }

    // perseverance sol
    let sol = document.getElementById("clock-sol");
    if (sol) {
        let elapsed = (now - PERSEVERANCE_LANDING) / 1000;
        sol.textContent = Math.floor(elapsed / SOL_SECONDS);
    }
}


// ---- feed LEDs + mission log ----

let LOG_KEY = "orbital-log";
let feedNames = { launches: "LL2", nasa: "NASA", iss: "ISS", swpc: "SWPC" };

function loadLog() {
    try {
        return JSON.parse(sessionStorage.getItem(LOG_KEY)) || [];
    } catch (e) {
        return [];
    }
}

// level is "info", "ok", "warn" or "bad"
function logEvent(text, level) {
    let entries = loadLog();
    entries.push({ t: Date.now(), text: text, level: level || "info" });
    if (entries.length > 60) {
        entries = entries.slice(entries.length - 60);
    }
    sessionStorage.setItem(LOG_KEY, JSON.stringify(entries));
    renderLog();
}

function renderLog() {
    let box = document.getElementById("mission-log");
    if (!box) return;

    let entries = loadLog().slice().reverse();
    if (entries.length === 0) {
        box.innerHTML = '<li class="log-empty">No events yet.</li>';
        return;
    }
    let html = "";
    entries.forEach(function (e) {
        let d = new Date(e.t);
        html += '<li class="log-' + e.level + '"><time>' + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds()) + '</time><span>' + e.text + '</span></li>';
    });
    box.innerHTML = html;
}

// api.js fires one of these every time a feed answers (or doesn't)
document.addEventListener("feedstatus", function (ev) {
    let feed = ev.detail.feed;
    let status = ev.detail.status;

    let led = document.querySelector('[data-feed="' + feed + '"]');
    if (led) {
        led.className = "led led-" + status;
        led.title = feedNames[feed] + ": " + status + (ev.detail.text ? " (" + ev.detail.text + ")" : "");
    }

    let name = feedNames[feed] || feed;
    if (status === "live") {
        logEvent(name + " link up. " + (ev.detail.text || ""), "ok");
    } else if (status === "cache") {
        logEvent(name + " served from cache. " + (ev.detail.text || ""), "info");
    } else if (status === "stale") {
        logEvent(name + " unreachable, using last good copy.", "warn");
    } else if (status === "down") {
        logEvent(name + " link down, running on mock data. " + (ev.detail.text || ""), "bad");
    }

    updateSystemsPill();
});

function updateSystemsPill() {
    let pill = document.getElementById("systems-pill");
    if (!pill) return;
    let statuses = Object.keys(feedStatus).map(function (k) { return feedStatus[k]; });
    let down = statuses.filter(function (s) { return s === "down"; }).length;
    let stale = statuses.filter(function (s) { return s === "stale"; }).length;
    pill.className = "status-pill";
    if (down > 0) {
        pill.classList.add("pill-bad");
        pill.querySelector("span:last-child").textContent = down + " feed" + (down > 1 ? "s" : "") + " down";
    } else if (stale > 0) {
        pill.classList.add("pill-warn");
        pill.querySelector("span:last-child").textContent = "Degraded";
    } else {
        pill.querySelector("span:last-child").textContent = "Systems nominal";
    }
}


// ---- ticker ----

// items is a list of { label, value }. the group is duplicated so the scroll loops cleanly
function setTicker(items) {
    let track = document.querySelector(".ticker-track");
    if (!track) return;

    let group = "";
    items.forEach(function (item) {
        group += "<span>" + item.label + " <strong>" + item.value + "</strong></span>";
    });
    track.innerHTML = '<div class="ticker-group">' + group + '</div><div class="ticker-group" aria-hidden="true">' + group + '</div>';
}


// ---- sounds (off unless you turn them on) ----

let audioCtx = null;

function soundOn() {
    return localStorage.getItem("orbital-sound") === "on";
}

// kind: "click", "confirm", "alert", "boot"
function beep(kind) {
    if (!soundOn()) return;
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        let now = audioCtx.currentTime;
        let freq = 880;
        let length = 0.05;
        if (kind === "confirm") { freq = 1320; length = 0.09; }
        if (kind === "alert") { freq = 440; length = 0.18; }
        if (kind === "boot") { freq = 660; length = 0.25; }

        osc.type = "square";
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.06, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
        osc.start(now);
        osc.stop(now + length + 0.02);
    } catch (e) {
        // no audio, no problem
    }
}

function setupSoundToggle() {
    let btn = document.getElementById("sound-toggle");
    if (!btn) return;

    function paint() {
        let on = soundOn();
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.querySelector("span").textContent = on ? "SND ON" : "SND OFF";
    }

    btn.addEventListener("click", function () {
        localStorage.setItem("orbital-sound", soundOn() ? "off" : "on");
        paint();
        beep("confirm");
    });
    paint();

    // every button and link clicks
    document.addEventListener("click", function (ev) {
        let target = ev.target.closest("button, a, .chip");
        if (target && target.id !== "sound-toggle") {
            beep("click");
        }
    });
}


// ---- boot screen ----
// runs once per tab session. click or press any key to skip.

function runBoot() {
    if (sessionStorage.getItem("orbital-booted") === "yes") {
        document.body.classList.add("booted");
        return;
    }
    sessionStorage.setItem("orbital-booted", "yes");

    let lines = [
        ["ORBITAL FLIGHT SOFTWARE v2.0", "hail-mary build"],
        ["MEMORY CHECK", "OK"],
        ["MOUNTING INSTRUMENT PANELS", "OK"],
        ["LINK  LAUNCH LIBRARY 2", "CONNECTING"],
        ["LINK  NASA APOD / NEOWS", "CONNECTING"],
        ["LINK  ISS TELEMETRY", "CONNECTING"],
        ["LINK  NOAA SWPC", "CONNECTING"],
        ["MISSION CLOCK SYNC", "UTC"],
        ["ALL SYSTEMS NOMINAL", "WELCOME BACK, COMMANDER"]
    ];

    let overlay = document.createElement("div");
    overlay.className = "boot";
    overlay.innerHTML = '<div class="boot-screen"><p class="boot-brand">ORBITAL</p><ol class="boot-lines"></ol>'
        + '<div class="boot-bar"><span></span></div><p class="boot-skip">press any key to skip</p></div>';
    document.body.appendChild(overlay);
    document.body.classList.add("booting");

    let list = overlay.querySelector(".boot-lines");
    let bar = overlay.querySelector(".boot-bar span");
    let i = 0;
    let done = false;

    function finish() {
        if (done) return;
        done = true;
        overlay.classList.add("boot-out");
        document.body.classList.remove("booting");
        document.body.classList.add("booted");
        setTimeout(function () {
            overlay.remove();
        }, 700);
        document.removeEventListener("keydown", finish);
    }

    function nextLine() {
        if (done) return;
        if (i >= lines.length) {
            setTimeout(finish, 500);
            return;
        }
        let li = document.createElement("li");
        li.innerHTML = "<span>" + lines[i][0] + "</span><em>" + lines[i][1] + "</em>";
        list.appendChild(li);
        bar.style.width = Math.round(((i + 1) / lines.length) * 100) + "%";
        if (i === 0) beep("boot");
        i++;
        setTimeout(nextLine, i === lines.length ? 500 : 180 + Math.random() * 160);
    }

    overlay.addEventListener("click", finish);
    document.addEventListener("keydown", finish);
    setTimeout(nextLine, 250);
}


// ---- little dom helper ----

function el(tag, className, html) {
    let node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
}


// ---- go ----

runBoot();
updateClock();
setInterval(updateClock, 1000);
setupSoundToggle();
renderLog();
