const source = document.querySelector('#top')
const high = document.querySelector('.high')
const low = document.querySelector('.low')

const source_sortable = Sortable.create(source, {
  group: {
    name: 'list',
    pull: 'clone',
    revertClone: 'true',
  },
  onAdd: function(evt){
    evt.item.parentNode.removeChild(evt.item)
  },
  animation: 100,
  sort: false,
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

// const high_sortable = Sortable.create(high, {
//   group: {
//     name: 'list',
//     put: (to) => to.el.children.length < 1,
//   },
//   animation: 100,
// })

// const low_sortable = Sortable.create(low, {
//   group: {
//     name: 'list',
//     put: (to) => to.el.children.length < 1,
//   },
//   animation: 100,
// })

function handleMore() {
  const pwl = document.querySelector('#pwl')
  const html = `<div class="pw"><div class="high"></div><div class="low"></div></div>`
  pwl.innerHTML += html
  // const highs = document.querySelectorAll('.high')
  // const high = highs[highs.length-1]
  add_to_sortable('.high')
  add_to_sortable('.low')
}
