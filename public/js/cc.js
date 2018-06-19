const source = document.querySelector('#top')
const med = document.querySelector('#center')
const high = document.querySelector('#left')
const low = document.querySelector('#right')

const source_sortable = Sortable.create(source, {
  group: 'list',
  animation: 300,
  sort: false,
  ghostClass: 'ghost',
})

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
