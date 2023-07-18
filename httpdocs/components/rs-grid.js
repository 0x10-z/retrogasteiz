import { app, database, escape } from '../modules/retrosantander.js'
import History from '../modules/history.js'
import './rs-image.js'

const component = 'rs-grid'
const template = document.createElement('template')

template.innerHTML = `
  <style>
    main {
      position: relative;
      top: calc(var(--header-height) + var(--gap));
      width: 100%;
      transition: transform 750ms ease;
    }

    main rs-image {
      position: absolute;
      display: block;
      width: 25%;
      transition: opacity ease-out 150ms, transform ease-out 350ms 350ms;
    }

    main rs-image:not(.selected):hover {
      transform: scale(1.025);
      transition: transform ease-out 150ms;
    }

    main rs-image.hidden {
      opacity: 0;
      pointer-events: none;
    }

    hr {
      position: absolute;
      left: 0;
      width: 100%;
      height: 1px;
      border: none;
    }

    @media (max-width: 1280px) {
      main rs-image {
        width: calc(100% / 3);
      }
    }

    @media (max-width: 768px) {
      main rs-image {
        width: 50%;
      }
    }

    @media (max-width: 640px) {
      main rs-image {
        width: 100%;
      }
    }

  </style>
  <main></main>
  <hr/>
  `

customElements.define(
  component,

  class extends HTMLElement {
    container
    pending = 0
    ready = false
    itemsPerPage = 25
    frequency = 150
    page = 1
    scale = 1
    padding

    constructor() {
      super()
      const root = this.attachShadow({ mode: 'open' })
      root.append(template.content.cloneNode(true))
    }

    connectedCallback() {
      this.container = this.shadowRoot.querySelector('main')
      this.hr = this.shadowRoot.querySelector('hr')

      const observer = new IntersectionObserver(this.onIntersect.bind(this), {
        rootMargin: '0px',
        threshold: 0,
      })

      observer.observe(this.hr)

      this.container.addEventListener('mouseover', async (event) => {
        const id = event.target.getAttribute('id')
        app.title = id ? (await database.find(id)).title : ''
      })

      this.container.addEventListener('click', async (event) => {
        const id = event.target.getAttribute('id')
        if (!id) {
          return
        }

        const image = event.target

        const selected = this.container.querySelector('rs-image.selected')
        selected && (selected.areas = false)

        this.zoom(image)

        if (selected) {
          return
        }

        image.classList.add('selected')

        const url = app.project.details(id)
        const { areas, faces, objects, tags } = await database.parse(url)

        const details = await database.find(id)

        image.areas = areas
        app.panel = { details, faces, objects, tags }
        app.history.addParam(History.I, id)
      })

      document.addEventListener('keyup', (event) => {
        event.key === 'Escape' && this.restore()
      })

      window.addEventListener('resize', this.arrange.bind(this))

      this.container.addEventListener(
        'wheel',
        (event) => {
          app.history.removeParam(History.I)
          this.restore()
        },
        { passive: true }
      )
    }

    onIntersect(intersections) {
      const intersection = intersections[0]
      if (!this.ready || !intersection.isIntersecting || this.pending) {
        return
      }

      this.append(++this.page)
    }

    async append(page = 0) {
      this.ready = false
      this.page = page
      if (page > 0) {
        //history.pushState(null, null, `/?p=${page}`)
        app.history.addParam(History.P, page)
      }

      if (!page) {
        this.clear()
      }

      //const start = page * this.itemsPerPage
      //const end = (1 + page) * this.itemsPerPage
      //const newImages = app.results.slice(start, end).map((result) => result.id)

      const response = await database.load(page)
      const newImages = response.map((result) => result.id)

      if (!newImages.length) {
        return
      }

      newImages.forEach((id) => {
        const rsImage = document.createElement('rs-image')
        rsImage.setAttribute('id', id)
        rsImage.setAttribute('label-id', 'label-' + id)
        rsImage.classList.add('hidden')

        rsImage.addEventListener('rsImageLoaded', async (event) => {
          const details = await database.find(event.detail.id)
          const image = rsImage.shadowRoot.querySelector('img')
          image.setAttribute('alt', escape(details.title))
        })

        this.container.appendChild(rsImage)
      })

      const interval = setInterval(() => {
        this.pending = [...this.container.querySelectorAll('rs-image')].filter(
          (image) => !image.complete
        ).length

        app.loading = 1 - this.pending / newImages.length

        if (!this.pending) {
          clearInterval(interval)
          this.arrange()
        }
      }, this.frequency)
    }

    arrange() {
      const style = getComputedStyle(this.container)

      const gap = parseFloat(style.getPropertyValue('--gap').match(/\d+/)[0])

      const headerHeight = parseFloat(
        style.getPropertyValue('--header-height').match(/\d+/)[0]
      )

      const detailsWidth =
        parseFloat(
          style.getPropertyValue('--panel-width').match(/\d+px/)?.[0]
        ) || 0

      const top = headerHeight + gap
      const left = detailsWidth + gap
      const right = gap
      const bottom = gap

      this.padding = { top, right, bottom, left }

      const images = [...this.container.querySelectorAll('rs-image')]

      if (!images.length) {
        return
      }

      images.forEach((image) => {
        delete image.dataset.top
        image.style = ''
      })

      const columns = Math.round(
        this.container.offsetWidth / images[0].offsetWidth
      )

      if (this.columns !== columns) {
        images.forEach((image) => delete image.dataset.column)
      }

      this.columns = columns

      const width = (this.container.offsetWidth - gap * (columns - 1)) / columns

      images
        .filter((image) => !image.dataset.top)
        .forEach((image, i) => {
          const heights = images
            .filter((image) => image.dataset.top)
            .reduce((array, current) => {
              array[current.dataset.column] = Math.max(
                array[current.dataset.column],
                Number(current.dataset.top) +
                  current.getBoundingClientRect().height +
                  gap
              )
              return array
            }, Array(columns).fill(0))

          const shortestColumn = heights.indexOf(Math.min(...heights))
          const column =
            image.dataset.column ?? (i < columns ? i % columns : shortestColumn)

          const top = heights[column]
          const left = column * (gap + width)

          image.dataset.column = column
          image.dataset.top = top

          image.style.top = `${top}px`
          image.style.left = `${left}px`
          image.style.width = `${width}px`

          image.classList.remove('hidden')
        })

      const offset = this.container.getBoundingClientRect().top
      const bottommost = images
        .map((image) => image.getBoundingClientRect().bottom - offset)
        .reduce((max, current) => (max = Math.max(max, current)), 0)

      this.container.style.height = `${bottommost + gap}px`
      this.hr.style.top = `${bottommost + gap}px`

      this.ready = true
    }

    clear() {
      this.container.innerHTML = ''
      this.container.style.height = 0
      this.hr.style.top = ''
    }

    magnify(area = { width: 1, height: 1 }, scale) {
      const padding = this.padding

      const centerX =
        (window.innerWidth - padding.left - padding.right) / 2 + padding.left
      const centerY =
        (window.innerHeight - padding.top - padding.bottom) / 2 + padding.top

      const x = centerX - (area.x + area.width / 2)
      const y = centerY - (area.y + area.height / 2)

      const containerBounds = this.container.getBoundingClientRect()

      const originX = area.x - containerBounds.x + area.width / 2
      const originY = area.y - containerBounds.y + area.height / 2

      this.container.style.transformOrigin = `${originX}px ${originY}px`
      this.container.style.transform = `translate(${x}px, ${y}px) scale(${scale})`

      this.scale = scale
    }

    zoom(element) {
      if (this.selected) {
        //history.pushState(null, null, `/`)
        app.history.removeParam(History.I)
        app.history.removeParam(History.Q)
        this.restore()
        return
      }

      const bounds = element.getBoundingClientRect()
      const { innerWidth, innerHeight } = window

      const padding = this.padding
      const viewportWidth = innerWidth - padding.left - padding.right
      const viewportHeight = innerHeight - padding.top - padding.bottom

      const width = bounds.width
      const height = bounds.height

      const scale = Math.max(
        Math.min(viewportWidth / width, viewportHeight / height),
        1
      )

      const x = bounds.left
      const y = bounds.top

      const area = { element, x, y, width, height }
      this.magnify(area, scale)
    }

    restore() {
      this.container.style.transform = ''
      this.scale = 1
      app.panel = false
      ;[...this.container.querySelectorAll('rs-image')].forEach((image) => {
        image.classList.remove('selected')
        image.areas = false
      })
    }

    get selected() {
      return this.container.querySelector('rs-image.selected')
    }

    get activeLayer() {
      const image = this.container.querySelector('rs-image.selected')
      return image.activeLayer
    }

    set activeLayer(id) {
      const image = this.container.querySelector('rs-image.selected')

      if (!image) {
        return
      }

      image.activeLayer = id
    }
  }
)
