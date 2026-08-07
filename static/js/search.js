console.log("search.js loaded");

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM Ready");

    const button = document.getElementById("searchRoute");

    console.log("Button:", button);

    if (!button) {
        console.error("Button not found!");
        return;
    }

    button.addEventListener("click", function () {
        console.log("Button clicked!");

        const source = document.getElementById("source").value;
        const destination = document.getElementById("destination").value;

        console.log("Source:", source);
        console.log("Destination:", destination);
    });
});