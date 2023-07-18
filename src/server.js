const express = require('express')
const { ImageMetadata, PictureRecord } = require('./models')

const app = express()
app.use('/', express.static('httpdocs'))

let wordIndex = null

async function generateWordIndex() {
  wordIndex = await PictureRecord.getSearchIndex()
}

generateWordIndex()

const getPagination = (req, defaultPage = 1, defaultLimit = 25) => {
  const page = Number(req.query.page) || defaultPage
  const limit = defaultLimit
  const offset = (page - 1) * limit

  return { offset, limit }
}

// Endpoints
app.get('/api/images/search/:text', async (req, res) => {
  const { offset, limit } = getPagination(req)
  const images = await ImageMetadata.search(req.params.text, offset, limit)
  const searchedIndex = wordIndex.filter((word) =>
    word.toLowerCase().startsWith(req.params.text.toLowerCase())
  )
  res.json({ results: images, suggestions: searchedIndex })
})

app.get('/api/images/count', async (_, res) => {
  const count = await ImageMetadata.count()
  res.json(count)
})

app.get('/api/images/:id', async (req, res) => {
  const image = await ImageMetadata.getImage(req.params.id)
  res.json(image)
})

app.get('/api/images', async (req, res) => {
  const { offset, limit } = getPagination(req)
  const images = await ImageMetadata.getImages(offset, limit)
  res.json(images)
})

app.listen(8080, 'retrogasteiz', function () {
  console.log('La aplicación está escuchando en el puerto 8080!')
})
