// set the mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiZHJ5ZXJsaW50IiwiYSI6ImNrM293NWcyMzI1N3ozb2tveXZlOGZvbGEifQ.8RpXmSagHLMD7D3xqFGb_w';

// location look up table for name to lat-lng
const LOCATIONS = {
    "Public Policy Building": [-76.70895, 39.25530]
};

// references to HTML elements that are imbued with some JS magic
const modeSelector = document.getElementById("modeSelector");
const infoContainer = document.getElementById("info_container"); 
const infoContainerTitle = document.getElementById("info_title");

// object to hold events: key is date, value is array of XML event DOM objects from myUMBC
const events = {};

// create mapboxgl map
const map = new mapboxgl.Map({
    container: "map",
    style: SADMAP_BASE_STYLE,
    center: [-76.71255, 39.25432],
    zoom: 13
});

map.on("click", "buildings", e => {
    // show the info container element
    infoContainer.style.display = "";

    infoContainerTitle.textContent = e.features[0].properties.name;
});

/**
 * Initialize the UI components on script load.
 */
(function iniUI() {
    // delete source-layer keys (quirk of Mapbox Studio...)
    for (a of SADMAP_BASE_STYLE.layers) 
    { 
        delete a["source-layer"];
    }

    // add navigation control buttons to top right of map
    const nav = new mapboxgl.NavigationControl();
    map.addControl(nav, "top-right");
    
    // bind close info container action to the close button
    document.getElementById("info_container_close").onclick = () => {
        infoContainer.style.display = "none";
    }

    // bind visualization mode toggle to mode selector button
    modeSelector.onclick = changeVisualizationMode;

    // get the events that are happening today
    fetch("https://apps.sga.umbc.edu/api/events/today")
        .then(res => res.text())
        .then(data => {
            // parse the XML into DOM objects
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, "text/xml");

            // store the events associated with today's date
            const today = new Date().toLocaleDateString("en-CA");
            events[today] = [...xmlDoc.getElementsByTagName("Event")];
        });
})();

function addIncidentLocations() {
    fetch("data/01-2020.json")
    .then(response => response.json())
    .then(data => {
        data.forEach(x => {
            // console.log(x.location);

            // if the location is in the location lookup table
            if (x.location in LOCATIONS)
            {
                // create a HTML element for each feature
                const el = document.createElement("div");
                el.className = "marker";

                // TODO check if there is a marker for that point already
                // can we just append to the popup for each incident?

                // create a marker for the incident
                new mapboxgl.Marker(el)
                    .setLngLat(LOCATIONS[x.location])
                    .setPopup(new mapboxgl.Popup({ offset: 25 })
                        .setHTML(`
                            ${x.incident}
                        `)
                    )
                    .addTo(map);
            }
        });
    });
}

function changeVisualizationMode() {
    const hash = window.location.hash.substr(1);

    if (hash == "3d") 
    {
        // show 3d buildings layer
        sadmapBaseStyleEdit.layers.find(x => x.id == "buildings 3d").layout = {};

        // hide flat buildings layers
        sadmapBaseStyleEdit.layers.find(x => x.id == "buildings upper layer").layout = { "visibility": "none" };
        sadmapBaseStyleEdit.layers.find(x => x.id == "buildings").layout = { "visibility": "none" };

        // change the link to enable flat mode
        modeSelector.setAttribute("href", "#flat");
        modeSelector.textContent = "Flat Mode";
    }
    else if (hash == "flat")
    {
        // hide 3d buildings layer
        sadmapBaseStyleEdit.layers.find(x => x.id == "buildings 3d").layout = { "visibility": "none" };

        // show flat buildings layers
        sadmapBaseStyleEdit.layers.find(x => x.id == "buildings upper layer").layout = {};
        sadmapBaseStyleEdit.layers.find(x => x.id == "buildings").layout = {};

        // change the link to enable 3d mode
        modeSelector.setAttribute("href", "#3d");
        modeSelector.textContent = "3D Mode";
    }
}