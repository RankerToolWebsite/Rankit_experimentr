const colorScheme = ["#ffffb3","#bebada","#fb8072","#80b1d3","#fdb462","#b3de69","#fccde5"];
var confidence = 0;
var weights = 0;
var tooltipCounter = 0;
const pool = document.querySelector('#top');
const target = document.querySelector('#lc-center');
var dataset = {}
var attributes = {}
const min_num_of_objects = 2;
var lc_observer;

/*********** Initialize Page *****************/
$(document).ready(function () {

    //load data
    d3.json("data/states.json", function(data) {
	//save full dataset
	dataset = data;
	dataset.sort((a, b) => a.Title.localeCompare(b.Title));
	//save list of data attributes
	attributes = Object.keys(data[0]);
	var index = attributes.indexOf("Title");
	if (index > -1) {
	    attributes.splice(index, 1);
	}
	//initialize data pool
	render(data);
	
	//create sortable container for pool
	const source_sortable = Sortable.create(pool, {
	    group: 'list',
	    animation: 300,
	    sort: false,
	    ghostClass: 'ghost',
	});
	//create sortable container for preference collection
	const target_sortable = Sortable.create(target, {
	    group: 'list',
	    animation: 300,
	    ghostClass: 'ghost',
	});
	
	//listener for rank button
	document.querySelector('#lc-submit').addEventListener('click', handleLCSubmit);
	
	lc_observer = new MutationObserver(function (mutations) {
	    mutations.forEach(function (mutation) {
		lc_urlUpdate();
		
		const list_length = document.querySelector('#lc-center').children.length;
		if (list_length < min_num_of_objects) {
		    $('#lc-submit').attr('disabled', 'disabled');
		    //d3.select("body").selectAll("svg").remove();
		    //document.getElementById("p1").innerHTML = "";
		}
		else {
		    $('#lc-submit').removeAttr('disabled');
		    handleBuildSubmit();
		    //barUpdate(confidence);
		    //console.log(weights);
		    //renderBarChart(weights,"#chart", colorScheme);
		    //document.getElementById("p1").innerHTML = "Impact of Attributes on Dataset Ranking";
		}
	    });
	});
	
	// Node, config
	var lc_observerConfig = {
	    childList: true
	};
	
	var lc_center_node = document.getElementById('lc-center');
	lc_observer.observe(lc_center_node, lc_observerConfig);
	
	//check if we need to populate page from URL
	if ( lc_getParametersFromURL() !== undefined) {
	    lc_populateBox();
	    barUpdate(confidence);
	}
	
	shuffleDataset();
	refresh_popovers();
	
	$('.popover-dismiss').popover({
	    trigger: 'focus'
	})
	
	$('body').on('click', function (e) {
	    // did not click a popover toggle or popover
	    if ($(e.target).data('toggle') !== 'popover'
		&& $(e.target).parents('.popover.in').length === 0) {
		$('[data-toggle="popover"]').popover('hide');
	    }
	});
    });
    experimentr.release();
});
	
/*********************** Functions ****************************************/


function add_to_sortable(className) {
    const all = document.querySelectorAll(className)
    
    all.forEach(t => Sortable.create(t, {
	group: {
	    name: 'list',
	    put: (to) => to.el.children.length < 1,
	},
	animation: 100,
    }))
}


function barUpdate(list_length) {
    list_length = Math.floor(list_length)
    document.getElementById("bar").setAttribute("aria-valuenow", list_length.toString())
    document.getElementById("bar").setAttribute("style", "width:"+list_length+"%")
    document.getElementById("bar").textContent = list_length+"%"+" Confidence"
}



function handleLCSubmit() {
    experimentr.next();
}

function handleBuildSubmit() {
    const pwl = lc_generatePairwise();
    var pairs = JSON.stringify(pwl);

    if (pairs !== ""){
	const url = "build?pairs="+pairs
	const xhr = new XMLHttpRequest()
	xhr.open('GET', url, true)
	xhr.setRequestHeader('Content-type', 'application/json')
	
	xhr.send()
	xhr.onload = function () {
	    d3.json("data/weights.json", function(data) {
		confidence = data[0]["tau"]
		weights = data[0]
		delete weights["tau"]
	    });
	}
    }
}

function lc_generatePairwise() {
    const list = Array.from(document.querySelectorAll('#lc-center .object'))
    const ids = list.map(x => x.id)
    // pairwise list to send back to server
    let pwl = []
    for (let i = 0; i < ids.length - 1; i++) {
	for (let j = i + 1; j < ids.length; j++) {
	    pwl.push({ 'high': ids[i], 'low': ids[j] })
	}
    }
    return pwl
}

//dataset should be accessed from json, contains all attributes
//can call getSubsetData first
function render(dataset) {
    //const pool = document.querySelector('#top')
    const html = dataset.map(x => generateTileHTML(x)).join('\n')
    pool.innerHTML = html	  
}

function generateTileHTML(x){
    //format data attributes as table for display in popover
    var id = dataset.indexOf(x);
    var text = "<table class='data-pool-popover'><tr><th>Attribute</th><th>Value</th></tr>";
    for (var i in attributes) {
	var attrName = attributes[i];
	var attrVal = x[attributes[i]];
        text = text + "<tr><td>" + attrName + "</td><td>" + attrVal + "</td></tr>";
    }
    text = text + "</table>"
    //format tile display, use index in dataset as id
    return `<div tabindex="0" id="${id}" class="object noSelect pop"
    data-toggle="popover" data-html="true" data-content="${text}">${x.Title}</div>`
}

//Takes what is in the data pool and returns their original ids as an integer array
function getCurrentPool() {
  return Array.from(document.querySelector('#top').children).map(x => parseInt(x.id))
}

//Takes what is in the ranked pool and returns their original ids as an integer array
function getRankedID() {
  return Array.from(document.querySelector('#lc-center').children).map(x => parseInt(x.id))
}


//Ids is a list of integers, functions returns the subset data associated with it
function filterDataset(ids){
    var currentData = [];
    ids.forEach(function(d) {
	currentData.push(dataset[d]);
    });
    return currentData
}

function sortDataset() {
    var currentIds = getCurrentPool()
    currentIds.sort(function(a, b){return a-b})
    render(filterDataset(currentIds))
    refresh_popovers()
}

function shuffleDataset() {
    var currentIds = getCurrentPool();
    var currentData = filterDataset(currentIds);
    for (let i = currentData.length - 1; i > 0; i--) {
	const j = Math.floor(Math.random() * (i + 1));
	[currentData[i], currentData[j]] = [currentData[j], currentData[i]];
    }
    render(currentData)
    refresh_popovers()
}

function searchDataset(e) {
    var currentData = dataset
    //filters what is already ranked out of the dataset
    var rankedID = getRankedID();
    var rankedDataset = filterDataset(rankedID);
    let difference = dataset.filter(tile => rankedDataset.indexOf(tile) == -1)
    //checks what is in the search bar and filters out anything that doesnt contain it
    const value = e.target.value
    const re = new RegExp(value, 'i')
    const newDataset = difference.filter(tile => re.test(tile.Title))
    render(newDataset)
    refresh_popovers()
  }

function refresh_popovers(){
    $('.pop').popover({
	trigger: 'hover',
	delay: {
	    show:"1000",
	    hide:"0"
	}
    });
}


/****** Loading from URL ******************/
function lc_urlUpdate() {
    var list = Array.from(document.querySelectorAll('#lc-center .object')).map(x => x.id)
    var url = window.location.pathname + "?method=" + "lc" + "&" + "objects="
    history.pushState({}, 'List Comparison', url + list.toString())
    
}

function lc_getParametersFromURL() {
    var query_string = {};
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
    	var pair = vars[i].split("=");
    	// If first entry with this name
    	if (typeof query_string[pair[0]] === "undefined") {
      	    query_string[pair[0]] = decodeURIComponent(pair[1]);
      	    // If second entry with this name
    	} else if (typeof query_string[pair[0]] === "string") {
     	    var arr = [query_string[pair[0]], decodeURIComponent(pair[1])];
      	    query_string[pair[0]] = arr;
      	    // If third or later entry with this name
    	} else {
      	    query_string[pair[0]].push(decodeURIComponent(pair[1]));
    	}
    }
    var selectedObjects = query_string.objects;
    if (selectedObjects !== undefined) {
	return selectedObjects.split(',');
    }
    return selectedObjects;
}

function lc_populateBox() {
    var lc_objectsFromURL = lc_getParametersFromURL();
    for (let i = 0; i < lc_objectsFromURL.length; i++) {
	document.querySelector('#top').removeChild(document.getElementById(lc_objectsFromURL[i]))
	var node = document.createElement("DIV");
	var textnode = document.createTextNode(dataset[lc_objectsFromURL[i]].Title);
	node.appendChild(textnode);
	node.setAttribute("id", lc_objectsFromURL[i]);
	node.setAttribute("class", "object noSelect pop");
	node.setAttribute("tabindex", "0");
	node.setAttribute("data-toggle", "popover");
	document.querySelector('#lc-center').appendChild(node);
	handleBuildSubmit();
    }
}

