// define the dimensions and margins for the map
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
const map = svgchloropleth.append("g").attr("id", "map")

// create color scheme
const colorScheme = ["#ffffb2", "#fecc5c", "#fd8d3c", "#e31a1c"];

// top 10 categories
const top10 = ['Restaurants', 'Food', 'Shopping', 'Home Services', 'Beauty & Spas', 'Nightlife', 'Health & Medical', 'Local Services', 'Bars', 'Automotive']

// csv and json paths
const pathToCSV = "data\\businesses_reviews.csv";
const pathsToJSON = [
    {'state': 'AZ', json: d3.json("data\\json\\az_arizona_zip_codes_geo.min.json")},
    {'state': 'CA', json: d3.json("data\\json\\ca_california_zip_codes_geo.min.json")},
    {'state': 'DE', json: d3.json("data\\json\\de_delaware_zip_codes_geo.min.json")},
    {'state': 'FL', json: d3.json("data\\json\\fl_florida_zip_codes_geo.min.json")},
    {'state': 'ID', json: d3.json("data\\json\\id_idaho_zip_codes_geo.min.json")},
    {'state': 'IL', json: d3.json("data\\json\\il_illinois_zip_codes_geo.min.json")},
    {'state': 'IN', json: d3.json("data\\json\\in_indiana_zip_codes_geo.min.json")},
    {'state': 'LA', json: d3.json("data\\json\\la_louisiana_zip_codes_geo.min.json")},
    {'state': 'MO', json: d3.json("data\\json\\mo_missouri_zip_codes_geo.min.json")},
    {'state': 'NJ', json: d3.json("data\\json\\nj_new_jersey_zip_codes_geo.min.json")},
    {'state': 'NV', json: d3.json("data\\json\\nv_nevada_zip_codes_geo.min.json")},
    {'state': 'PA', json: d3.json("data\\json\\pa_pennsylvania_zip_codes_geo.min.json")},
    {'state': 'TN', json: d3.json("data\\json\\tn_tennessee_zip_codes_geo.min.json")}
];

// load review data
console.log('loading data...')
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
    ready(pathsToJSON, d)
});

// this function is called after the review data is read in
// jsons: object containing states and paths to geojson files
// reviewData: data from businesses_reviews.csv
function ready(jsons, reviewData) {
    console.log('ready!')

    // extract all unique metros from reviewData
    let metros = [...new Set(reviewData.map(x => x.metro))].sort()
    metros = metros.filter(item => item !== '')

    // append the metro options to the dropdown
    const selectList = document.getElementById('metroDropdown');
    for (let i = 0; i < metros.length; i++) {
        let option = document.createElement('option');
        option.value = metros[i];
        option.text = metros[i];
        selectList.appendChild(option);
    }

    // set default metro to philly for now
    selectList.value = 'Philadelphia'

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
    d3.select("#map").selectAll("*").remove();
    console.log('creating map...')

    // filter review data for metro
    let businesses = reviewData.filter(d => d.metro == selectedMetro)

    // unique list of states and zipcodes by metro
    let states = [...new Set(businesses.map(d => d.state))].sort()
    let zipcodes = [...new Set(businesses.map(d => d.zipcode))].sort()

    /*
    // quantile scale for color
    ratings = businesses.map(row => row.avgRating).sort(function (a, b) {return a - b});
    let quantize = d3.scaleQuantile()
        .domain(ratings)
        .range(colorScheme)

    // function for getting color for map
    function getColor(zipcode) {
        if (zipcodes.includes(zipcode)) {
            let rating = businesses.find(obj => {return obj.zipcode === zipcode}).avgRating
            return quantize(rating)
        } else {
            return ("grey")
        }
    }
     */

    // filter on promises for states within metro area
    let promises = []
    states.forEach((state) => {
        promises.push(jsons.filter(json => json.state == state)[0].json)
    });
    Promise.all(promises).then( function (jsons) {

        // append all for this metro area geojsons to one object
        let allstates = {['features']: [], ['type']: 'FeatureCollection'};
        Object.keys(jsons).map(key => {
            allstates = {['features']: [...allstates['features'], ...jsons[key]['features']]}
        });

        // filter geojsons by zipcodes with data
        let metroarea = {['features']: [], ['type']: 'FeatureCollection'};
        allstates['features'].forEach(zip => { // iterate over the feature keys
               if (zipcodes.includes(zip['properties']['ZCTA5CE10'])) {
                   metroarea['features'].push(zip)
                }
        })

        console.log('drawing...')
        // initial projection and path for map
        var center = d3.geoCentroid(metroarea)
        var scale  = 150;
        var offset = [width/2, height/2];
        var projection = d3.geoMercator().scale(scale).center(center).translate(offset);
        var path = d3.geoPath().projection(projection);

        // using the path determine the bounds of the current map and use
        // these to determine better values for the scale and translation
        var bounds  = path.bounds(metroarea);
        var hscale  = scale*width  / (bounds[1][0] - bounds[0][0]);
        var vscale  = scale*height / (bounds[1][1] - bounds[0][1]);
        var scale   = (hscale < vscale) ? hscale : vscale;
        var offset  = [width - (bounds[0][0] + bounds[1][0])/2,
                            height - (bounds[0][1] + bounds[1][1])/2];
        // new projection
        projection = d3.geoMercator().center(center).scale(scale).translate(offset);
        path = path.projection(projection);

        console.log(metroarea)
        console.log(metroarea.features[0].properties.ZCTA5CE10)

        // create map
        map.selectAll("path")
            .data(metroarea.features)
            .enter()
            .append("path")
            .attr("class", "continent")
            .attr("d", path)
            //.attr("fill", function (d) {return getColor(d.properties.name);})
            .style("fill", "red")
            .attr("stroke", "black")
            .on("mouseover", function (event, d) {
                zipcode = d.properties.ZCTA5CE10
                if (zipcodes.includes(zipcode)) {
                    //let rating = businesses.find(obj => {return obj.zipcode === zipcode}).avgRating
                    //let numUser = businesses.find(obj => {return obj.zipcode === zipcode}).numUsers
                    //tooltip.html("Country: " + d.properties.name + "\n<br>Game: " + selectedGame + "<br>Rating: " + rating + "<br>Number of Users: " + numUser);
                    tooltip.html("Zipcode: " + zipcode + "\n<br>Metro: " + selectedMetro + "<br>Rating: N/A <br>Number of Users: N/A");
                } else {
                    tooltip.html("Zipcode: " + zipcode + "\n<br>Metro: " + selectedMetro + "<br>Rating: N/A <br>Number of Users: N/A");
                }
                return tooltip.style("visibility", "visible");
            })
            .on("mousemove", function (event, d) {return tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");})
            .on("mouseout", function (event, d) {return tooltip.style("visibility", "hidden");});

        console.log('done drawing! select the next metro')
    }
    );


}