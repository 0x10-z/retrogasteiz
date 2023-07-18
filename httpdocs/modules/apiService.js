const API_BASE_URL = 'http://retrogasteiz:8080/api'

const apiService = {
  fetchImages: async (page = 1) => {
    try {
      const response = await fetch(`${API_BASE_URL}/images?page=${page}`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error al recuperar las imágenes:', error)
      return []
    }
  },

  fetchImageById: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/images/${id}`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error(`Error al recuperar la imagen con el id ${id}:`, error)
      return []
    }
  },

  fetchImagesCount: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/images/count`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error al recuperar el recuento de imágenes:', error)
      return 0
    }
  },

  searchImages: async (text, page = 1) => {
    try {
      if (text != '') {
        const encodedText = encodeURIComponent(text)
        const url = `${API_BASE_URL}/images/search/${encodedText}?page=${page}`
        const response = await fetch(url)
        const data = await response.json()
        return data
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
