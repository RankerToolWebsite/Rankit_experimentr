var confidence = 0
var weights = 0
var counter = 0
var tooltipCounter = 0

    function parseData(raw) {
      return JSON.parse(raw.substring(1, raw.length - 1))
    }
    
    function findObject (objectTitle) {
      var raw = '{{data|tojson}}'
      var data = parseData(raw)
      for (var i=0; i<data.length; i++) {
        obj = data[i]
        if (obj.Title === objectTitle) {
          return obj
        }
      }
    }

const dataset = getDataset()
const source = document.querySelector('#top')
const target = document.querySelector('#lc-center')

const source_sortable = Sortable.create(source, {
  group: 'list',
  animation: 300,
  sort: false,
  ghostClass: 'ghost',
})

const target_sortable = Sortable.create(target, {
  group: 'list',
  animation: 300,
  ghostClass: 'ghost',
})

const med = document.querySelector('#center')
const high = document.querySelector('#left')
const low = document.querySelector('#right')

const high_sortable = Sortable.create(high, {
  group: 'list',
  animation: 300,
  ghostClass: 'ghost',
})
const med_sortable = Sortable.create(med, {
  group: 'list',
  animation: 300,
  ghostClass: 'ghost',
})
const low_sortable = Sortable.create(low, {
  group: 'list',
  animation: 300,
  ghostClass: 'ghost',
})

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
add_to_sortable('.high')
add_to_sortable('.low')

function handleMore() {
  const pwl = document.querySelector('#pwl')
  const html = `<div class="pw"><div class="high list"></div><div class="low list"></div></div>`
  pwl.innerHTML += html
  add_to_sortable('.low')
}


var min_num_of_objects = 2

var lc_observer = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    lc_urlUpdate()

    const list_length = document.querySelector('#lc-center').children.length
    if (list_length < min_num_of_objects) {
      $('#lc-submit').attr('disabled', 'disabled');
    }
    else {
      $('#lc-submit').removeAttr('disabled');
      handleBuildSubmit()
    }
    barUpdate(confidence)

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

function barUpdate(list_length) {
  list_length = Math.floor(list_length)
  document.getElementById("bar").setAttribute("aria-valuenow", list_length.toString())
  document.getElementById("bar").setAttribute("style", "width:"+list_length+"%")
  document.getElementById("bar").textContent = list_length+"%"+" Confidence"
}
function lc_urlUpdate() {
  var list = Array.from(document.querySelectorAll('#lc-center .object')).map(x => nameToId(x.id))
  var url = window.location.pathname + "?method=" + "lc" + "&" + "objects="
  history.pushState({}, 'List Comparison', url + list.toString())
}
function nameToId(name) {
  if (name !== undefined) {
    var i = 0
    {% for x in dataset %}
    if ('{{ x }}' == name) {
      return i
    }
    i++
    {% endfor %}
  }
  return -1
}


// Node, config
var lc_observerConfig = {
  childList: true,
};

var lc_center_node = document.getElementById('lc-center');
lc_observer.observe(lc_center_node, lc_observerConfig);

var lc_QueryString = function () {
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
}();

function lc_getParametersFromURL() {
  var selectedObjects = lc_QueryString.objects;

  if (selectedObjects !== undefined && selectedObjects != "") {
    var objects = selectedObjects.split(',');
  }
  if (objects !== undefined) {
    // Convert ids back to names
    var objectsNames = Array.from(objects.map(x => idToName(x)))
    return objectsNames;
  }
  return objects;
}
function idToName(id) {
  var i = 0
  {% for x in dataset %}
  if (id == i) {
    return '{{ x }}'
  }
  i++
  {% endfor %}
  return id
}

var lc_objectsFromURL = {}
lc_objectsFromURL = lc_getParametersFromURL()

if (lc_objectsFromURL !== undefined) {
  lc_populateBox()
  barUpdate(confidence)
}

function lc_populateBox() {
  // id="${x}" class="object noSelect"
  for (let i = 0; i < lc_objectsFromURL.length; i++) {
    document.querySelector('#top').removeChild(document.getElementById(lc_objectsFromURL[i]))
    var node = document.createElement("DIV");
    var textnode = document.createTextNode(lc_objectsFromURL[i]);
    node.appendChild(textnode);
    node.setAttribute("id", lc_objectsFromURL[i]);
    node.setAttribute("class", "object noSelect pop");
    node.setAttribute("tabindex", "0");
    node.setAttribute("data-toggle", "popover");
    document.querySelector('#lc-center').appendChild(node);
    handleBuildSubmit()
  }
}


function getRankedObjects() {
  return Array.from(document.querySelector('#lc-center').children).map(x => x.innerText)
}

function handleLCSubmit() {
  const pwl = lc_generatePairwise()
  var pairwiseURL = "{{url_for('explore.explore', dataset_name = dataset_name) }}"
  for (let i = 0; i < pwl.length; i++) {
    pairwiseURL = pairwiseURL + i + "=" + pwl[i].high + ">" + pwl[i].low + "&"
  }

  window.location = pairwiseURL

}

function handleBuildSubmit() {
  const pwl = lc_generatePairwise()
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

document.querySelector('#lc-submit').addEventListener('click', handleLCSubmit)
