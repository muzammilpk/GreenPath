console.log("search.js loaded");


// ============================================================
// MAIN BUTTON
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    const button = document.getElementById("searchRoute");

    if (!button) {
        console.error("Search button not found!");
        return;
    }

    button.addEventListener("click", async () => {

        const sourceElement = document.getElementById("source");
        const destinationElement = document.getElementById("destination");

        const source = sourceElement.value.trim();
        const destination = destinationElement.value.trim();

        // Get selected vehicle
        const selectedVehicle =
            document.querySelector('input[name="vehicle"]:checked');

        if (!source || !destination) {
            alert("Please enter both source and destination.");
            return;
        }

        if (!selectedVehicle) {
            alert("Please select a transportation option.");
            return;
        }

        console.log("Selected vehicle:", selectedVehicle.value);

        // Show selected vehicle immediately
        displaySelectedVehicle(selectedVehicle.value);

        // ----------------------------------------------------
        // GEOCODING
        // ----------------------------------------------------

        const sourceLocation = await geocode(source);
        const destinationLocation = await geocode(destination);

        if (!sourceLocation || !destinationLocation) {
            return;
        }

        // ----------------------------------------------------
        // SHOW ROUTE
        // ----------------------------------------------------

        showRoute(
            sourceLocation,
            destinationLocation,
            selectedVehicle.value
        );

    });

});


// ============================================================
// GEOCODING
// ============================================================

async function geocode(place) {

    try {

        const url =
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Geocoding request failed.");
        }

        const data = await response.json();

        if (data.length === 0) {

            alert(`Location not found: ${place}`);

            return null;
        }

        return {
            lat: parseFloat(data[0].lat),
            lon: parseFloat(data[0].lon),
            name: data[0].display_name
        };

    } catch (error) {

        console.error("Geocoding error:", error);

        alert("Unable to find the location. Please try again.");

        return null;
    }
}


// ============================================================
// ROUTE
// ============================================================

function showRoute(source, destination, selectedVehicle) {

    if (!window.greenMap) {

        console.error("Map is not initialized!");

        alert("Map is not ready.");

        return;
    }


    // Remove previous route
    if (window.routeControl) {

        window.greenMap.removeControl(
            window.routeControl
        );
    }


    // Create new route
    window.routeControl = L.Routing.control({

        waypoints: [

            L.latLng(
                source.lat,
                source.lon
            ),

            L.latLng(
                destination.lat,
                destination.lon
            )

        ],

        routeWhileDragging: false,

        addWaypoints: false,

        draggableWaypoints: false,

        fitSelectedRoutes: true,

        show: false

    }).addTo(window.greenMap);


    // ========================================================
    // ROUTE FOUND
    // ========================================================

    window.routeControl.on(
        "routesfound",
        function (e) {

            const route = e.routes[0];


            // ------------------------------------------------
            // DISTANCE
            // ------------------------------------------------

            const distance =
                route.summary.totalDistance / 1000;

            const distanceKm =
                distance.toFixed(2);


            // ------------------------------------------------
            // ROUTE DURATION
            // ------------------------------------------------

            const durationMinutes =
                Math.round(
                    route.summary.totalTime / 60
                );


            // ------------------------------------------------
            // UPDATE ROUTE SUMMARY
            // ------------------------------------------------

            const distanceElement =
                document.getElementById("distanceValue");

            const timeElement =
                document.getElementById("timeValue");

            if (distanceElement) {

                distanceElement.textContent =
                    distanceKm + " km";
            }

            if (timeElement) {

                timeElement.textContent =
                    formatTime(durationMinutes);
            }


            // Show summary
            const routeSummary =
                document.getElementById("routeSummary");

            if (routeSummary) {

                routeSummary.classList.remove("d-none");
            }


            // ------------------------------------------------
            // VEHICLE COMPARISON
            // ------------------------------------------------

            const vehicleData =
                calculateVehicleComparison(
                    distance
                );


            // ------------------------------------------------
            // SELECTED VEHICLE DETAILS
            // ------------------------------------------------

            displaySelectedVehicleDetails(
                selectedVehicle,
                distance
            );


            // ------------------------------------------------
            // RECOMMENDATION
            // ------------------------------------------------

            updateRecommendation(
                vehicleData
            );


            // ------------------------------------------------
            // DEBUG
            // ------------------------------------------------

            console.log(
                "Distance:",
                distanceKm + " km"
            );

            console.log(
                "Duration:",
                durationMinutes + " minutes"
            );

            console.log(
                "Vehicle data:",
                vehicleData
            );

        }
    );
}


// ============================================================
// VEHICLE COMPARISON
// ============================================================

function calculateVehicleComparison(distance) {

    /*
        Average speeds in km/h.

        These are currently estimated values.
        Later we can replace them with real
        transport-specific routing/API data.
    */

    const speeds = {

        walk: 5,

        cycle: 15,

        bike: 45,

        bus: 40,

        train: 55,

        car: 55
    };


    /*
        CO₂ emission factors
        grams per passenger-kilometre
    */

    const emissions = {

        walk: 0,

        cycle: 0,

        bike: 50,

        bus: 80,

        train: 30,

        car: 170
    };


    /*
        Estimated cost per kilometre
    */

    const costs = {

        walk: 0,

        cycle: 0,

        bike: 3,

        bus: 2,

        train: 1.5,

        car: 10
    };


    // --------------------------------------------------------
    // VEHICLES
    // --------------------------------------------------------

    const vehicles = {

        walk: {
            name: "Walking",
            icon: "🚶",
            speed: speeds.walk,
            emission: emissions.walk,
            cost: costs.walk
        },

        cycle: {
            name: "Bicycle",
            icon: "🚴",
            speed: speeds.cycle,
            emission: emissions.cycle,
            cost: costs.cycle
        },

        bike: {
            name: "Bike",
            icon: "🏍️",
            speed: speeds.bike,
            emission: emissions.bike,
            cost: costs.bike
        },

        bus: {
            name: "Bus",
            icon: "🚌",
            speed: speeds.bus,
            emission: emissions.bus,
            cost: costs.bus
        },

        train: {
            name: "Train",
            icon: "🚆",
            speed: speeds.train,
            emission: emissions.train,
            cost: costs.train
        },

        car: {
            name: "Car",
            icon: "🚗",
            speed: speeds.car,
            emission: emissions.car,
            cost: costs.car
        }

    };


    // --------------------------------------------------------
    // CALCULATE EACH VEHICLE
    // --------------------------------------------------------

    Object.keys(vehicles).forEach(vehicle => {

        const data = vehicles[vehicle];


        // Travel time
        const timeMinutes =
            Math.round(
                (distance / data.speed) * 60
            );


        // CO₂
        const co2 =
            (distance * data.emission) / 1000;


        // Cost
        const cost =
            distance * data.cost;


        // Store calculated values
        data.time = timeMinutes;

        data.co2 = co2;

        data.totalCost = cost;


        // ----------------------------------------------------
        // UPDATE HTML
        // ----------------------------------------------------

        const timeElement =
            document.getElementById(
                vehicle + "Time"
            );

        const co2Element =
            document.getElementById(
                vehicle + "CO2"
            );

        const costElement =
            document.getElementById(
                vehicle + "Cost"
            );


        if (timeElement) {

            timeElement.textContent =
                formatTime(timeMinutes);
        }


        if (co2Element) {

            co2Element.textContent =
                co2.toFixed(2) + " kg";
        }


        if (costElement) {

            costElement.textContent =
                "₹" + Math.round(cost);
        }

    });


    // --------------------------------------------------------
    // SHOW COMPARISON
    // --------------------------------------------------------

    const comparison =
        document.getElementById(
            "vehicleComparison"
        );

    if (comparison) {

        comparison.classList.remove("d-none");
    }


    console.log(
        "Calculated vehicle comparison:",
        vehicles
    );


    return vehicles;
}


// ============================================================
// FORMAT TIME
// ============================================================

function formatTime(minutes) {

    const hours =
        Math.floor(minutes / 60);

    const remainingMinutes =
        minutes % 60;


    if (hours > 0) {

        return `${hours} hr ${remainingMinutes} min`;
    }


    return `${remainingMinutes} min`;
}


// ============================================================
// GREENPATH RECOMMENDATION
// ============================================================

function updateRecommendation(vehicles) {

    const recommendationText =
        document.getElementById(
            "recommendationText"
        );


    if (!recommendationText) {

        console.error(
            "recommendationText element not found!"
        );

        return;
    }


    if (!vehicles) {

        console.error(
            "Vehicle data not available!"
        );

        return;
    }


    // --------------------------------------------------------
    // Convert object to array
    // --------------------------------------------------------

    const vehicleList =
        Object.values(vehicles);


    // --------------------------------------------------------
    // Find fastest time
    // --------------------------------------------------------

    const fastestTime =
        Math.min(
            ...vehicleList.map(
                vehicle => vehicle.time
            )
        );


    /*
        Remove extremely slow options.

        If a vehicle takes more than 2x
        the fastest option, it won't be
        considered practical.
    */

    const practicalVehicles =
        vehicleList.filter(
            vehicle =>
                vehicle.time <= fastestTime * 2
        );


    if (practicalVehicles.length === 0) {

        recommendationText.textContent =
            "No practical transportation option found.";

        return;
    }


    // --------------------------------------------------------
    // Find minimum values
    // --------------------------------------------------------

    const minCO2 =
        Math.min(
            ...practicalVehicles.map(
                vehicle => vehicle.co2
            )
        );


    const minCost =
        Math.min(
            ...practicalVehicles.map(
                vehicle => vehicle.totalCost
            )
        );


    // --------------------------------------------------------
    // Calculate GreenPath score
    // --------------------------------------------------------

    practicalVehicles.forEach(vehicle => {


        // -----------------------------------------------
        // TIME SCORE - 40%
        // -----------------------------------------------

        const timeScore =
            (fastestTime / vehicle.time) * 40;


        // -----------------------------------------------
        // CO₂ SCORE - 40%
        // -----------------------------------------------

        let co2Score;

        if (vehicle.co2 === 0) {

            co2Score = 40;

        } else if (minCO2 === 0) {

            co2Score = 0;

        } else {

            co2Score =
                (minCO2 / vehicle.co2) * 40;
        }


        // -----------------------------------------------
        // COST SCORE - 20%
        // -----------------------------------------------

        let costScore;

        if (vehicle.totalCost === 0) {

            costScore = 20;

        } else if (minCost === 0) {

            costScore = 0;

        } else {

            costScore =
                (minCost / vehicle.totalCost) * 20;
        }


        // -----------------------------------------------
        // TOTAL
        // -----------------------------------------------

        vehicle.score =
            timeScore +
            co2Score +
            costScore;

    });


    // --------------------------------------------------------
    // Find best vehicle
    // --------------------------------------------------------

    const bestVehicle =
        practicalVehicles.reduce(
            (best, vehicle) => {

                return vehicle.score > best.score
                    ? vehicle
                    : best;

            }
        );


    // --------------------------------------------------------
    // Display recommendation
    // --------------------------------------------------------

    recommendationText.innerHTML = `

        ${bestVehicle.icon}

        <strong>
            ${bestVehicle.name}
            is the GreenPath recommendation.
        </strong>

        <br>

        It provides the best balance of
        travel time, carbon emissions,
        and estimated cost.

    `;


    // --------------------------------------------------------
    // CONSOLE DEBUG
    // --------------------------------------------------------

    console.log(
        "Practical vehicles:",
        practicalVehicles
    );


    console.log(
        "GreenPath scores:"
    );


    practicalVehicles.forEach(vehicle => {

        console.log(
            `${vehicle.name}: ${vehicle.score.toFixed(2)}`
        );

    });


    console.log(
        "Recommended:",
        bestVehicle.name
    );
}


// ============================================================
// SELECTED VEHICLE DISPLAY
// ============================================================

function displaySelectedVehicle(vehicle) {

    const vehicleBox =
        document.getElementById(
            "selectedVehicleBox"
        );

    const vehicleText =
        document.getElementById(
            "selectedVehicleText"
        );


    if (!vehicleBox || !vehicleText) {

        console.error(
            "Selected vehicle elements not found!"
        );

        return;
    }


    const vehicleNames = {

        walk: "🚶 Walking",

        cycle: "🚴 Bicycle",

        bike: "🏍️ Bike",

        bus: "🚌 Bus",

        train: "🚆 Train",

        car: "🚗 Car",

        all: "🌍 Compare All Vehicles"

    };


    const vehicleName =
        vehicleNames[vehicle] || vehicle;


    vehicleText.innerHTML = `

        You selected
        <strong>${vehicleName}</strong>
        for this journey.

    `;


    vehicleBox.classList.remove(
        "d-none"
    );
}


// ============================================================
// SELECTED VEHICLE DETAILS
// ============================================================

function displaySelectedVehicleDetails(
    vehicle,
    distance
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

        console.error(
            "Selected vehicle detail elements not found!"
        );

        return;
    }


    // --------------------------------------------------------
    // ALL VEHICLES
    // --------------------------------------------------------

    if (vehicle === "all") {

        detailsBox.classList.add(
            "d-none"
        );

        return;
    }


    // --------------------------------------------------------
    // VEHICLE DATA
    // --------------------------------------------------------

    const vehicleData = {

        walk: {
            name: "🚶 Walking",
            speed: 5,
            emission: 0,
            cost: 0
        },

        cycle: {
            name: "🚴 Bicycle",
            speed: 15,
            emission: 0,
            cost: 0
        },

        bike: {
            name: "🏍️ Bike",
            speed: 45,
            emission: 50,
            cost: 3
        },

        bus: {
            name: "🚌 Bus",
            speed: 40,
            emission: 80,
            cost: 2
        },

        train: {
            name: "🚆 Train",
            speed: 55,
            emission: 30,
            cost: 1.5
        },

        car: {
            name: "🚗 Car",
            speed: 55,
            emission: 170,
            cost: 10
        }

    };


    const data =
        vehicleData[vehicle];


    if (!data) {

        console.error(
            "Unknown vehicle:",
            vehicle
        );

        return;
    }


    // --------------------------------------------------------
    // CALCULATE
    // --------------------------------------------------------

    const timeMinutes =
        Math.round(
            (distance / data.speed) * 60
        );


    const co2 =
        (distance * data.emission) / 1000;


    const cost =
        distance * data.cost;


    // --------------------------------------------------------
    // UPDATE UI
    // --------------------------------------------------------

    nameElement.textContent =
        data.name;


    timeElement.textContent =
        formatTime(timeMinutes);


    statsElement.textContent =
        `${co2.toFixed(2)} kg • ₹${Math.round(cost)}`;


    detailsBox.classList.remove(
        "d-none"
    );


    // --------------------------------------------------------
    // DEBUG
    // --------------------------------------------------------

    console.log(
        "Selected vehicle details:",
        {
            vehicle,
            time: timeMinutes,
            co2,
            cost
        }
    );
}