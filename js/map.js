/* ==========================================================================
   ChargeMate — SVG Metro Map Engine (No external API required)
   Renders stylized city roads + pulsing station nodes directly onto the
   inline SVG canvas. All 5 cities with 20 stations are fully supported.
   ========================================================================== */

/* --------------------------------------------------------------------------
   Station Database  (all 5 cities, 4 stations each)
   -------------------------------------------------------------------------- */
const CITIES_DATA = {
    shenzhen: {
        name: "Shenzhen",
        stations: [
            { id:"sz-1", name:"Shenzhen Bay Hub",          lat:22.5112, lng:113.9302, status:"available", plugs:"4 / 6 Available", rate:"¥1.82/kWh", speed:"350 kW DC", address:"Binhai Avenue 1208, Nanshan District" },
            { id:"sz-2", name:"Futian Central Plaza Grid", lat:22.5372, lng:114.0503, status:"charging",  plugs:"0 / 8 Available", rate:"¥2.10/kWh", speed:"350 kW DC", address:"Shennan Road 4001, Futian District" },
            { id:"sz-3", name:"Luohu MixC Plaza",          lat:22.5521, lng:114.1157, status:"available", plugs:"2 / 4 Available", rate:"¥1.65/kWh", speed:"150 kW DC", address:"Baoan South Road 1001, Luohu District" },
            { id:"sz-4", name:"Baoan Airport Depot",       lat:22.6395, lng:113.8105, status:"offline",   plugs:"0 / 6 Offline",   rate:"¥1.95/kWh", speed:"350 kW DC", address:"Airport Expressway 1, Baoan District" }
        ]
    },
    newyork: {
        name: "New York",
        stations: [
            { id:"ny-1", name:"Times Square Central Plaza", lat:40.7580, lng:-73.9855, status:"available", plugs:"6 / 8 Available", rate:"$0.45/kWh", speed:"350 kW DC", address:"7th Ave & W 42nd St, Manhattan" },
            { id:"ny-2", name:"Central Park West Depot",    lat:40.7813, lng:-73.9735, status:"charging",  plugs:"1 / 4 Available", rate:"$0.38/kWh", speed:"150 kW DC", address:"Central Park West & W 81st St, Manhattan" },
            { id:"ny-3", name:"Brooklyn Bridge Gateway",    lat:40.7020, lng:-73.9874, status:"available", plugs:"3 / 6 Available", rate:"$0.42/kWh", speed:"350 kW DC", address:"Old Fulton St, Brooklyn" },
            { id:"ny-4", name:"LaGuardia Air Plaza",        lat:40.7769, lng:-73.8740, status:"offline",   plugs:"0 / 4 Offline",   rate:"$0.40/kWh", speed:"150 kW DC", address:"Grand Central Parkway, Queens" }
        ]
    },
    london: {
        name: "London",
        stations: [
            { id:"ldn-1", name:"Hyde Park Charger Gate", lat:51.5078, lng:-0.1674, status:"available", plugs:"4 / 4 Available",  rate:"£0.48/kWh", speed:"150 kW DC", address:"Park Lane, London W1K" },
            { id:"ldn-2", name:"Westminster Hub",        lat:51.4994, lng:-0.1353, status:"charging",  plugs:"0 / 6 Available",  rate:"£0.52/kWh", speed:"350 kW DC", address:"Victoria Street, London SW1E" },
            { id:"ldn-3", name:"Canary Wharf Plaza",     lat:51.5054, lng:-0.0235, status:"available", plugs:"8 / 10 Available", rate:"£0.45/kWh", speed:"350 kW DC", address:"Canada Square, London E14" },
            { id:"ldn-4", name:"Heathrow Airport Plaza", lat:51.4700, lng:-0.4543, status:"available", plugs:"5 / 8 Available",  rate:"£0.50/kWh", speed:"350 kW DC", address:"Inner Ring Road East, Hounslow" }
        ]
    },
    munich: {
        name: "Munich",
        stations: [
            { id:"de-1", name:"Munich Olympiapark Hub",  lat:48.1736, lng:11.5465, status:"available", plugs:"6 / 6 Available", rate:"€0.52/kWh", speed:"350 kW DC", address:"Spiridon-Louis-Ring 21, 80809 Munich" },
            { id:"de-2", name:"Munich Odeonsplatz Grid", lat:48.1426, lng:11.5771, status:"charging",  plugs:"0 / 4 Available", rate:"€0.48/kWh", speed:"150 kW DC", address:"Odeonsplatz 1, 80539 Munich" },
            { id:"de-3", name:"Marienplatz Station",     lat:48.1371, lng:11.5754, status:"available", plugs:"3 / 4 Available", rate:"€0.50/kWh", speed:"150 kW DC", address:"Marienplatz 1, 80331 Munich" },
            { id:"de-4", name:"Munich Airport Plaza",    lat:48.3537, lng:11.7751, status:"offline",   plugs:"0 / 8 Offline",   rate:"€0.55/kWh", speed:"350 kW DC", address:"Nordallee 25, 85356 Munich-Flughafen" }
        ]
    },
    austin: {
        name: "Austin, TX",
        stations: [
            { id:"tx-1", name:"Downtown Austin Center", lat:30.2672, lng:-97.7431, status:"available", plugs:"8 / 8 Available",   rate:"$0.39/kWh", speed:"350 kW DC", address:"601 Congress Ave, Austin, TX 78701" },
            { id:"tx-2", name:"Tesla Giga Texas Plaza", lat:30.2217, lng:-97.6218, status:"available", plugs:"12 / 16 Available", rate:"$0.32/kWh", speed:"350 kW DC", address:"1 Tesla Rd, Austin, TX 78725" },
            { id:"tx-3", name:"Domain Retail Grid",     lat:30.4018, lng:-97.7297, status:"charging",  plugs:"2 / 6 Available",   rate:"$0.42/kWh", speed:"150 kW DC", address:"11410 Century Oaks Terrace, Austin, TX 78758" },
            { id:"tx-4", name:"Austin Airport Depot",   lat:30.1975, lng:-97.6664, status:"offline",   plugs:"0 / 4 Offline",     rate:"$0.38/kWh", speed:"150 kW DC", address:"3600 Presidential Blvd, Austin, TX 78719" }
        ]
    }
};

/* --------------------------------------------------------------------------
   City viewport bounds — used to normalise lat/lng → SVG x/y
   -------------------------------------------------------------------------- */
const CITY_BOUNDS = {
    shenzhen: { minLat:22.48, maxLat:22.66, minLng:113.78, maxLng:114.14 },
    newyork:  { minLat:40.68, maxLat:40.80, minLng:-74.02, maxLng:-73.84 },
    london:   { minLat:51.45, maxLat:51.53, minLng:-0.48,  maxLng: 0.02  },
    munich:   { minLat:48.11, maxLat:48.38, minLng:11.50,  maxLng:11.82  },
    austin:   { minLat:30.17, maxLat:30.43, minLng:-97.82, maxLng:-97.58 }
};

/* --------------------------------------------------------------------------
   Stylised city road paths (SVG "d" strings, viewBox 0 0 600 400)
   -------------------------------------------------------------------------- */
const CITY_ROADS = {
    shenzhen: [
        "M 0 230 Q 120 210 260 225 Q 380 240 520 220 Q 570 215 600 218",
        "M 130 0 Q 140 100 155 200 Q 165 300 170 400",
        "M 0 310 Q 180 295 340 308 Q 470 318 600 305",
        "M 370 0 Q 360 130 350 260 Q 345 330 340 400",
        "M 0 140 Q 200 130 400 145 Q 500 152 600 140"
    ],
    newyork: [
        "M 0 195 Q 150 180 300 195 Q 450 210 600 190",
        "M 0 310 Q 200 298 380 308 Q 490 315 600 305",
        "M 190 0 L 195 400",
        "M 410 0 Q 415 200 410 400",
        "M 0 100 Q 300 90 600 105"
    ],
    london: [
        "M 0 210 Q 100 195 250 205 Q 400 215 520 200 Q 560 196 600 200",
        "M 105 0 Q 115 200 125 400",
        "M 0 320 Q 200 305 380 318 Q 500 326 600 315",
        "M 380 0 Q 370 200 360 400",
        "M 0 110 Q 250 100 480 115 Q 540 118 600 112"
    ],
    munich: [
        "M 0 210 Q 150 195 300 210 Q 450 225 600 208",
        "M 295 0 Q 288 200 280 400",
        "M 0 315 Q 200 300 400 312 Q 500 318 600 308",
        "M 140 0 Q 148 200 155 400",
        "M 0 120 Q 200 110 420 122 Q 510 127 600 118"
    ],
    austin: [
        "M 0 215 Q 180 200 340 215 Q 480 228 600 212",
        "M 270 0 Q 262 200 255 400",
        "M 0 340 Q 200 328 400 338 Q 510 344 600 335",
        "M 450 0 Q 455 200 460 400",
        "M 0 110 Q 250 100 500 112 Q 550 114 600 110"
    ]
};

/* --------------------------------------------------------------------------
   Constants & state
   -------------------------------------------------------------------------- */
const SVG_NS  = "http://www.w3.org/2000/svg";
const SVG_W   = 600;
const SVG_H   = 400;
const PAD     = 55; /* inner padding so nodes never touch the edge */

let currentCity    = "shenzhen";
let activeStationId = null;
let isDarkTheme    = false;

const STATUS_COLORS  = { available:"#10B981", charging:"#FF5A36", offline:"#EF4444" };
const STATUS_LABELS  = { available:"Available", charging:"In Use", offline:"Offline" };
const STATUS_CLASSES = { available:"text-green", charging:"text-coral", offline:"text-red" };

/* --------------------------------------------------------------------------
   Coordinate conversion
   -------------------------------------------------------------------------- */
function geoToSVG(lat, lng, cityKey) {
    const b = CITY_BOUNDS[cityKey];
    const x = PAD + ((lng - b.minLng) / (b.maxLng - b.minLng)) * (SVG_W - PAD * 2);
    const y = PAD + ((b.maxLat - lat) / (b.maxLat - b.minLat)) * (SVG_H - PAD * 2);
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

/* --------------------------------------------------------------------------
   Road colour (theme-aware)
   -------------------------------------------------------------------------- */
function roadColor() {
    return isDarkTheme ? "#3A3A3C" : "#CBD5E1";
}

/* --------------------------------------------------------------------------
   Render city map
   -------------------------------------------------------------------------- */
function renderCityMap(cityKey) {
    const city        = CITIES_DATA[cityKey];
    if (!city) return;

    const roadsGroup  = document.getElementById("map-roads");
    const nodesGroup  = document.getElementById("map-nodes");
    const sidebar     = document.getElementById("sidebar-station-list");

    if (!roadsGroup || !nodesGroup) return;

    /* Clear */
    roadsGroup.innerHTML = "";
    nodesGroup.innerHTML = "";
    if (sidebar) sidebar.innerHTML = "";

    /* ---- Roads ---- */
    (CITY_ROADS[cityKey] || []).forEach(d => {
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", d);
        path.setAttribute("stroke", roadColor());
        path.setAttribute("stroke-width", "2");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("fill", "none");
        roadsGroup.appendChild(path);
    });

    /* ---- Station nodes + sidebar cards ---- */
    city.stations.forEach(station => {
        const { x, y } = geoToSVG(station.lat, station.lng, cityKey);
        const color     = STATUS_COLORS[station.status] || STATUS_COLORS.available;
        const isLive    = station.status === "available";

        /* SVG group */
        const g = document.createElementNS(SVG_NS, "g");
        g.setAttribute("class", "station-node");
        g.setAttribute("id", "node-" + station.id);
        g.setAttribute("data-id", station.id);
        g.setAttribute("tabindex", "0");
        g.setAttribute("role", "button");
        g.setAttribute("aria-label", station.name + " – " + STATUS_LABELS[station.status]);
        g.style.cursor = "pointer";

        /* Pulse ring for available stations */
        if (isLive) {
            const pulse = document.createElementNS(SVG_NS, "circle");
            pulse.setAttribute("cx", x);
            pulse.setAttribute("cy", y);
            pulse.setAttribute("r", "20");
            pulse.setAttribute("fill", color);
            pulse.setAttribute("opacity", "0.18");
            pulse.setAttribute("class", "station-node-pulse");
            g.appendChild(pulse);
        }

        /* Main circle */
        const outer = document.createElementNS(SVG_NS, "circle");
        outer.setAttribute("cx", x);
        outer.setAttribute("cy", y);
        outer.setAttribute("r", "11");
        outer.setAttribute("fill", color);
        outer.setAttribute("stroke", "white");
        outer.setAttribute("stroke-width", "2.5");
        outer.setAttribute("class", "node-outer");
        g.appendChild(outer);

        /* Centre dot */
        const inner = document.createElementNS(SVG_NS, "circle");
        inner.setAttribute("cx", x);
        inner.setAttribute("cy", y);
        inner.setAttribute("r", "4");
        inner.setAttribute("fill", "white");
        g.appendChild(inner);

        g.addEventListener("click",   () => selectStation(station));
        g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") selectStation(station); });
        nodesGroup.appendChild(g);

        /* ---- Sidebar card ---- */
        if (sidebar) {
            const card = document.createElement("div");
            card.className = "station-item-card";
            card.id        = "card-" + station.id;
            card.innerHTML =
                '<div class="station-item-info">'
              + '<span class="station-item-name">' + station.name + '</span>'
              + '<span class="station-item-meta">' + station.speed + ' &bull; ' + station.rate + '</span>'
              + '</div>'
              + '<div class="station-item-status ' + STATUS_CLASSES[station.status] + '">'
              + '<span class="dot" style="background-color:currentColor;width:8px;height:8px;border-radius:50%;display:inline-block;"></span>'
              + '&nbsp;<span>' + STATUS_LABELS[station.status] + '</span></div>';
            card.addEventListener("click", () => selectStation(station));
            sidebar.appendChild(card);
        }
    });
}

/* --------------------------------------------------------------------------
   Select station — highlights node, shows detail panel
   -------------------------------------------------------------------------- */
function selectStation(station) {
    activeStationId = station.id;

    /* Reset all nodes to normal size */
    document.querySelectorAll(".station-node .node-outer").forEach(c => {
        c.setAttribute("r", "11");
        c.setAttribute("stroke-width", "2.5");
    });

    /* Enlarge selected node */
    const selNode = document.getElementById("node-" + station.id);
    if (selNode) {
        const outer = selNode.querySelector(".node-outer");
        if (outer) {
            outer.setAttribute("r", "15");
            outer.setAttribute("stroke-width", "3");
        }
    }

    /* Sidebar highlight */
    document.querySelectorAll(".station-item-card").forEach(c => c.classList.remove("selected"));
    const card = document.getElementById("card-" + station.id);
    if (card) {
        card.classList.add("selected");
        card.scrollIntoView({ behavior:"smooth", block:"nearest" });
    }

    /* Detail panel */
    const panel   = document.getElementById("map-station-detail");
    const title   = document.getElementById("detail-title");
    const address = document.getElementById("detail-address");
    const speed   = document.getElementById("detail-speed");
    const plugs   = document.getElementById("detail-plugs");
    const rate    = document.getElementById("detail-rate");
    if (panel && title) {
        title.textContent   = station.name;
        address.textContent = station.address;
        speed.textContent   = station.speed;
        plugs.textContent   = station.plugs;
        rate.textContent    = station.rate;
        panel.style.display = "block";
        panel.offsetHeight;  /* force reflow for transition */
        panel.classList.add("active");
    }
}

/* --------------------------------------------------------------------------
   Switch city
   -------------------------------------------------------------------------- */
function switchCity(cityKey) {
    currentCity = cityKey;
    hideStationDetails();
    renderCityMap(cityKey);
}

/* --------------------------------------------------------------------------
   Hide station detail panel
   -------------------------------------------------------------------------- */
function hideStationDetails() {
    activeStationId = null;
    const panel = document.getElementById("map-station-detail");
    if (panel) {
        panel.classList.remove("active");
        setTimeout(() => { panel.style.display = "none"; }, 300);
    }
}

/* --------------------------------------------------------------------------
   Find station by id across all cities
   -------------------------------------------------------------------------- */
function findStationById(id) {
    for (const city of Object.values(CITIES_DATA)) {
        const s = city.stations.find(s => s.id === id);
        if (s) return s;
    }
    return null;
}

/* --------------------------------------------------------------------------
   Init — wire up all UI interactions
   -------------------------------------------------------------------------- */
function initMap() {
    isDarkTheme = document.documentElement.getAttribute("data-theme") === "dark";

    /* Update SVG background + road colours on theme change */
    new MutationObserver(() => {
        isDarkTheme = document.documentElement.getAttribute("data-theme") === "dark";
        const svg = document.querySelector(".metro-map-svg");
        if (svg) svg.style.backgroundColor = isDarkTheme ? "#18181B" : "#F8FAFC";
        document.querySelectorAll("#map-roads path").forEach(p =>
            p.setAttribute("stroke", roadColor())
        );
        /* Update grid pattern line colour */
        const gridPath = document.querySelector("#grid-pattern path");
        if (gridPath) gridPath.setAttribute("stroke", isDarkTheme ? "#27272A" : "#E2E8F0");
    }).observe(document.documentElement, { attributes:true, attributeFilter:["data-theme"] });

    /* City tab clicks */
    document.querySelectorAll(".city-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".city-tab").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            switchCity(tab.getAttribute("data-city"));
        });
    });

    /* Search autocomplete */
    const searchInput   = document.getElementById("map-search-input");
    const searchResults = document.getElementById("search-results");
    if (searchInput && searchResults) {
        searchInput.addEventListener("input", e => {
            const q = e.target.value.toLowerCase().trim();
            searchResults.innerHTML = "";
            if (q.length < 2) { searchResults.style.display = "none"; return; }

            const matches = [];
            Object.keys(CITIES_DATA).forEach(cityKey => {
                CITIES_DATA[cityKey].stations.forEach(station => {
                    if (station.name.toLowerCase().includes(q) || station.address.toLowerCase().includes(q)) {
                        matches.push({ station, cityKey, cityName: CITIES_DATA[cityKey].name });
                    }
                });
            });

            if (matches.length) {
                matches.slice(0, 5).forEach(m => {
                    const div = document.createElement("div");
                    div.className   = "autocomplete-item";
                    div.textContent = m.station.name + " (" + m.cityName + ")";
                    div.addEventListener("click", () => {
                        const tab = document.querySelector('.city-tab[data-city="' + m.cityKey + '"]');
                        if (tab) tab.click();
                        setTimeout(() => selectStation(m.station), 120);
                        searchInput.value           = "";
                        searchResults.style.display = "none";
                    });
                    searchResults.appendChild(div);
                });
                searchResults.style.display = "block";
            } else {
                searchResults.style.display = "none";
            }
        });

        document.addEventListener("click", e => {
            if (!e.target.closest(".search-box")) searchResults.style.display = "none";
        });
    }

    /* Reserve button — prefill the reservations form */
    const reserveBtn = document.getElementById("btn-reserve-station");
    if (reserveBtn) {
        reserveBtn.addEventListener("click", () => {
            if (!activeStationId) return;
            const s = findStationById(activeStationId);
            if (!s) return;
            const rType  = document.getElementById("reserve-type");
            const rNotes = document.getElementById("booking-notes");
            if (rType)  rType.value  = "network-pass";
            if (rNotes) {
                rNotes.value = "Reservation inquiry for: " + s.name + " (" + s.address + ").";
                rNotes.dispatchEvent(new Event("input"));
            }
            const target = document.getElementById("reserve");
            if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior:"smooth" });
        });
    }

    /* Initial render */
    renderCityMap(currentCity);
}

document.addEventListener("DOMContentLoaded", initMap);
