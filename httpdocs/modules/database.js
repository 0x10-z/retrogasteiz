import { normalize } from './retrosantander.js'
import { labels } from '../modules/labels.js'
import apiService from '../modules/apiService.mock.js' // Asegúrate de que esta ruta es correcta

// Umbral de confianza en la visión artificial.
// Los objetos detectados por debajo de éste umbral serán ignorados.
const confidenceThreshold = 80

// Cuántas sugerencias de búsqueda mostrar al buscar.
const maxSuggestions = 100

// El CDIS a veces encierra los títulos de las imágenes entre corchetes,
// entre comillas… Aquí tratamos de revertir los casos más habituales.
const prettify = (title) => {
  let string = title.trim()

  let [first, last] = [string[0], string[string.length - 1]]

  const period = last === '.' && string.slice(0, -1).indexOf('.') === -1
  if (period) {
    string = string.slice(0, -1)
    first = string[0]
    last = string[string.length - 1]
  }

  const betweenBrackets = first === '[' && last === ']'
  const betweenQuotationMarks =
    first === '"' && last === '"' && string.slice(1, -1).indexOf('"') === -1

  return betweenBrackets || betweenQuotationMarks ? string.slice(1, -1) : string
}

const database = {
  records: [],

  // Carga en `this.records` el fichero JSON con los datos.
  load: async (page) => {
    const images = await apiService.fetchImages(page + 1)
    const newRecords = images.map((item) => ({
      ...item,
      title: prettify(item.title),
    }))

    database.records.push(...newRecords)
    return newRecords
  },

  // Retorna el número de registros en la base de datos.
  count: async () => {
    return await apiService.fetchImagesCount()
  },

  // Devuelve el registro de una imagen a partir de su `id`.
  find: async (id) => {
    const record = await database.records.find((item) => item.id === id)
    if (record) {
      return record
    } else {
      // Hay que buscarlo en la base de datos
      const { page, image } = await apiService.fetchImageById(id)
      if (image) {
        record['title'] = prettify(record.title)
        database.records.push(record)
        return record
      } else {
        return null
      }
    }
  },

  // Devuelve un registro en particular a partir de su `id` y varias imágenes más.
  firstAndSome: async (id) => {
    let foundRecord = null
    let moreImages = []
    foundRecord = await database.records.find((item) => item.id === id)
    if (foundRecord === null || foundRecord === undefined) {
      // Hay que buscarlo en la base de datos
      const { page, image } = await apiService.fetchImageById(id)
      moreImages = await apiService.fetchImages(page)
      foundRecord = image
      if (foundRecord) {
        foundRecord['title'] = prettify(foundRecord.title)
      } else {
        return null
      }
    }

    database.records = [foundRecord, ...moreImages]
    return database.records
  },

  // Cursa una búsqueda en la base de datos y devuelve los resultados de la misma
  // y las sugerencias de búsqueda para el término empleado.
  search: async (string) => {
    const query = normalize(string)

    if (!query.length) {
      const results = database.records
      const suggestions = []
      return { results, suggestions }
    }

    const { results, suggestions } = await apiService.searchImages(query)

    results.forEach((result) => {
      // Comprobar si el resultado ya está en database.records para evitar duplicados
      if (!database.records.find((record) => record.id === result.id)) {
        result['title'] = result.title
        database.records.push(result)
      }
    })

    return { results, suggestions }
  },

  // Carga e interpreta un fichero JSON con los datos de visión artificial
  // de una imagen.
  async parse(url) {
    try {
      const response = await fetch(url)
      const json = await response.json()
      const gender = (value) =>
        ({
          Male: 'Hombre',
          Female: 'Mujer',
        }[value])

      const faces = json.FaceDetails.filter(
        (face) => face.Confidence >= confidenceThreshold
      ).map((face, i) => ({
        type: 'face',
        id: `face-${i}`,
        name: `${gender(face.Gender.Value)} ${i + 1}`,
        title: [
          `${gender(face.Gender.Value)} nº ${i + 1},`,
          `de entre ${face.AgeRange.Low} y ${face.AgeRange.High} años`,
        ].join(' '),
        top: face.BoundingBox.Top,
        left: face.BoundingBox.Left,
        width: face.BoundingBox.Width,
        height: face.BoundingBox.Height,
        confidence: face.Confidence,
        age: `Entre ${face.AgeRange.Low} y ${face.AgeRange.High} años`,
        emotions: face.Emotions.map((emotion) => ({
          confidence: emotion.Confidence,
          name: {
            CALM: 'Tranquilo',
            SURPRISED: 'Sorprendido',
            FEAR: 'Asustado',
            SAD: 'Triste',
            DISGUSTED: 'Disgustado',
            CONFUSED: 'Confundido',
            HAPPY: 'Contento',
            ANGRY: 'Enfadado',
          }[emotion.Type],
        })).filter((emotion) => emotion.confidence > confidenceThreshold),
        ...(face.Gender.Confidence > confidenceThreshold && {
          gender: gender(face.Gender.Value),
        }),
        ...(face.Beard.Confidence > confidenceThreshold && {
          beard: face.Beard.Value,
        }),
        ...(face.Eyeglasses.Confidence > confidenceThreshold && {
          glasses: face.Eyeglasses.Value,
        }),
        ...(face.EyesOpen.Confidence > confidenceThreshold && {
          eyes: face.EyesOpen.Value,
        }),
        ...(face.MouthOpen.Confidence > confidenceThreshold && {
          mouth: face.MouthOpen.Value,
        }),
        ...(face.Mustache.Confidence > confidenceThreshold && {
          mustache: face.Mustache.Value,
        }),
        ...(face.Smile.Confidence > confidenceThreshold && {
          smile: face.Smile.Value,
        }),
        ...(face.Sunglasses.Confidence > confidenceThreshold && {
          sunglasses: face.Sunglasses.Value,
        }),
      }))

      const objects = json.Labels.filter(
        (object) => object.Instances.length
      ).reduce(
        (accumulator, object) => [
          ...accumulator,
          ...object.Instances.filter(
            (instance) => instance.Confidence >= confidenceThreshold
          ).map((instance, i) => ({
            type: 'object',
            id: `object-${accumulator.length + i}`,
            name: `${labels[object.Name]} ${i + 1}`,
            title: labels[object.Name],
            label: object.Name,
            confidence: instance.Confidence,
            top: instance.BoundingBox.Top,
            left: instance.BoundingBox.Left,
            width: instance.BoundingBox.Width,
            height: instance.BoundingBox.Height,
          })),
        ],
        []
      )

      const tags = json.Labels.filter((label) => !label.Instances.length)
        .filter((label) => label.Confidence > confidenceThreshold)
        .map((label) => ({
          name: labels[label.Name],
          label: label.Name,
          confidence: label.Confidence,
        }))

      const areas = [...faces, ...objects].map((area) => ({
        id: area.id,
        title: area.title,
        type: area.type,
        confidence: area.confidence,
        top: 100 * area.top,
        left: 100 * area.left,
        width: 100 * area.width,
        height: 100 * area.height,
        area: 10000 * area.width * area.height,
      }))

      return { faces, objects, tags, areas }
    } catch (error) {
      return { faces: [], objects: [], tags: [], areas: [] }
    }
  },
}

export { database }
