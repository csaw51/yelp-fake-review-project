function buildBarchart(srt_tmp, selectedCategory, zipcode, colorScale) {
    // define the dimensions and margins for the bar chart
    const margin2 = {top: 30, right: 30, bottom: 70, left: 140},
    width2 = 640 - margin2.left - margin2.right,
    height2 = 450 - margin2.top - margin2.bottom;

    // bar chart svg
    const svgbar = d3
        .select("#chloropleth")
        .append("svg")
        .attr("id", "bar_chart")
        .attr("width", width2 + margin2.left + margin2.right)
        .attr("height", height2 + margin2.top + margin2.bottom)
        .attr("float", "right")
        .append("g")
        .attr("id", "container_2")
        .attr("transform",
            "translate(" + margin2.left + "," + margin2.top + ")");
    // group containing bars
    let bars = svgbar.append("g").attr("id", "bars");
    // remove labels, title, bars, and axes of bar chart
    d3.select("#x-axis-bars").remove();
    d3.select("#y-axis-bars").remove();
    d3.select("#bar_x_axis_label").remove();
    d3.select("#bar_y_axis_label").remove();
    d3.select("#bar_chart_title").remove();
    bars.selectAll("rect").remove();
    // define x scale
    var xbar = d3.scaleLinear()
        .domain([0, d3.max(srt_tmp, function(d) {return d.fake_review_count;})])
        .range([ 0, width2]);
    // define y scale
    var ybar = d3.scaleBand()
        .range([ 0,  height2])
        .domain(srt_tmp.map(function(d) { return d.name.slice(0,15)}))
        .padding(.1);
    // define x-axis
    var xAxis2 = d3.axisBottom()
        .scale(xbar)
        .tickFormat(d3.format("d"))
        .tickValues(xbar.ticks().filter(tick => Number.isInteger(tick)));
        //.tickSize(-height);
    // define y-axis
    var yAxis2 = d3.axisLeft()
        .scale(ybar);
    // add x-axis
    svgbar.append("g")
        .attr("id", "x-axis-bars")
        .attr("transform", `translate(0,${height2})`)
        .call(xAxis2);
    // add y-axis
    svgbar.append("g")
        .attr("id", "y-axis-bars")
        .attr("transform", `translate(0,0)`)
        .call(yAxis2);
    // add bars
    bars.selectAll("rect")
        .data(srt_tmp)
        .enter()
        .append("rect")
        .attr("x", xbar(0))
        .attr("y", function(d) { return ybar(d.name.slice(0,15)) })
        .attr("width", function(d) { return xbar(d.fake_review_count) })
        .attr("height", ybar.bandwidth() )
        .attr("fill", function(d){return colorScale(d.fake_review_pct)});

//{return getColor(d.properties.ZCTA5CE10);})

    // Add the text label for X Axis
    svgbar.append("text")
        .attr("id", "bar_x_axis_label")
        .text("Number of Fake Reviews")
        .style("text-anchor", "middle")
        .attr("transform", `translate(${width2/2},${height2*1.15})`)
        .style('fill', 'Black')
        .attr("font-weight", 500)
        .attr("font-size", "15px")
    ;
    // Add the text label for Y axis
    svgbar.append("text")
        .attr("id", "bar_y_axis_label")
        .text("Business")
        .attr("transform", "rotate(-90)")
        .attr("x", -(height2/2))
        .attr("y", -margin2.left/1.4)
        .attr("dy", -20)
        .style("text-anchor", "middle")
        .style('fill', 'Black')
        .attr("font-weight", 500)
        .attr("font-size", "15px");

    // Add chart title
    svgbar.append("text")
        .attr("id", "bar_chart_title")
        .text(`${selectedCategory} in ${zipcode} with most fake reviews`)
        .style("text-anchor", "middle")
        .attr("transform", `translate(${width2/2},${-10})`)
        .style('fill', 'Black')
        .attr("font-weight", 700)
        .attr("font-size", "22px")

    // Display bar chart
    d3.select("#bar_chart");

};

export {buildBarchart}