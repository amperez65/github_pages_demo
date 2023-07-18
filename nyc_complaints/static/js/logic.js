// For docs, refer to https://dev.socrata.com/docs/queries/where.html.
// And, refer to https://dev.socrata.com/foundry/data.cityofnewyork.us/erm2-nwe9.

function chooseColor(borough) {
  if (borough === "Brooklyn") return "yellow";
  else if (borough === "Bronx") return "red";
  else if (borough === "Manhattan") return "orange";
  else if (borough === "Queens") return "green";
  else if (borough === "Staten Island") return "purple";
  else return "black";
}

function doWork() {
  // get filters
  let complaint_val = d3.select("#complaint_type").node().value;

  // Store the API query variables.
  let baseURL = "https://data.cityofnewyork.us/resource/fhrw-4uyv.json?";
  // Add the dates in the ISO formats
  let date = "$where=created_date between '2022-01-01T00:00:00' and '2023-01-01T00:00:00'";
  // Add the complaint type.
  let complaint = `&complaint_type=${complaint_val}`;
  // Add a limit.
  let limit = "&$limit=10000";

  // Assemble the API query URL.
  let url = baseURL + date + complaint + limit;
  console.log(url);

  // nuke map
  d3.select("#map_container").html("");
  d3.select("#map_container").html("<div id='map'></div>");

  // NESTED TO GET BOROUGH
  // Use this link to get the GeoJSON data.
  let link = "https://2u-data-curriculum-team.s3.amazonaws.com/dataviz-classroom/v1.1/15-Mapping-Web/nyc.geojson";

  // make request
  d3.json(url).then(function (data) {
    console.log(data);

    let borough_val = d3.select("#borough").node().value;

    // check if borough filter should be applied
    let data_sub = data;
    if (borough_val !== "ALL") {
      data_sub = data.filter(x => x.borough === borough_val);
    }

    // second request
    d3.json(link).then(function (data2) {
      createMap(data_sub, data2);
    });
  });
}

function createMap(data, data2) {

  // STEP 1: CREATE THE BASE LAYERS

  // Create the base layers.
  let street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  })

  let topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
  });

  // STEP 2: CREATE THE OVERLAY LAYERS

  // Create an overlays object.
  let markers = L.markerClusterGroup();
  let coords = [];
  for (let i = 0; i < data.length; i++){
    let location = data[i].location;

    if (location) {
      let coord = [location.coordinates[1], location.coordinates[0]];
      let marker = L.marker(coord).bindPopup(`${data[i].descriptor}<hr>${data[i].park_borough}`);
      markers.addLayer(marker);

      coords.push(coord);
    }
  }

  // create heatmap layer
  let heatLayer = L.heatLayer(coords, {
    radius: 20,
    blur: 30
  });

  // Create an overlays object.
  let nyc_layer = L.geoJSON(data2.features, {
    style: function (feature) {
      return {
        color: "white",
        fillColor: chooseColor(feature.properties.borough),
        fillOpacity: 0.5,
        weight: 1.5
      }
    },
    // This is called on each feature.
    onEachFeature: function(feature, layer) {
      // Set the mouse events to change the map styling.
      layer.on({
        // When a user's mouse cursor touches a map feature, the mouseover event calls this function, which makes that feature's opacity change to 90% so that it stands out.
        mouseover: function(event) {
          layer = event.target;
          layer.setStyle({
            fillOpacity: 0.9
          });
        },
        // When the cursor no longer hovers over a map feature (that is, when the mouseout event occurs), the feature's opacity reverts back to 50%.
        mouseout: function(event) {
          layer = event.target;
          layer.setStyle({
            fillOpacity: 0.5
          });
        },
        // When a feature (neighborhood) is clicked, it enlarges to fit the screen.
        click: function(event) {
          myMap.fitBounds(event.target.getBounds());
        }
      });
      // Giving each feature a popup with information that's relevant to it
      layer.bindPopup("<h1>" + feature.properties.neighborhood + "</h1> <hr> <h2>" + feature.properties.borough + "</h2>");
    }
  });

  // STEP 3: Build the Layer Controls

  // Create a baseMaps object.
  let baseMaps = {
    "Street Map": street,
    "Topographic Map": topo
  };

  let overlayMaps = {
    "Complaint": markers,
    "Heat Map": heatLayer,
    "NYC": nyc_layer
  };

  // STEP 4: Init the Map

  // Create a new map.
  // Edit the code to add the earthquake data to the layers.
  let myMap = L.map("map", {
    center: [40.7128, -74.0059],
    zoom: 11,
    layers: [street, markers, nyc_layer]
  });

  // STEP 5: Add the Layer Controls/Legend to the map
  // Create a layer control that contains our baseMaps.
  // Be sure to add an overlay Layer that contains the earthquake GeoJSON.
  L.control.layers(baseMaps, overlayMaps).addTo(myMap);
}

// event listener
d3.select("#complaint_type").on("change", doWork);
d3.select("#borough").on("change", doWork);

// on page load
doWork();
