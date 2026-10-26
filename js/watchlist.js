// Watchlist page (watchlist.html)
// this is the page that uses all of CRUD:
//   GET    /api/watchlist       load the list
//   POST   /api/watchlist       add (done from the launches page)
//   PUT    /api/watchlist/:id   edit the note on an item
//   DELETE /api/watchlist/:id   remove an item

let watchItems = watchlistResponse.items;


function showWatchlist() {
    let list = document.getElementById("watchlist");
    let addBox = document.getElementById("watch-add");

    // clear everything except the "want to track more" box at the bottom
    list.querySelectorAll(".saved-item").forEach(function (li) {
        li.remove();
    });

    if (watchItems.length === 0) {
        let empty = document.createElement("li");
        empty.className = "watch-item saved-item";
        empty.innerHTML = '<p class="note">Nothing saved yet.</p>';
        list.insertBefore(empty, addBox);
        return;
    }

    // soonest first
    watchItems.sort(function (a, b) {
        return new Date(a.date) - new Date(b.date);
    });

    watchItems.forEach(function (item) {
        let d = new Date(item.date + "T12:00:00");
        let typeLabel = item.type === "iss" ? "ISS" : item.type.charAt(0).toUpperCase() + item.type.slice(1);

        let li = document.createElement("li");
        li.className = "watch-item saved-item watch-" + item.type;
        li.innerHTML = `
            <div class="watch-date"><span class="watch-day">${pad(d.getDate())}</span><span class="watch-month">${monthNames[d.getMonth()]}</span></div>
            <div class="watch-card">
                <div>
                    <span class="watch-type">${typeLabel}</span>
                    <h3>${item.title}</h3>
                    <p>${formatDate(item.date)} / ${item.detail}</p>
                    ${item.note ? '<p class="watch-note">Note: ' + item.note + '</p>' : ""}
                </div>
                <div class="watch-actions">
                    <span class="badge status-${item.badge_status}">${item.badge}</span>
                    <button type="button" class="btn-ghost" onclick="editNote(${item.id})">Note</button>
                    <button type="button" class="btn-ghost btn-remove" onclick="removeItem(${item.id})">Remove</button>
                </div>
            </div>
        `;
        list.insertBefore(li, addBox);
    });
}


// PUT /api/watchlist/:id
function editNote(id) {
    let item = watchItems.find(function (w) {
        return w.id === id;
    });

    let newNote = prompt("Note for " + item.title + ":", item.note);
    if (newNote === null) {
        return;
    }

    item.note = newNote.trim();
    console.log("PUT /api/watchlist/" + id, { note: item.note });
    showWatchlist();
}


// DELETE /api/watchlist/:id
function removeItem(id) {
    watchItems = watchItems.filter(function (w) {
        return w.id !== id;
    });
    console.log("DELETE /api/watchlist/" + id);
    showWatchlist();
}


showWatchlist();
