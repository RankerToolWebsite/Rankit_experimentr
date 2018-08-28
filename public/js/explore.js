var dataset = {}
var expData = {};
expData.interaction = ""

/*********** Initialize Page *****************/
$(document).ready(function () {

    //load data
    var source = experimentr.source();
    d3.json(source, function(data) {
        //save full dataset
        dataset = data;
	var tempData = dataset[0];
	var keys = renderHead(data[0]);
	var table =  $('#table').DataTable({
	    destroy: true,
	    sScrollY: '60vh',
	    sScrollX:  '100%',
	    sScrollXInner: '100%',
	    bscrollCollapse: false,
	    pageLength: 25,
	    searching: true,

	});
	new $.fn.dataTable.FixedColumns(table, {
	    leftColumns: 3,
	    heightMatch: "auto",
	    rightColumns: 0
	} );
	renderData(data, keys)
    });
    //listener for rank button
    document.querySelector('.previous').addEventListener('click', prevValidate); 
    document.querySelector('.finish').addEventListener('click', finValidate);

    experimentr.startTimer('explore');
});


/****************** FUNCTIONS **********************/
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
		tooltip.select('.weight').html("<b>Normalized Weight: " + d.weight + "</b>");

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


function prevValidate(){
    expData.interaction = "PREVIOUS"
    experimentr.addData(expData)
    experimentr.save();
    expData.interaction = ""
    experimentr.endTimer('explore')
    experimentr.previous();
}


function finValidate() {
    expData.interaction = "FINISH"
    experimentr.addData(expData)
    experimentr.save();
    expData.interaction = ""
    experimentr.endTimer('explore')
    experimentr.next();
}


function highlightColor(percent, color1, color2){
    color = d3.scale.linear().domain([0, 1]).interpolate(d3.interpolateHcl).range([d3.rgb(color1), d3.rgb(color2)])
    return color(percent)
}


function highlightRows(){
    const raw_highlighted = '{{list|tojson}}'
    highlighted = JSON.parse(raw_highlighted)
    trs = $('#data > tr')
    trs = $('#data > tr')
    for (j=0; j<highlighted.length; j++) {
	for (i=0; i<trs.length; i++) {
	    if (trs[i].cells[1].textContent === highlighted[j]){
		trs[i].style.fontWeight = "900";
		trs[i].style.color = "black";
	    }
	}
    }
}

function shadeRowsByconf(data){

    trs = $('#data > tr')
    for (i=0; i<trs.length; i++) {
	confidence = data[i].Confidence
	score = data[i].ScoreNum
	trs[i].cells[0].style.backgroundColor = highlightColor(score, "#e3f7f3","#337c6e");
	trs[i].cells[1].style.backgroundColor = highlightColor(score, "#e3f7f3","#337c6e");
	trs[i].cells[1].setAttribute("data-html", "true");
	trs[i].cells[1].title="Confidence" + "||<br />" + "Score";
	trs[i].cells[1].setAttribute("tabindex", "0");
	trs[i].cells[1].setAttribute("data-toggle", "popover");
	trs[i].cells[1].setAttribute("data-trigger", "focus");
	trs[i].cells[1].setAttribute("data-content", confidence + "||<br />" + score);
	trs[i].cells[1].setAttribute("data-container","body");
	trs[i].cells[2].style.backgroundColor = highlightColor(score, "#e3f7f3","#337c6e");
    }
    $('[data-toggle="popover"]').popover();
}


function findMin(weights) {
    var current_min = weights[0].weight
    for (i=0; i<weights.length; i++){
	if (current_min > weights[i].weight) {
	    current_min = weights[i].weight
	}
    }
    return current_min
}


function findMax(weights) {
    var current_max = weights[0].weight
    for (i=0; i<weights.length; i++){
	if (current_max < weights[i].weight) {
	    current_max = weights[i].weight
	}
    }
    return current_max
}


function normalize(val, min, max) {
    return (val-min)/(max-min)
}


function normalizeWeights(data) {
    var dict = []
    min = findMin(data)
    max = findMax(data)
    for (i=0; i<data.length; i++){
	current_normalized = normalize(data[i].weight, min, max);
	dict.push({
	    "attribute": data[i].attribute,
	    "weight": current_normalized
	});
    }
    return dict;
}

function roundTo(n, digits) {
    if (digits === undefined) {
	digits = 0;
    }
    var multiplicator = Math.pow(10, digits);
    n = parseFloat((n * multiplicator).toFixed(11));
    var test =(Math.round(n) / multiplicator);
    return +(test.toFixed(digits));
}

function sumToOne(data) {
    var dict = [];
    var sum = 0;
    for (i=0; i<data.length; i++){
	if (data[i].weight < 0) {
	    sum = sum + (-1)*data[i].weight;
	} else {
	    sum = sum + data[i].weight;
	}
    }

    for (j=0; j<data.length; j++) {
	if (data[j].weight < 0) {
	    dict.push({
		"attribute": data[j].attribute,
		"weight": roundTo((-1)*(data[j].weight/sum), 2)
	    });

	} else {
	    dict.push({
		"attribute": data[j].attribute,
		"weight": roundTo(data[j].weight/sum, 2)
	    });
	}
    }
    return dict
}

// dict has a format:
// [
//  {
//    attribute: <attribute1>,
//    weight: <weight1>
//  }
//  {
//    attribute: <attribute2>,
//    weight: <weight2>
//  }
// ]
// To access: dict[0].attribute -> attribute1
//            dict[1].weight -> weight2


///////////////////////////


function renderHead(datum) {
    const title = 'Title'
    const rank = 'Rank'
    const score = 'Score'
    var w = 'Weights = '
    var data = Object.keys(datum)

    if (data.indexOf(score) > 0) {
	data.splice(data.indexOf(score), 1);
	data.unshift(score);
    }
    if (data.indexOf(title) > 0) {
	data.splice(data.indexOf(title), 1);
	data.unshift(title);
    }
    if (data.indexOf(rank) > 0) {
	data.splice(data.indexOf(rank), 1);
	data.unshift(rank);
    }
    const thead = data
	.map(k => `<th>${k}</th>`)
	.join('\n')
    document.querySelector('#head').innerHTML = thead
    return data
}

function renderData(data, keys) {
    var t = $('#table').dataTable();
    let maxScore = -1; // Is this true?? can a score be negative
    data.forEach(function(row) {
	if (row.Score > maxScore) {
            maxScore = row.Score;
	}
    });
    const html = data.map(x => {
        const dataScore = x.Score;
        x.ScoreNum = x.Score;
        const dataConf = x.Confidence;
	x.Score = `
            <div class="bar-chart-bar">
            <div class="inTableBar" style="width: ${(dataScore / ((maxScore !== 0) ? maxScore : 0.01)) * 100}%;background-color: #6a6265"></div>
            </div>
            `
	var props = keys
	    .map(k => x[k])
	t.fnAddData(props, false);
    })
    t.fnDraw();
}

function searchTable(e) {
    var value = e.target.value;
    var table = $('#table').DataTable().search( value ).draw();
}

function parseData(raw) {
    return JSON.parse(raw.substring(1, raw.length - 1))
}
