import { Legend } from './modules/legend.js';
import { calculateMetrics } from './modules/metrics.js';
import { download } from './modules/utilities.js';
import { buildBarchart } from './modules/barchart.js';

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

// **HARDCODED** top 10 categories
const top10 = ['Restaurants', 'Food', 'Shopping', 'Home Services', 'Beauty & Spas', 'Nightlife', 'Health & Medical', 'Local Services', 'Bars', 'Automotive']

// csv and json paths
const pathToCSV = "data\\businesses_reviews.csv";
const pathToJSONs = "data\\JSONPaths.json";

console.log('loading data...')
Promise.all([
    d3.csv(pathToCSV, function (d) {
    return {
        zipcode: d.zipcode,
        state: d.state,
        metro: d.metro,
        urban: +d.urban,
        stars: +d.stars,
        review_count: +d.review_count,
        is_open: +d.is_open,
        categories: d.categories.split(', '),
        category: d.category,
        small_business: +d.small_business,
        fake_reviews: +d.fake_reviews
    }}),
    d3.json(pathToJSONs)]
).then(function(files) {
    ready(files[1], files[0])
})

// this function is called after the review data is read in
// jsons: object containing states and paths to geojson files
// reviewData: data from businesses_reviews.csv
function ready(jsons, reviewData) {
    // extract all unique metros from reviewData
    let metros = [...new Set(reviewData.map(x => x.metro))].sort()
    metros = metros.filter(item => item !== '')

    // append the metro options to the dropdown
    const metroList = document.getElementById('metroDropdown');
    for (let i = 0; i < metros.length; i++) {
        let option = document.createElement('option');
        option.value = metros[i];
        option.text = metros[i];
        metroList.appendChild(option);
    }
    // append the category options to the dropdown
    const categoryList = document.getElementById('categoryDropdown');
    for (let i = 0; i < top10.length; i++) {
        let option = document.createElement('option');
        option.value = top10[i];
        option.text = top10[i];
        categoryList.appendChild(option);
    }
    
    // set default drowpdown values
    metroList.value = 'Philadelphia'
    categoryList.value = 'Restaurants'
    
    // event listener for the dropdowns. Update choropleth and legend when selection changes.
    metroList.onchange = function () {
        createMapAndLegend(jsons, reviewData, this.value, categoryList.value)
    }
    categoryList.onchange = function () {
        createMapAndLegend(jsons, reviewData, metroList.value, this.value)
    }
    
    // create Choropleth with default options. Call createMapAndLegend() with required arguments.
    createMapAndLegend(jsons, reviewData, metroList.value, categoryList.value)
}

// this function creates a Choropleth and legend json and reviewData arguments for a selectedMetro and selectedCategory
// updates Choropleth and legend when a different metro or category are selected from the dropdown
function createMapAndLegend(jsons, reviewData, selectedMetro, selectedCategory) {
    d3.select("#map").selectAll("*").remove();
    d3.select("#legend").selectAll("*").remove();
    console.log('creating map...')

    // filter review data for selectedMetro
    let businesses = reviewData.filter(d => d.metro == selectedMetro)
    //console.log(businesses)
    
    // unique list of states and zipcodes by metro
    let states = [...new Set(businesses.map(d => d.state))].sort()
    let zipcodes = [...new Set(businesses.map(d => d.zipcode))].sort()

    // filter businesses data for selectedCategory
    let businesses_category = businesses.filter(d => d.categories.includes(selectedCategory))

    // calculate metrics and unique list of states and zipcodes for category
    let metrics = calculateMetrics(businesses_category)
    let zipcodes_category = [...new Set(businesses_category.map(d => d.zipcode))].sort()

    // quantile scale for color
    let ratings = metrics.map(zip => zip.fake_review_pct);//.sort(function (a, b) {return a - b});
    let colorScale = d3.scaleSequential([Math.min(...ratings),Math.max(...ratings)],d3.interpolateBlues)

    // add legend
    Legend(colorScale, {legendGroup: legend, y: height, title: "Fake Reviews (%)"})
    
    // function for getting color for map
    // colors grey if there are no businesses for a category within the zipcode
    function getColor(zipcode) {
        if (zipcodes_category.includes(zipcode)) {
            let fake_review_pct = metrics.find(obj => {return obj.zipcode === zipcode}).fake_review_pct
            return colorScale(fake_review_pct)
        } else {
            return ("grey")
        }
    }

    // filter on promises for states within metro area
    let promises = []
    states.forEach((state) => {
        promises.push(d3.json(jsons.filter(json => json.state == state)[0].json))
    });

    Promise.all(promises).then( function (jsons) {

        // append all geojsons for this metro area to one object
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

        // create map
        map.selectAll("path")
            .data(metroarea.features)
            .enter()
            .append("path")
            .attr("d", path)
            .style("fill", function (d) {return getColor(d.properties.ZCTA5CE10);})
            .attr("stroke", "black")
            .on("mouseover", function (event, d) {
                let zipcode = d.properties.ZCTA5CE10
                if (zipcodes_category.includes(zipcode)) {
                    let fake_review_count = metrics.find(obj => {return obj.zipcode === zipcode}).fake_review_count
                    let fake_review_pct = metrics.find(obj => {return obj.zipcode === zipcode}).fake_review_pct.toFixed(2);
                    let stars_pct_diff = metrics.find(obj => {return obj.zipcode === zipcode}).stars_pct_diff.toFixed(2);
                    tooltip.html("Zipcode: " + zipcode + "\n<br>Metro: " + selectedMetro + "<br>Fake Reviews: " + fake_review_count +
                        "<br>Fake Reviews (%): " + fake_review_pct + "<br>Rating Difference (%): " + stars_pct_diff);
                    // filter businesses based on zip and number of fake reviews
                    let businesses_zip = businesses_category.filter(d => (d.zipcode===zipcode && d.fake_reviews > 0));
                    // sort based on number of fake reviews, take top 5
                    let srt_tmp = businesses_zip.sort((a, b) => (a.fake_reviews < b.fake_reviews) ? 1 : -1).slice(0,5);
                    // execute block if businesses with fake reviews exist for selection
                    if (srt_tmp.length > 0) {buildBarchart(srt_tmp, selectedCategory, zipcode, margin)};
                    //tooltip.html("Zipcode: " + zipcode + "\n<br>Metro: " + selectedMetro + "<br>Fake Reviews: " + fake_review_count + "<br>Fake Reviews (%): " + fake_review_pct + "<br>Rating Difference (%): " + stars_pct_diff);
                } else {
                    tooltip.html("Zipcode: " + zipcode + "\n<br>Metro: " + selectedMetro + "<br>Fake Reviews: N/A <br>Fake Reviews (%): N/A <br>Rating Difference (%): N/A");
                }
                return tooltip.style("visibility", "visible");
            })
            .on("mousemove", function (event, d) {return tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");})
            .on("mouseout", function (event, d) {return tooltip.style("visibility", "hidden");});

        console.log('done drawing! select the next metro')
    }
    );
}

