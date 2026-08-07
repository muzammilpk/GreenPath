document.addEventListener("DOMContentLoaded", () => {

    const mapContainer = document.getElementById("map");

    if (!mapContainer) return;

    window.greenMap = L.map("map").setView([10.8505, 76.2711], 7);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap contributors",
        }
    ).addTo(window.greenMap);

    // Store markers globally
    window.sourceMarker = null;
    window.destinationMarker = null;
    window.routeControl = null;
});