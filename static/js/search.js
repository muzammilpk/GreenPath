console.log("GreenPath search.js loaded");

// ============================================================
// VEHICLES
// ============================================================

const VEHICLES = {

    walk: {
        name: "Walking",
        icon: "🚶",
        speed: 5,
        emission: 0,
        cost: 0
    },

    cycle: {
        name: "Bicycle",
        icon: "🚴",
        speed: 15,
        emission: 0,
        cost: 0
    },

    bike: {
        name: "Bike",
        icon: "🏍️",
        speed: 45,
        emission: 50,
        cost: 3
    },

    bus: {
        name: "Bus",
        icon: "🚌",
        speed: 40,
        emission: 80,
        cost: 2
    },

    train: {
        name: "Train",
        icon: "🚆",
        speed: 55,
        emission: 30,
        cost: 1.5
    },

    car: {
        name: "Car",
        icon: "🚗",
        speed: 55,
        emission: 170,
        cost: 10
    }

};


// ============================================================
// DOM READY
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    const button =
        document.getElementById("searchRoute");

    if (!button) {
        console.error("Search button not found!");
        return;
    }


    button.addEventListener("click", async () => {

        const sourceElement =
            document.getElementById("source");

        const destinationElement =
            document.getElementById("destination");

        const selected =
            document.querySelector(
                'input[name="vehicle"]:checked'
            );


        const source =
            sourceElement
                ? sourceElement.value.trim()
                : "";

        const destination =
            destinationElement
                ? destinationElement.value.trim()
                : "";


        if (!source || !destination) {

            alert(
                "Please enter both source and destination."
            );

            return;
        }


        if (!selected) {

            alert(
                "Please select a transportation option."
            );

            return;
        }


        displaySelectedVehicle(
            selected.value
        );


        button.disabled = true;

        button.innerHTML =
            "⏳ Calculating Route...";


        try {

            const sourceLocation =
                await geocode(source);


            if (!sourceLocation) {
                return;
            }


            const destinationLocation =
                await geocode(destination);


            if (!destinationLocation) {
                return;
            }


            await showRoute(
                sourceLocation,
                destinationLocation,
                selected.value
            );

        }

        catch (error) {

            console.error(
                "Route calculation error:",
                error
            );


            alert(
                error.message ||
                "Something went wrong while calculating the route."
            );

        }

        finally {

            button.disabled = false;

            button.innerHTML =
                "🌱 Compare Routes";

        }

    });


    const clearButton =
        document.getElementById(
            "clearRoute"
        );


    if (clearButton) {

        clearButton.addEventListener(
            "click",
            () => clearRoute(true)
        );

    }

});


// ============================================================
// GEOCODING
// ============================================================

async function geocode(place) {

    try {

        const url =
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`;


        const response =
            await fetch(url, {
                headers: {
                    Accept: "application/json"
                }
            });


        if (!response.ok) {

            throw new Error(
                "Geocoding request failed."
            );

        }


        const data =
            await response.json();


        if (!data.length) {

            alert(
                `Location not found: ${place}`
            );

            return null;
        }


        return {

            lat:
                parseFloat(
                    data[0].lat
                ),

            lon:
                parseFloat(
                    data[0].lon
                ),

            name:
                data[0].display_name ||
                place

        };

    }

    catch (error) {

        console.error(
            "Geocoding error:",
            error
        );


        alert(
            "Unable to find the location. Please try again."
        );


        return null;

    }

}


// ============================================================
// MAIN ROUTE FUNCTION
// ============================================================

async function showRoute(
    source,
    destination,
    selectedVehicle
) {

    if (!window.greenMap) {

        throw new Error(
            "Map is not ready. Please refresh the page."
        );

    }


    clearRoute(false);


    // ========================================================
    // TRAIN JOURNEY
    // ========================================================

    if (selectedVehicle === "train") {

        return await showTrainJourney(
            source,
            destination
        );

    }


    // ========================================================
    // NORMAL ROAD JOURNEY
    // ========================================================

    const sourceLat =
        Number(source.lat);

    const sourceLon =
        Number(source.lon);

    const destinationLat =
        Number(destination.lat);

    const destinationLon =
        Number(destination.lon);


    if (
        ![
            sourceLat,
            sourceLon,
            destinationLat,
            destinationLon
        ].every(Number.isFinite)
    ) {

        throw new Error(
            "Invalid location coordinates."
        );

    }


    const coordinates =
        `${sourceLon},${sourceLat};${destinationLon},${destinationLat}`;


    const url =
        `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;


    const response =
        await fetch(url);


    if (!response.ok) {

        throw new Error(
            `Route server returned HTTP ${response.status}.`
        );

    }


    const data =
        await response.json();


    if (
        data.code !== "Ok" ||
        !data.routes?.length
    ) {

        throw new Error(
            "No road route could be found."
        );

    }


    const route =
        data.routes[0];


    const distance =
        Number(route.distance) / 1000;


    const durationMinutes =
        Math.max(
            1,
            Math.round(
                Number(route.duration) / 60
            )
        );


    drawRouteGeometry(
        route.geometry,
        false
    );


    addJourneyMarker(
        source.lat,
        source.lon,
        `📍 ${source.name || "Source"}`
    );


    addJourneyMarker(
        destination.lat,
        destination.lon,
        `📍 ${destination.name || "Destination"}`
    );


    fitJourneyMap([
        [source.lat, source.lon],
        [destination.lat, destination.lon]
    ]);


    updateRouteSummary(
        distance,
        durationMinutes
    );


    const vehicleData =
        calculateVehicleComparison(
            distance,
            source.name,
            destination.name
        );


    displaySelectedVehicleDetails(
        selectedVehicle,
        vehicleData
    );


    updateRecommendation(
        vehicleData
    );


    return {
        distance,
        durationMinutes,
        vehicleData,
        route
    };

}


// ============================================================
// TRAIN MULTIMODAL JOURNEY
// ============================================================

async function showTrainJourney(
    source,
    destination
) {

    showTrainStatus(
        "🚆 Finding nearest railway stations..."
    );


    // --------------------------------------------------------
    // SOURCE STATION
    // --------------------------------------------------------

    const sourceStation =
        await findNearestRailwayStation(
            source.lat,
            source.lon
        );


    // --------------------------------------------------------
    // DESTINATION STATION
    // --------------------------------------------------------

    const destinationStation =
        await findNearestRailwayStation(
            destination.lat,
            destination.lon
        );


    if (
        !sourceStation ||
        !destinationStation
    ) {

        throw new Error(
            "Could not find a suitable railway station near the source or destination."
        );

    }


    console.log(
        "Source station:",
        sourceStation
    );


    console.log(
        "Destination station:",
        destinationStation
    );


    // ========================================================
    // FIRST MILE
    // Source → Railway Station
    // ========================================================

    showTrainStatus(
        `🚗 Navigating to ${sourceStation.name}...`
    );


    const firstMile =
        await getRoadRoute(
            source,
            sourceStation
        );


    // ========================================================
    // LAST MILE
    // Railway Station → Destination
    // ========================================================

    showTrainStatus(
        `🚗 Calculating route from ${destinationStation.name}...`
    );


    const lastMile =
        await getRoadRoute(
            destinationStation,
            destination
        );


    // ========================================================
    // RAILWAY NETWORK
    // ========================================================

    showTrainStatus(
        "🚆 Loading railway network..."
    );


    await drawRailwayNetwork(
        sourceStation.lat,
        sourceStation.lon,
        destinationStation.lat,
        destinationStation.lon
    );


    // ========================================================
    // DRAW FIRST MILE
    // ========================================================

    drawRouteGeometry(
        firstMile.geometry,
        true
    );


    // ========================================================
    // DRAW LAST MILE
    // ========================================================

    drawRouteGeometry(
        lastMile.geometry,
        true
    );


    // ========================================================
    // MARKERS
    // ========================================================

    addJourneyMarker(
        source.lat,
        source.lon,
        `📍 ${source.name || "Source"}`
    );


    addStationMarker(
        sourceStation,
        "🚉 Boarding Station"
    );


    addStationMarker(
        destinationStation,
        "🚉 Destination Station"
    );


    addJourneyMarker(
        destination.lat,
        destination.lon,
        `📍 ${destination.name || "Destination"}`
    );


    // ========================================================
    // TRAIN DISTANCE
    // ========================================================

    const railDistance =
        haversineKm(
            sourceStation.lat,
            sourceStation.lon,
            destinationStation.lat,
            destinationStation.lon
        );


    // ========================================================
    // ESTIMATED TRAIN TIME
    // ========================================================

    const railTravelMinutes =
        Math.max(
            10,
            Math.round(
                (
                    railDistance /
                    VEHICLES.train.speed
                ) * 60
            )
        );


    // ========================================================
    // STATION BUFFER
    // ========================================================

    const boardingTime = 10;

    const interchangeTime = 10;


    // ========================================================
    // TOTAL TIME
    // ========================================================

    const totalMinutes =
        firstMile.durationMinutes +
        boardingTime +
        railTravelMinutes +
        interchangeTime +
        lastMile.durationMinutes;


    // ========================================================
    // TOTAL DISTANCE
    // ========================================================

    const totalDistance =
        firstMile.distance +
        railDistance +
        lastMile.distance;


    // ========================================================
    // UPDATE SUMMARY
    // ========================================================

    updateRouteSummary(
        totalDistance,
        totalMinutes
    );


    // ========================================================
    // TRAIN JOURNEY PANEL
    // ========================================================

    updateTrainJourneyPanel({

        source,
        destination,

        sourceStation,

        destinationStation,

        firstMile,

        railDistance,

        railTravelMinutes,

        lastMile,

        totalMinutes,

        totalDistance

    });


    // ========================================================
    // VEHICLE COMPARISON
    // ========================================================

    const vehicleData =
        calculateVehicleComparison(
            totalDistance,
            source.name,
            destination.name
        );


    // ========================================================
    // CORRECT TRAIN VALUES
    // ========================================================

    vehicleData.train.time =
        totalMinutes;


    vehicleData.train.totalCost =
        Math.round(

            railDistance *
            VEHICLES.train.cost

            +

            firstMile.distance *
            VEHICLES.car.cost *
            0.25

            +

            lastMile.distance *
            VEHICLES.car.cost *
            0.25

        );


    vehicleData.train.co2 =
        Number(

            (

                railDistance *
                VEHICLES.train.emission /
                1000

                +

                (
                    firstMile.distance +
                    lastMile.distance
                ) *
                40 /
                1000

            ).toFixed(2)

        );


    // ========================================================
    // RECALCULATE SCORES
    // ========================================================

    const validVehicles =
        Object.values(
            vehicleData
        ).filter(
            vehicle =>
                vehicle.available &&
                vehicle.practical
        );


    calculateGreenPathScores(
        validVehicles
    );


    // ========================================================
    // UPDATE UI
    // ========================================================

    updateComparisonTable(
        vehicleData
    );


    updateRecommendation(
        vehicleData
    );


    displaySelectedVehicleDetails(
        "train",
        vehicleData
    );


    // ========================================================
    // FIT MAP
    // ========================================================

    fitJourneyMap([

        [
            source.lat,
            source.lon
        ],

        [
            sourceStation.lat,
            sourceStation.lon
        ],

        [
            destinationStation.lat,
            destinationStation.lon
        ],

        [
            destination.lat,
            destination.lon
        ]

    ]);


    hideTrainStatus();


    return {

        trainJourney: true,

        sourceStation,

        destinationStation,

        totalDistance,

        totalMinutes,

        vehicleData

    };

}


// ============================================================
// FIND NEAREST RAILWAY STATION
// ============================================================

async function findNearestRailwayStation(
    lat,
    lon
) {

    const radiusList = [
        30000,
        60000,
        100000
    ];


    for (
        const radius of radiusList
    ) {

        const query = `

            [out:json][timeout:25];

            (

                node
                ["railway"="station"]
                (around:${radius},${lat},${lon});

                node
                ["railway"="halt"]
                (around:${radius},${lat},${lon});

            );

            out tags center;

        `;


        try {

            const response =
                await fetch(
                    "https://overpass-api.de/api/interpreter",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "text/plain;charset=UTF-8"
                        },

                        body: query
                    }
                );


            if (!response.ok) {
                continue;
            }


            const data =
                await response.json();


            const candidates =
                (data.elements || [])

                    .map(
                        element => ({

                            lat:
                                Number(
                                    element.lat
                                ),

                            lon:
                                Number(
                                    element.lon
                                ),

                            name:
                                element.tags?.name ||
                                "Railway Station",

                            type:
                                element.tags?.railway ||
                                "station"

                        })
                    )

                    .filter(
                        station =>

                            Number.isFinite(
                                station.lat
                            )

                            &&

                            Number.isFinite(
                                station.lon
                            )
                    );


            if (
                !candidates.length
            ) {

                continue;

            }


            candidates.sort(
                (a, b) =>

                    haversineKm(
                        lat,
                        lon,
                        a.lat,
                        a.lon
                    )

                    -

                    haversineKm(
                        lat,
                        lon,
                        b.lat,
                        b.lon
                    )
            );


            return candidates[0];

        }

        catch (error) {

            console.warn(
                "Railway station search failed:",
                error
            );

        }

    }


    return null;

}


// ============================================================
// ROAD ROUTE BETWEEN TWO POINTS
// ============================================================

async function getRoadRoute(
    from,
    to
) {

    const coordinates =
        `${Number(from.lon)},${Number(from.lat)};${Number(to.lon)},${Number(to.lat)}`;


    const url =
        `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;


    const response =
        await fetch(url);


    if (!response.ok) {

        throw new Error(
            "Unable to calculate road connection."
        );

    }


    const data =
        await response.json();


    if (
        data.code !== "Ok" ||
        !data.routes?.length
    ) {

        throw new Error(
            "Could not calculate the road connection to the railway station."
        );

    }


    const route =
        data.routes[0];


    return {

        distance:
            Number(
                route.distance
            ) / 1000,

        durationMinutes:
            Math.max(
                1,
                Math.round(
                    Number(
                        route.duration
                    ) / 60
                )
            ),

        geometry:
            route.geometry

    };

}


// ============================================================
// RAILWAY NETWORK
// ============================================================

async function drawRailwayNetwork(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const south =
        Math.min(
            lat1,
            lat2
        ) - 0.35;


    const north =
        Math.max(
            lat1,
            lat2
        ) + 0.35;


    const west =
        Math.min(
            lon1,
            lon2
        ) - 0.35;


    const east =
        Math.max(
            lon1,
            lon2
        ) + 0.35;


    const query = `

        [out:json][timeout:30];

        way
        ["railway"="rail"]
        (${south},${west},${north},${east});

        out geom;

    `;


    try {

        const response =
            await fetch(
                "https://overpass-api.de/api/interpreter",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "text/plain;charset=UTF-8"
                    },

                    body: query
                }
            );


        if (!response.ok) {
            return;
        }


        const data =
            await response.json();


        const features = [];


        (data.elements || [])
            .forEach(
                way => {

                    if (
                        !way.geometry ||
                        way.geometry.length < 2
                    ) {

                        return;

                    }


                    features.push({

                        type: "Feature",

                        properties: {
                            railway: "rail"
                        },

                        geometry: {

                            type: "LineString",

                            coordinates:
                                way.geometry.map(
                                    point => [
                                        point.lon,
                                        point.lat
                                    ]
                                )

                        }

                    });

                }
            );


        if (!features.length) {
            return;
        }


        window.railwayNetworkLayer =
            L.geoJSON(

                {
                    type:
                        "FeatureCollection",

                    features

                },

                {

                    style: {

                        color:
                            "#166534",

                        weight:
                            3,

                        opacity:
                            0.65,

                        dashArray:
                            "7 6"

                    }

                }

            ).addTo(
                window.greenMap
            );

    }

    catch (error) {

        console.warn(
            "Could not load railway network:",
            error
        );

    }

}


// ============================================================
// TRAIN JOURNEY PANEL
// ============================================================

function updateTrainJourneyPanel(
    journey
) {

    let panel =
        document.getElementById(
            "trainJourneyPanel"
        );


    if (!panel) {

        panel =
            document.createElement(
                "div"
            );


        panel.id =
            "trainJourneyPanel";


        panel.className =
            "alert alert-light border mt-3 shadow-sm";


        const comparison =
            document.getElementById(
                "vehicleComparison"
            );


        if (comparison) {

            comparison.prepend(
                panel
            );

        }

    }


    panel.innerHTML = `

        <div class="fw-bold mb-3">

            🚆 Train Journey

        </div>


        <div class="small">

            <div class="mb-2">

                📍
                <strong>
                    ${escapeHtml(
                        journey.source.name ||
                        "Source"
                    )}
                </strong>

            </div>


            <div class="ms-3 mb-2">

                ↓ 🚗

                ${journey.firstMile.distance.toFixed(1)}
                km

                ·

                ${formatTime(
                    journey.firstMile.durationMinutes
                )}

            </div>


            <div class="mb-2">

                🚉
                <strong>
                    ${escapeHtml(
                        journey.sourceStation.name
                    )}
                </strong>

            </div>


            <div class="ms-3 mb-2">

                ↓ 🚆

                ${journey.railDistance.toFixed(1)}
                km

                ·

                ~${formatTime(
                    journey.railTravelMinutes
                )}

            </div>


            <div class="mb-2">

                🚉
                <strong>
                    ${escapeHtml(
                        journey.destinationStation.name
                    )}
                </strong>

            </div>


            <div class="ms-3 mb-2">

                ↓ 🚗

                ${journey.lastMile.distance.toFixed(1)}
                km

                ·

                ${formatTime(
                    journey.lastMile.durationMinutes
                )}

            </div>


            <div>

                📍
                <strong>
                    ${escapeHtml(
                        journey.destination.name ||
                        "Destination"
                    )}
                </strong>

            </div>

        </div>


        <hr>


        <div class="small text-muted">

            ⏱️ Total:

            <strong>
                ${formatTime(
                    journey.totalMinutes
                )}
            </strong>

            &nbsp; • &nbsp;

            📏

            ${journey.totalDistance.toFixed(1)}
            km

        </div>


        <div class="small text-muted mt-2">

            ℹ️ Train time is estimated.
            Live railway timetable is not connected yet.

        </div>

    `;

}


// ============================================================
// TRAIN STATUS
// ============================================================

function showTrainStatus(
    message
) {

    let status =
        document.getElementById(
            "trainJourneyStatus"
        );


    if (!status) {

        status =
            document.createElement(
                "div"
            );


        status.id =
            "trainJourneyStatus";


        status.className =
            "alert alert-success py-2 mt-2 mb-2";


        const form =
            document.getElementById(
                "plannerForm"
            )

            ||

            document.getElementById(
                "searchRoute"
            )?.parentElement;


        if (form) {

            form.appendChild(
                status
            );

        }

    }


    status.textContent =
        message;


    status.classList.remove(
        "d-none"
    );

}


function hideTrainStatus() {

    const status =
        document.getElementById(
            "trainJourneyStatus"
        );


    if (status) {

        status.classList.add(
            "d-none"
        );

    }

}


// ============================================================
// MAP MARKERS
// ============================================================

function addJourneyMarker(
    lat,
    lon,
    label
) {

    const marker =
        L.marker([
            lat,
            lon
        ])

        .addTo(
            window.greenMap
        )

        .bindPopup(
            label
        );


    if (
        !window.greenPathMarkers
    ) {

        window.greenPathMarkers =
            [];

    }


    window.greenPathMarkers.push(
        marker
    );

}


function addStationMarker(
    station,
    label
) {

    const marker =
        L.marker([
            station.lat,
            station.lon
        ])

        .addTo(
            window.greenMap
        )

        .bindPopup(
            `${label}: ${escapeHtml(station.name)}`
        );


    if (
        !window.greenPathMarkers
    ) {

        window.greenPathMarkers =
            [];

    }


    window.greenPathMarkers.push(
        marker
    );

}


// ============================================================
// DRAW ROUTE
// ============================================================

function drawRouteGeometry(
    geometry,
    firstLastMile
) {

    const layer =
        L.geoJSON(
            geometry,
            {

                style: {

                    weight:
                        5,

                    opacity:
                        0.9,

                    dashArray:
                        firstLastMile
                            ? "10 8"
                            : null

                }

            }
        )

        .addTo(
            window.greenMap
        );


    if (
        !window.greenPathRouteLayers
    ) {

        window.greenPathRouteLayers =
            [];

    }


    window.greenPathRouteLayers.push(
        layer
    );

}


// ============================================================
// FIT MAP
// ============================================================

function fitJourneyMap(
    points
) {

    if (
        !points ||
        !points.length
    ) {

        return;

    }


    const bounds =
        L.latLngBounds(
            points
        );


    window.greenMap.fitBounds(
        bounds.pad(
            0.15
        )
    );

}


// ============================================================
// DISTANCE
// ============================================================

function haversineKm(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const R = 6371;


    const dLat =
        (
            lat2 -
            lat1
        ) *
        Math.PI /
        180;


    const dLon =
        (
            lon2 -
            lon1
        ) *
        Math.PI /
        180;


    const a =
        Math.sin(
            dLat / 2
        ) ** 2

        +

        Math.cos(
            lat1 *
            Math.PI /
            180
        )

        *

        Math.cos(
            lat2 *
            Math.PI /
            180
        )

        *

        Math.sin(
            dLon / 2
        ) ** 2;


    return (
        R *
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(
                1 - a
            )
        )
    );

}


// ============================================================
// ROUTE SUMMARY
// ============================================================

function updateRouteSummary(
    distance,
    durationMinutes
) {

    const distanceElement =
        document.getElementById(
            "distanceValue"
        );


    const timeElement =
        document.getElementById(
            "timeValue"
        );


    const summary =
        document.getElementById(
            "routeSummary"
        );


    if (distanceElement) {

        distanceElement.textContent =
            `${distance.toFixed(2)} km`;

    }


    if (timeElement) {

        timeElement.textContent =
            formatTime(
                durationMinutes
            );

    }


    if (summary) {

        summary.classList.remove(
            "d-none"
        );

    }

}


// ============================================================
// CLEAR ROUTE
// ============================================================

function clearRoute(
    showMessage = false
) {

    if (
        window.greenMap &&
        window.routeLayer
    ) {

        try {

            window.greenMap.removeLayer(
                window.routeLayer
            );

        }

        catch (error) {}

    }


    // Remove route layers

    if (
        window.greenPathRouteLayers
    ) {

        window.greenPathRouteLayers
            .forEach(
                layer => {

                    try {

                        if (
                            window.greenMap
                        ) {

                            window.greenMap.removeLayer(
                                layer
                            );

                        }

                    }

                    catch (error) {}

                }
            );

    }


    window.greenPathRouteLayers =
        [];


    // Remove railway network

    if (
        window.greenMap &&
        window.railwayNetworkLayer
    ) {

        try {

            window.greenMap.removeLayer(
                window.railwayNetworkLayer
            );

        }

        catch (error) {}

    }


    window.railwayNetworkLayer =
        null;


    // Remove markers

    if (
        window.greenMap &&
        window.greenPathMarkers
    ) {

        window.greenPathMarkers
            .forEach(
                marker => {

                    try {

                        window.greenMap.removeLayer(
                            marker
                        );

                    }

                    catch (error) {}

                }
            );

    }


    window.greenPathMarkers =
        [];


    window.routeLayer =
        null;


    window.routeControl =
        null;


    // Hide summary

    const summary =
        document.getElementById(
            "routeSummary"
        );


    if (summary) {

        summary.classList.add(
            "d-none"
        );

    }


    // Hide selected details

    const details =
        document.getElementById(
            "selectedVehicleDetails"
        );


    if (details) {

        details.classList.add(
            "d-none"
        );

    }


    // Hide best choice

    const best =
        document.getElementById(
            "bestChoiceBox"
        );


    if (best) {

        best.classList.add(
            "d-none"
        );

    }


    // Remove train panel

    const trainPanel =
        document.getElementById(
            "trainJourneyPanel"
        );


    if (trainPanel) {

        trainPanel.remove();

    }


    const trainStatus =
        document.getElementById(
            "trainJourneyStatus"
        );


    if (trainStatus) {

        trainStatus.remove();

    }


    if (showMessage) {

        console.log(
            "Route cleared."
        );

    }

}


window.greenPathClearRoute =
    clearRoute;


// ============================================================
// VEHICLE COMPARISON
// ============================================================

function calculateVehicleComparison(
    distance,
    sourceName = "",
    destinationName = ""
) {

    const vehicles = {};


    Object.keys(
        VEHICLES
    ).forEach(
        key => {

            vehicles[key] = {

                ...VEHICLES[key]

            };

        }
    );


    Object.keys(
        vehicles
    ).forEach(
        key => {

            const vehicle =
                vehicles[key];


            const feasibility =
                getTransportFeasibility(
                    key,
                    distance,
                    sourceName,
                    destinationName
                );


            vehicle.available =
                feasibility.available;


            vehicle.practical =
                feasibility.practical;


            vehicle.status =
                feasibility.status;


            vehicle.message =
                feasibility.message;


            vehicle.time =
                Math.round(
                    (
                        distance /
                        vehicle.speed
                    ) * 60
                );


            vehicle.co2 =
                (
                    distance *
                    vehicle.emission
                ) / 1000;


            vehicle.totalCost =
                distance *
                vehicle.cost;

        }
    );


    const validVehicles =
        Object.values(
            vehicles
        ).filter(
            vehicle =>
                vehicle.available &&
                vehicle.practical
        );


    calculateGreenPathScores(
        validVehicles
    );


    updateComparisonTable(
        vehicles
    );


    const comparison =
        document.getElementById(
            "vehicleComparison"
        );


    if (comparison) {

        comparison.classList.remove(
            "d-none"
        );

    }


    return vehicles;

}


// ============================================================
// VEHICLE FEASIBILITY
// ============================================================

function getTransportFeasibility(
    vehicle,
    distance,
    sourceName = "",
    destinationName = ""
) {

    const source =
        String(
            sourceName
        ).toLowerCase();


    const destination =
        String(
            destinationName
        ).toLowerCase();


    // --------------------------------------------------------
    // WALKING
    // --------------------------------------------------------

    if (
        vehicle === "walk" &&
        distance > 15
    ) {

        return {

            available: true,

            practical: false,

            status:
                "Not practical",

            message:
                "Walking is not practical above 15 km."

        };

    }


    // --------------------------------------------------------
    // BICYCLE
    // --------------------------------------------------------

    if (
        vehicle === "cycle" &&
        distance > 60
    ) {

        return {

            available: true,

            practical: false,

            status:
                "Not practical",

            message:
                "Bicycle travel is not practical above 60 km."

        };

    }


    // --------------------------------------------------------
    // TRAIN
    //
    // IMPORTANT:
    // Train is NOT rejected just because the destination
    // has no railway station.
    //
    // We find the nearest railway station and create:
    //
    // Source
    //   ↓
    // Nearest Station
    //   ↓
    // Train
    //   ↓
    // Nearest Destination Station
    //   ↓
    // Destination
    // --------------------------------------------------------

    if (
        vehicle === "train"
    ) {

        return {

            available: true,

            practical: true,

            status:
                "Available with station transfer",

            message:
                "Train journey uses the nearest railway stations with road connections."

        };

    }


    // --------------------------------------------------------
    // DEFAULT
    // --------------------------------------------------------

    return {

        available: true,

        practical: true,

        status:
            "Available",

        message:
            "Available for this journey."

    };

}


// ============================================================
// GREENPATH SCORE
// ============================================================

function calculateGreenPathScores(
    vehicles
) {

    if (
        !vehicles ||
        !vehicles.length
    ) {

        return;

    }


    const times =
        vehicles.map(
            vehicle =>
                vehicle.time
        );


    const co2Values =
        vehicles.map(
            vehicle =>
                vehicle.co2
        );


    const costs =
        vehicles.map(
            vehicle =>
                vehicle.totalCost
        );


    const minTime =
        Math.min(...times);


    const maxTime =
        Math.max(...times);


    const minCO2 =
        Math.min(...co2Values);


    const maxCO2 =
        Math.max(...co2Values);


    const minCost =
        Math.min(...costs);


    const maxCost =
        Math.max(...costs);


    vehicles.forEach(
        vehicle => {

            let timeScore = 40;

            let co2Score = 35;

            let costScore = 15;


            if (
                maxTime !== minTime
            ) {

                timeScore =
                    (
                        (
                            maxTime -
                            vehicle.time
                        ) /
                        (
                            maxTime -
                            minTime
                        )
                    ) * 40;

            }


            if (
                maxCO2 !== minCO2
            ) {

                co2Score =
                    (
                        (
                            maxCO2 -
                            vehicle.co2
                        ) /
                        (
                            maxCO2 -
                            minCO2
                        )
                    ) * 35;

            }


            if (
                maxCost !== minCost
            ) {

                costScore =
                    (
                        (
                            maxCost -
                            vehicle.totalCost
                        ) /
                        (
                            maxCost -
                            minCost
                        )
                    ) * 15;

            }


            const practicalityScore =
                vehicle.practical
                    ? 10
                    : 0;


            vehicle.score =
                Math.min(
                    100,
                    Math.max(
                        0,
                        timeScore +
                        co2Score +
                        costScore +
                        practicalityScore
                    )
                );

        }
    );

}


// ============================================================
// RATING
// ============================================================

function getRating(
    score
) {

    if (score >= 90) {

        return {
            stars: "⭐⭐⭐⭐⭐",
            label: "Excellent"
        };

    }


    if (score >= 80) {

        return {
            stars: "⭐⭐⭐⭐",
            label: "Very Good"
        };

    }


    if (score >= 70) {

        return {
            stars: "⭐⭐⭐",
            label: "Good"
        };

    }


    if (score >= 60) {

        return {
            stars: "⭐⭐",
            label: "Fair"
        };

    }


    return {
        stars: "⭐",
        label: "Poor"
    };

}


// ============================================================
// COMPARISON TABLE
// ============================================================

function updateComparisonTable(
    vehicles
) {

    const table =
        findComparisonTable();


    if (!table) {

        console.warn(
            "Vehicle comparison table not found."
        );

        return;

    }


    let thead =
        table.querySelector(
            "thead"
        );


    if (!thead) {

        thead =
            document.createElement(
                "thead"
            );

        table.prepend(
            thead
        );

    }


    thead.innerHTML = `

        <tr>

            <th>Transport</th>

            <th>Availability</th>

            <th>Time</th>

            <th>CO₂</th>

            <th>Cost</th>

            <th>GreenPath Rating</th>

        </tr>

    `;


    let tbody =
        table.querySelector(
            "tbody"
        );


    if (!tbody) {

        tbody =
            document.createElement(
                "tbody"
            );

        table.appendChild(
            tbody
        );

    }


    tbody.innerHTML = "";


    const order = [
        "walk",
        "cycle",
        "bike",
        "bus",
        "train",
        "car"
    ];


    order.forEach(
        key => {

            const vehicle =
                vehicles[key];


            if (!vehicle) {
                return;
            }


            const row =
                document.createElement(
                    "tr"
                );


            row.dataset.vehicle =
                key;


            // ------------------------------------------------
            // NOT AVAILABLE
            // ------------------------------------------------

            if (!vehicle.available) {

                row.innerHTML = `

                    <td>
                        ${vehicle.icon}
                        ${vehicle.name}
                    </td>

                    <td>
                        <span class="text-danger fw-semibold">
                            ❌ Not Available
                        </span>
                    </td>

                    <td>—</td>

                    <td>—</td>

                    <td>—</td>

                    <td>—</td>

                `;


                tbody.appendChild(row);

                return;

            }


            // ------------------------------------------------
            // NOT PRACTICAL
            // ------------------------------------------------

            if (!vehicle.practical) {

                row.innerHTML = `

                    <td>
                        ${vehicle.icon}
                        ${vehicle.name}
                    </td>

                    <td>
                        <span class="text-warning fw-semibold">
                            ⚠️ Not Practical
                        </span>
                    </td>

                    <td>
                        ${formatTime(
                            vehicle.time
                        )}
                    </td>

                    <td>
                        ${vehicle.co2.toFixed(2)}
                        kg
                    </td>

                    <td>
                        ₹${Math.round(
                            vehicle.totalCost
                        )}
                    </td>

                    <td>—</td>

                `;


                tbody.appendChild(row);

                return;

            }


            const rating =
                getRating(
                    vehicle.score
                );


            row.innerHTML = `

                <td>
                    ${vehicle.icon}
                    ${vehicle.name}
                </td>

                <td>
                    <span class="text-success fw-semibold">
                        ✓ Available
                    </span>
                </td>

                <td>
                    ${formatTime(
                        vehicle.time
                    )}
                </td>

                <td>
                    ${vehicle.co2.toFixed(2)}
                    kg
                </td>

                <td>
                    ₹${Math.round(
                        vehicle.totalCost
                    )}
                </td>

                <td>

                    <strong>
                        ${vehicle.score.toFixed(0)}/100
                    </strong>

                    <span class="ms-1">
                        ${rating.stars}
                    </span>

                </td>

            `;


            tbody.appendChild(row);

        }
    );


    const comparison =
        document.getElementById(
            "vehicleComparison"
        );


    if (comparison) {

        comparison.classList.remove(
            "d-none"
        );

    }

}


// ============================================================
// FIND COMPARISON TABLE
// ============================================================

function findComparisonTable() {

    const comparison =
        document.getElementById(
            "vehicleComparison"
        );


    if (comparison) {

        const table =
            comparison.querySelector(
                "table"
            );


        if (table) {

            return table;

        }

    }


    const tables =
        document.querySelectorAll(
            "table"
        );


    for (
        const table of tables
    ) {

        const text =
            table.textContent
                .toLowerCase();


        if (
            text.includes("transport") &&
            (
                text.includes("co₂") ||
                text.includes("co2")
            )
        ) {

            return table;

        }

    }


    return null;

}


// ============================================================
// RECOMMENDATION
// ============================================================

function updateRecommendation(
    vehicles
) {

    const recommendationText =
        document.getElementById(
            "recommendationText"
        );


    if (!recommendationText) {

        return;

    }


    const validVehicles =
        Object.values(
            vehicles || {}
        ).filter(
            vehicle =>
                vehicle.available &&
                vehicle.practical
        );


    if (!validVehicles.length) {

        recommendationText.innerHTML = `

            <strong>
                ⚠️ No practical transportation option found.
            </strong>

        `;

        return;

    }


    const bestVehicle =
        validVehicles.reduce(
            (best, vehicle) =>

                vehicle.score >
                best.score
                    ? vehicle
                    : best
        );


    const rating =
        getRating(
            bestVehicle.score
        );


    const bestChoiceBox =
        document.getElementById(
            "bestChoiceBox"
        );


    if (bestChoiceBox) {

        bestChoiceBox.classList.remove(
            "d-none"
        );

    }


    recommendationText.innerHTML = `

        <strong>

            ${bestVehicle.icon}

            ${bestVehicle.name}

            —

            ${bestVehicle.score.toFixed(0)}/100

            ${rating.stars}

        </strong>

        <br>

        ${rating.label} choice based on
        travel time, carbon emissions,
        estimated cost and practicality.

        <br><br>

        <strong>Why?</strong>

        <br>

        ⏱️
        ${formatTime(
            bestVehicle.time
        )}

        &nbsp; • &nbsp;

        🌱
        ${bestVehicle.co2.toFixed(2)}
        kg CO₂

        &nbsp; • &nbsp;

        💰
        ₹${Math.round(
            bestVehicle.totalCost
        )}

    `;

}


// ============================================================
// SELECTED VEHICLE
// ============================================================

function displaySelectedVehicle(
    vehicle
) {

    const box =
        document.getElementById(
            "selectedVehicleBox"
        );


    const text =
        document.getElementById(
            "selectedVehicleText"
        );


    if (!box || !text) {
        return;
    }


    const names = {

        walk:
            "🚶 Walking",

        cycle:
            "🚴 Bicycle",

        bike:
            "🏍️ Bike",

        bus:
            "🚌 Bus",

        train:
            "🚆 Train",

        car:
            "🚗 Car",

        all:
            "🌍 Compare All Vehicles"

    };


    text.innerHTML = `

        You selected

        <strong>
            ${names[vehicle] || vehicle}
        </strong>

        for this journey.

    `;


    box.classList.remove(
        "d-none"
    );

}


// ============================================================
// SELECTED VEHICLE DETAILS
// ============================================================

function displaySelectedVehicleDetails(
    vehicle,
    vehicles
) {

    const detailsBox =
        document.getElementById(
            "selectedVehicleDetails"
        );


    const nameElement =
        document.getElementById(
            "selectedVehicleName"
        );


    const timeElement =
        document.getElementById(
            "selectedVehicleTime"
        );


    const statsElement =
        document.getElementById(
            "selectedVehicleStats"
        );


    if (
        !detailsBox ||
        !nameElement ||
        !timeElement ||
        !statsElement
    ) {

        return;

    }


    if (vehicle === "all") {

        detailsBox.classList.add(
            "d-none"
        );

        return;

    }


    const data =
        vehicles?.[vehicle];


    if (!data) {

        return;

    }


    nameElement.textContent =
        `${data.icon} ${data.name}`;


    if (!data.available) {

        timeElement.textContent =
            "Not available";


        statsElement.textContent =
            data.message ||
            "This transportation option is not available.";


        detailsBox.classList.remove(
            "d-none"
        );

        return;

    }


    if (!data.practical) {

        timeElement.textContent =
            formatTime(
                data.time
            );


        statsElement.textContent =
            data.message ||
            "This transportation option is not practical.";


        detailsBox.classList.remove(
            "d-none"
        );

        return;

    }


    timeElement.textContent =
        formatTime(
            data.time
        );


    statsElement.textContent =

        `${data.co2.toFixed(2)} kg • ₹${Math.round(
            data.totalCost
        )}`;


    detailsBox.classList.remove(
        "d-none"
    );

}


// ============================================================
// FORMAT TIME
// ============================================================

function formatTime(
    minutes
) {

    if (
        !Number.isFinite(
            minutes
        )
    ) {

        return "—";

    }


    const total =
        Math.max(
            0,
            Math.round(
                minutes
            )
        );


    const hours =
        Math.floor(
            total / 60
        );


    const mins =
        total % 60;


    if (hours > 0) {

        return `${hours} hr ${mins} min`;

    }


    return `${mins} min`;

}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


// ============================================================
// DEBUG ACCESS
// ============================================================

window.greenPathFunctions = {

    geocode,

    showRoute,

    clearRoute,

    calculateVehicleComparison,

    updateComparisonTable,

    findComparisonTable,

    getTransportFeasibility,

    calculateGreenPathScores,

    getRating,

    updateRecommendation,

    displaySelectedVehicle,

    displaySelectedVehicleDetails,

    findNearestRailwayStation,

    showTrainJourney

};


console.log(
    "GreenPath search.js ready."
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  