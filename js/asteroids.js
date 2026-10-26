// Asteroids page (asteroids.html)

let asteroids = asteroidsResponse.asteroids;


function showStats() {
    let hazardCount = 0;
    let closest = asteroids[0].miss_distance_km;

    for (let i = 0; i < asteroids.length; i++) {
        if (asteroids[i].hazardous) {
            hazardCount++;
        }
        if (asteroids[i].miss_distance_km < closest) {
            closest = asteroids[i].miss_distance_km;
        }
    }

    document.getElementById("stat-tracked").textContent = asteroids.length;
    document.getElementById("stat-hazard").textContent = hazardCount;
    document.getElementById("stat-closest").textContent = shortKm(closest);
}


// size of the rock drawing, just rough buckets
function rockSize(maxDiameter) {
    if (maxDiameter < 50) {
        return 16;
    } else if (maxDiameter < 200) {
        return 26;
    } else if (maxDiameter < 500) {
        return 52;
    }
    return 64;
}


function showCards() {
    let search = document.getElementById("neo-search").value.toLowerCase().trim();
    let grid = document.getElementById("neo-grid");
    grid.innerHTML = "";

    let matches = asteroids.filter(function (rock) {
        return rock.name.toLowerCase().includes(search);
    });

    if (matches.length === 0) {
        grid.innerHTML = '<p class="note">No asteroids match "' + search + '".</p>';
        return;
    }

    matches.forEach(function (rock) {
        let sizeText = rock.diameter_min_m + " to " + rock.diameter_max_m;

        let card = document.createElement("article");
        card.className = "panel neo-card";
        if (rock.hazardous) {
            card.classList.add("is-hazard");
        }

        card.innerHTML = `
            <div class="panel-head">
                <h3>${rock.name}</h3>
                ${hazardBadge(rock.hazardous, true)}
            </div>
            <div class="neo-visual" aria-hidden="true" style="--size: ${rockSize(rock.diameter_max_m)}px">
                <span class="neo-rock"></span>
                <span class="neo-size-label">${sizeText} m</span>
            </div>
            <dl class="readout">
                <div><dt>Closest approach</dt><dd>${formatDate(rock.approach_date)}</dd></div>
                <div><dt>Miss distance</dt><dd>${shortKm(rock.miss_distance_km)} <small>km</small></dd></div>
                <div><dt>Estimated size</dt><dd>${sizeText} <small>m</small></dd></div>
                <div><dt>Speed</dt><dd>${rock.speed_kmh.toLocaleString()} <small>km/h</small></dd></div>
            </dl>
            <div class="neo-proximity">Proximity <span class="meter ${rock.hazardous ? "meter-warn" : ""}" style="--fill: ${proximityPercent(rock.miss_distance_km)}%"></span></div>
        `;
        grid.appendChild(card);
    });
}


document.getElementById("neo-search").addEventListener("input", showCards);
document.getElementById("neo-search-btn").addEventListener("click", showCards);

showStats();
showCards();
