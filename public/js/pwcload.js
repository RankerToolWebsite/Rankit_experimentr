var confidence = 0;
var counter = 0;
var tooltipCounter = 0;
var pool = document.querySelector('#top');
var dataset = {}
var attributes = {}
var min_num_of_objects = 2;
var pwc_observer;
var expData = {};
var high = new Array();
var low = new Array();
expData.highUrlChanges = new Array();
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
	    group: {
		name: 'list',
		pull: 'clone',
		revertClone: 'true',
	    },
	    onAdd: function(evt){
		evt.item.parentNode.removeChild(evt.item)
	    },
	    animation: 300,
	    sort: false,
	    ghostClass: 'ghost',
	});
	
	high_to_sortable('.high')
	low_to_sortable('.low')
	

	//listener for rank button
	document.querySelector('#submit').addEventListener('click', buildSubmit);
        
	document.querySelector('#more').addEventListener('click', trackNewPair);
        
	
	var pwc_observer = new MutationObserver(function (mutations) {
	    mutations.forEach(function (mutation) {

		const high_length = document.querySelectorAll('.high > div').length;
		const low_length = document.querySelectorAll('.low > div').length;
                
		const list_num = (high_length > 0 ? 1 : 0) + (low_length > 0 ? 1 : 0);
		
		if ((high_length != low_length) || (list_num < min_num_of_objects)) {
		    $('#submit').attr('disabled', 'disabled');
		}
		else {
		    $('#submit').removeAttr('disabled');
		}
		//MOTIVATORS
		//barUpdate(confidence);
		//console.log(weights);
		//renderBarChart(weights,"#chart", colorScheme);
		//document.getElementById("p1").innerHTML = "Impact of Attributes on Dataset Ranking";
	    });
	});
	
	// Node, config
	var pwc_observerConfig = {
	    childList: true,
        subtree: true,
	};
	
	var pwc_center_node = document.getElementById('pwl');
	pwc_observer.observe(pwc_center_node, pwc_observerConfig);
	
	
	//check if we need to populate page from URL
	if ( pwc_getHighFromURL() !== undefined){
	    if ( !pwc_getHighFromURL().includes("")) {
		pwc_populateHighBox();
		//barUpdate(confidence);
	    }
	}
	
	if ( pwc_getLowFromURL() !== undefined){ 
            if ( !pwc_getLowFromURL().includes("")) {
		pwc_populateLowBox();
		//barUpdate(confidence);
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

function high_to_sortable(className) {
    const all = document.querySelectorAll(className)
    
    all.forEach(t => Sortable.create(t, {
	group: {
	    name: 'list',
	    put: (to) => to.el.children.length < 1,
	},
	animation: 100,
	onAdd: function(e){
	    high.push(e.item.id);
            expData.interaction = "LEFT ADD";
	    expData.highUrlChanges = high;
            experimentr.addData(expData);
	    pwc_urlUpdate();
	},
	onRemove: function(e){
	    var index = high.indexOf(e.item.id);
	    high.splice(index, 1);
            expData.interaction = "LEFT REMOVE";
	    expData.highUrlChanges = high;
            experimentr.addData(expData);
	    pwc_urlUpdate();
	}
    }))
}

function low_to_sortable(className) {
    const all = document.querySelectorAll(className)
    
    all.forEach(t => Sortable.create(t, {
	group: {
	    name: 'list',
	    put: (to) => to.el.children.length < 1,
	},
	animation: 100,
	onAdd: function(e){
	    low.push(e.item.id);
	    expData.interaction = "RIGHT ADD"
	    expData.lowUrlChanges = low;
            experimentr.addData(expData);
	    pwc_urlUpdate();

	},
	onRemove: function(e){
	    var index = low.indexOf(e.item.id);
	    low.splice(index, 1);
            expData.interaction = "RIGHT REMOVE"
	    expData.lowUrlChanges = low;
            experimentr.addData(expData);
	    pwc_urlUpdate();

	}
    }))
}

function barUpdate(list_length) {
    list_length = Math.floor(list_length)
    document.getElementById("bar").setAttribute("aria-valuenow", list_length.toString())
    document.getElementById("bar").setAttribute("style", "width:"+list_length+"%")
    document.getElementById("bar").textContent = list_length+"%"+" Confidence"
}

function trackNewPair(){
    expData.interaction = "NEW PAIR"
    experimentr.addData(expData)
    expData.interaction = ""  
}

//log end of build session, advance to explore    
function buildSubmit(){
    expData.interaction = "RANK";
    var url = getRanking();
    expData.model = url.substr(url.indexOf('=')+1);
    experimentr.addData(expData);
    experimentr.endTimer('build');
    experimentr.save();
    expData.interaction = "";
    expData.model = "";
    experimentr.next_json(url);   
}

function getRanking() {
    //generate query string to fetch anking from backend
    const pwl = pwc_generatePairwise();
    var pairs = JSON.stringify(pwl);    
    return "build?pairs="+pairs;
}

function pwc_generatePairwise() {
    let pwl = []
    for (let i = 0; i < high.length; i++) {
        pwl.push({ 'high': high[i], 'low': low[i] })
    }
    console.log(pwl)
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
    var high = Array.from(document.querySelector('.high').children).map(x => parseInt(x.id))
    var low = Array.from(document.querySelector('.low').children).map(x => parseInt(x.id))
    return high.concat(low)
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

function handleMore() {
    const pwl = document.querySelector('#pwl')
    // const html = `<div class="pw"><div class="high list"></div><div class="low list"></div></div>`
    const html = `<div class="pwx"><div class="pw"><div class="high list"></div><div class="low list"></div></div><div class="x" onclick="clearPW(event)"><i class="fas fa-times"></i></div></div>`
    pwl.innerHTML += html
    high_to_sortable('.high')
    low_to_sortable('.low')
}


function clearPW(e) {
    const pwl = e.target.closest('#pwl')
    console.log();
    if (pwl.children.length > 1) {
        const pwx = e.target.closest('.pwx');
        // console.log(pwx)
        pwx.remove()
    } else {
        const pw = e.target.closest('.pwx').children[0];
        pw.children[0].innerHTML = "";
        pw.children[1].innerHTML = "";
    }
}


/****** Loading from URL ******************/
function pwc_urlUpdate() {
    var url = window.location.pathname + "?method=" + "pwc" + "&" + "left=" + high.toString() + "&" + "right=" + low.toString()
    history.pushState({}, 'Pairwise Comparison', url)
}

function pwc_getParametersFromURL() {
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


function pwc_getHighFromURL() {
    var selectedObjects = pwc_getParametersFromURL().left;
    
    if (selectedObjects !== undefined) {
	return selectedObjects.split(',');
    }
    return selectedObjects;
}


function pwc_getLowFromURL() {
    var selectedObjects = pwc_getParametersFromURL().right;
    
    if (selectedObjects !== undefined) {
	return selectedObjects.split(',');
    }
    return selectedObjects;
}


function pwc_populateHighBox() {
    var index = 0
    var numOfElem = 0
    var pwc_objectsFromURL = pwc_getHighFromURL();
    for (let i = 0; i < pwc_objectsFromURL.length; i++) {
	if (numOfElem > 0) {
            if (document.querySelectorAll('.low')[index + 1] === undefined) {
		handleMore()
            }
            index = index + 1
            numOfElem = 0
        }
	document.querySelector('#top').removeChild(document.getElementById(pwc_objectsFromURL[i]));
	var node = document.createElement("DIV");
	var textnode = document.createTextNode(dataset[pwc_objectsFromURL[i]].Title);
	node.appendChild(textnode);
	node.setAttribute("id", pwc_objectsFromURL[i]);
	node.setAttribute("class", "object noSelect pop");
	node.setAttribute("tabindex", "0");
	node.setAttribute("data-toggle", "popover");
	document.querySelectorAll('.high')[index].appendChild(node);
	high.push(pwc_objectsFromURL[i]);
	numOfElem = numOfElem + 1
    }
    expData.highUrlChanges = high;
    experimentr.addData(expData);
}

function pwc_populateLowBox() {
    var index = 0
    var numOfElem = 0
    var pwc_objectsFromURL = pwc_getLowFromURL();
    for (let i = 0; i < pwc_objectsFromURL.length; i++) {
	if (numOfElem > 0) {
            if (document.querySelectorAll('.low')[index + 1] === undefined) {
		handleMore();
            }
            index = index + 1;
            numOfElem = 0;
        }
	var node = document.createElement("DIV");
	var textnode = document.createTextNode(dataset[pwc_objectsFromURL[i]].Title);
	node.appendChild(textnode);
	node.setAttribute("id", pwc_objectsFromURL[i]);
	node.setAttribute("class", "object noSelect pop");
	node.setAttribute("tabindex", "0");
	node.setAttribute("data-toggle", "popover");
	document.querySelectorAll('.low')[index].appendChild(node);
	low.push(pwc_objectsFromURL[i]);
	numOfElem = numOfElem + 1;
    }
    expData.lowUrlChanges = low;
    experimentr.addData(expData);
}

