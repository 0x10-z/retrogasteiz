const component = 'rs-license-cc-by-nc-sa'
const template = document.createElement('template')

template.innerHTML = `
  <style>
    p {
      font-size: 16px;
    }

    p a {
      color: inherit;
      text-decoration: underline;
      text-decoration-style: dotted;
      text-decoration-thickness: 2px;
    }

    p a:hover {
      text-decoration-style: solid;
    }
  </style>
  <p>
    Con licencia <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es" target="_blank">CC BY-NC-SA 4.0</a>.
  </p>
`

customElements.define(
  component,

  class extends HTMLElement {
    constructor() {
      super()
      const root = this.attachShadow({ mode: 'open' })
      root.append(template.content.cloneNode(true))
    }
  }
)
