const fs = require('fs').promises
const path = require('path')
const Vec3 = require('vec3').Vec3
const nbt = require('prismarine-nbt')

let MapIcon

class Map {
  constructor (id) {
    this.id = id

    const width = 128 // map visual is always 128x128
    const height = 128

    this.data = {
      unlimitedTracking: 0,
      trackingPosition: 1,
      width,
      height,
      scale: 0,
      dimension: 0,
      xCenter: -512,
      zCenter: 0
    }

    // icon positioning is 256x256 with 0, 0 as center
    this.icons = {
      random1: new MapIcon('target_point', width - 1, height - 1, 135), // bottom right
      random2: new MapIcon('target_point', -(width), -(height), 315) // top left
    }

    this.setColorBuffer(Buffer.alloc(width * height))
    this.setBaseColor(28, 'normal', { x: 64, y: 64 })
  }

  setBaseColor (baseColor, shade = 'normal', location) {
    const shades = {
      normal: 2,
      light: 1,
      lighter: 0,
      lightest: 3
    }

    const mapColor = baseColor * 4 + shades[shade]

    this.setColor(mapColor, location)
  }

  setColor (mapColor, location) {
    const {
      x,
      y
    } = location

    const startLocation = (x - 1) + ((y - 1) * this.data.width)
    const endLocation = (x - 1) + ((y - 1) * this.data.width) + 1

    this.data.colors.fill(mapColor, startLocation, endLocation)
  }

  setColorBuffer (buffer) {
    this.data.colors = buffer
  }

  async load (fileName) {
    const raw = await fs.readFile(fileName || path.join(__dirname, '/test/map_0.dat'))

    const mapData = await new Promise((resolve, reject) => {
      nbt.parse(raw, (error, data) => {
        if (error) reject(error)

        const mapObject = nbt.simplify(data)
        const mapData = mapObject.data

        if (mapObject.DataVersion) {
          this.mapVersion = mapObject.DataVersion
        }

        resolve(mapData)
      })
    })

    const colors = new Uint8Array(mapData.colors)

    mapData.colors = Buffer.from(colors)

    if (mapData.trackingPosition) {
      this.icons.player = new MapIcon('player', 0, 0, 0)
    }

    this.data = mapData
  }

  get output () {
    return this.data
  }

  /**
   * Build the packet used for networking
   */
  get itemPacket () {
    const {
      width,
      height,
      scale,
      colors
    } = this.data

    /**
     * https://wiki.vg/Protocol#Map_Data
     */
    return {
      itemDamage: this.id, // map id
      scale,
      trackingPosition: true, // should be dynamic
      icons: Object.values(this.icons).map(icon => icon.output),
      columns: -(width),
      rows: -(height),
      x: 0,
      z: 0,
      length: colors.length,
      data: colors
    }
  }

  /**
   * Update interactive elements on the map
   */
  update ({
    position,
    yaw
  }) {
    if (yaw) {
      this.icons.player.updateDirection(yaw)
    } else if (position) {
      const positionRelativeToMap = this.coordsToMapPosition(position)

      this.icons.player.updatePosition(positionRelativeToMap)
    }

    return this.itemPacket
  }

  /**
   * Determine whether player must be tracked on the map
   */
  get shouldTrackPlayer () {
    return this.data.trackingPosition
  }

  /**
   * Get the map scale integer
   */
  get mapSizeScale () {
    const scales = [1, 2, 4, 8, 16]

    return scales[this.data.scale]
  }

  /**
   * Get the map size by absolute width
   */
  get mapSize () {
    return this.mapSizeScale * 128
  }

  /**
   * Get the map center world coordinates
   */
  get mapCenter () {
    const { xCenter, zCenter } = this.data
    return new Vec3(xCenter, 0, zCenter)
  }

  /**
   * Get the current map version
   */
  get mapVersion () {
    // 1343 (1.12.2) is currently the assumed version if none is supplied. This might change in the future.
    return this.currentMapVersion || 1343
  }

  set mapVersion (version) {
    this.currentMapVersion = version
  }

  /**
   * Convert world coordinates to map position
   */
  coordsToMapPosition (position) {
    const mapCenter = this.mapCenter

    const coordinatesScale = 2 / this.mapSizeScale
    return position.clone().subtract(mapCenter).scale(coordinatesScale)
  }
}

module.exports = (version) => {
  if (!version) {
    throw new Error('plugins:map - No server version has been supplied')
  }

  Map.serverVersion = version
  MapIcon = require('./MapIcon')(version)

  return Map
}
