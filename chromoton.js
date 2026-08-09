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
  var stepInterval = 100 // ms between steps (~10fps)
  var imageData
  var grayscale = false // display-only toggle; simulation state is unaffected

  // Image mode: each cell pursues one of two target colors depending on
  // whether it falls on a black or white pixel of a source image, instead of
  // the whole population chasing the same global targetColors list.
  var imageModeEnabled = false
  var imageSourceData = null // last ImageData-like {width, height, data} applied
  var imageColors = null // { black: {red,green,blue}, white: {red,green,blue} }
  var imageThreshold = 128 // luma cutoff separating "black" from "white" pixels

  // Decode chromosome into RGB + deviance, mutating the chromoton in-place.
  function applyChromosome(c) {
    var red = 0
    var green = 0
    var blue = 0
    var chromosome = c.chromosome

    // Optimized calculation for better performance
    for (var i = 0; i < NUMBER_OF_GENES; i++) {
      var gene = chromosome[i] & 0x1f
      var colorVal = gene >> 3
      var multiplier = gene & 0x7
      var value = 1 << multiplier

      // Use if-else instead of switch for better branch prediction
      if (colorVal === 1) red += value
      else if (colorVal === 2) green += value
      else if (colorVal === 3) blue += value
    }

    c.red = red > 255 ? 255 : red
    c.green = green > 255 ? 255 : green
    c.blue = blue > 255 ? 255 : blue

    if (c.target) {
      // Image mode: this cell has a single fixed target color (chosen by
      // which pixel of the source image it overlaps), so deviance is a
      // straight distance to that one target rather than a min over many.
      var tdr = c.red - c.target.red
      var tdg = c.green - c.target.green
      var tdb = c.blue - c.target.blue
      c.deviance =
        (tdr < 0 ? -tdr : tdr) + (tdg < 0 ? -tdg : tdg) + (tdb < 0 ? -tdb : tdb)
    } else {
      // Calculate deviance against all target colors and use the minimum
      var minDeviance = Infinity
      var numTargets = targetColors.length
      for (var i = 0; i < numTargets; i++) {
        var target = targetColors[i]
        var dr = c.red - target.red
        var dg = c.green - target.green
        var db = c.blue - target.blue

        // Use absolute difference without Math.abs (faster)
        var deviation =
          (dr < 0 ? -dr : dr) + (dg < 0 ? -dg : dg) + (db < 0 ? -db : db)

        if (deviation < minDeviance) {
          minDeviance = deviation
        }
      }
      c.deviance = minDeviance
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
      target: null, // per-cell fixed target color, set by image mode
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
    var ctx = canvas.getContext('2d', { willReadFrequently: true })
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
        if (grayscale) {
          var gray = (c.red * 77 + c.green * 150 + c.blue * 29) >> 8
          data[base] = gray
          data[base + 1] = gray
          data[base + 2] = gray
        } else {
          data[base] = c.red
          data[base + 1] = c.green
          data[base + 2] = c.blue
        }
        data[base + 3] = 255
      }
    }
    ctx.putImageData(imageData, 0, 0)
  }

  // Use requestAnimationFrame with a timestamp gate to maintain ~10fps cadence.
  // rAF automatically pauses when the tab is hidden, saving CPU.
  function loop(timestamp) {
    if (timestamp - lastStepTime >= stepInterval) {
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
    if (imageModeEnabled) applyImageTargetsToPopulation()
    if (el) startSimulation(el)
  }

  // Live setters — no reinit needed.
  function setStepInterval(ms) {
    stepInterval = Math.max(1, ms | 0)
  }

  function getStepInterval() {
    return stepInterval
  }

  function setMutationRate(rate) {
    MUTATION_RATE = rate
  }

  // Display-only toggle: swaps rendering between full color and grayscale.
  // Does not touch chromosome/color state, so the simulation is unaffected.
  function setGrayscale(value) {
    grayscale = !!value
    if (el) render(population)
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

  function normalizeColor(c) {
    return {
      red: c.r !== undefined ? c.r : c.red,
      green: c.g !== undefined ? c.g : c.green,
      blue: c.b !== undefined ? c.b : c.blue,
    }
  }

  // Downsample a source image to one black/white bit per grid cell using
  // nearest-neighbor lookup + the same luma formula used for grayscale
  // rendering. imgData is any {width, height, data} with RGBA bytes — an
  // ImageData object works as-is.
  //
  // The image is scaled up as large as possible without distorting its
  // aspect ratio ("contain" fit) and centered in the grid; cells outside
  // the scaled image bounds are treated as black.
  function sampleImageMask(imgData, cols, rows) {
    var mask = new Uint8Array(cols * rows)
    var srcW = imgData.width
    var srcH = imgData.height
    var data = imgData.data

    var scale = Math.min(cols / srcW, rows / srcH)
    var scaledW = srcW * scale
    var scaledH = srcH * scale
    var offsetX = (cols - scaledW) / 2
    var offsetY = (rows - scaledH) / 2

    for (var y = 0; y < rows; y++) {
      var sy = (y - offsetY) / scale
      var rowInBounds = sy >= 0 && sy < srcH
      var syIdx = rowInBounds ? sy | 0 : 0
      for (var x = 0; x < cols; x++) {
        var sx = (x - offsetX) / scale
        if (!rowInBounds || sx < 0 || sx >= srcW) {
          mask[y * cols + x] = 0
          continue
        }
        var i = (syIdx * srcW + (sx | 0)) * 4
        var luma = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8
        mask[y * cols + x] = luma >= imageThreshold ? 1 : 0
      }
    }
    return mask
  }

  // Re-sample the stored image against the current grid and assign each
  // cell its black/white target, recomputing deviance immediately. Both
  // double-buffered cells at a grid position share the same target since
  // the target belongs to the position, not the chromosome.
  function applyImageTargetsToPopulation() {
    if (!imageSourceData || !imageColors) return
    var mask = sampleImageMask(imageSourceData, xDim, yDim)
    for (var y = 0; y < yDim; y++) {
      for (var x = 0; x < xDim; x++) {
        var target = mask[y * xDim + x] ? imageColors.white : imageColors.black
        var cur = population[y][x]
        var nxt = populationNext[y][x]
        cur.target = target
        nxt.target = target
        applyChromosome(cur)
        applyChromosome(nxt)
      }
    }
  }

  // Enable image mode: imgData is any {width, height, data} RGBA source
  // (e.g. an ImageData from a file, URL, or another canvas). colors is
  // { black: Color, white: Color } drawn from the current palette.
  function setImageTargets(imgData, colors) {
    if (!imgData || !imgData.data || !imgData.width || !imgData.height) return
    if (!colors || !colors.black || !colors.white) return

    imageSourceData = imgData
    imageColors = {
      black: normalizeColor(colors.black),
      white: normalizeColor(colors.white),
    }
    imageModeEnabled = true
    applyImageTargetsToPopulation()
  }

  // Disable image mode and fall back to the global targetColors list.
  function clearImageTargets() {
    imageModeEnabled = false
    imageSourceData = null
    imageColors = null
    for (var y = 0; y < yDim; y++) {
      for (var x = 0; x < xDim; x++) {
        population[y][x].target = null
        populationNext[y][x].target = null
        applyChromosome(population[y][x])
        applyChromosome(populationNext[y][x])
      }
    }
  }

  function isImageModeEnabled() {
    return imageModeEnabled
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
    setStepInterval: setStepInterval,
    getStepInterval: getStepInterval,
    setMutationRate: setMutationRate,
    setGrayscale: setGrayscale,
    setTargetColors: setTargetColors,
    getTargetColors: getTargetColors,
    getPopulation: getPopulation,
    setImageTargets: setImageTargets,
    clearImageTargets: clearImageTargets,
    isImageModeEnabled: isImageModeEnabled,
  }
})()
