const { Model, DataTypes, Sequelize, Op } = require('sequelize')

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'src/db.sqlite',
})

class ImageMetadata extends Model {
  static _formatImageModel(imageModel) {
    const image = imageModel.toJSON()

    image.id = image.raw_name
    image.title = image.PictureRecord.title
    image.caption = image.PictureRecord.description
    image.license = image.PictureRecord.license

    const split_permalink = image.PictureRecord.permalink.split('/')
    image.permalink = split_permalink[split_permalink.length - 1]
    delete image.PictureRecord
    delete image.raw_name
    return image
  }

  static async search(searchText, offset = 0, limit = 25) {
    const imageModels = await this.findAll({
      attributes: ['raw_name', 'id'],
      include: [
        {
          model: PictureRecord,
          as: 'PictureRecord',
          attributes: [
            ['title', 'title'],
            ['description', 'caption'],
            ['permalink', 'permalink'],
            ['license', 'license'],
            ['permalink', 'permalink'],
          ],
          required: true,
          where: {
            [Op.or]: [
              { title: { [Op.like]: `%${searchText}%` } },
              { description: { [Op.like]: `%${searchText}%` } },
            ],
          },
        },
      ],
      offset: offset,
      limit: limit,
    })

    return imageModels.map(ImageMetadata._formatImageModel)
  }

  static async getImage(id) {
    let page = 1
    const pageSize = 25

    const imageModel = await this.findOne({
      where: { raw_name: id },
      attributes: ['id', 'raw_name'],
      include: [
        {
          model: PictureRecord,
          as: 'PictureRecord',
          attributes: ['title', 'description', 'permalink', 'license'],
          required: true,
        },
      ],
    })

    const imageIndex = imageModel.id
    if (imageIndex) {
      page = Math.ceil(imageIndex / pageSize)
    }

    if (!imageModel) {
      return []
    }

    return { page: page, image: ImageMetadata._formatImageModel(imageModel) }
  }

  static async getImages(offset = 0, limit = 25) {
    const imageModels = await this.findAll({
      attributes: ['id', 'raw_name'],
      include: [
        {
          model: PictureRecord,
          as: 'PictureRecord',
          attributes: ['title', 'description', 'permalink', 'license'],
          required: true,
        },
      ],
      offset: offset,
      limit: limit,
    })

    return imageModels.map(ImageMetadata._formatImageModel)
  }
}

ImageMetadata.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    picture_record_id: { type: DataTypes.INTEGER },
    webp_hash: { type: DataTypes.STRING },
    width: { type: DataTypes.INTEGER, defaultValue: 0 },
    height: { type: DataTypes.INTEGER, defaultValue: 0 },
    raw_url: { type: DataTypes.STRING },
    raw_name: { type: DataTypes.STRING },
    webp_url: { type: DataTypes.STRING, allowNull: true },
    jpg_url: { type: DataTypes.STRING },
    vision_rekognition_url: { type: DataTypes.STRING },
    is_bn: { type: DataTypes.BOOLEAN, defaultValue: false },
    need_to_be_rotated: { type: DataTypes.BOOLEAN, defaultValue: false },
    rotated: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    sequelize,
    modelName: 'ImageMetadata',
    tableName: 'image_metadata',
    timestamps: false,
  }
)

class PictureRecord extends Model {
  static async getSearchIndex() {
    const pictureRecords = await this.findAll({
      attributes: ['title', 'description'],
    })

    let index = new Set()

    pictureRecords.forEach((record) => {
      let words = (record.title || '')
        .split(' ')
        .concat((record.caption || '').split(' '))
      words.forEach((word) => {
        let cleanedWord = word.replace(/[^a-zA-Z0-9]/g, '')
        if (cleanedWord !== '') {
          index.add(
            cleanedWord.charAt(0).toUpperCase() +
              cleanedWord.slice(1).toLowerCase()
          )
        }
      })
    })

    return Array.from(index)
  }
}

PictureRecord.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    unique_id: { type: DataTypes.STRING },
    description: { type: DataTypes.STRING },
    title: { type: DataTypes.STRING },
    datestamp: { type: DataTypes.DATEONLY, allowNull: true },
    raw_datestamp: { type: DataTypes.STRING },
    license: { type: DataTypes.STRING },
    permalink: { type: DataTypes.STRING },
  },
  {
    sequelize,
    modelName: 'PictureRecord',
    tableName: 'picture_record',
    timestamps: false,
  }
)

// Asociaciones
PictureRecord.hasOne(ImageMetadata, { foreignKey: 'picture_record_id' })
ImageMetadata.belongsTo(PictureRecord, { foreignKey: 'picture_record_id' })

module.exports = { sequelize, ImageMetadata, PictureRecord }
