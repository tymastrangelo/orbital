// Watchlist page (watchlist.html)
// this is the page that uses all of CRUD:
//   GET    /watchitems          load the list
//   POST   /watchitem           add (done from the launches / asteroids pages)
//   PUT    /watchitem/:id       edit the note on an item
//   DELETE /watchitem/:id       remove an item

let watchItems = [];
let watchFilter = "all";
let editingId = null;


function eventTime(item) {
    // launches carry a full timestamp, asteroids may only have a date
    return item.time ? new Date(item.time) : new Date(item.date + "T12:00:00");
}

function showStats() {
    let now = Date.now();
    let upcoming = watchItems.filter(function (w) { return eventTime(w) > now; });
    upcoming.sort(function (a, b) { return eventTime(a) - eventTime(b); });

    document.getElementById("stat-saved").textContent = watchItems.length;
    document.getElementById("stat-upcoming").textContent = upcoming.length;
    document.getElementById("stat-notes").textContent = watchItems.filter(function (w) { return w.note; }).length;

    let next = document.getElementById("stat-next");
    if (upcoming.length) {
        let c = countdownParts(eventTime(upcoming[0]) - now);
        next.textContent = c.days > 0 ? c.days + "d " + c.hours + "h" : c.hours + "h " + c.mins + "m";
    } else {
        next.textContent = "-";
    }
}


function showWatchlist() {
    let list = document.getElementById("watchlist");
    let addBox = document.getElementById("watch-add");

    // clear everything except the "want to track more" box at the bottom
    list.querySelectorAll(".saved-item").forEach(function (li) {
        li.remove();
    });

    let shown = watchItems.filter(function (w) {
        return watchFilter === "all" || w.type === watchFilter;
    });

    if (shown.length === 0) {
        let empty = document.createElement("li");
        empty.className = "watch-item saved-item";
        empty.innerHTML = '<div class="watch-card watch-empty"><p class="note">' + (watchItems.length ? "Nothing of that type saved." : "Nothing saved yet.") + '</p></div>';
        list.insertBefore(empty, addBox);
        return;
    }

    // soonest first
    shown.sort(function (a, b) {
        return eventTime(a) - eventTime(b);
    });

    let now = Date.now();
    shown.forEach(function (item) {
        let d = eventTime(item);
        let past = d < now;
        let typeLabel = item.type === "iss" ? "ISS" : item.type.charAt(0).toUpperCase() + item.type.slice(1);
        let cd = past ? "Passed" : formatCountdown(d - now);

        let li = document.createElement("li");
        li.className = "watch-item saved-item watch-" + item.type + (past ? " watch-past" : "");
        li.dataset.id = item.watchItemId;

        let noteHtml = "";
        if (editingId === item.watchItemId) {
            noteHtml = '<form class="note-form" onsubmit="submitNote(event, ' + item.watchItemId + ')">'
                + '<input type="text" id="note-input" maxlength="140" value="' + (item.note || "").replace(/"/g, "&quot;") + '" placeholder="Add a note..." aria-label="Note">'
                + '<button type="submit" class="btn-solid">Save</button>'
                + '<button type="button" class="btn-ghost" onclick="cancelNote()">Cancel</button>'
                + '</form>';
        } else if (item.note) {
            noteHtml = '<p class="watch-note">' + item.note + '</p>';
        }

        li.innerHTML = `
            <div class="watch-date"><span class="watch-day">${pad(d.getDate())}</span><span class="watch-month">${monthNames[d.getMonth()]}</span></div>
            <div class="watch-card">
                <div class="watch-main">
                    <span class="watch-type">${typeLabel}</span>
                    <h3>${item.title}</h3>
                    <p>${formatShort(d.toISOString())} / ${item.detail}</p>
                    ${noteHtml}
                </div>
                <div class="watch-actions">
                    <span class="watch-cd" data-time="${d.toISOString()}">${cd}</span>
                    <span class="badge status-${item.badgeStatus}">${item.badge}</span>
                    <button type="button" class="btn-ghost" onclick="editNote(${item.watchItemId})">${item.note ? "Edit note" : "Note"}</button>
                    <button type="button" class="btn-ghost btn-remove" onclick="removeItem(${item.watchItemId})">Remove</button>
                </div>
            </div>
        `;
        list.insertBefore(li, addBox);
    });

    let input = document.getElementById("note-input");
    if (input) {
        input.focus();
        input.select();
    }
}

function tickCountdowns() {
    let now = Date.now();
    document.querySelectorAll(".watch-cd").forEach(function (span) {
        let ms = new Date(span.dataset.time) - now;
        span.textContent = ms < 0 ? "Passed" : formatCountdown(ms);
    });
}


// ---- update (PUT) ----

function editNote(id) {
    editingId = id;
    showWatchlist();
}

function cancelNote() {
    editingId = null;
    showWatchlist();
}

async function submitNote(event, id) {
    event.preventDefault();
    let note = document.getElementById("note-input").value.trim();

    let item = watchItems.find(function (w) { return w.watchItemId === id; });
    let updated = await updateWatchItem(id, Object.assign({}, item, { note: note }));

    let index = watchItems.indexOf(item);
    watchItems[index] = updated;
    editingId = null;
    logEvent("Updated note on " + updated.title + ".", "ok");
    beep("confirm");
    showStats();
    showWatchlist();
}


// ---- delete (DELETE) ----

async function removeItem(id) {
    let item = watchItems.find(function (w) { return w.watchItemId === id; });
    let li = document.querySelector('.saved-item[data-id="' + id + '"]');
    if (li) li.classList.add("watch-leaving");

    await deleteWatchItem(id);
    watchItems = watchItems.filter(function (w) { return w.watchItemId !== id; });
    logEvent("Removed " + item.title + " from watchlist.", "info");
    beep("alert");

    setTimeout(function () {
        showStats();
        showWatchlist();
    }, 260);
}


// ---- wiring ----

document.querySelectorAll("#watch-chips .chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
        watchFilter = chip.dataset.type;
        document.querySelectorAll("#watch-chips .chip").forEach(function (c) { c.classList.remove("chip-active"); });
        chip.classList.add("chip-active");
        showWatchlist();
    });
});

// read (GET)
getWatchItemList().then(function (list) {
    watchItems = list;
    showStats();
    showWatchlist();
    setInterval(tickCountdowns, 1000);

    let now = Date.now();
    let upcoming = watchItems.filter(function (w) { return eventTime(w) > now; })
        .sort(function (a, b) { return eventTime(a) - eventTime(b); });
    let items = [{ label: "Saved events", value: watchItems.length }];
    upcoming.slice(0, 5).forEach(function (w) {
        items.push({ label: w.title, value: formatShort(eventTime(w).toISOString()) });
    });
    setTicker(items);
});
