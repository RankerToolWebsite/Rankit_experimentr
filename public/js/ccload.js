var confidence = 0;
var weights = 0;
var counter = 0;
var tooltipCounter = 0;
const pool = document.querySelector('#top');
const med = document.querySelector('#center')
const high = document.querySelector('#left')
const low = document.querySelector('#right')
var dataset = {}
var attributes = {}
var min_num_of_objects = 2;
var cc_observer;
   var min_num_of_non_empty_lists = 2

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
	    group: 'category',
	    animation: 300,
	    sort: false,
	    ghostClass: 'ghost',
	});
        
	//create sortable container for preference collection
    const high_sortable = Sortable.create(high, {
      group: 'category',
      animation: 300,
      ghostClass: 'ghost',
    })
    const med_sortable = Sortable.create(med, {
      group: 'category',
      animation: 300,
      ghostClass: 'ghost',
    })
    const low_sortable = Sortable.create(low, {
      group: 'category',
      animation: 300,
      ghostClass: 'ghost',
    })
	
	//listener for rank button
	document.querySelector('#cc-submit').addEventListener('click', handleCCSubmit);
	
    var cc_observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        cc_urlUpdate()

        var num_of_non_empty_list = document.querySelector('#center').children.length > 0 ? 1 : 0
        num_of_non_empty_list += document.querySelector('#left').children.length > 0 ? 1 : 0
        num_of_non_empty_list += document.querySelector('#right').children.length > 0 ? 1 : 0

        if (num_of_non_empty_list < min_num_of_non_empty_lists) {
          $('#cc-submit').attr('disabled', 'disabled');
        }
        else {
          $('#cc-submit').removeAttr('disabled');
          handleBuildSubmit()
        }
          barUpdate(confidence);

      var colorScheme = ["#ffffb3","#bebada","#fb8072","#80b1d3","#fdb462","#b3de69","#fccde5"];
		console.log(counter);
		if (counter == 1) {
		    d3.select("body").selectAll("svg").remove();
		    console.log(weights);
		    renderBarChart(weights,"#chart", colorScheme);
		} else if(weights != 0){
		    document.getElementById("p1").innerHTML = "Impact of Attributes on Dataset Ranking";
		    renderBarChart(weights,"#chart", colorScheme);
		}
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
	if ( cc_getParametersFromURL() !== undefined) {
	    cc_populateBox();
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
});
	
/*********************** Functions ****************************************/


function add_to_sortable(className) {
    const all = document.querySelectorAll(className)
    
    all.forEach(t => Sortable.create(t, {
	group: {
	    name: 'category',
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



function handleCCSubmit() {
      const pwl = cc_generatePairwise()
      // sendPostRequest(pwl)
      var pairwiseURL = "{{url_for('explore.explore', dataset_name = dataset_name) }}"
      for (let i = 0; i < pwl.length; i++) {
        pairwiseURL = pairwiseURL + i + "=" + pwl[i].high + ">" + pwl[i].low + "&"
      }

      window.location = pairwiseURL
    }


function handleBuildSubmit() {
    const pwl = cc_generatePairwise()
    var pairs = ""
    for (let i = 0; i < pwl.length; i++) {
    pairs = pairs + i + "=" + pwl[i].high + ">" + pwl[i].low + "&"
    }
    if (pairs !== ""){
    const url = "confidence/"+pairs
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url, true)
    xhr.setRequestHeader('Content-type', 'application/json')

    xhr.send()
    xhr.onload = function () {
        weights = JSON.parse(JSON.parse(this.response).weights)
        confidence = JSON.parse(this.response).confidence
	}
    }
}

function cc_generatePairwise() {
    const high = Array.from(document.querySelectorAll('#left .object')).map(x => x.id)
      const med = Array.from(document.querySelectorAll('#center .object')).map(x => x.id)
      const low = Array.from(document.querySelectorAll('#right .object')).map(x => x.id)
      // pairwise list to send back to server
      let pwl = []
      for (let i = 0; i < high.length; i++) {
        for (let j = 0; j < med.length; j++) {
          pwl.push({ 'high': high[i], 'low': med[j] })
        }
        for (let j = 0; j < low.length; j++) {
          pwl.push({ 'high': high[i], 'low': low[j] })
        }
      }
      for (let i = 0; i < med.length; i++) {
        for (let j = 0; j < low.length; j++) {
          pwl.push({ 'high': med[i], 'low': low[j] })
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

//Takes what is in the ranked Item box and returns their Titles in a string array
function getRankedObjects() {
    var left = Array.from(document.querySelector('#left').children).map(x => x.innerText)
    var center = Array.from(document.querySelector('#center').children).map(x => x.innerText)
    var right = Array.from(document.querySelector('#right').children).map(x => x.innerText)
    return left.concat(center).concat(right)
    }

//Takes what is in the ranked pool and returns their original ids as an integer array
function getRankedID() {
    var left = Array.from(document.querySelector('#left').children).map(x => parseInt(x.id))
    var center = Array.from(document.querySelector('#center').children).map(x => parseInt(x.id))
    var right = Array.from(document.querySelector('#right').children).map(x => parseInt(x.id))
    return left.concat(center).concat(right)
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

var filtered = [1, 2, 3, 4].filter(
  function(e) {
    return this.indexOf(e) < 0;
  },
  [2, 4]
);

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
function cc_urlUpdate() {
    const high = Array.from(document.querySelectorAll('#left .object')).map(x => x.id)
    const med = Array.from(document.querySelectorAll('#center .object')).map(x => x.id)
    const low = Array.from(document.querySelectorAll('#right .object')).map(x => x.id)
    var url = window.location.pathname + "?method=" + "cc" + "&" + "high=" + high.toString() + "&" + "medium=" + med.toString() + "&" + "low=" + low.toString()
    history.pushState({}, 'Categorical Comparison', url)
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
cc_highFromURL = cc_getHighFromURL()


function cc_getHighFromURL() {
var highObjects = cc_getParametersFromURL.high;
    if (highObjects !== undefined) {
	return highObjects.split(',');
    }
    return highObjects;
}


    var cc_highFromURL = {}
    cc_highFromURL = cc_getHighFromURL()

console.log(cc_highFromURL)
if (cc_highFromURL !== undefined) {
      cc_populateBox("#left", cc_highFromURL)
    }

function cc_populateBox(box, objectsFromURL) {
    //var lc_objectsFromURL = lc_getParametersFromURL();
    for (let i = 0; i < objectsFromURL.length; i++) {
	document.querySelector('#top').removeChild(document.getElementById(cc_objectsFromURL[i]))
	var node = document.createElement("DIV");
	var textnode = document.createTextNode(dataset[cc_objectsFromURL[i]].Title);
	node.appendChild(textnode);
	node.setAttribute("id", cc_objectsFromURL[i]);
	node.setAttribute("class", "object noSelect pop");
	node.setAttribute("tabindex", "0");
	node.setAttribute("data-toggle", "popover");
	document.querySelector(box).appendChild(node);
	handleBuildSubmit();
    }
}

