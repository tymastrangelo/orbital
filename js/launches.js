// Launches page (launches.html)

let launches = launchesResponse.launches;
let activeProvider = "All";
let savedIds = [];


// stat boxes at the top
function showStats() {
    let go = 0;
    let tbd = 0;
    let delayed = 0;

    for (let i = 0; i < launches.length; i++) {
        if (launches[i].status === "go") {
            go++;
        } else if (launches[i].status === "delayed") {
            delayed++;
        } else {
            tbd++;
        }
    }

    document.getElementById("stat-total").textContent = launches.length;
    document.getElementById("stat-go").textContent = go;
    document.getElementById("stat-tbd").textContent = tbd;
    document.getElementById("stat-delayed").textContent = delayed;
}


// one chip per provider, so a new provider in the data gets a chip automatically
function buildChips() {
    let providers = ["All"];
    launches.forEach(function (launch) {
        if (!providers.includes(launch.provider)) {
            providers.push(launch.provider);
        }
    });

    let chipRow = document.getElementById("provider-chips");
    chipRow.innerHTML = "";

    providers.forEach(function (provider) {
        let chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        if (provider === activeProvider) {
            chip.classList.add("chip-active");
        }
        chip.textContent = provider;
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
        if (activeProvider !== "All" && launch.provider !== activeProvider) {
            return;
        }

        let text = (launch.rocket + " " + launch.mission + " " + launch.provider).toLowerCase();
        if (search !== "" && !text.includes(search)) {
            return;
        }

        let saved = savedIds.includes(launch.id);

        let row = document.createElement("tr");
        row.innerHTML = `
            <td data-label="Date">${formatDate(launch.launch_date)}</td>
            <td class="obj-name" data-label="Rocket">${launch.rocket}</td>
            <td data-label="Mission">${launch.mission}</td>
            <td data-label="Provider">${launch.provider}</td>
            <td data-label="Location">${launch.location}</td>
            <td data-label="Status">${launchBadge(launch.status)}</td>
            <td data-label="Watch">
                <button type="button" class="btn-ghost" onclick="saveLaunch(${launch.id}, this)" ${saved ? "disabled" : ""}>${saved ? "Saved" : "+ Watch"}</button>
            </td>
        `;
        tbody.appendChild(row);
        shown++;
    });

    if (shown === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No launches match that search.</td></tr>';
    }
}


// this will be POST /api/watchlist once the backend exists
function saveLaunch(id, button) {
    let launch = launches.find(function (l) {
        return l.id === id;
    });

    let body = {
        type: "launch",
        ref_id: launch.id
    };
    console.log("POST /api/watchlist", body);

    savedIds.push(id);
    button.textContent = "Saved";
    button.disabled = true;
}


document.getElementById("launch-search").addEventListener("input", showTable);
document.getElementById("search-btn").addEventListener("click", showTable);

showStats();
buildChips();
showTable();
