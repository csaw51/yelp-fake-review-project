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
        categories: d.categories.split(', '),
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

// this function should create a Choropleth and legend using the world and gameData arguments for a selectedGame
// also use this function to update Choropleth and legend when a different game is selected from the dropdown
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
    ratings = metrics.map(zip => zip.fake_review_pct);//.sort(function (a, b) {return a - b});
    let quantize = d3.scaleQuantile()
        .domain(ratings)
        .range(colorScheme)

    // add legend
    sequentialize = d3.scaleSequential(ratings, d3.interpolateBlues)
    Legend(sequentialize, {title: "Fake Reviews (%)"})
    
    // function for getting color for map
    // colors grey if there are no businesses for a category within the zipcode
    function getColor(zipcode) {
        if (zipcodes_category.includes(zipcode)) {
            let fake_review_pct = metrics.find(obj => {return obj.zipcode === zipcode}).fake_review_pct
            return sequentialize(fake_review_pct)
        } else {
            return ("grey")
        }
    }

    // filter on promises for states within metro area
    let promises = []
    states.forEach((state) => {
        promises.push(jsons.filter(json => json.state == state)[0].json)
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
            //.attr("class", "continent")
            .attr("d", path)
            .style("fill", function (d) {return getColor(d.properties.ZCTA5CE10);})
            .attr("stroke", "black")
            .on("mouseover", function (event, d) {
                zipcode = d.properties.ZCTA5CE10
                if (zipcodes_category.includes(zipcode)) {
                    let fake_review_count = metrics.find(obj => {return obj.zipcode === zipcode}).fake_review_count
                    let fake_review_pct = metrics.find(obj => {return obj.zipcode === zipcode}).fake_review_pct.toFixed(2);
                    let stars_pct_diff = metrics.find(obj => {return obj.zipcode === zipcode}).stars_pct_diff.toFixed(2);
                    tooltip.html("Zipcode: " + zipcode + "\n<br>Metro: " + selectedMetro + "<br>Fake Reviews: " + fake_review_count + "<br>Fake Reviews (%): " + fake_review_pct + "<br>Rating Difference (%): " + stars_pct_diff);
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


//// Calculate metrics for data stored in array of objects //// 
/*businesses_count: count number of businesses per zipcode
review_count: count number of reviews per zipcode
fake_review_count: count number of fake reviews per zipcode
stars_sum: sum all star ratings for each zipcode
real_stars_sum: sum all star ratings for each zipcode of real reviews ONLY
stars_max: maximum star rating for each zipcode
fake_review_pct: percentage of fake reviews for all reviews
stars_mean: mean star rating per zipcode
real stars_mean: mean star rating per zipcode of real reviews ONLY
stars_pct_diff: percent difference between fake review impacted rating (baseline) and rating inclusive of all reviews */
function calculateMetrics(data) {

    // group by zipcode and calculate aggregate metrics (count, sum, max)
    // source: https://stackoverflow.com/questions/29364262/how-to-group-by-and-sum-an-array-of-objects
    var metrics = [];
    data.reduce(function(res, value) {
      if (!res[value.zipcode]) {
        res[value.zipcode] = { zipcode: value.zipcode, businesses_count: 0, review_count: 0, fake_review_count: 0, stars_sum: 0, real_stars_sum: 0, stars_max: 0};
        metrics.push(res[value.zipcode]);
      }
      res[value.zipcode].businesses_count += 1;        
      res[value.zipcode].review_count += value.review_count;
      res[value.zipcode].fake_review_count += value.fake_reviews;
      res[value.zipcode].stars_sum += value.stars;        
      if (value.fake_reviews == 0){ res[value.zipcode].real_stars_sum += value.stars }; // TODO: update when we get real data. aggregate this field in preprocessing instead of in here. currently totally inaccurate.
      res[value.zipcode].stars_max = Math.max(res[value.zipcode].stars_max, value.stars);
      return res;
    }, {});

    // use aggregated metrics to calculate new ones, like averages and percent change
    metrics.forEach((item) => {
        stars_mean = item.stars_sum / item.businesses_count
        real_stars_mean = item.real_stars_sum / item.businesses_count 
        item.fake_review_pct = item.fake_review_count / item.review_count * 100;
        item.stars_mean = stars_mean,
        item.real_stars_mean = real_stars_mean,
        item.stars_pct_diff = Math.abs(stars_mean - real_stars_mean) / real_stars_mean * 100
    });
    //console.log(metrics)
    
    return metrics   
}

// Copyright 2021, Observable Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/color-legend
function Legend(color, {
  title,
  tickSize = 6,
  legendWidth = 320, 
  legendHeight = 44 + tickSize,
  marginTop = 18,
  marginRight = 0,
  marginBottom = 16 + tickSize,
  marginLeft = 0,
  ticks = legendWidth / 64,
  tickFormat,
  tickValues
} = {}) {

  function ramp(color, n = 256) {
    const canvas = document.createElement("canvas");
    canvas.width = n;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    for (let i = 0; i < n; ++i) {
      context.fillStyle = color(i / (n - 1));
      context.fillRect(i, 0, 1, 1);
    }
    return canvas;
  }

  const svg = d3.create("svg")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .attr("viewBox", [0, 0, legendWidth, legendHeight])
      .style("overflow", "visible")
      .style("display", "block");

  let tickAdjust = g => g.selectAll(".tick line").attr("y1", marginTop + marginBottom - legendHeight);
  let x;

  // Continuous
  if (color.interpolate) {
    const n = Math.min(color.domain().length, color.range().length);

    x = color.copy().rangeRound(d3.quantize(d3.interpolate(marginLeft, legendWidth - marginRight), n));

    legend.append("image")
        .attr("x", marginLeft)
        .attr("y", marginTop + height)
        .attr("width", legendWidth - marginLeft - marginRight)
        .attr("height", legendHeight - marginTop - marginBottom)
        .attr("preserveAspectRatio", "none")
        .attr("xlink:href", ramp(color.copy().domain(d3.quantize(d3.interpolate(0, 1), n))).toDataURL());
  }

  // Sequential
  else if (color.interpolator) {
    x = Object.assign(color.copy()
        .interpolator(d3.interpolateRound(marginLeft, legendWidth - marginRight)),
        {range() { return [marginLeft, legendWidth - marginRight]; }});

    legend.append("image")
        .attr("x", marginLeft)
        .attr("y", marginTop + height)
        .attr("width", legendWidth - marginLeft - marginRight)
        .attr("height", legendHeight - marginTop - marginBottom)
        .attr("preserveAspectRatio", "none")
        .attr("xlink:href", ramp(color.interpolator()).toDataURL());

    // scaleSequentialQuantile doesn’t implement ticks or tickFormat.
    if (!x.ticks) {
      if (tickValues === undefined) {
        const n = Math.round(ticks + 1);
        tickValues = d3.range(n).map(i => d3.quantile(color.domain(), i / (n - 1)));
      }
      if (typeof tickFormat !== "function") {
        tickFormat = d3.format(tickFormat === undefined ? ",f" : tickFormat);
      }
    }
  }
  legend.append("g")
      .attr("transform", `translate(0,${legendHeight - marginBottom + height})`)
      .call(d3.axisBottom(x)
        .ticks(ticks, typeof tickFormat === "string" ? tickFormat : undefined)
        .tickFormat(typeof tickFormat === "function" ? tickFormat : undefined)
        .tickSize(tickSize)
        .tickValues(tickValues))
      .call(tickAdjust)
      .call(g => g.select(".domain").remove())
      .call(g => g.append("text")
        .attr("x", marginLeft)
        .attr("y", marginTop + marginBottom - legendHeight - 6 + height)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .attr("class", "title")
        .text(title));

  return svg.node();
}
