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
    .style("background", "white")
    .style("border", "1px solid #333")
    //.style("border-width", "1px")
    .style("border-radius", "8px")
    .style("padding", "5px")
    .style("box-sizing", "border-box")

// initialize svg groups
const legend = svgchloropleth.append("g").attr("id", "legend")
const map = svgchloropleth.append("g").attr("id", "map")
const map2 = svgchloropleth.append("g").attr("id", "map2")

// **HARDCODED** top 10 categories
const top10 = ['Restaurants', 'Food', 'Shopping', 'Home Services', 'Beauty & Spas', 'Nightlife', 'Health & Medical', 'Local Services', 'Bars', 'Automotive']

// csv and json paths
const pathToCSV = "data\\data_merged.csv";
const pathToJSONs = "data\\JSONPaths.json";

var clicked = false
var zipcode
var srt_tmp
var colorScale
var oldFill
var oldZip

console.log('loading data...')
Promise.all([
    d3.csv(pathToCSV, function (d) {
    return {
        zipcode: d.zipcode,
        name: d.name,
        state: d.state,
        metro: d.metro,
        //stars: +d.stars,
        //review_count: +d.review_count,
        //is_open: +d.is_open,
        categories: d.categories.split(', '),
        //small_business: +d.small_business,
        //fake_reviews: +d.fake_reviews
        total_review_count: +d.total_review_count,
        fake_review_count: +d.fake_review_count,
        real_review_count: +d.real_review_count,
        avg_stars: +d.avg_stars,
        adj_avg_stars: +d.adj_avg_stars,
        stars_delta: +d.stars_delta,
        fake_review_pct: +d.fake_review_pct*100
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

    // event listener for bar chart visibility
    d3.select("body")
    .on("click",function(){
        if (d3.select("#bar_chart")['_groups'][0][0] != null && tooltip.style("visibility") == "hidden") {
            d3.select("#bar_chart_title").remove();
            d3.select("#bar_chart").remove();
            clicked = false;
            let thisZip = document.querySelector('[id="' + oldZip + '"]');
            thisZip.setAttribute("style", oldFill)
        }
    })
}

// this function creates a Choropleth and legend json and reviewData arguments for a selectedMetro and selectedCategory
// updates Choropleth and legend when a different metro or category are selected from the dropdown
function createMapAndLegend(jsons, reviewData, selectedMetro, selectedCategory) {
    d3.select("#map").selectAll("*").remove();
    d3.select("#map2").selectAll("*").remove();
    d3.select("#legend").selectAll("*").remove();
    //svgchloropleth.select("#title").selectAll("*").remove();
    console.log('creating map...')

    map.append("text")
        .attr("id", "title")
        .attr("x", width/4)
        .text("Fake Reviews for " + selectedMetro + " by Business Sector")
        .attr("font-weight", 700)
        .attr("font-size", "22px")

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
    //console.log(metrics)
    //console.log(reviewData)

    // quantile scale for color
    let ratings = metrics.map(zip => zip.fake_review_pct);
    //let ratings = metrics.map(zip => zip.stars_pct_diff);
    let colors = d3.interpolateRgb("yellow", "red")
    //colorScale = []
    colorScale = d3.scaleSequential([Math.min(...ratings),Math.max(...ratings)],colors)

    // add legend
    Legend(colorScale, {legendGroup: legend, y: height, title: "Fake Reviews (%)"})
    
    // function for getting color for map
    // colors grey if there are no businesses for a category within the zipcode
    function getColor(zipcode) {
        if (zipcodes_category.includes(zipcode)) {
            let fake_review_pct = metrics.find(obj => {return obj.zipcode === zipcode}).fake_review_pct
            return colorScale(fake_review_pct)
            //let stars_pct_diff = metrics.find(obj => {return obj.zipcode === zipcode}).stars_pct_diff
            //return colorScale(stars_pct_diff)
        } else {
            return ("grey")
        }
    }

    // filter on promises for states within metro area
    let zipPromises = []
    states.forEach((state) => {
        zipPromises.push(d3.json(jsons.filter(json => json.state == state)[0].json))
    });

    // filter on promise for metro area
    zipPromises.push(d3.json(jsons.filter(json => json.metro == selectedMetro)[0].json))

    Promise.all(zipPromises).then( function (jsons) {
        let zipJsons = jsons.slice(0,-1)
        let metroJson = jsons.slice(-1)
        //console.log(zipJsons)
        //console.log(metroJson)

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

        //let metroJson = jsons.slice(-1)[0]

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

        // create map
        map.selectAll("path")
            .data(metroarea.features, function(d) { return d.geometry.coordinates; })
            .enter()
            .append("path")
            .attr("d", path)
            .attr("id", function (d) {return d.properties.ZCTA5CE10})
            .style("fill", function (d) {return getColor(d.properties.ZCTA5CE10);})
            .attr("stroke", "black")
            .on("mouseover", function (event, d) {
                zipcode = d.properties.ZCTA5CE10
                if (zipcodes_category.includes(zipcode)) {
                    let fake_review_count = metrics.find(obj => {return obj.zipcode === zipcode}).fake_review_count
                    let fake_review_pct = metrics.find(obj => {return obj.zipcode === zipcode}).fake_review_pct.toFixed(2);
                    let stars_pct_diff = metrics.find(obj => {return obj.zipcode === zipcode}).stars_pct_diff.toFixed(2);
                    let stars_delta_mean = metrics.find(obj => {return obj.zipcode === zipcode}).stars_delta_mean.toFixed(2);
                    tooltip.html("<b>Zipcode</b>: " + zipcode + "<br><b>Fake Reviews (%)</b>: " + fake_review_pct + "<br><b>Rating Difference (%)</b>: " + stars_pct_diff + "<br><b>Stars Delta Mean</b>: " + stars_delta_mean);
                    // filter businesses based on zip and number of fake reviews
                    let businesses_zip = businesses_category.filter(d => (d.zipcode===zipcode && d.fake_review_count > 0));
                    // sort based on number of fake reviews, take top 5
                    srt_tmp = businesses_zip.sort((a, b) => (a.fake_review_count < b.fake_review_count) ? 1 : -1).slice(0,5);
                    // execute block if businesses with fake reviews exist for selection
                    if (srt_tmp.length > 0 && clicked == false) {buildBarchart(srt_tmp, selectedCategory, zipcode, colorScale)};
                    //tooltip.html("Zipcode: " + zipcode + "\n<br>Metro: " + selectedMetro + "<br>Fake Reviews: " + fake_review_count + "<br>Fake Reviews (%): " + fake_review_pct + "<br>Rating Difference (%): " + stars_pct_diff);
                } else {
                    tooltip.html("Zipcode: " + zipcode + "\n<br>Metro: " + selectedMetro + "<br>Fake Reviews: N/A <br>Fake Reviews (%): N/A <br>Rating Difference (%): N/A");
                }
                return tooltip.style("visibility", "visible");
            })
            .on("click", function (event) {
                if (d3.select("#bar_chart")['_groups'][0][0] != null && clicked == false) {clicked = true
                    oldFill = this.getAttribute("style")
                    oldZip = this.getAttribute("id")
                    this.setAttribute("style", "fill: rgb(0,255,0)")
            }
                else {
                    clicked = false
                    d3.select("#bar_chart_title").remove();
                    d3.select("#bar_chart").remove();
                    if (srt_tmp.length > 0 && clicked == false) {
                        buildBarchart(srt_tmp, selectedCategory, zipcode, colorScale)
                        let thisZip = document.querySelector('[id="' + oldZip + '"]');
                        thisZip.setAttribute("style", oldFill)
                    };
                }
            })
            .on("mousemove", function (event) {return tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");})
            .on("mouseout", function (event, d) {
                if (clicked == false) {
                    d3.select("#bar_chart_title").remove();
                    d3.select("#bar_chart").remove();
                }
                return tooltip.style("visibility", "hidden");});
        
        // create map
        map2.selectAll("path")
            .data(metroJson)
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

