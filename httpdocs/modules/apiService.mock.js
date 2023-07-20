const DEBUG_JSON_FILE = '/retrogasteiz/arabaartxiboa_1_debug.json'

const apiService = {
  fetchImages: async (page = 1) => {
    try {
      const response = await fetch(DEBUG_JSON_FILE)
      const data = await response.json()
      const pageSize = 25
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      const images = data.slice(startIndex, endIndex)
      return images
    } catch (error) {
      console.error('Error al recuperar las imágenes:', error)
      return []
    }
  },

  fetchImageById: async (id) => {
    try {
      const pageSize = 25
      const response = await fetch(DEBUG_JSON_FILE)
      const data = await response.json()
      const image = data.find((item) => item.id === id)

      let page = 1
      if (image) {
        const imageIndex = data.findIndex((item) => item.id === id)
        page = Math.ceil((imageIndex + 1) / pageSize) - 1 // Image 10 is page 0, image 25 is page 1 and so on.
      }

      return { page: page, image: image }
    } catch (error) {
      console.error(`Error al recuperar la imagen con ID ${id}:`, error)
      return []
    }
  },

  fetchImagesCount: async () => {
    try {
      const response = await fetch(DEBUG_JSON_FILE)
      const data = await response.json()
      const count = data.length
      return count
    } catch (error) {
      console.error('Error al recuperar el recuento de imágenes:', error)
      return 0
    }
  },

  searchImages: async (text, page = 1) => {
    try {
      if (text !== '') {
        const response = await fetch(DEBUG_JSON_FILE)
        const data = await response.json()
        // Simulate searching based on text
        const results = data.filter((item) =>
          item.title.toLowerCase().includes(text.toLowerCase())
        )

        return { results, suggestions: [] }
      } else {
        return { results: [], suggestions: [] }
      }
    } catch (error) {
      console.error(`Error al buscar imágenes con el texto "${text}":`, error)
      return { results: [], suggestions: [] }
    }
  },
}

export default apiService
