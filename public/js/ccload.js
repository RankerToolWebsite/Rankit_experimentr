var confidence = 0;
var counter = 0;
var tooltipCounter = 0;
var pool = document.querySelector('#top');
var dataset = {}
var attributes = {}
var min_num_of_objects = 2;
var cc_observer;
var min_num_of_non_empty_lists = 2
var expData = {};
var high = new Array();
var medium = new Array();
var low = new Array();
expData.highUrlChanges = new Array();
expData.medUrlChanges = new Array();
expData.lowUrlChanges = new Array();
expData.interaction = "";
expData.model = "";
/*********** Initialize Page *****************/
$(document).ready(function () {

    //load data
    d3.json("data/colleges.json", function(data) {
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
	    group: 'category',
	    animation: 300,
	    sort: false,
	    ghostClass: 'ghost',
	});
        
	//create sortable container for preference collection
	const high_sortable = Sortable.create(document.querySelector('#left'), {
	    group: 'category',
	    animation: 300,
	    ghostClass: 'ghost',
	    onAdd: function(e){
	    	high.push(e.item.id);
            	expData.interaction = "HIGH ADD"
	    	expData.highUrlChanges = high;
            	experimentr.addData(expData);
	    	cc_urlUpdate();
	    },
	    onRemove: function(e){
		var index = high.indexOf(e.item.id);
		high.splice(index, 1);
		expData.interaction = "HIGH REMOVE";
		expData.highUrlChanges = high;
		experimentr.addData(expData);
		cc_urlUpdate();
	    }
	})
	const med_sortable = Sortable.create(document.querySelector('#center'), {
	    group: 'category',
	    animation: 300,
	    ghostClass: 'ghost',
	    onAdd: function(e){
	    	high.push(e.item.id);
            	expData.interaction = "MED ADD";
	    	expData.medUrlChanges = medium;
            	experimentr.addData(expData);
	    	cc_urlUpdate();
	    },
	    onRemove: function(e){
		var index = medium.indexOf(e.item.id);
		medium.splice(index, 1);
		expData.interaction = "MED REMOVE";
		expData.medUrlChanges = medium;
		experimentr.addData(expData);
		cc_urlUpdate();
	    }
	});
	
	const low_sortable = Sortable.create(document.querySelector('#right'), {
	    group: 'category',
	    animation: 300,
	    ghostClass: 'ghost',
	    onAdd: function(e){
	    	high.push(e.item.id);
            	expData.interaction = "LOW ADD";
	    	expData.lowUrlChanges = low;
            	experimentr.addData(expData);
	    	cc_urlUpdate();
	    },
	    onRemove: function(e){
		var index = low.indexOf(e.item.id);
		low.splice(index, 1);
		expData.interaction = "LOW REMOVE";
		expData.lowUrlChanges = low;
		experimentr.addData(expData);
		cc_urlUpdate();
	    }
	});
	
	
	//listener for rank button
	document.querySelector('#cc-submit').addEventListener('click', buildSubmit);
	
	var cc_observer = new MutationObserver(function (mutations) {
	    mutations.forEach(function (mutation) {
		cc_urlUpdate();
		
		var num_of_non_empty_list = document.querySelector('#center').children.length > 0 ? 1 : 0;
		num_of_non_empty_list += document.querySelector('#left').children.length > 0 ? 1 : 0;
		num_of_non_empty_list += document.querySelector('#right').children.length > 0 ? 1 : 0;
		
		if (num_of_non_empty_list < min_num_of_non_empty_lists) {
		    $('#cc-submit').attr('disabled', 'disabled');
		}
		else {
		    $('#cc-submit').removeAttr('disabled');
		}
		//MOTIVATORS
		//barUpdate(confidence);
		//console.log(weights);
		//renderBarChart(weights,"#chart", colorScheme);
		//document.getElementById("p1").innerHTML = "Impact of Attributes on Dataset Ranking";
	    });
	});
	
	// Node, config
	var cc_observerConfig = {
	    childList: true,
	};
        
	var cc_center_node = document.getElementById('center');
	var cc_left_node = document.getElementById('left');
	var cc_right_node = document.getElementById('right');
	
	cc_observer.observe(cc_center_node, cc_observerConfig);
	cc_observer.observe(cc_left_node, cc_observerConfig);
	cc_observer.observe(cc_right_node, cc_observerConfig);
        
	//check if we need to populate page from URL
	if ( cc_getHighFromURL() !== undefined){
	    if ( !cc_getHighFromURL().includes("")) {
		cc_populateHighBox();
	    }
	}
        
	if ( cc_getMedFromURL() !== undefined){
            if ( !cc_getMedFromURL().includes("")) {
		cc_populateMediumBox();
	    }
	}
        
	if ( cc_getLowFromURL() !== undefined){    
            if ( !cc_getLowFromURL().includes("")) {
		cc_populateLowBox();
	    }
	}
	
	//initialize pool randomly
	shuffle();
	
	//iniitalize popovers
	var $popover = $('.pop').popover({
	    trigger: 'hover',
	    delay: {
		show:"1000",
		hide:"0"
	    }
	});
	   	
	$('.popover-dismiss').popover({
	    trigger: 'focus'
	})
	
	//log when users are reading popovers
	$popover.on('shown.bs.popover', function(e) {
	    var pop_start = e.timeStamp;
	    $(this).popover().on("hidden.bs.popover", function(e) {
		var pop_end = e.timeStamp;
		var pop_time = pop_end - pop_start
		if (pop_time > 500){
		    expData.pop_time = pop_time;
		    experimentr.addData(expData);
		    experimentr.save();
		}
		$(this).off(e);
	    })
	});
	
	
	$('body').on('click', function (e) {
	    // did not click a popover toggle or popover
	    if ($(e.target).data('toggle') !== 'popover'
		&& $(e.target).parents('.popover.in').length === 0) {
		$('[data-toggle="popover"]').popover('hide');
	    }
	});
    }); 

    experimentr.startTimer('build');
});

/*********************** Functions ****************************************/


function barUpdate(list_length) {
    list_length = Math.floor(list_length);
    document.getElementById("bar").setAttribute("aria-valuenow", list_length.toString());
    document.getElementById("bar").setAttribute("style", "width:"+list_length+"%");
    document.getElementById("bar").textContent = list_length+"%"+" Confidence";
}

//log end of build session, advance to explore    
function buildSubmit(){
    expData.interaction = "RANK";
    experimentr.addData(expData);
    var url = getRanking();
    expData.model = url.substr(url.indexOf('=')+1);
    experimentr.save();
    experimentr.endTimer('build');
    expData.interaction = "";
    expData.model = "";
    experimentr.next_json(url);   
}

function getRanking() {
    //generate query string to fetch anking from backend
    const pwl = cc_generatePairwise();
    var pairs = JSON.stringify(pwl);    
    return "build?pairs="+pairs;
}

function cc_generatePairwise() {
    // pairwise list to send back to server
    let pwl = [];
    for (let i = 0; i < high.length; i++) {
        for (let j = 0; j < medium.length; j++) {
            pwl.push({ 'high': high[i], 'low': medium[j] });
        }
        for (let j = 0; j < low.length; j++) {
            pwl.push({ 'high': high[i], 'low': low[j] });
        }
    }
    for (let i = 0; i < medium.length; i++) {
        for (let j = 0; j < low.length; j++) {
            pwl.push({ 'high': medium[i], 'low': low[j] });
        }
    }
    return pwl;
}

//dataset should be accessed from json, contains all attributes
//can call getSubsetData first
function render(dataset) {
    //const pool = document.querySelector('#top')
    const html = dataset.map(x => generateTileHTML(x)).join('\n');
    pool.innerHTML = html;	  
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
    text = text + "</table>";
    //format tile display, use index in dataset as id
    return `<div tabindex="0" id="${id}" class="object noSelect pop";
    data-toggle="popover" data-html="true" data-content="${text}">${x.Title}</div>`;
}

//Takes what is in the data pool and returns their original ids as an integer array
function getCurrentPool() {
    return Array.from(document.querySelector('#top').children).map(x => parseInt(x.id));
}


//Takes what is in the ranked Item box and returns their Titles in a string array
function getRankedObjects() {
    var left = Array.from(document.querySelector('#left').children).map(x => x.innerText);
    var center = Array.from(document.querySelector('#center').children).map(x => x.innerText);
    var right = Array.from(document.querySelector('#right').children).map(x => x.innerText);
    return left.concat(center).concat(right)
}


//Takes what is in the ranked pool and returns their original ids as an integer array
function getRankedID() {
    var left = Array.from(document.querySelector('#left').children).map(x => parseInt(x.id));
    var center = Array.from(document.querySelector('#center').children).map(x => parseInt(x.id));
    var right = Array.from(document.querySelector('#right').children).map(x => parseInt(x.id));
    return left.concat(center).concat(right);
}


//Ids is a list of integers, functions returns the subset data associated with it
function filterDataset(ids){
    var currentData = [];
    ids.forEach(function(d) {
	currentData.push(dataset[d]);
    });
    return currentData;
}

function sortDataset() {
    var currentIds = getCurrentPool();
    currentIds.sort(function(a, b){return a-b});
    render(filterDataset(currentIds));
    refresh_popovers();
    expData.interaction="SORT";
    experimentr.addData(expData);
}

function shuffleDataset() {
    expData.interaction="SHUFFLE";
    experimentr.addData(expData);
    shuffle();
}

function shuffle(){
    var currentIds = getCurrentPool();
    var currentData = filterDataset(currentIds);
    for (let i = currentData.length - 1; i > 0; i--) {
	const j = Math.floor(Math.random() * (i + 1));
	[currentData[i], currentData[j]] = [currentData[j], currentData[i]];
    }
    render(currentData);
    refresh_popovers();
}

function searchDataset(e) {
    var currentData = dataset;
    //filters what is already ranked out of the dataset
    var rankedID = getRankedID();
    var rankedDataset = filterDataset(rankedID);
    let difference = dataset.filter(tile => rankedDataset.indexOf(tile) == -1);
    //checks what is in the search bar and filters out anything that doesnt contain it
    const value = e.target.value;
    const re = new RegExp(value, 'i');
    const newDataset = difference.filter(tile => re.test(tile.Title))
    render(newDataset);
    refresh_popovers();
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
function cc_urlUpdate() {
    var url = window.location.pathname + "?method=" + "cc" + "&" + 
	"high=" + high.toString() + "&" + 
	"medium=" + medium.toString() + "&" + 
	"low=" + low.toString();
    history.pushState({}, 'Categorical Comparison', url);
}
 

function cc_getParametersFromURL() {
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
    return query_string;
}

function cc_getHighFromURL() {
    var selectedObjects = cc_getParametersFromURL().high;

     if (selectedObjects !== undefined) {
	return selectedObjects.split(',');
    }
    return selectedObjects;
    }

function cc_getMedFromURL() {
    var selectedObjects = cc_getParametersFromURL().medium;

     if (selectedObjects !== undefined) {
	return selectedObjects.split(',');
    }
    return selectedObjects;
    }

function cc_getLowFromURL() {
    var selectedObjects = cc_getParametersFromURL().low;

     if (selectedObjects !== undefined) {
	return selectedObjects.split(',');
    }
    return selectedObjects;
    }

function cc_populateHighBox() {
    var cc_objectsFromURL = cc_getHighFromURL();
    for (let i = 0; i < cc_objectsFromURL.length; i++) {
	document.querySelector('#top').removeChild(document.getElementById(cc_objectsFromURL[i]))
	var node = document.createElement("DIV");
	var textnode = document.createTextNode(dataset[cc_objectsFromURL[i]].Title);
	node.appendChild(textnode);
	node.setAttribute("id", cc_objectsFromURL[i]);
	node.setAttribute("class", "object noSelect pop");
	node.setAttribute("tabindex", "0");
	node.setAttribute("data-toggle", "popover");
	document.querySelector('#left').appendChild(node);
	high.push(cc_objectsFromURL[i]);
    }
}

function cc_populateMediumBox() {
    var cc_objectsFromURL = cc_getMedFromURL();
    for (let i = 0; i < cc_objectsFromURL.length; i++) {
	document.querySelector('#top').removeChild(document.getElementById(cc_objectsFromURL[i]))
	var node = document.createElement("DIV");
	var textnode = document.createTextNode(dataset[cc_objectsFromURL[i]].Title);
	node.appendChild(textnode);
	node.setAttribute("id", cc_objectsFromURL[i]);
	node.setAttribute("class", "object noSelect pop");
	node.setAttribute("tabindex", "0");
	node.setAttribute("data-toggle", "popover");
	document.querySelector('#center').appendChild(node);
	medium.push(cc_objectsFromURL[i]);
    }
}

function cc_populateLowBox() {
    var cc_objectsFromURL = cc_getLowFromURL();
    for (let i = 0; i < cc_objectsFromURL.length; i++) {
	document.querySelector('#top').removeChild(document.getElementById(cc_objectsFromURL[i]))
	var node = document.createElement("DIV");
	var textnode = document.createTextNode(dataset[cc_objectsFromURL[i]].Title);
	node.appendChild(textnode);
	node.setAttribute("id", cc_objectsFromURL[i]);
	node.setAttribute("class", "object noSelect pop");
	node.setAttribute("tabindex", "0");
	node.setAttribute("data-toggle", "popover");
	document.querySelector('#right').appendChild(node);
	low.push(cc_objectsFromURL[i]);
    }
}

