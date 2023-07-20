const express = require('express')
const { ImageMetadata, PictureRecord } = require('./models')
const router = express.Router()

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

router.get('/search/:text', async (req, res) => {
  const { offset, limit } = getPagination(req)
  const images = await ImageMetadata.search(req.params.text, offset, limit)
  const searchedIndex = wordIndex.filter((word) =>
    word.toLowerCase().startsWith(req.params.text.toLowerCase())
  )
  res.json({ results: images, suggestions: searchedIndex })
})

router.get('/count', async (_, res) => {
  const count = await ImageMetadata.count()
  res.json(count)
})

router.get('/:id', async (req, res) => {
  const { page, image } = await ImageMetadata.getImage(req.params.id)
  res.json({ page: page, image: image })
})

router.get('/', async (req, res) => {
  const { offset, limit } = getPagination(req)
  const images = await ImageMetadata.getImages(offset, limit)
  res.json(images)
})

module.exports = router
