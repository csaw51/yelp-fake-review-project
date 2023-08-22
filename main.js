import { Legend } from './javascript/legend.js';
import { calculateMetrics } from './javascript/metrics.js';
import { download } from './javascript/utilities.js';
import { buildBarchart } from './javascript/barchart.js';

// csv and json data paths
const pathToCSV = "data\\business_data.csv";
const pathToJSONs = "data\\json\\JSONPaths.json";

// append the category options to the dropdown
const top10 = ['Restaurants', 'Food', 'Shopping', 'Home Services', 'Beauty & Spas', 'Nightlife', 'Health & Medical', 'Local Services', 'Bars', 'Automotive']
const categoryList = document.getElementById('categoryDropdown');
for (let i = 0; i < top10.length; i++) {
    let option = document.createElement('option')
    option.value = top10[i]
    option.text = top10[i]
    categoryList.appendChild(option)
};

// append metric options to dropdown
const metricOptions = {'Fake Reviews (%)': 'fake_review_pct', 'Rating Relative Difference (%)': 'stars_pct_diff', 'Rating Change with Fake Reviews': 'stars_delta'}
const metricList = document.getElementById('metricDropdown');
Object.keys(metricOptions).forEach(key => {
    let option = document.createElement('option')
    option.value = metricOptions[key]
    option.text = key
    metricList.appendChild(option)
});

// define the dimensions and margins for the map
const margin = {top: 30, right: 30, bottom: 100, left: 0},
    width = 800 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

// create chloropleth map svg
const svgchloropleth = d3.select("#chloropleth")
    .append("svg").attr("id", "chloropleth")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g").attr("id", "container")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// dimensions for barchart
const barDimensions = {marginTop: 30, marginRight: 150, marginBottom: 70, marginLeft: 150};
barDimensions.width = 800 - barDimensions.marginLeft - barDimensions.marginRight;
barDimensions.height = 450 - barDimensions.marginTop - barDimensions.marginBottom;

// create barchart svg
const svgbar = d3
    .select("#barchart")
    .append("svg")
    .attr("id", "bar_chart")
    .attr("width", barDimensions.width + barDimensions.marginRight + barDimensions.marginRight)
    .attr("height", barDimensions.height + barDimensions.marginTop + barDimensions.marginBottom)
    .attr("float", "right");
    
// create tooltip
const tooltip = d3.select("#chloropleth")
    .append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("z-index", "0")
    .style("visibility", "hidden")
    .style("background", "white")
    .style("border", "1px solid #333")
    .style("border-radius", "8px")
    .style("padding", "5px")
    .style("box-sizing", "border-box");

// initialize svg groups
const legendGroup = svgchloropleth.append("g").attr("id", "legend");
const map = svgchloropleth.append("g").attr("id", "map");
const city = svgchloropleth.append("g").attr("id", "city");

// define global variables
var clicked = false;
var zipcode;
var srt_tmp;
var colorScale;
var oldFill;
var oldZip;
var colors;

console.log('loading data...')
Promise.all([
    d3.csv(pathToCSV, function (d) {
    return {
        zipcode: d.zipcode,
        name: d.name,
        state: d.state,
        metro: d.metro,
        categories: d.categories.split(', '),
        total_review_count: +d.total_review_count,
        fake_review_count: +d.fake_review_count,
        real_review_count: +d.real_review_count,
        avg_stars: +d.avg_stars,
        adj_avg_stars: +d.adj_avg_stars,
        stars_delta: +d.stars_delta,
        fake_review_pct: +d.fake_review_pct * 100,
        stars_pct_diff: Math.abs(+d.avg_stars - +d.adj_avg_stars)/+d.adj_avg_stars * 100
    }}),
    d3.json(pathToJSONs)]
).then(function(files) {
    ready(files[1], files[0])
});

// this function is called after the review data is read in
// jsons: object containing states and paths to geojson files
// reviewData: data from businesses_reviews.csv
function ready(jsons, reviewData) {
    // extract all unique metros from reviewData
    let metros = [...new Set(reviewData.map(x => x.metro))].sort();
    metros = metros.filter(item => item !== '');

    // append the metro options to the dropdown
    const metroList = document.getElementById('metroDropdown');
    for (let i = 0; i < metros.length; i++) {
        let option = document.createElement('option')
        option.value = metros[i]
        option.text = metros[i]
        metroList.appendChild(option)
    };

    // set default drowpdown values
    metroList.value = 'Indianapolis'
    categoryList.value = 'Restaurants'
    metricList.value = 'fake_review_pct'

    // event listener for the dropdowns. Update choropleth and legend when selection changes.
    metroList.onchange = function () {createMapAndLegend(jsons, reviewData, this.value, categoryList.value)};
    categoryList.onchange = function () {createMapAndLegend(jsons, reviewData, metroList.value, this.value)};
    metricList.onchange = function () {createMapAndLegend(jsons, reviewData, metroList.value, categoryList.value)};

    // create Choropleth with default options. Call createMapAndLegend() with required arguments.
    createMapAndLegend(jsons, reviewData, metroList.value, categoryList.value);

    // event listener for bar chart visibility
    d3.select("body")
    .on("click",function(){
        if (d3.select("#barcontainer")['_groups'][0][0] != null && tooltip.style("visibility") == "hidden") {
            d3.select("#barcontainer").remove()
            clicked = false
            let thisZip = document.querySelector('[id="' + oldZip + '"]')
            thisZip.setAttribute("style", oldFill)
        }}
    )};

// this function creates a Choropleth and legend json and reviewData arguments for a selectedMetro and selectedCategory
// updates Choropleth and legend when a different metro or category are selected from the dropdown
function createMapAndLegend(jsons, reviewData, selectedMetro, selectedCategory) {
    d3.select("#map").selectAll("*").remove();
    d3.select("#city").selectAll("*").remove();
    d3.select("#legend").selectAll("*").remove();
    console.log('creating map...');

    // title based on current selected metro
    map.append("text")
        .attr("id", "title")
        .attr("x", width/6)
        .text("Fake Reviews for " + selectedMetro + " " + selectedCategory + " by Zipcode")
        .attr("font-weight", 700)
        .attr("font-size", "22px");

    // filter review data for selectedMetro
    let businesses = reviewData.filter(d => d.metro == selectedMetro);
    
    // unique list of states and zipcodes by metro
    let states = [...new Set(businesses.map(d => d.state))].sort();
    let zipcodes = [...new Set(businesses.map(d => d.zipcode))].sort();

    // filter businesses data for selectedCategory
    let businesses_category = businesses.filter(d => d.categories.includes(selectedCategory));

    // calculate metrics and unique list of states and zipcodes for category
    let metrics = calculateMetrics(businesses_category);
    let zipcodes_category = [...new Set(businesses_category.map(d => d.zipcode))].sort();

    // quantile scale for color - reversed for directional change in star rating (stars_delta)
    let ratings = metrics.map(zip => zip[metricList.value]);
    if (metricList.value == 'stars_delta'){ 
        colors = d3.interpolateRgb.gamma(2.2)("red", "yellow");
        colorScale = d3.scaleDiverging([Math.min(...ratings),0,Math.max(...ratings)], colors);
    } else { 
        colors = d3.interpolateRgb.gamma(2.2)("yellow", "red");
        colorScale = d3.scaleSequential([Math.min(...ratings),Math.max(...ratings)], colors);
    };

    // add legend
    Legend(colorScale, {legendGroup: legendGroup, y: height + 30, title: metricList.options[metricList.selectedIndex].text, marginLeft: 200, marginRight: -200});
    
    // function for getting color for map
    // colors grey if there are no businesses for a category within the zipcode
    function getColor(zipcode) {
        if (zipcodes_category.includes(zipcode)) {
            let metric = metrics.find(obj => {return obj.zipcode === zipcode})[metricList.value]
            return colorScale(metric)
        } else {return ("grey")}vb 
    };

    // filter on promises for states within metro area
    let zipPromises = []
    states.forEach((state) => {
        zipPromises.push(d3.json(jsons.filter(json => json.state == state)[0].json))
    });

    // filter on overlay promise for city area 
    zipPromises.push(d3.json(jsons.filter(json => json.metro == selectedMetro)[0].json));

    // load promises and split zipcodes vs. city overlay
    Promise.all(zipPromises).then( function (jsons) {
        let zipJsons = jsons.slice(0,-1)
        let cityJson = jsons.slice(-1)

        // append all geojsons for this metro area to one object
        let allstates = {['features']: [], ['type']: 'FeatureCollection'};
        Object.keys(zipJsons).map(key => {
            allstates = {['features']: [...allstates['features'], ...zipJsons[key]['features']]}
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
        var scale  = 400;
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

        // create zipcode map
        map.selectAll("path")
            .data(metroarea.features, function(d) { return d.geometry.coordinates; })
            .enter()
            .append("path")
            .attr("d", path)
            .attr("id", function (d) {return d.properties.ZCTA5CE10})
            .style("fill", function (d) {return getColor(d.properties.ZCTA5CE10);})
            .attr("stroke", "black")
            // build bar chart and tooltip for each zipcode on mouseover
            .on("mouseover", function (event, d) {
                zipcode = d.properties.ZCTA5CE10
                if (zipcodes_category.includes(zipcode)) {
                    // tooltip text with fixed digits
                    let fake_review_count = metrics.find(obj => {return obj.zipcode === zipcode}).fake_review_count
                    let fake_review_pct = metrics.find(obj => {return obj.zipcode === zipcode}).fake_review_pct.toFixed(2);
                    let stars_pct_diff = metrics.find(obj => {return obj.zipcode === zipcode}).stars_pct_diff.toFixed(2);
                    let stars_delta_mean = metrics.find(obj => {return obj.zipcode === zipcode}).stars_delta.toFixed(2);
                    tooltip.html("<b>Zipcode</b>: " + zipcode + "<br><b>Fake Review Count</b>: " + fake_review_count + "<br><b>Fake Reviews (%)</b>: " + fake_review_pct + "<br><b>Rating Relative Difference (%)</b>: " + stars_pct_diff + "<br><b>Rating Change</b>: " + stars_delta_mean);
                    // filter businesses based on zip and number of fake reviews
                    let businesses_zip = businesses_category.filter(d => (d.zipcode===zipcode && d.fake_review_count > 0));
                    // sort based on number of fake reviews, take top 5
                    srt_tmp = businesses_zip.sort((a, b) => (a.fake_review_count < b.fake_review_count) ? 1 : -1).slice(0,5);
                    // execute block if businesses with fake reviews exist for selection
                    if (srt_tmp.length > 0 && clicked == false) {buildBarchart(svgbar, barDimensions, srt_tmp, selectedCategory, zipcode, colorScale, metricList.value)};
                } else {tooltip.html("<b>Zipcode</b>: " + zipcode + "<br><b>Fake Review Count</b>: N/A <br><b>Fake Reviews (%)</b>: N/A <br><b>Rating Relative Difference (%)</b>: N/A <br><b>Rating Change</b>: N/A")};
                return tooltip.style("visibility", "visible");
            })
            // highlight zipcode and lock bar chart on click
            .on("click", function (event) {
                if (d3.select("#barcontainer")['_groups'][0][0] != null && clicked == false) {clicked = true
                    oldFill = this.getAttribute("style")
                    oldZip = this.getAttribute("id")
                    this.setAttribute("style", "fill: rgb(0,255,0)")
                } else {
                    // if a zipcode was already clicked, unhighlight and remove bar chart
                    // then build new bar chart
                    clicked = false
                    d3.select("#barcontainer").remove();
                    if (srt_tmp.length > 0 && clicked == false) {
                        if (this.getAttribute("style") != "fill: grey;") {buildBarchart(svgbar, barDimensions, srt_tmp, selectedCategory, zipcode, colorScale, metricList.value)}
                        let thisZip = document.querySelector('[id="' + oldZip + '"]');
                        thisZip.setAttribute("style", oldFill)
                    };
                }
            })
            // move tooltip with mouse
            .on("mousemove", function (event) {return tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");})
            // remove barchart and tooltip on mouseout
            .on("mouseout", function (event, d) {
                if (clicked == false) { d3.select("#barcontainer").remove()};
                return tooltip.style("visibility", "hidden");
            });
        
        // create city overlay map
        city.selectAll("path")
            .data(cityJson)
            .enter().append("path")
            .attr("d", path)
            .attr("stroke", "black")
            .style("fill", "grey")
            .attr("pointer-events", "none")
            .attr("opacity", 0.5)

        console.log('done drawing! select the next metro')
    }
    );
}

