class MapIcon {
  constructor (type = 'player', x, y, direction = 0) {
    this.data = {
      direction,
      type: MapIcon.iconsByName[type].id,
      x,
      y
    }
  }

  updateDirection (yaw) {
    this.data.direction = this.simplifyDeg(yaw)

    return this.output
  }

  updatePosition (position) {
    // failsafe min/max value - too high or too low will result in a client disconnect
    if (position.x < -128) position.x = -128
    else if (position.x > 127) position.x = 127

    if (position.z < -128) position.z = -128
    else if (position.z > 127) position.z = 127

    /**
     * The minimum value is -128
     * The maximum value is 127
     */
    this.data.x = Math.round(position.x)
    this.data.y = Math.round(position.z)

    if (this.outOfBounds) {
      this.updateIcon('player_off_map')
    } else {
      this.updateIcon('player')
    }

    return this.output
  }

  updateIcon (type) {
    this.data.type = MapIcon.iconsByName[type].id
  }

  degToSteps (degrees) {
    // convert degrees to steps so it can be used for networking
    const directionAccuracy = 360 / 16
    return Math.round(degrees / directionAccuracy)
  }

  simplifyDeg (yaw) {
    return Math.round((yaw % 360) + 360) % 360
  }

  // for older minecraft versions
  // directionAndType (direction, type) {
  //   if (typeof direction !== 'number' || typeof type !== 'number') return 0
  //
  //   return parseInt(type.toString(16) + direction.toString(16), 16)
  // }

  get output () {
    const {
      direction,
      type,
      x,
      y
    } = this.data

    // const directionAndType = this.directionAndType(this.degToSteps(direction), type)

    return {
      type,
      // directionAndType,
      x,
      y,
      direction: this.degToSteps(direction)
    }
  }

  get outOfBounds () {
    return this.data.x === 127 || this.data.x === -128 || this.data.y === 127 || this.data.y === -128
  }
}

module.exports = (version) => {
  MapIcon.serverVersion = version
  MapIcon.iconsByName = require('minecraft-data')(version).mapIconsByName

  return MapIcon
}
