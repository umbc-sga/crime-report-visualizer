// set the mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiZHJ5ZXJsaW50IiwiYSI6ImNrM293NWcyMzI1N3ozb2tveXZlOGZvbGEifQ.8RpXmSagHLMD7D3xqFGb_w';

// references to HTML elements that are imbued with some JS magic
const modeSelector = document.getElementById("modeSelector");
const infoContainer = document.getElementById("info_container"); 
const infoContainerTitle = document.getElementById("info_title");

// object to hold events: key is date, value is array of XML event DOM objects from myUMBC
const events = {};
// object to hold locations, analogous to the events object
const event_locations = {};

let coords = [];
let incidents = []

let bingGeocoder = new GeocoderJS.createGeocoder({provider: 'bing', apiKey: 'As11PsBXYvAoGEXmz59ZWl93T8_OACdXi2QnRKWMRIUK6hzOXgN3BcZHnbKyPZYo'});


// create mapboxgl map
const map = new mapboxgl.Map({
    container: "map",
    style: SADMAP_BASE_STYLE,
    center: [-76.71209711, 39.2556232],
    zoom: 15
});


map.dragRotate.disable();
map.touchPitch.disable()
map.setPitch(0)
map.setBearing(19.943) //natural angled bearing on UMBC campus is 19.943deg

map.on("click", "buildings", e => {
    // show the info container element
    infoContainer.style.display = "";

    infoContainerTitle.textContent = e.features[0].properties.name;
});


let addIncidentLocations = () => {
    let month = new Date().getMonth()+1 //getMonth is zero based
    month = month < 10 ? "0" + month : "" + month;
    let year = new Date().getUTCFullYear();

    //TODO:
    //try to find in LOCATIONS, if cant geoguessr thing the geocoder

    fetch(`data/${month}-${year}.json`)
    .then(response => response.json())
    .then(data => {
        console.log(data)
        data.forEach(x => {
            // console.log(x.location);
            //check if has latlong

            console.log(x.location)

            // if the location is in the location lookup table
            //check whether the word is any certain locations, since the police
            //reports are necessarily standardized
            let coordinates = [];

            

            if(x.location != "Off Campus"){
                if(x.location in LOCATIONS){
                    new mapboxgl.Marker({color: x.incidentClass=='Interference'?'orange':'red'})
                    .setLngLat(LOCATIONS[x.location])
                    .setPopup(new mapboxgl.Popup({ offset: 25 })
                        .setHTML(`
                            Incident: ${x.incident}
                        `)
                    )
                    .addTo(map);
                } else{
                    incidents.push(x.incident)
                    bingGeocoder.geocode((x.location.toUpperCase().includes("UMBC") ? '' : 'UMBC ') + x.location, function(result){
                        console.log(x, x.incident, x.location)
                        coordinates = [result[0]['longitude'], result[0]['latitude']]
                        coords.push(coordinates)
            

                        if (coordinates.length == 2){
                            console.log(coordinates)

                            // TODO check if there is a marker for that point already
                            // can we just append to the popup for each incident?

                            // TODO: change color of marker based on incident,
                            // for example whether or not its closed, if its a robbery, etc.

                            // create a marker for the incident
                            new mapboxgl.Marker({color: x.incidentClass=='Interference'?'orange':'red'})
                                .setLngLat((coordinates.length == 2 ? coordinates : LOCATIONS[x.location]))
                                .setPopup(new mapboxgl.Popup({ offset: 25 })
                                    .setHTML(`
                                        ${x.incident}
                                    `)
                                )
                                .addTo(map);
                                
                        }
                    })
                }
            }
        });
    });
}

let markEvents = data => {
    //data is an array of two dictionaries, first is the events and second is the location of those events

    let keys = Object.keys(data[1])

    keys.forEach(key => {
        data[1][key].forEach((x, i) => {
            if(x.innerHTML != "Online"){
                let coord = [x.getAttribute('longitude'), x.getAttribute('latitude')]

                new mapboxgl.Marker({color: 'blue'})
                    .setLngLat(coord)
                    .setPopup(new mapboxgl.Popup({ offset: 25 })
                        .setHTML(`
                            Event: ${data[0][key][i].getElementsByTagName('Title')[0].innerHTML}
                        `)
                    )
                    .addTo(map);
            }
            else{
                //this is fired if the location is "Online"

                //make it on the center of umbc or something?
            }
                    
        })
    })
}

let changeVisualizationMode = () => {
    const hash = window.location.hash.substr(1);

    if (hash == "3d") {
        //enable pitching and rotating to properly see 3d view
        map.dragRotate.enable();
        map.touchPitch.enable()
        // show 3d buildings layer
        SADMAP_BASE_STYLE.layers.find(x => x.id == "buildings 3d").layout = {};

        // hide flat buildings layers
        SADMAP_BASE_STYLE.layers.find(x => x.id == "buildings upper layer").layout = { "visibility": "none" };
        SADMAP_BASE_STYLE.layers.find(x => x.id == "buildings").layout = { "visibility": "none" };
    }
    else if (hash == "flat"){
        //disable the ability to tilt and set rotation to make everything look corrent
        map.dragRotate.disable();
        map.touchPitch.disable()
        map.setPitch(0)
        map.setBearing(19.943)

        // hide 3d buildings layer
        SADMAP_BASE_STYLE.layers.find(x => x.id == "buildings 3d").layout = { "visibility": "none" };

        // show flat buildings layers
        SADMAP_BASE_STYLE.layers.find(x => x.id == "buildings upper layer").layout = {};
        SADMAP_BASE_STYLE.layers.find(x => x.id == "buildings").layout = {};
    }

    //updates the map style to either 3d or 2d
    SADMAP_BASE_STYLE.source = 'mapbox-dem'
    map.setStyle(SADMAP_BASE_STYLE);
    map.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        'tileSize': 512
    });
    // add the DEM source as a terrain layer with exaggerated height
    map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': window.location.hash.substr(1)=='3d'? 1 : 0 });
    // add a sky layer that will show when the map is highly pitched
    map.addLayer({
        'id': 'sky',
        'type': 'sky',
        'paint': {
        'sky-type': 'atmosphere',
        'sky-atmosphere-sun': [0.0, 0.0],
        'sky-atmosphere-sun-intensity': 15
        }
    });
    // map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': hash=='3d'? 1.5 : 0 });
}

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
modeSelector.onclick = () => {
    if(modeSelector.innerText == 'Change to 3D Mode'){
        window.location.hash = '#3d'
        modeSelector.innerText = 'Change to Normal Mode'
    } else if(modeSelector.innerText == "Change to Normal Mode"){
        window.location.hash = '#flat'
        modeSelector.innerText = 'Change to 3D Mode'
    }
    changeVisualizationMode()
}

// get the events that are happening today
fetch("https://apps.sga.umbc.edu/api/events/today")
    .then(res => res.text())
    .then(data => {
        // parse the XML into DOM objects
        // FIND LOCATION TAG
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, "text/xml");

        // store the events associated with today's date
        const today = new Date().toLocaleDateString("en-CA");
        events[today] = [...xmlDoc.getElementsByTagName("Event")];
        event_locations[today] = [...xmlDoc.getElementsByTagName("Location")];

        markEvents([events, event_locations])

        console.log(events, event_locations)
        });



addIncidentLocations();