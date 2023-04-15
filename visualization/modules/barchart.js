function buildBarchart(svgbar, barDimensions, srt_tmp, selectedCategory, zipcode, colorScale, metric) {
    // create container for easy removal and group for bars
    const svgbarcontainer = svgbar.append("g")
        .attr("id", "barcontainer")
        .attr("transform", "translate(" + barDimensions.marginLeft + "," + barDimensions.marginTop + ")");
 
    // define x scale
    var xbar = d3.scaleLinear()
        .domain([0, d3.max(srt_tmp, function(d) {return d.fake_review_count;})])
        .range([ 0, barDimensions.width]);
    // define y scale
    var ybar = d3.scaleBand()
        .range([ 0,  barDimensions.height])
        .domain(srt_tmp.map(function(d) { return d.name.slice(0,15)}))
        .padding(.1);
    // define x-axis
    var xAxis = d3.axisBottom()
        .scale(xbar)
        .tickFormat(d3.format("d"))
        .tickValues(xbar.ticks().filter(tick => Number.isInteger(tick)));
    // define y-axis
    var yAxis = d3.axisLeft()
        .scale(ybar);

    // add x-axis
    svgbarcontainer.append("g")
        .attr("id", "x-axis-bars")
        .attr("transform", `translate(0,${barDimensions.height})`)
        .call(xAxis);
    // add y-axis
    svgbarcontainer.append("g")
        .attr("id", "y-axis-bars")
        .attr("transform", `translate(0,0)`)
        .call(yAxis);

    // add bars
    svgbarcontainer.selectAll("rect")
        .data(srt_tmp)
        .enter()
        .append("rect")
        .attr("x", xbar(0))
        .attr("y", function(d) { return ybar(d.name.slice(0,15)) })
        .attr("width", function(d) { return xbar(d.fake_review_count) })
        .attr("height", ybar.bandwidth() )
        .attr("fill", function(d){return colorScale(d[metric])});

    // Add the text label for X Axis
    svgbarcontainer.append("text")
        .attr("id", "bar_x_axis_label")
        .text("Number of Fake Reviews")
        .style("text-anchor", "middle")
        .attr("transform", `translate(${barDimensions.width/2.5},${barDimensions.height*1.15})`)
        .style('fill', 'Black')
        .attr("font-weight", 500)
        .attr("font-size", "20px")
    ;
    // Add the text label for Y axis
    svgbarcontainer.append("text")
        .attr("id", "bar_y_axis_label")
        .text("Business")
        .attr("transform", "rotate(-90)")
        .attr("x", -(barDimensions.height/2))
        .attr("y", -barDimensions.marginLeft/1.7)
        .attr("dy", -20)
        .style("text-anchor", "middle")
        .style('fill', 'Black')
        .attr("font-weight", 500)
        .attr("font-size", "20px");

    // Add chart title
    svgbarcontainer.append("text")
        .attr("id", "bar_chart_title")
        .text(`${selectedCategory} in ${zipcode} with most fake reviews`)
        .style("text-anchor", "middle")
        .attr("transform", `translate(${barDimensions.width/2.2},${-10})`)
        .style('fill', 'Black')
        .attr("font-weight", 700)
        .attr("font-size", "22px")
};

export {buildBarchart}