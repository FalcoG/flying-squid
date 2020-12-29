module.exports.player = async function (player, server, settings) {
  const Map = require('./Map')(settings.version)

  let lastPlayerPosition

  player.on('move', ({ position }) => {
    if (!player.loadedMap) return

    if (!player.loadedMap.shouldTrackPlayer) return // no player marker

    const shouldUpdate = lastPlayerPosition
      ? position.distanceTo(lastPlayerPosition) > 1 // update for every block moved - perhaps make this dependent of the map scale
      : true

    if (shouldUpdate) {
      const data = player.loadedMap.update({
        position
      })

      if (data) player._client.write('map', data)

      lastPlayerPosition = position
    }
  })

  let lastYawPosition = 0

  player.on('look', ({ yaw }) => {
    if (!player.loadedMap) return

    if (!player.loadedMap.shouldTrackPlayer) return // no player marker

    const singleStepSize = 360 / 16
    const yawDifference = Math.abs(yaw - lastYawPosition)

    const shouldUpdate = yawDifference > (singleStepSize / 2) // rate limiter

    if (shouldUpdate) {
      const data = player.loadedMap.update({
        yaw
      })

      if (data) player._client.write('map', data)

      lastYawPosition = yaw
    }
  })

  player._client.on('held_item_slot', async ({ slotId } = {}) => {
    const heldItem = player.inventory.slots[36 + slotId]

    if (heldItem === undefined || heldItem.name !== 'filled_map') {
      delete player.loadedMap
      return
    }

    const loadedMap = new Map(heldItem.metadata, settings.version)
    await loadedMap.load()

    player._client.write('map', loadedMap.itemPacket)

    player.loadedMap = loadedMap
  })
}
