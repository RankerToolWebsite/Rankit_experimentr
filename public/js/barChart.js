
/** ************************ attribute histogram *************************** */

// const inputData = [{attribute:"Category 1",weight:0.5},{attribute:"Category
// 2",weight:0.1},{attribute:"Category 3",weight:1.2},{attribute:"Category
// 4",weight:1.2},{attribute:"Category 5",weight:0.3}];
// const inputData = weights
// console.log(weights);
// var colorScheme = d3.scale.category20();


function renderBarChart(inputData, dom_element_to_append_to, colorScheme) {
	counter = 1;
	
	// var colorScheme =
	// ["#8dd3c7","#bebada","#fb8072","#80b1d3","#fdb462","#b3de69","#fccde5"];
	
	var margin =  {top: 20, right: 10, bottom: 20, left: 40};
	var marginOverview = {top: 30, right: 10, bottom: 20, left: 40};
	var selectorHeight = 40;
	var width = 2000 - margin.left - margin.right;
	var height = 420 - margin.top - margin.bottom - selectorHeight;
	var heightOverview = 80 - marginOverview.top - marginOverview.bottom;
	
	var maxLength = d3.max(inputData.map(function(d){ return d.attribute.length}))
	var barWidth = maxLength * 7;
	var numBars = Math.round(width/barWidth);
	var isScrollDisplayed = barWidth * inputData.length > width;
	
	
	console.log(isScrollDisplayed)
	
	var xscale = d3.scale.ordinal()
	.domain(inputData.slice(0,numBars).map(function (d) { return d.attribute; }))
	.rangeBands([0, width], .2);
	
	var yscale = d3.scale.linear()
	.domain([0, d3.max(inputData, function (d) { return d.weight; })])
	.range([height, 0]);
	
	var color = d3.scale.ordinal()
	.range(colorScheme);
	
	var xAxis  = d3.svg.axis().scale(xscale).orient("bottom");
	var yAxis  = d3.svg.axis().scale(yscale).orient("left");
	
	var svg = d3.select("#chart").append("svg")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom + selectorHeight)
	.attr("viewBox", "0 0 700 500")
	.attr("preserveAspectRatio", "xMinYMin meet");
	
	
	var diagram = svg.append("g")
	.attr("transform", "translate(" + margin.left + "," + 100 + ")");
	
	diagram.append("g")
	.attr("class", "x axis")
	.attr("transform", "translate(0, " + height + ")")
	.call(xAxis);
	
	var bars = diagram.append("g");
	
	bars.selectAll("rect")
	.data(inputData.slice(0, numBars), function (d) {return d.attribute; })
	.enter().append("rect")
	.attr("class", "bar")
	.attr("x", function (d) { return xscale(d.attribute); })
	.attr("y", function (d) { return yscale(d.weight); })
	.attr("width", xscale.rangeBand())
	.attr("height", function (d) { return height - yscale(d.weight); })
	.attr('fill', function(d, i) {
	 return color(d.attribute);
	});
	
	var tooltip = d3.select("#chart")
	.append('div')
	.attr('class', 'tooltip');
	
	tooltip.append('div')
	.attr('class', 'attribute');
	tooltip.append('div')
	.attr('class', 'weight');
	
	svg.selectAll(".bar")
	.on('mouseover', function(d) {
	 tooltip.select('.attribute').html("<b>" + d.attribute + "</b>");
	 tooltip.select('.weight').html("<b>Weight: " + d.weight + "</b>");
	
	 tooltip.style('display', 'block');
	 tooltip.style('opacity',2);
	})
	.on('mousemove', function(d) {
	
	 tooltip.style('top', (d3.event.layerY + 10) + 'px')
	 .style('left', (d3.event.layerX - 25) + 'px');
	})
	.on('mouseout', function(d) {
	 tooltip.style('display', 'none');
	 tooltip.style('opacity',0);
	});
	
	
	
	
	if (isScrollDisplayed)
	{
	 var xOverview = d3.scale.ordinal()
	 .domain(inputData.map(function (d) { return d.attribute; }))
	 .rangeBands([0, width], .2);
	 yOverview = d3.scale.linear().range([heightOverview, 0]);
	 yOverview.domain(yscale.domain());
	
	 var subBars = diagram.selectAll('.subBar')
	 .data(inputData)
	
	 subBars.enter().append("rect")
	 .classed('subBar', true)
	 .attr({
	   height: function(d) {
	     return heightOverview - yOverview(d.weight);
	   },
	   width: function(d) {
	     return xOverview.rangeBand()
	   },
	   x: function(d) {
	
	     return xOverview(d.attribute);
	   },
	   y: function(d) {
	     return height + heightOverview + yOverview(d.weight)
	   }
	 })
	
	 var displayed = d3.scale.quantize()
	 .domain([0, width])
	 .range(d3.range(inputData.length));
	
	 diagram.append("rect")
	 // .attr("transform", "translate(0, " + (height + margin.bottom) + ")")
	 // .attr("transform","translate(" + margin.left + "," + 40 + ")")
	 .attr("transform", "translate(0, " + (height + margin.bottom) + ")")
	 .attr("class", "mover")
	 .attr("x", 0)
	 .attr("y", 0)
	 .attr("height", selectorHeight)
	 .attr("width", Math.round(parseFloat(numBars * width)/inputData.length))
	 .attr("pointer-events", "all")
	 .attr("cursor", "ew-resize")
	 .call(d3.behavior.drag().on("drag", display));
	
	
	}
	function display () {
	 var x = parseInt(d3.select(this).attr("x")),
	 nx = x + d3.event.dx,
	 w = parseInt(d3.select(this).attr("width")),
	 f, nf, new_data, rects;
	
	 if ( nx < 0 || nx + w > width ) return;
	
	 d3.select(this).attr("x", nx);
	
	 f = displayed(x);
	 nf = displayed(nx);
	
	 if ( f === nf ) return;
	
	 new_data = inputData.slice(nf, nf + numBars);
	
	 xscale.domain(new_data.map(function (d) { return d.attribute; }));
	 diagram.select(".x.axis").call(xAxis);
	
	 rects = bars.selectAll("rect")
	 .data(new_data, function (d) {return d.attribute; });
	
	 rects.attr("x", function (d) { return xscale(d.attribute); });
	
	 // rects.attr("transform", function(d) { return "translate(" +
		// xscale(d.attribute) + ",0)"; })
	
	 rects.enter().append("rect")
	 .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
	 .attr("class", "bar")
	 .attr("x", function (d) { return xscale(d.attribute); })
	 .attr("y", function (d) { return yscale(d.weight); })
	 .attr("width", xscale.rangeBand())
	 .attr("height", function (d) { return height - yscale(d.weight); })
	 .attr('fill', function(d, i) {
	   return color(d.attribute);
	 });
	
	 var tooltip = d3.select("#chart")
	 .append('div')
	 .attr('class', 'tooltip');
	
	 tooltip.append('div')
	 .attr('class', 'attribute');
	 tooltip.append('div')
	 .attr('class', 'weight');
	
	 if (tooltipCounter >= 1) {
	   tooltipCounter = 0;
	 }
	 else {
	   svg.selectAll(".bar")
	   .on('mouseover', function(d) {
	     tooltip.select('.attribute').html("<b>" + d.attribute + "</b>");
	     tooltip.select('.weight').html("<b>Weight: " + d.weight + "</b>");
	
	     tooltip.style('display', 'block');
	     tooltip.style('opacity',2);
	     tooltipCounter += 1;
	   })
	   .on('mousemove', function(d) {
	     tooltip.style('top', (d3.event.layerY + 10) + 'px')
	     .style('left', (d3.event.layerX - 25) + 'px');
	   })
	   .on('mouseout', function(d) {
	     tooltip.style('display', 'none');
	     tooltip.style('opacity',0);
	   });
	
	   rects.exit().remove();
	 }
	
	};
}