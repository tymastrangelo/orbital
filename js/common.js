// stuff every page uses

let monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// turns "go" / "tbd" / "delayed" into the css class + text for a badge
function launchBadge(status) {
    if (status === "go") {
        return '<span class="badge status-good">Go</span>';
    } else if (status === "delayed") {
        return '<span class="badge status-bad">Delayed</span>';
    } else {
        return '<span class="badge status-warn">TBD</span>';
    }
}

function hazardBadge(hazardous, longText) {
    if (hazardous) {
        return '<span class="badge status-warn">' + (longText ? "Hazardous" : "Yes") + '</span>';
    }
    return '<span class="badge status-good">' + (longText ? "Not hazardous" : "No") + '</span>';
}

function pad(num) {
    if (num < 10) {
        return "0" + num;
    }
    return "" + num;
}

// "2026-11-02T18:30:00Z" -> "11/02/2026"
function formatDate(dateString) {
    // add a time if there isn't one so it doesn't shift a day back
    if (dateString.length === 10) {
        dateString = dateString + "T12:00:00";
    }
    let d = new Date(dateString);
    return pad(d.getMonth() + 1) + "/" + pad(d.getDate()) + "/" + d.getFullYear();
}

// 3200000 -> "3.2M"
function shortKm(km) {
    return (km / 1000000).toFixed(1) + "M";
}

// closer pass = fuller bar. 15 million km or more is basically empty
function proximityPercent(km) {
    let percent = Math.round(100 - (km / 150000));
    if (percent < 5) {
        percent = 5;
    }
    return percent;
}

// keeps the clock in the header current
function updateClock() {
    let clock = document.querySelector(".utc-clock");
    if (!clock) {
        return;
    }
    let now = new Date();
    clock.textContent = pad(now.getUTCMonth() + 1) + "/" + pad(now.getUTCDate()) + "/" + now.getUTCFullYear()
        + " " + pad(now.getUTCHours()) + ":" + pad(now.getUTCMinutes()) + " UTC";
}

updateClock();
setInterval(updateClock, 30000);
