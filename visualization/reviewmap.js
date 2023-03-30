// define the dimensions and margins for the chloropleth map
const margin = {top: 30, right: 30, bottom: 70, left: 70},
    width = 800 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

// create chlorpleth svg
const svgchloropleth = d3.select("#chloropleth")
    .append("svg").attr("id", "chloropleth")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g").attr("id", "container")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// create tooltip
const tooltip = d3.select("#chloropleth")
    .append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("z-index", "0")
    .style("visibility", "hidden")
    .style("background", "darkgrey")

// initialize svg groups
const legend = svgchloropleth.append("g").attr("id", "legend")
const zipcodes = svgchloropleth.append("g").attr("id", "zipcodes")

// create color scheme
const colorScheme = ["#ffffb2", "#fecc5c", "#fd8d3c", "#e31a1c"];

// csv and json paths
const pathToCSV = "businesses_reviews.csv";

const pathsToJSON = [
    {'state': 'PA', json: d3.json("pa_pennsylvania_zip_codes_geo.min.json")},
    {'state': 'NJ', json: d3.json("nj_new_jersey_zip_codes_geo.min.json")},
    {'state': 'DE', json: d3.json("de_delaware_zip_codes_geo.min.json")}
];

d3.dsv(",", pathToCSV, function (d) {
    return {
        zipcode: d.zipcode,
        state: d.state,
        metro: d.metro,
        urban: +d['urban'],
        stars: +d['stars'],
        review_count: +d['review_count'],
        is_open: +d['is_open'],
        category: d.category,
        small_business: +d['small_business'],
        fake_reviews: +d['fake_reviews']
    }
}).then(function (d) {
    // enter code to call ready() with required arguments
    ready(pathsToJSON, d)
});

// this function should be called once the data from files have been read
// world: topojson from world_countries.json
// gameData: data from ratings-by-country.csv
function ready(jsons, reviewData) {
    // enter code to extract all unique metros from reviewData
    let metros = [...new Set(reviewData.map(x => x.metro))].sort()
    metros = metros.filter(item => item !== '')

    // enter code to append the metro options to the dropdown
    const selectList = document.getElementById('metroDropdown');

    for (let i = 0; i < metros.length; i++) {
        let option = document.createElement('option');
        option.value = metros[i];
        option.text = metros[i];
        selectList.appendChild(option);
    }

    // event listener for the dropdown. Update choropleth and legend when selection changes. Call createMapAndLegend() with required arguments.
    selectList.onchange = function () {
        createMapAndLegend(jsons, reviewData, this.value)
    }

    // create Choropleth with default option. Call createMapAndLegend() with required arguments.
    createMapAndLegend(jsons, reviewData, selectList.value)

}

// this function should create a Choropleth and legend using the world and gameData arguments for a selectedGame
// also use this function to update Choropleth and legend when a different game is selected from the dropdown
function createMapAndLegend(jsons, reviewData, selectedMetro) {
    // filter review data on metro
    let businesses = reviewData.filter(function (d) {
        return d.metro == selectedMetro
    })

    // unique list of states by metro
    let states = [...new Set(businesses.map(x => x.state))].sort()

    // filter jsons by state
    //let filtered = jsons.filter(function (d) {
    //    return states.includes(d.state)
    //})

    let promises = []
    for (let i = 0; i < states.length; i++) {
        thisjson = jsons.filter(item => item.state == states[i])
        promises.push(thisjson[0].json)
    }

    Promise.all(promises).then( function (jsons) {

        let resultObject = {};
        Object.keys(jsons[0]).map(key => { // iterate over the keys
          resultObject = {
            ...resultObject,
            [key]: [...jsons[0][key], ...jsons[1][key], ...jsons[2][key]] // merge two objects
          }
          return;
        });
        resultObject['type'] = 'FeatureCollection'
        console.log(resultObject)

            // initial projection and path for map
        var center = d3.geoCentroid(resultObject)
        var scale  = 150;
        var offset = [width/2, height/2];
        var projection = d3.geoMercator().scale(scale).center(center).translate(offset);
        var path = d3.geoPath().projection(projection);

        // using the path determine the bounds of the current map and use
        // these to determine better values for the scale and translation
        var bounds  = path.bounds(resultObject);
        var hscale  = scale*width  / (bounds[1][0] - bounds[0][0]);
        var vscale  = scale*height / (bounds[1][1] - bounds[0][1]);
        var scale   = (hscale < vscale) ? hscale : vscale;
        var offset  = [width - (bounds[0][0] + bounds[1][0])/2,
                            height - (bounds[0][1] + bounds[1][1])/2];
        // new projection
        projection = d3.geoMercator().center(center).scale(scale).translate(offset);
        path = path.projection(projection);

        // create map
        zipcodes.selectAll("path")
            .data(resultObject.features)
            .enter()
            .append("path")
            //.attr("class", "continent")
            .attr("d", path)
            //.attr("fill", function (d) {return getColor(d.properties.name);})
            .style("fill", "red")
            .attr("stroke", "black")
    }
    );


}