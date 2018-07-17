var confidence = 0;
var weights = 0;
var counter = 0;
var tooltipCounter = 0;
var pool = document.querySelector('#top');
//const target = document.querySelector('#lc-center');
var dataset = {}
var attributes = {}
var min_num_of_objects = 2;
var pwc_observer;

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
	
    add_to_sortable('.high')
    add_to_sortable('.low')

	
	//listener for rank button
	document.querySelector('#submit').addEventListener('click', handleBuildSubmit);
	
	var pwc_observer = new MutationObserver(function (mutations) {
	    mutations.forEach(function (mutation) {
        pwc_urlUpdate()

        const high_length = document.querySelectorAll('.high > div').length
        const low_length = document.querySelectorAll('.low > div').length

        const list_num = (high_length > 0 ? 1 : 0) + (low_length > 0 ? 1 : 0)

        if ((high_length != low_length) || (list_num < min_num_of_objects)) {
          $('#submit').attr('disabled', 'disabled');
        }
        else {
          $('#submit').removeAttr('disabled');
          handleBuildSubmit()
        }
		//barUpdate(confidence);
		
		var colorScheme = ["#ffffb3","#bebada","#fb8072","#80b1d3","#fdb462","#b3de69","#fccde5"];
		console.log(counter);
		if (counter == 1) {
		    d3.select("body").selectAll("svg").remove();
		    console.log(weights);
		    renderBarChart(weights,"#chart", colorScheme);
		} 
            //shows barchart in top right corner
           /* else if(weights != 0){
		    document.getElementById("p1").innerHTML = "Impact of Attributes on Dataset Ranking";
		    renderBarChart(weights,"#chart", colorScheme);
		} */
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
	if ( pwc_getParametersFromURL() !== undefined) {
	    pwc_populateHighBox();
        pwc_populateLowBox();
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



function handlePWCSubmit() {
    const pwl = pwc_generatePairwise()
    var pairwiseURL = "{{url_for('explore.explore', dataset_name = dataset_name) }}"
    for (let i = 0; i < pwl.length; i++) {
	pairwiseURL = pairwiseURL + i + "=" + pwl[i].high + ">" + pwl[i].low + "&"
    }    
    window.location = pairwiseURL
}

function handleBuildSubmit() {
    const pwl = pwc_generatePairwise()
    var pairs = ""
    for (let i = 0; i < pwl.length; i++) {
	pairs = pairs + i + "=" + pwl[i].high + ">" + pwl[i].low + "&"
    }
    if (pairs !== ""){
	const url = "build/"+pairs
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

function pwc_generatePairwise() {
    const list = Array.from(document.querySelectorAll('#pwl .object'))
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

   function handleMore() {
      const pwl = document.querySelector('#pwl')
      // const html = `<div class="pw"><div class="high list"></div><div class="low list"></div></div>`
      const html = `<div class="pwx"><div class="pw"><div class="high list"></div><div class="low list"></div></div><div class="x" onclick="clearPW(event)"><i class="fas fa-times"></i></div></div>`
      pwl.innerHTML += html
        add_to_sortable('.high')
        add_to_sortable('.low')
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
      const high = Array.from(document.querySelectorAll('.high > div')).map(x => x.id)
      const low = Array.from(document.querySelectorAll('.low > div')).map(x => x.id)
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
        }document.querySelector('#top').removeChild(document.getElementById(pwc_objectsFromURL[i]))
	var node = document.createElement("DIV");
	var textnode = document.createTextNode(dataset[pwc_objectsFromURL[i]].Title);
	node.appendChild(textnode);
	node.setAttribute("id", pwc_objectsFromURL[i]);
	node.setAttribute("class", "object noSelect pop");
	node.setAttribute("tabindex", "0");
	node.setAttribute("data-toggle", "popover");
	document.querySelectorAll('.high')[index].appendChild(node);
    numOfElem = numOfElem + 1
	handleBuildSubmit();
    }
}
     
    function pwc_populateLowBox() {
    var index = 0
    var numOfElem = 0
    var pwc_objectsFromURL = pwc_getLowFromURL();
    for (let i = 0; i < pwc_objectsFromURL.length; i++) {
	if (numOfElem > 0) {
          if (document.querySelectorAll('.low')[index + 1] === undefined) {
            handleMore()
          }
          index = index + 1
          numOfElem = 0
        }//document.querySelector('#top').removeChild(document.getElementById(pwc_objectsFromURL[i]))
	var node = document.createElement("DIV");
	var textnode = document.createTextNode(dataset[pwc_objectsFromURL[i]].Title);
	node.appendChild(textnode);
	node.setAttribute("id", pwc_objectsFromURL[i]);
	node.setAttribute("class", "object noSelect pop");
	node.setAttribute("tabindex", "0");
	node.setAttribute("data-toggle", "popover");
	document.querySelectorAll('.low')[index].appendChild(node);
    numOfElem = numOfElem + 1
	handleBuildSubmit();
    }
}
