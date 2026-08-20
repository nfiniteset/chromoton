window.chromoton = (function () {
  var el
  var PRIME_INC = 457
  var NEIGHBOR_DX = new Int8Array([-1, 1, 1, -1, 0, 0, 1, -1])
  var NEIGHBOR_DY = new Int8Array([-1, 1, -1, 1, -1, 1, 0, 0])
  var NUMBER_OF_GENES = 24
  var MAX_MATES = 3 // maximum number of times a chromoton can breed
  var MUTATION_RATE = 0.002 // likelyhood that a mutation will occur
  var xDim = 240 // dimensions of arrays in x direction
  var yDim = 1 // dimensions of arrays in y direction

  // Population is stored Struct-of-Arrays style (flat typed arrays, one slot
  // per cell at index y*xDim+x) instead of arrays of JS objects. This keeps
  // the hot per-step loop free of object/property overhead and nested-array
  // indirection. getPopulation() reconstructs the old per-object shape for
  // external consumers, since that's called on a slow UI-polling cadence,
  // not from the simulation loop.
  var population // current generation buffer
  var populationNext // scratch buffer for the generation being computed
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

  // Fast inline PRNG (xorshift32) for the breeding crossover mask. Math.random()
  // was measured to cost ~25% of total step time at large grid sizes because
  // breedInto draws from it up to 24 times per breeding cell, and nearly every
  // cell breeds every step. xorshift32 avoids the per-call engine overhead and
  // lets us draw one 32-bit word and slice it into four 8-bit gene masks.
  var rngState = (Date.now() ^ 0x9e3779b9) >>> 0 || 1
  function nextRandom32() {
    var x = rngState
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    rngState = x >>> 0
    return rngState
  }

  // Allocate a struct-of-arrays buffer for `size` cells.
  function makeBuffer(size) {
    return {
      red: new Uint8Array(size),
      green: new Uint8Array(size),
      blue: new Uint8Array(size),
      deviance: new Int32Array(size),
      breedTimes: new Uint8Array(size),
      parentX: new Int16Array(size),
      parentY: new Int16Array(size),
      chromosome: new Uint8Array(size * NUMBER_OF_GENES),
      targetActive: new Uint8Array(size),
      targetR: new Uint8Array(size),
      targetG: new Uint8Array(size),
      targetB: new Uint8Array(size),
    }
  }

  function writeChromosomeAt(buf, idx, src) {
    var base = idx * NUMBER_OF_GENES
    for (var i = 0; i < NUMBER_OF_GENES; i++) buf.chromosome[base + i] = src[i]
  }

  // Decode chromosome into RGB + deviance for cell `idx`, mutating buf in-place.
  function applyChromosomeAt(buf, idx) {
    var red = 0
    var green = 0
    var blue = 0
    var base = idx * NUMBER_OF_GENES
    var chromosome = buf.chromosome

    for (var i = 0; i < NUMBER_OF_GENES; i++) {
      var gene = chromosome[base + i] & 0x1f
      var colorVal = gene >> 3
      var multiplier = gene & 0x7
      var value = 1 << multiplier

      if (colorVal === 1) red += value
      else if (colorVal === 2) green += value
      else if (colorVal === 3) blue += value
    }

    red = red > 255 ? 255 : red
    green = green > 255 ? 255 : green
    blue = blue > 255 ? 255 : blue
    buf.red[idx] = red
    buf.green[idx] = green
    buf.blue[idx] = blue

    if (buf.targetActive[idx]) {
      // Image mode: this cell has a single fixed target color (chosen by
      // which pixel of the source image it overlaps), so deviance is a
      // straight distance to that one target rather than a min over many.
      var tdr = red - buf.targetR[idx]
      var tdg = green - buf.targetG[idx]
      var tdb = blue - buf.targetB[idx]
      buf.deviance[idx] =
        (tdr < 0 ? -tdr : tdr) + (tdg < 0 ? -tdg : tdg) + (tdb < 0 ? -tdb : tdb)
    } else {
      // Calculate deviance against all target colors and use the minimum
      var minDeviance = 0x7fffffff
      var numTargets = targetColors.length
      for (var t = 0; t < numTargets; t++) {
        var target = targetColors[t]
        var dr = red - target.red
        var dg = green - target.green
        var db = blue - target.blue

        var deviation =
          (dr < 0 ? -dr : dr) + (dg < 0 ? -dg : dg) + (db < 0 ? -db : db)

        if (deviation < minDeviance) {
          minDeviance = deviation
        }
      }
      buf.deviance[idx] = minDeviance
    }
    buf.breedTimes[idx] = 0
  }

  // Write offspring of curBuf[motherIdx] x curBuf[fatherIdx] into nextBuf[idx].
  // Target fields aren't touched here — target belongs to the grid position,
  // not the chromosome, and is kept in sync by applyImageTargetsToPopulation.
  function breedIntoAt(nextBuf, idx, curBuf, motherIdx, fatherIdx) {
    var nc = nextBuf.chromosome
    var cc = curBuf.chromosome
    var base = idx * NUMBER_OF_GENES
    var mBase = motherIdx * NUMBER_OF_GENES
    var fBase = fatherIdx * NUMBER_OF_GENES

    var word = 0
    for (var i = 0; i < NUMBER_OF_GENES; i++) {
      if ((i & 3) === 0) word = nextRandom32()
      var mask = word & 0xff
      word >>>= 8
      nc[base + i] = (cc[mBase + i] & mask) | (cc[fBase + i] & ~mask)
    }

    // determine if a mutation should occur
    if (nextRandom32() / 4294967296 < MUTATION_RATE) {
      var gi = nextRandom32() % NUMBER_OF_GENES
      nc[base + gi] ^= 1 << (nextRandom32() % 7)
    }
    applyChromosomeAt(nextBuf, idx)
  }

  // Copy curBuf[srcIdx]'s chromosome into nextBuf[idx] and recalculate.
  function cloneIntoAt(nextBuf, idx, curBuf, srcIdx) {
    var nc = nextBuf.chromosome
    var cc = curBuf.chromosome
    var base = idx * NUMBER_OF_GENES
    var sBase = srcIdx * NUMBER_OF_GENES
    for (var i = 0; i < NUMBER_OF_GENES; i++) nc[base + i] = cc[sBase + i]
    applyChromosomeAt(nextBuf, idx)
  }

  // Render one pixel per cell into a reused ImageData buffer. CSS width:100% scales
  // the canvas to fit the container, so the cell count drives resolution, not pixel size.
  function render(buf) {
    var canvas = el.getElementsByClassName('chromotons')[0]
    var ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!imageData) {
      canvas.width = xDim
      canvas.height = yDim
      imageData = ctx.createImageData(xDim, yDim)
    }
    var data = imageData.data
    var size = xDim * yDim
    var red = buf.red
    var green = buf.green
    var blue = buf.blue
    for (var idx = 0; idx < size; idx++) {
      var base = idx * 4
      if (grayscale) {
        var gray = (red[idx] * 77 + green[idx] * 150 + blue[idx] * 29) >> 8
        data[base] = gray
        data[base + 1] = gray
        data[base + 2] = gray
      } else {
        data[base] = red[idx]
        data[base + 1] = green[idx]
        data[base + 2] = blue[idx]
      }
      data[base + 3] = 255
    }
    ctx.putImageData(imageData, 0, 0)
  }

  // Actual measured step cadence (as opposed to the configured target
  // stepInterval) — tracks a small rolling window of step() timestamps so
  // the fps reading reflects reality when the sim can't keep up.
  var fpsSamples = []
  var FPS_SAMPLE_WINDOW = 10

  function recordFpsSample(timestamp) {
    fpsSamples.push(timestamp)
    if (fpsSamples.length > FPS_SAMPLE_WINDOW) fpsSamples.shift()
  }

  function getFps() {
    if (fpsSamples.length < 2) return 0
    var elapsed = fpsSamples[fpsSamples.length - 1] - fpsSamples[0]
    if (elapsed <= 0) return 0
    return ((fpsSamples.length - 1) * 1000) / elapsed
  }

  // Use requestAnimationFrame with a timestamp gate to maintain ~10fps cadence.
  // rAF automatically pauses when the tab is hidden, saving CPU.
  function loop(timestamp) {
    if (timestamp - lastStepTime >= stepInterval) {
      step()
      lastStepTime = timestamp
      recordFpsSample(timestamp)
    }
    rafId = requestAnimationFrame(loop)
  }

  function startSimulation(element) {
    el = element
    cancelAnimationFrame(rafId)
    lastStepTime = 0
    fpsSamples = []
    rafId = requestAnimationFrame(loop)
  }

  function stopSimulation() {
    cancelAnimationFrame(rafId)
  }

  function step() {
    var size = xDim * yDim // dimensions of array
    var index = 0 // index of current chromoton
    var subIndex = 0 // index moded into range of array (== flat cell index)
    var deviance = 1 << 30 // deviance of current mate
    var x = 0 // x position of current chromoton
    var y = 0 // y position of current chromoton
    var lowIdx = -1 // flat index of best mate for chromoton
    var lowX = 0 // x position of best mate for chromoton
    var lowY = 0 // y position of best mate for chromoton
    var testX = 0 // index of potential mate
    var testY = 0 // index of potential mate
    var testIdx = 0 // flat index of potential mate
    var curParentX = 0
    var curParentY = 0
    var sequenceIndex = 0 // which direction to begin mate search
    var cur = population
    var nxt = populationNext

    // perform a semi-random traversal of population
    index = (Math.random() * size) | 0
    for (var i = 0; i < size; i++) {
      subIndex = index % size
      y = (subIndex / xDim) | 0
      x = subIndex - y * xDim

      curParentX = cur.parentX[subIndex]
      curParentY = cur.parentY[subIndex]
      deviance = 1 << 30
      lowIdx = -1

      // loop through potential mates
      for (var k = 0; k < 8; k++) {
        var seq = (k + sequenceIndex) & 0x7
        testX = x + NEIGHBOR_DX[seq]
        testY = y + NEIGHBOR_DY[seq]

        if (testY >= 0 && testY < yDim && testX >= 0 && testX < xDim) {
          testIdx = testY * xDim + testX

          // if mate's deviance is too high, don't bother
          if (
            cur.deviance[testIdx] < deviance &&
            cur.breedTimes[testIdx] <= MAX_MATES
          ) {
            // make sure chromotons aren't siblings
            if (
              (curParentX != testX || curParentY != testY) &&
              (curParentX != cur.parentX[testIdx] ||
                curParentY != cur.parentY[testIdx])
            ) {
              // this ones an ok mate
              lowIdx = testIdx
              lowX = testX
              lowY = testY
              deviance = cur.deviance[testIdx]
            }
          }
        }
      }

      // if mate found, breed into next generation, else clone — no allocation in either path
      if (lowIdx >= 0) {
        breedIntoAt(nxt, subIndex, cur, subIndex, lowIdx)
        nxt.parentX[subIndex] = lowX
        nxt.parentY[subIndex] = lowY
        cur.breedTimes[lowIdx] = cur.breedTimes[lowIdx] + 1
      } else {
        cloneIntoAt(nxt, subIndex, cur, subIndex)
        nxt.parentX[subIndex] = x
        nxt.parentY[subIndex] = y
      }

      // increment index
      index += PRIME_INC

      // increment sequenceIndex
      sequenceIndex++
    }

    // population mate complete — swap populations
    population = nxt
    populationNext = cur

    render(population)
  }

  function init() {
    // initialize defaultChromosome
    var defaultChromosome = [13, 11, 21, 19, 29, 27]
    for (var i = defaultChromosome.length; i < NUMBER_OF_GENES; i++)
      defaultChromosome[i] = 0

    var size = xDim * yDim
    population = makeBuffer(size)
    populationNext = makeBuffer(size)

    // create default chromotons in both buffers — both pre-allocated to avoid
    // per-step allocation
    for (var y = 0; y < yDim; y++) {
      for (var x = 0; x < xDim; x++) {
        var idx = y * xDim + x

        writeChromosomeAt(population, idx, defaultChromosome)
        applyChromosomeAt(population, idx)
        // set parent to self (so there won't be inbreeding problems in first step)
        population.parentX[idx] = x
        population.parentY[idx] = y

        writeChromosomeAt(populationNext, idx, defaultChromosome)
        applyChromosomeAt(populationNext, idx)
        populationNext.parentX[idx] = x
        populationNext.parentY[idx] = y
      }
    }
  }

  // Resize grid — resets population and restarts simulation.
  function configure(params) {
    if (params.width !== undefined) xDim = Math.max(1, params.width | 0)
    if (params.height !== undefined) yDim = Math.max(1, params.height | 0)
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
      var size = xDim * yDim
      for (var idx = 0; idx < size; idx++) {
        applyChromosomeAt(population, idx)
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
    var black = imageColors.black
    var white = imageColors.white
    var size = xDim * yDim
    for (var idx = 0; idx < size; idx++) {
      var target = mask[idx] ? white : black
      population.targetActive[idx] = 1
      population.targetR[idx] = target.red
      population.targetG[idx] = target.green
      population.targetB[idx] = target.blue
      populationNext.targetActive[idx] = 1
      populationNext.targetR[idx] = target.red
      populationNext.targetG[idx] = target.green
      populationNext.targetB[idx] = target.blue
      applyChromosomeAt(population, idx)
      applyChromosomeAt(populationNext, idx)
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
    var size = xDim * yDim
    for (var idx = 0; idx < size; idx++) {
      population.targetActive[idx] = 0
      populationNext.targetActive[idx] = 0
      applyChromosomeAt(population, idx)
      applyChromosomeAt(populationNext, idx)
    }
  }

  function isImageModeEnabled() {
    return imageModeEnabled
  }

  // Adjust the black/white luma cutoff used by sampleImageMask — lower
  // values classify more pixels as "white", higher values classify more as
  // "black". Re-applies immediately if image mode is active.
  function setImageThreshold(value) {
    imageThreshold = Math.max(0, Math.min(255, value | 0))
    if (imageModeEnabled) applyImageTargetsToPopulation()
  }

  function getImageThreshold() {
    return imageThreshold
  }

  // Reconstructs the pre-SoA per-object population shape for external
  // consumers (UI polling, strategies). Not called from the simulation
  // loop, so the per-cell object allocation here is cheap relative to its
  // ~500ms polling cadence.
  function getPopulation() {
    var result = []
    for (var y = 0; y < yDim; y++) {
      var row = []
      for (var x = 0; x < xDim; x++) {
        var idx = y * xDim + x
        row.push({
          red: population.red[idx],
          green: population.green[idx],
          blue: population.blue[idx],
          deviance: population.deviance[idx],
          breedTimes: population.breedTimes[idx],
          parentX: population.parentX[idx],
          parentY: population.parentY[idx],
          target: population.targetActive[idx]
            ? {
                red: population.targetR[idx],
                green: population.targetG[idx],
                blue: population.targetB[idx],
              }
            : null,
          chromosome: population.chromosome.subarray(
            idx * NUMBER_OF_GENES,
            (idx + 1) * NUMBER_OF_GENES
          ),
        })
      }
      result.push(row)
    }
    return {
      population: result,
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
    setImageThreshold: setImageThreshold,
    getImageThreshold: getImageThreshold,
    getFps: getFps,
  }
})()
