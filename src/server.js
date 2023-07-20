const express = require('express')
const imageRouter = require('./imageRouter')

const app = express()
app.use('/', express.static('httpdocs'))
app.use('/api/images', imageRouter)

app.listen(8080, 'retrogasteiz', function () {
  console.log('La aplicación está escuchando en el puerto 8080!')
})
