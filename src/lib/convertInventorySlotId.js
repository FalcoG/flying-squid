module.exports = { fromNBT, toNBT };

const replace = {
  "100": 8, "101": 7, "102": 6, "103": 5, "-106": 45
}

function fromNBT(slotId) {
  let slot;
  if (slotId >= 0 && slotId < 9) {
    slot = 36 + slotId
  }
  return replace[String(slotId)] || slot;
}

function toNBT(slotId) {
  let slot;
  const invertReplace = Object.assign({}, ...Object.entries(replace).map(([a, b]) => ({ [b]: a })));
  if (slotId >= 36 && slotId < 44) {
    slot = slotId - 36
  }
  return invertReplace[String(slotId)] || slot;
}