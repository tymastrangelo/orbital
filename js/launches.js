// Launches page (launches.html)

let launches = [];
let activeProvider = "All";
let selectedId = null;
let padMap = null;


// stat boxes at the top
function showStats() {
    let go = 0;
    let tbd = 0;
    let delayed = 0;
    let week = 0;
    let weekFromNow = Date.now() + 7 * 86400000;

    launches.forEach(function (l) {
        if (l.status === "go" || l.status === "flight") {
            go++;
        } else if (l.status === "delayed") {
            delayed++;
        } else {
            tbd++;
        }
        if (new Date(l.launchDate) < weekFromNow) {
            week++;
        }
    });

    document.getElementById("stat-total").textContent = launches.length;
    document.getElementById("stat-go").textContent = go;
    document.getElementById("stat-tbd").textContent = tbd;
    document.getElementById("stat-delayed").textContent = delayed;
    document.getElementById("stat-week").textContent = week;

    let first = launches[0];
    let last = launches[launches.length - 1];
    if (first && last) {
        document.getElementById("manifest-tag").textContent = formatDate(first.launchDate) + " to " + formatDate(last.launchDate);
    }
}


// one chip per provider, so a new provider in the data gets a chip automatically
function buildChips() {
    let counts = {};
    launches.forEach(function (launch) {
        counts[launch.providerShort] = (counts[launch.providerShort] || 0) + 1;
    });
    let providers = Object.keys(counts).sort(function (a, b) {
        return counts[b] - counts[a];
    });
    providers.unshift("All");

    let chipRow = document.getElementById("provider-chips");
    chipRow.innerHTML = "";

    providers.forEach(function (provider) {
        let chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        if (provider === activeProvider) {
            chip.classList.add("chip-active");
        }
        chip.innerHTML = provider + (provider === "All" ? "" : ' <small>' + counts[provider] + '</small>');
        chip.addEventListener("click", function () {
            activeProvider = provider;
            buildChips();
            showTable();
        });
        chipRow.appendChild(chip);
    });
}


function showTable() {
    let search = document.getElementById("launch-search").value.toLowerCase().trim();
    let tbody = document.getElementById("launch-table-body");
    tbody.innerHTML = "";

    let shown = 0;

    launches.forEach(function (launch) {
        if (activeProvider !== "All" && launch.providerShort !== activeProvider) {
            return;
        }

        let text = (launch.rocket + " " + launch.mission + " " + launch.provider + " " + launch.location + " " + launch.pad).toLowerCase();
        if (search !== "" && !text.includes(search)) {
            return;
        }

        let saved = isWatched("launch", launch.launchId);

        let row = document.createElement("tr");
        row.dataset.id = launch.launchId;
        if (launch.launchId === selectedId) row.classList.add("row-selected");
        row.innerHTML = `
            <td data-label="NET"><span class="cell-main">${formatShort(launch.launchDate)}</span><small>${formatUtcTime(launch.launchDate)}</small></td>
            <td data-label="T-" class="cell-cd" data-date="${launch.launchDate}">${formatCountdown(new Date(launch.launchDate) - Date.now())}</td>
            <td class="obj-name" data-label="Rocket">${launch.rocket}</td>
            <td data-label="Mission">${launch.mission}</td>
            <td data-label="Provider" title="${launch.provider}">${launch.providerShort}</td>
            <td data-label="Site">${launch.location}</td>
            <td data-label="Status">${launchBadge(launch.status)}</td>
            <td data-label="Watch">
                <button type="button" class="btn-ghost" onclick="event.stopPropagation(); saveLaunch('${launch.launchId}', this)" ${saved ? "disabled" : ""}>${saved ? "Saved" : "+ Watch"}</button>
            </td>
        `;
        row.addEventListener("click", function () {
            selectLaunch(launch.launchId);
        });
        tbody.appendChild(row);
        shown++;
    });

    if (shown === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-row">No launches match that search.</td></tr>';
    }
}

function tickCountdowns() {
    document.querySelectorAll(".cell-cd").forEach(function (cell) {
        let ms = new Date(cell.dataset.date) - Date.now();
        cell.textContent = formatCountdown(ms);
        cell.classList.toggle("cd-soon", ms > 0 && ms < 86400000);
    });
}


// the mission brief panel on the right
function selectLaunch(id) {
    let launch = launches.find(function (l) { return l.launchId === id; });
    if (!launch) return;
    selectedId = id;

    document.querySelectorAll("#launch-table-body tr").forEach(function (tr) {
        tr.classList.toggle("row-selected", tr.dataset.id === String(id));
    });

    let panel = document.getElementById("launch-detail");
    panel.querySelector(".panel-tag").textContent = launch.provider;

    let windowText = "";
    if (launch.windowStart && launch.windowEnd) {
        windowText = formatUtcTime(launch.windowStart) + " to " + formatUtcTime(launch.windowEnd);
        if (launch.windowStart === launch.windowEnd) windowText = "Instantaneous";
    }

    let html = "";
    if (launch.image) {
        html += '<figure class="detail-image"><img src="' + launch.image + '" alt="' + launch.rocket + '"></figure>';
    }
    html += '<p class="detail-name">' + launch.rocket + ' <span>|</span> ' + launch.mission + '</p>';
    html += '<p class="detail-meta">' + launchBadge(launch.status) + ' <span>' + launch.statusText + '</span></p>';
    html += '<dl class="readout readout-grid">';
    html += '<div><dt>NET</dt><dd class="dd-text">' + formatShort(launch.launchDate) + '<small>' + formatUtcTime(launch.launchDate) + '</small></dd></div>';
    html += '<div><dt>Countdown</dt><dd class="cell-cd" data-date="' + launch.launchDate + '">' + formatCountdown(new Date(launch.launchDate) - Date.now()) + '</dd></div>';
    if (windowText) html += '<div><dt>Window</dt><dd class="dd-text">' + windowText + '</dd></div>';
    if (launch.probability !== null) html += '<div><dt>Go probability</dt><dd>' + launch.probability + '<small>%</small></dd></div>';
    if (launch.orbit) html += '<div><dt>Orbit</dt><dd class="dd-text">' + launch.orbit + '</dd></div>';
    if (launch.missionType) html += '<div><dt>Type</dt><dd class="dd-text">' + launch.missionType + '</dd></div>';
    html += '<div class="wide"><dt>Pad</dt><dd class="dd-text">' + (launch.pad ? launch.pad + ", " : "") + launch.location + '</dd></div>';
    html += '</dl>';
    if (launch.description) {
        html += '<p class="detail-desc">' + launch.description + '</p>';
    } else {
        html += '<p class="note">No mission description on file.</p>';
    }
    html += '<div class="detail-actions">';
    if (launch.webcast) {
        html += '<a class="btn-solid" href="' + launch.webcast + '" target="_blank" rel="noopener">Watch webcast</a>';
    }
    let saved = isWatched("launch", launch.launchId);
    html += '<button type="button" class="btn-ghost" onclick="saveLaunch(\'' + launch.launchId + '\', this)" ' + (saved ? "disabled" : "") + '>' + (saved ? "Saved" : "+ Watch") + '</button>';
    html += '</div>';

    document.getElementById("detail-body").innerHTML = html;
    panel.classList.add("loaded");

    drawPadMap(launch);

    // on a phone, scroll the brief into view
    if (window.innerWidth < 900) {
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}


// every pad as a diamond, the selected launch's pad filled in
function drawPadMap(selected) {
    let markers = [];
    let seen = {};
    launches.forEach(function (l) {
        if (l.padLat === null || l.padLon === null) return;
        let key = l.padLat.toFixed(1) + "," + l.padLon.toFixed(1);
        if (seen[key]) return;
        seen[key] = true;
        markers.push({ lat: l.padLat, lon: l.padLon, kind: "pad" });
    });
    if (selected && selected.padLat !== null) {
        markers.push({ lat: selected.padLat, lon: selected.padLon, kind: "pad", filled: true, label: selected.rocket.toUpperCase() });
    }
    markers.push({ lat: HOME.lat, lon: HOME.lon, kind: "home", label: HOME.label });
    padMap.draw({ markers: markers, showNight: true });
    document.getElementById("pad-foot").textContent = (markers.length - 1 - (selected ? 1 : 0)) + " active pads in the manifest." + (selected ? " Filled marker is " + selected.pad + "." : "");
}


// this will be POST /watchitem once the backend exists
// no watchItemId in the body, the backend makes that (same as createStudent)
async function saveLaunch(id, button) {
    let launch = launches.find(function (l) { return l.launchId === id; });
    let info = launchBadgeInfo(launch.status);

    let body = {
        type: "launch",
        refId: launch.launchId,
        title: launch.rocket + " | " + launch.mission,
        date: launch.launchDate.substring(0, 10),
        time: launch.launchDate,
        detail: launch.location,
        badge: info.badge,
        badgeStatus: info.badgeStatus,
        note: ""
    };

    await createWatchItem(body);
    logEvent("Added " + launch.rocket + " / " + launch.mission + " to watchlist.", "ok");
    beep("confirm");

    document.querySelectorAll('button[onclick*="' + id + '"]').forEach(function (b) {
        b.textContent = "Saved";
        b.disabled = true;
    });
}


document.getElementById("launch-search").addEventListener("input", showTable);
document.getElementById("search-btn").addEventListener("click", showTable);

padMap = createWorldMap(document.getElementById("pad-map"));
padMap.draw({ markers: [{ lat: HOME.lat, lon: HOME.lon, kind: "home", label: HOME.label }] });

getLaunchList().then(function (list) {
    launches = list.slice().sort(function (a, b) {
        return new Date(a.launchDate) - new Date(b.launchDate);
    });
    showStats();
    buildChips();
    showTable();
    drawPadMap(null);
    setInterval(tickCountdowns, 1000);

    let next = launches[0];
    let items = [{ label: "Next up", value: next.rocket + " " + formatCountdown(new Date(next.launchDate) - Date.now()) }];
    items.push({ label: "On the board", value: launches.length + " launches" });
    let providers = {};
    launches.forEach(function (l) { providers[l.provider] = true; });
    items.push({ label: "Providers", value: Object.keys(providers).length });
    launches.slice(1, 5).forEach(function (l) {
        items.push({ label: l.rocket, value: formatShort(l.launchDate) });
    });
    setTicker(items);
});
