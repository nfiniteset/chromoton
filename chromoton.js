window.chromoton = (function () {
  var el;
  var PRIME_INC = 457;
  var NEIGHBOR_SEQUENCE = [[-1, -1], [1, 1], [1, -1], [-1, 1], [0, -1], [0, 1], [1, 0], [-1, 0]];
  var NUMBER_OF_GENES = 24;
  var MAX_MATES = 3;                        // maximum number of times a chromoton can breed
  var MUTATION_RATE = 0.002;                  // likelyhood that a mutation will occur
  var xDim = 240;                          // dimensions of arrays in x direction
  var yDim = 1;                           // dimensions of arrays in y direction
  var MIN_CHANGE_TIME = 8000;
  var MAX_CHANGE_TIME = 15000;
  var randomizeColor = true;
  var onColorChange = null;

  var population = [];
  var populationNext = [];
  var targetColors = [];  // array of target colors (initialized later)
  var currentPalette = '';  // will be set after PALETTES is defined
  var rafId;
  var lastStepTime = 0;
  var changeColorTimeout;
  var imageData;

  // Color palettes - each palette is an array of {red, green, blue} objects
  var PALETTES = {
    custom: null,  // null means use manual color selection
    forest: [
      {red: 34, green: 139, blue: 34},   // forest green
      {red: 85, green: 107, blue: 47},   // dark olive
      {red: 107, green: 142, blue: 35},  // olive drab
      {red: 46, green: 125, blue: 50},   // medium forest
      {red: 139, green: 69, blue: 19},   // saddle brown
      {red: 160, green: 82, blue: 45}    // sienna
    ],
    ocean: [
      {red: 0, green: 105, blue: 148},   // deep ocean
      {red: 64, green: 224, blue: 208},  // turquoise
      {red: 0, green: 139, blue: 139},   // dark cyan
      {red: 72, green: 209, blue: 204},  // medium turquoise
      {red: 32, green: 178, blue: 170},  // light sea green
      {red: 70, green: 130, blue: 180}   // steel blue
    ],
    sunset: [
      {red: 255, green: 99, blue: 71},   // tomato
      {red: 255, green: 140, blue: 0},   // dark orange
      {red: 255, green: 69, blue: 0},    // orange red
      {red: 220, green: 20, blue: 60},   // crimson
      {red: 186, green: 85, blue: 211},  // medium orchid
      {red: 147, green: 112, blue: 219}  // medium purple
    ],
    neon: [
      {red: 255, green: 0, blue: 255},   // magenta
      {red: 0, green: 255, blue: 255},   // cyan
      {red: 255, green: 255, blue: 0},   // yellow
      {red: 57, green: 255, blue: 20},   // neon green
      {red: 255, green: 20, blue: 147},  // deep pink
      {red: 138, green: 43, blue: 226}   // blue violet
    ],
    pastel: [
      {red: 255, green: 182, blue: 193}, // light pink
      {red: 176, green: 224, blue: 230}, // powder blue
      {red: 221, green: 160, blue: 221}, // plum
      {red: 255, green: 218, blue: 185}, // peach puff
      {red: 152, green: 251, blue: 152}, // pale green
      {red: 216, green: 191, blue: 216}  // thistle
    ],
    monochrome: [
      {red: 50, green: 50, blue: 50},    // dark gray
      {red: 100, green: 100, blue: 100}, // gray
      {red: 150, green: 150, blue: 150}, // light gray
      {red: 75, green: 75, blue: 75},    // medium dark
      {red: 125, green: 125, blue: 125}, // medium light
      {red: 175, green: 175, blue: 175}  // very light
    ],
    fire: [
      {red: 255, green: 0, blue: 0},     // red
      {red: 255, green: 69, blue: 0},    // orange red
      {red: 255, green: 140, blue: 0},   // dark orange
      {red: 255, green: 165, blue: 0},   // orange
      {red: 255, green: 215, blue: 0},   // gold
      {red: 184, green: 134, blue: 11}   // dark goldenrod
    ],
    cyberpunk: [
      {red: 255, green: 0, blue: 110},   // hot pink
      {red: 0, green: 255, blue: 255},   // cyan
      {red: 138, green: 43, blue: 226},  // blue violet
      {red: 255, green: 20, blue: 147},  // deep pink
      {red: 0, green: 191, blue: 255},   // deep sky blue
      {red: 186, green: 85, blue: 211}   // medium orchid
    ],
    queenOfHearts: [
      {red: 201, green: 0, blue: 0},   // Brick ember
      {red: 255, green: 71, blue: 71},     // Strawberry red
      {red: 82, green: 0, blue: 0},     // Black cherry
      {red: 255, green: 194, blue: 194},     // Cotton rose
      {red: 255, green: 255, blue: 255},     // white
      {red: 255, green: 0, blue: 110},   // hot pink
    ]
  };

  // Initialize with a random palette
  if (!currentPalette) {
    var paletteNames = Object.keys(PALETTES);
    var nonCustomPalettes = paletteNames.filter(function(name) { return name !== 'custom'; });
    var randomIndex = (Math.random() * nonCustomPalettes.length) | 0;
    currentPalette = nonCustomPalettes[randomIndex];
  }

  // Initialize 3 unique target colors from the palette
  targetColors = getUniqueRandomColorsFromPalette(3);

  // Decode chromosome into RGB + deviance, mutating the chromoton in-place.
  function applyChromosome(c) {
    c.red = 0;
    c.green = 0;
    c.blue = 0;
    var chromosome = c.chromosome;
    for (var i = 0; i < NUMBER_OF_GENES; i++) {
      var gene = (chromosome[i] & 0x1F);
      var colorVal = gene >> 3;
      var multiplier = gene & 0x7;
      switch (colorVal) {
        case 1:     // red
          c.red += (1 << multiplier);
          break;
        case 2:     // green
          c.green += (1 << multiplier);
          break;
        case 3:     // blue
          c.blue += (1 << multiplier);
          break;
      }
    }
    if (c.red > 255) c.red = 255;
    if (c.green > 255) c.green = 255;
    if (c.blue > 255) c.blue = 255;

    // Calculate deviance against all target colors and use the minimum
    c.deviance = Infinity;
    for (var i = 0; i < targetColors.length; i++) {
      var target = targetColors[i];
      var deviation = Math.abs(c.red - target.red) + Math.abs(c.green - target.green) + Math.abs(c.blue - target.blue);

      if (deviation < c.deviance) {
        c.deviance = deviation;
      }
    }
    c.breedTimes = 0;
  }

  // Allocate a new chromoton object with a Uint8Array chromosome.
  function makeChromoton(srcChromosome) {
    var c = {
      chromosome: new Uint8Array(NUMBER_OF_GENES),
      red: 0, green: 0, blue: 0, deviance: 0, breedTimes: 0,
      parentX: -1, parentY: -1
    };
    for (var i = 0; i < NUMBER_OF_GENES; i++) c.chromosome[i] = srcChromosome[i];
    applyChromosome(c);
    return c;
  }

  // Write offspring of mother+father into an existing chromoton object (no allocation).
  function breedInto(child, mother, father) {
    var chromosome = child.chromosome;
    var mc = mother.chromosome;
    var fc = father.chromosome;
    for (var i = 0; i < NUMBER_OF_GENES; i++) {
      var mask = (256 * Math.random()) | 0;
      chromosome[i] = (mc[i] & mask) | (fc[i] & ~mask);
    }
    // determine if a mutation should occur
    if (Math.random() < MUTATION_RATE) {
      i = (Math.random() * NUMBER_OF_GENES) | 0;
      // mutate a single bit
      chromosome[i] ^= 1 << ((Math.random() * 7) | 0);
    }
    applyChromosome(child);
  }

  // Copy source's chromosome into child and recalculate (picks up target color changes).
  function cloneInto(child, source) {
    var sc = source.chromosome;
    var cc = child.chromosome;
    for (var i = 0; i < NUMBER_OF_GENES; i++) cc[i] = sc[i];
    applyChromosome(child);
  }

  // Render one pixel per cell into a reused ImageData buffer. CSS width:100% scales
  // the canvas to fit the container, so the cell count drives resolution, not pixel size.
  function render(population) {
    var canvas = el.getElementsByClassName('chromotons')[0];
    var ctx = canvas.getContext('2d');
    if (!imageData) {
      canvas.width = xDim;
      canvas.height = yDim;
      imageData = ctx.createImageData(xDim, yDim);
    }
    var data = imageData.data;
    for (var i = 0; i < yDim; i++) {
      var row = population[i];
      var rowBase = i * xDim * 4;
      for (var j = 0; j < xDim; j++) {
        var c = row[j];
        var base = rowBase + j * 4;
        data[base]   = c.red;
        data[base+1] = c.green;
        data[base+2] = c.blue;
        data[base+3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // Use requestAnimationFrame with a timestamp gate to maintain ~10fps cadence.
  // rAF automatically pauses when the tab is hidden, saving CPU.
  function loop(timestamp) {
    if (timestamp - lastStepTime >= 100) {
      step();
      lastStepTime = timestamp;
    }
    rafId = requestAnimationFrame(loop);
  }

  function startSimulation(element) {
    el = element;
    cancelAnimationFrame(rafId);
    clearTimeout(changeColorTimeout);
    lastStepTime = 0;
    rafId = requestAnimationFrame(loop);
    if (randomizeColor) {
      changeColorTimeout = setTimeout(changeColor, MIN_CHANGE_TIME + (Math.random() * (MAX_CHANGE_TIME - MIN_CHANGE_TIME)) | 0);
    }
  }

  function stopSimulation() {
    cancelAnimationFrame(rafId);
    clearTimeout(changeColorTimeout);
  }

  function step() {
    var size = xDim * yDim;             // dimensions of array
    var index = 0;                      // index of current chromoton
    var subIndex = 0;                   // index moded into range of array
    var deviance = 1 << 30;               // deviance of current mate
    var x = 0;                          // x position of current chromoton
    var y = 0;                          // y position of current chromoton
    var lowX = 0;                       // x position of best mate for chromoton
    var lowY = 0;                       // y position of best mate for chromoton
    var testX = 0;                      // index of potential mate
    var testY = 0;                      // index of potential mate
    var current;                        // current chromoton
    var mate;                           // mate chromoton
    var next;                           // target cell in next generation
    var tmpPopulation;                  // temporary population used to swap populations
    var sequenceIndex = 0;              // which direction to begin mate search

    // perform a semi-random traversal of population
    index = ((Math.random() * size) | 0);
    for (var i = 0; i < size; i++) {
      subIndex = index % size;
      y = (subIndex / xDim) | 0;
      x = subIndex % xDim;

      current = population[y][x];
      deviance = 1 << 30;
      lowX = -1;
      lowY = -1;

      // loop through potential mates
      for (var k = 0; k < 8; k++) {
        testX = x + NEIGHBOR_SEQUENCE[(k + sequenceIndex) & 0x7][0];
        testY = y + NEIGHBOR_SEQUENCE[(k + sequenceIndex) & 0x7][1];

        if ((testY >= 0) && (testY < yDim) && (testX >= 0) && (testX < xDim)) {
          mate = population[testY][testX];

          // if mate's deviance is too high, don't bother
          if ((mate.deviance < deviance) && (mate.breedTimes <= MAX_MATES)) {
            // make sure chromotons aren't siblings
            if (((current.parentX != testX) || (current.parentY != testY))
              && ((current.parentX != mate.parentX) || (current.parentY != mate.parentY))) {
              // this ones an ok mate
              lowX = testX;
              lowY = testY;
              deviance = mate.deviance;
            }
          }
        }
      }

      // if mate found, breed into next generation, else clone — no allocation in either path
      next = populationNext[y][x];
      if ((lowX >= 0) && (lowY >= 0)) {
        mate = population[lowY][lowX];
        breedInto(next, current, mate);
        next.parentX = lowX;
        next.parentY = lowY;
        mate.breedTimes = (mate.breedTimes || 0) + 1;
      } else {
        cloneInto(next, current);
        next.parentX = x;
        next.parentY = y;
      }

      // increment index
      index += PRIME_INC;

      // increment sequenceIndex
      sequenceIndex++;

    }

    // population mate complete — swap populations
    tmpPopulation = population;
    population = populationNext;
    populationNext = tmpPopulation;

    render(population);
  }

  // Generate a random color from the current palette (or random if custom)
  function getRandomColor() {
    var palette = PALETTES[currentPalette];

    if (palette === null) {
      // Custom mode - generate random color with brightness constraint
      var newColor;
      do {
        newColor = {
          red: (Math.random() * 256) | 0,
          green: (Math.random() * 256) | 0,
          blue: (Math.random() * 256) | 0
        };
      } while (newColor.red + newColor.green + newColor.blue > 400);
      return newColor;
    } else {
      // Palette mode - pick a random color from the palette
      var index = (Math.random() * palette.length) | 0;
      return {
        red: palette[index].red,
        green: palette[index].green,
        blue: palette[index].blue
      };
    }
  }

  // Get unique random colors from the current palette
  // Returns an array of unique colors (no duplicates)
  function getUniqueRandomColorsFromPalette(count) {
    var palette = PALETTES[currentPalette];

    if (palette === null) {
      // Custom mode - generate unique random colors
      var colors = [];
      for (var i = 0; i < count; i++) {
        colors.push(getRandomColor());
      }
      return colors;
    } else {
      // Palette mode - shuffle and take first N colors
      var shuffled = palette.slice(); // Copy array

      // Fisher-Yates shuffle
      for (var i = shuffled.length - 1; i > 0; i--) {
        var j = (Math.random() * (i + 1)) | 0;
        var temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
      }

      // Take first 'count' colors (capped at palette length)
      var numColors = Math.min(count, shuffled.length);
      var colors = [];
      for (var i = 0; i < numColors; i++) {
        colors.push({
          red: shuffled[i].red,
          green: shuffled[i].green,
          blue: shuffled[i].blue
        });
      }
      return colors;
    }
  }

  // Get a single unique random color not already in target colors
  function getUniqueRandomColor() {
    var palette = PALETTES[currentPalette];

    if (palette === null) {
      // Custom mode - just get a random color
      return getRandomColor();
    } else {
      // Palette mode - find colors not in use
      var availableColors = [];
      for (var i = 0; i < palette.length; i++) {
        var paletteColor = palette[i];
        var isInUse = false;

        // Check if this color is already a target
        for (var j = 0; j < targetColors.length; j++) {
          var target = targetColors[j];
          if (target.red === paletteColor.red &&
              target.green === paletteColor.green &&
              target.blue === paletteColor.blue) {
            isInUse = true;
            break;
          }
        }

        if (!isInUse) {
          availableColors.push(paletteColor);
        }
      }

      // Pick a random color from available colors, or fallback to any palette color
      if (availableColors.length > 0) {
        var index = (Math.random() * availableColors.length) | 0;
        var selectedColor = availableColors[index];
        return {
          red: selectedColor.red,
          green: selectedColor.green,
          blue: selectedColor.blue
        };
      } else {
        // All palette colors are in use, just pick any
        return getRandomColor();
      }
    }
  }

  // Count how many cells are closest to each target color
  function getColorSuccessCounts() {
    var counts = new Array(targetColors.length);
    for (var i = 0; i < counts.length; i++) counts[i] = 0;

    for (var y = 0; y < yDim; y++) {
      for (var x = 0; x < xDim; x++) {
        var cell = population[y][x];
        var minDeviance = Infinity;
        var closestColorIndex = 0;

        // Find which target color this cell is closest to
        for (var i = 0; i < targetColors.length; i++) {
          var target = targetColors[i];
          var deviation = Math.abs(cell.red - target.red) + Math.abs(cell.green - target.green) + Math.abs(cell.blue - target.blue);
          if (deviation < minDeviance) {
            minDeviance = deviation;
            closestColorIndex = i;
          }
        }
        counts[closestColorIndex]++;
      }
    }
    return counts;
  }

  function changeColor() {
    // Find the most successful color (the one with the most cells closest to it)
    var counts = getColorSuccessCounts();
    var maxCount = -1;
    var mostSuccessfulIndex = 0;

    for (var i = 0; i < counts.length; i++) {
      if (counts[i] > maxCount) {
        maxCount = counts[i];
        mostSuccessfulIndex = i;
      }
    }

    // Determine available actions based on current color count (min 1, max 5)
    var currentCount = targetColors.length;
    var availableActions = [];

    if (currentCount > 1) {
      availableActions.push('remove');  // Can remove if we have more than 1
    }
    if (currentCount < 5) {
      availableActions.push('add');     // Can add if we have fewer than 5
    }
    availableActions.push('change');    // Can always change

    // Randomly pick an action
    var actionIndex = (Math.random() * availableActions.length) | 0;
    var action = availableActions[actionIndex];

    if (action === 'remove') {
      // Remove the dominant color
      targetColors.splice(mostSuccessfulIndex, 1);

    } else if (action === 'add') {
      // Add a new unique color from the palette
      var newColor = getUniqueRandomColor();
      targetColors.push({
        red: newColor.red,
        green: newColor.green,
        blue: newColor.blue
      });

    } else if (action === 'change') {
      // Replace the most successful color with a new unique random color from the palette
      var palette = PALETTES[currentPalette];
      var newColor;

      if (palette === null) {
        // Custom mode - just get a random color
        newColor = getRandomColor();
      } else {
        // Palette mode - ensure we pick a color not already in use
        var availableColors = [];
        for (var i = 0; i < palette.length; i++) {
          var paletteColor = palette[i];
          var isInUse = false;

          // Check if this color is already a target (excluding the one we're replacing)
          for (var j = 0; j < targetColors.length; j++) {
            if (j !== mostSuccessfulIndex) {
              var target = targetColors[j];
              if (target.red === paletteColor.red &&
                  target.green === paletteColor.green &&
                  target.blue === paletteColor.blue) {
                isInUse = true;
                break;
              }
            }
          }

          if (!isInUse) {
            availableColors.push(paletteColor);
          }
        }

        // Pick a random color from available colors, or fallback to any palette color
        if (availableColors.length > 0) {
          var index = (Math.random() * availableColors.length) | 0;
          var selectedColor = availableColors[index];
          newColor = {
            red: selectedColor.red,
            green: selectedColor.green,
            blue: selectedColor.blue
          };
        } else {
          // All palette colors are in use, just pick any
          newColor = getRandomColor();
        }
      }

      targetColors[mostSuccessfulIndex] = newColor;
    }

    // Recalculate deviances for the entire population since target colors changed
    for (var y = 0; y < yDim; y++) {
      for (var x = 0; x < xDim; x++) {
        applyChromosome(population[y][x]);
      }
    }

    if (onColorChange) onColorChange(targetColors);
    changeColorTimeout = setTimeout(changeColor, MIN_CHANGE_TIME + (Math.random() * (MAX_CHANGE_TIME - MIN_CHANGE_TIME)) | 0);
  }

  function init() {
    // initialize defaultChromosome
    var defaultChromosome = [13, 11, 21, 19, 29, 27];
    for (var i = defaultChromosome.length; i < NUMBER_OF_GENES; i++) defaultChromosome[i] = 0;

    // create arrays of default chromotons — both buffers pre-allocated to avoid per-step allocation
    for (var i = 0; i < yDim; i++) {
      population[i] = [];
      populationNext[i] = [];

      for (var j = 0; j < xDim; j++) {
        population[i][j] = makeChromoton(defaultChromosome);
        // set parent to self (so there won't be inbreeding problems in first step)
        population[i][j].parentX = j;
        population[i][j].parentY = i;

        populationNext[i][j] = makeChromoton(defaultChromosome);
        populationNext[i][j].parentX = j;
        populationNext[i][j].parentY = i;
      }
    }
  }

  // Resize grid — resets population and restarts simulation.
  function configure(params) {
    if (params.width !== undefined) xDim = Math.max(1, params.width | 0);
    if (params.height !== undefined) yDim = Math.max(1, params.height | 0);
    population = [];
    populationNext = [];
    imageData = null;
    init();
    if (el) startSimulation(el);
  }

  // Live setters — no reinit needed.
  function setMutationRate(rate) {
    MUTATION_RATE = rate;
  }

  function setColor(r, g, b, index) {
    // If index not provided, set the first color
    if (index === undefined) index = 0;
    if (index >= 0 && index < targetColors.length) {
      targetColors[index] = { red: r, green: g, blue: b };
    }
  }

  function setRandomizeColor(enabled) {
    randomizeColor = enabled;
    clearTimeout(changeColorTimeout);
    if (enabled) {
      changeColorTimeout = setTimeout(changeColor, MIN_CHANGE_TIME + (Math.random() * (MAX_CHANGE_TIME - MIN_CHANGE_TIME)) | 0);
    }
  }

  function getColor(index) {
    // If index not provided, return the first color for backwards compatibility
    if (index === undefined) index = 0;
    if (index >= 0 && index < targetColors.length) {
      var target = targetColors[index];
      return { r: target.red, g: target.green, b: target.blue };
    }
    return null;
  }

  function getColors() {
    return targetColors.map(function(t) {
      return { r: t.red, g: t.green, b: t.blue };
    });
  }

  function setColorChangeCallback(fn) {
    onColorChange = fn;
  }

  function addTargetColor(r, g, b) {
    if (targetColors.length < 5) {
      targetColors.push({ red: r, green: g, blue: b });
      return true;
    }
    return false;
  }

  function removeTargetColor(index) {
    if (targetColors.length > 1 && index >= 0 && index < targetColors.length) {
      targetColors.splice(index, 1);
      return true;
    }
    return false;
  }

  function setTargetColors(colors) {
    if (colors && colors.length > 0) {
      targetColors = colors.map(function(c) {
        return { red: c.r || c.red, green: c.g || c.green, blue: c.b || c.blue };
      });
    }
  }

  function reassignAllColorsFromPalette() {
    var currentCount = targetColors.length;
    var uniqueColors = getUniqueRandomColorsFromPalette(currentCount);
    for (var i = 0; i < uniqueColors.length; i++) {
      targetColors[i] = uniqueColors[i];
    }
    // Notify UI if callback is set
    if (onColorChange) onColorChange(targetColors);
  }

  function setPalette(paletteName) {
    if (PALETTES[paletteName] !== undefined) {
      currentPalette = paletteName;
      if (paletteName !== 'custom') {
        reassignAllColorsFromPalette();
      }
      return true;
    }
    return false;
  }

  function getPalettes() {
    return Object.keys(PALETTES);
  }

  function getCurrentPalette() {
    return currentPalette;
  }

  return {
    init: init,
    show: startSimulation,
    hide: stopSimulation,
    configure: configure,
    setMutationRate: setMutationRate,
    setColor: setColor,
    setRandomizeColor: setRandomizeColor,
    getColor: getColor,
    getColors: getColors,
    addTargetColor: addTargetColor,
    removeTargetColor: removeTargetColor,
    setTargetColors: setTargetColors,
    setColorChangeCallback: setColorChangeCallback,
    setPalette: setPalette,
    getPalettes: getPalettes,
    getCurrentPalette: getCurrentPalette,
    getRandomColor: getRandomColor,
    getUniqueRandomColor: getUniqueRandomColor
  };
})()
