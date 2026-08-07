console.log("search.js loaded");

document.addEventListener("DOMContentLoaded", () => {

    const button = document.getElementById("searchRoute");

    button.addEventListener("click", async () => {

        const source = document.getElementById("source").value.trim();
        const destination = document.getElementById("destination").value.trim();

        if (!source || !destination) {
            alert("Please enter both source and destination.");
            return;
        }

        const sourceLocation = await geocode(source);
        const destinationLocation = await geocode(destination);

        showMarkers(sourceLocation, destinationLocation);

        console.log("Source:", sourceLocation);
        console.log("Destination:", destinationLocation);

    });

});

async function geocode(place) {

    const url =
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`;

    const response = await fetch(url);

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

}

function showMarkers(source, destination) {

    // Remove previous route
    if (window.routeControl) {
        window.greenMap.removeControl(window.routeControl);
    }

    // Create new route
    window.routeControl = L.Routing.control({
        waypoints: [
            L.latLng(source.lat, source.lon),
            L.latLng(destination.lat, destination.lon)
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        show: false
    }).addTo(window.greenMap);

    // ✅ Listen for when the route is calculated
    window.routeControl.on("routesfound", function (e) {

        const route = e.routes[0];

        const distance = (route.summary.totalDistance / 1000).toFixed(2);

        const duration = Math.round(route.summary.totalTime / 60);

        console.log("Distance:", distance + " km");

        console.log("Duration:", duration + " minutes");

    });

}