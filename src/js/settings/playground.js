export default {
  day: {
    state: true,
    switchDuration: .5
  },
  skybox: {
    day: `#69CEEC`,
    night: `#1B3569`
  },
  ground: {
    color: `#81DD7A`,
    size: {
      w: 500,
      h: 500,
      segments: 1
    }
  },
  arena: {
    color: `#A2A4A1`,
    size: {
      // width is based on total chickens
      h: 10,
      depth: 1
    }
  }
};
