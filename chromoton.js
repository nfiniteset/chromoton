window.chromoton = (function () {
  var el
  var PRIME_INC = 457
  var NEIGHBOR_SEQUENCE = [
    [-1, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, 0],
    [-1, 0],
  ]
  var NUMBER_OF_GENES = 24
  var MAX_MATES = 3 // maximum number of times a chromoton can breed
  var MUTATION_RATE = 0.002 // likelyhood that a mutation will occur
  var xDim = 240 // dimensions of arrays in x direction
  var yDim = 1 // dimensions of arrays in y direction

  var population = []
  var populationNext = []
  var targetColors = [] // array of target colors
  var rafId
  var lastStepTime = 0
  var imageData

  // Decode chromosome into RGB + deviance, mutating the chromoton in-place.
  function applyChromosome(c) {
    c.red = 0
    c.green = 0
    c.blue = 0
    var chromosome = c.chromosome
    for (var i = 0; i < NUMBER_OF_GENES; i++) {
      var gene = chromosome[i] & 0x1f
      var colorVal = gene >> 3
      var multiplier = gene & 0x7
      switch (colorVal) {
        case 1: // red
          c.red += 1 << multiplier
          break
        case 2: // green
          c.green += 1 << multiplier
          break
        case 3: // blue
          c.blue += 1 << multiplier
          break
      }
    }
    if (c.red > 255) c.red = 255
    if (c.green > 255) c.green = 255
    if (c.blue > 255) c.blue = 255

    // Calculate deviance against all target colors and use the minimum
    c.deviance = Infinity
    for (var i = 0; i < targetColors.length; i++) {
      var target = targetColors[i]
      var deviation =
        Math.abs(c.red - target.red) +
        Math.abs(c.green - target.green) +
        Math.abs(c.blue - target.blue)

      if (deviation < c.deviance) {
        c.deviance = deviation
      }
    }
    c.breedTimes = 0
  }

  // Allocate a new chromoton object with a Uint8Array chromosome.
  function makeChromoton(srcChromosome) {
    var c = {
      chromosome: new Uint8Array(NUMBER_OF_GENES),
      red: 0,
      green: 0,
      blue: 0,
      deviance: 0,
      breedTimes: 0,
      parentX: -1,
      parentY: -1,
    }
    for (var i = 0; i < NUMBER_OF_GENES; i++) c.chromosome[i] = srcChromosome[i]
    applyChromosome(c)
    return c
  }

  // Write offspring of mother+father into an existing chromoton object (no allocation).
  function breedInto(child, mother, father) {
    var chromosome = child.chromosome
    var mc = mother.chromosome
    var fc = father.chromosome
    for (var i = 0; i < NUMBER_OF_GENES; i++) {
      var mask = (256 * Math.random()) | 0
      chromosome[i] = (mc[i] & mask) | (fc[i] & ~mask)
    }
    // determine if a mutation should occur
    if (Math.random() < MUTATION_RATE) {
      i = (Math.random() * NUMBER_OF_GENES) | 0
      // mutate a single bit
      chromosome[i] ^= 1 << ((Math.random() * 7) | 0)
    }
    applyChromosome(child)
  }

  // Copy source's chromosome into child and recalculate (picks up target color changes).
  function cloneInto(child, source) {
    var sc = source.chromosome
    var cc = child.chromosome
    for (var i = 0; i < NUMBER_OF_GENES; i++) cc[i] = sc[i]
    applyChromosome(child)
  }

  // Render one pixel per cell into a reused ImageData buffer. CSS width:100% scales
  // the canvas to fit the container, so the cell count drives resolution, not pixel size.
  function render(population) {
    var canvas = el.getElementsByClassName('chromotons')[0]
    var ctx = canvas.getContext('2d')
    if (!imageData) {
      canvas.width = xDim
      canvas.height = yDim
      imageData = ctx.createImageData(xDim, yDim)
    }
    var data = imageData.data
    for (var i = 0; i < yDim; i++) {
      var row = population[i]
      var rowBase = i * xDim * 4
      for (var j = 0; j < xDim; j++) {
        var c = row[j]
        var base = rowBase + j * 4
        data[base] = c.red
        data[base + 1] = c.green
        data[base + 2] = c.blue
        data[base + 3] = 255
      }
    }
    ctx.putImageData(imageData, 0, 0)
  }

  // Use requestAnimationFrame with a timestamp gate to maintain ~10fps cadence.
  // rAF automatically pauses when the tab is hidden, saving CPU.
  function loop(timestamp) {
    if (timestamp - lastStepTime >= 100) {
      step()
      lastStepTime = timestamp
    }
    rafId = requestAnimationFrame(loop)
  }

  function startSimulation(element) {
    el = element
    cancelAnimationFrame(rafId)
    lastStepTime = 0
    rafId = requestAnimationFrame(loop)
  }

  function stopSimulation() {
    cancelAnimationFrame(rafId)
  }

  function step() {
    var size = xDim * yDim // dimensions of array
    var index = 0 // index of current chromoton
    var subIndex = 0 // index moded into range of array
    var deviance = 1 << 30 // deviance of current mate
    var x = 0 // x position of current chromoton
    var y = 0 // y position of current chromoton
    var lowX = 0 // x position of best mate for chromoton
    var lowY = 0 // y position of best mate for chromoton
    var testX = 0 // index of potential mate
    var testY = 0 // index of potential mate
    var current // current chromoton
    var mate // mate chromoton
    var next // target cell in next generation
    var tmpPopulation // temporary population used to swap populations
    var sequenceIndex = 0 // which direction to begin mate search

    // perform a semi-random traversal of population
    index = (Math.random() * size) | 0
    for (var i = 0; i < size; i++) {
      subIndex = index % size
      y = (subIndex / xDim) | 0
      x = subIndex % xDim

      current = population[y][x]
      deviance = 1 << 30
      lowX = -1
      lowY = -1

      // loop through potential mates
      for (var k = 0; k < 8; k++) {
        testX = x + NEIGHBOR_SEQUENCE[(k + sequenceIndex) & 0x7][0]
        testY = y + NEIGHBOR_SEQUENCE[(k + sequenceIndex) & 0x7][1]

        if (testY >= 0 && testY < yDim && testX >= 0 && testX < xDim) {
          mate = population[testY][testX]

          // if mate's deviance is too high, don't bother
          if (mate.deviance < deviance && mate.breedTimes <= MAX_MATES) {
            // make sure chromotons aren't siblings
            if (
              (current.parentX != testX || current.parentY != testY) &&
              (current.parentX != mate.parentX ||
                current.parentY != mate.parentY)
            ) {
              // this ones an ok mate
              lowX = testX
              lowY = testY
              deviance = mate.deviance
            }
          }
        }
      }

      // if mate found, breed into next generation, else clone — no allocation in either path
      next = populationNext[y][x]
      if (lowX >= 0 && lowY >= 0) {
        mate = population[lowY][lowX]
        breedInto(next, current, mate)
        next.parentX = lowX
        next.parentY = lowY
        mate.breedTimes = (mate.breedTimes || 0) + 1
      } else {
        cloneInto(next, current)
        next.parentX = x
        next.parentY = y
      }

      // increment index
      index += PRIME_INC

      // increment sequenceIndex
      sequenceIndex++
    }

    // population mate complete — swap populations
    tmpPopulation = population
    population = populationNext
    populationNext = tmpPopulation

    render(population)
  }

  function init() {
    // initialize defaultChromosome
    var defaultChromosome = [13, 11, 21, 19, 29, 27]
    for (var i = defaultChromosome.length; i < NUMBER_OF_GENES; i++)
      defaultChromosome[i] = 0

    // create arrays of default chromotons — both buffers pre-allocated to avoid per-step allocation
    for (var i = 0; i < yDim; i++) {
      population[i] = []
      populationNext[i] = []

      for (var j = 0; j < xDim; j++) {
        population[i][j] = makeChromoton(defaultChromosome)
        // set parent to self (so there won't be inbreeding problems in first step)
        population[i][j].parentX = j
        population[i][j].parentY = i

        populationNext[i][j] = makeChromoton(defaultChromosome)
        populationNext[i][j].parentX = j
        populationNext[i][j].parentY = i
      }
    }
  }

  // Resize grid — resets population and restarts simulation.
  function configure(params) {
    if (params.width !== undefined) xDim = Math.max(1, params.width | 0)
    if (params.height !== undefined) yDim = Math.max(1, params.height | 0)
    population = []
    populationNext = []
    imageData = null
    init()
    if (el) startSimulation(el)
  }

  // Live setters — no reinit needed.
  function setMutationRate(rate) {
    MUTATION_RATE = rate
  }

  function setTargetColors(colors) {
    if (colors && colors.length > 0) {
      targetColors = colors.map(function (c) {
        return {
          red: c.r !== undefined ? c.r : c.red,
          green: c.g !== undefined ? c.g : c.green,
          blue: c.b !== undefined ? c.b : c.blue,
        }
      })

      // Recalculate deviances for the entire population since target colors changed
      for (var y = 0; y < yDim; y++) {
        for (var x = 0; x < xDim; x++) {
          applyChromosome(population[y][x])
        }
      }
    }
  }

  function getTargetColors() {
    return targetColors.map(function (t) {
      return { r: t.red, g: t.green, b: t.blue }
    })
  }

  function getPopulation() {
    return {
      population: population,
      xDim: xDim,
      yDim: yDim,
    }
  }

  return {
    init: init,
    show: startSimulation,
    hide: stopSimulation,
    configure: configure,
    setMutationRate: setMutationRate,
    setTargetColors: setTargetColors,
    getTargetColors: getTargetColors,
    getPopulation: getPopulation,
  }
})()
