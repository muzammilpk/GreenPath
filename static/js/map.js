// Create the map
const greenMap = L.map("map").setView([10.8505, 76.2711], 7);

// Add OpenStreetMap tiles
L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "&copy; OpenStreetMap contributors",
    }
).addTo(greenMap);

// Make the map accessible from other JS files
window.greenMap = greenMap;

// Store markers globally
window.sourceMarker = null;
window.destinationMarker = null;