let sketch = function(p) {

  class Node {
    nodeOrigin
    destinations = new Map()
    type
    angle
    redTriangles = new Set()
    blueTriangles = new Set()
  
    constructor(origin, destination) {
      this.nodeOrigin = origin
      this.destinations.set(getId(destination), destination)
    }
  }

  const goldenRatio = (1 + Math.sqrt(5)) / 2
  const SLIDER_RESOLUTION = 30
  const SUBDIVISION_THRESHOLD = 7

  let subdivisions = 4
  let canvasSize
  let canvas
  let triangles = []
  let nodeMap = new Map()
  let inputImage
  let short = 0
  let long = 0

  // Controls
  let shadeA, shadeB, shadeC, shadeAlabel, shadeBlabel, shadeClabel, subdivControl, shadeOffset, colourSelect
  let drawLines, debug, manualControl, recalcButton, deformButton, animateButton, exportCheck
  let doExport = false
  let phi1slider, phi2slider, phi4slider, phi5slider, phi6slider, phi7slider
  let p1, p2, p4, p5, p6, p7
  let palettes = [
    { "name": "Outrun", "palette": { "a": "#D90368", "b": "#2E294E", "lines": "#2E294E" } },
    { "name": "Autumn", "palette": { "a": "#780116", "b": "#DB7C26", "lines": "#780116" } },
    { "name": "Purple", "palette": { "a": "#552846", "b": "#bd4089", "lines": "#552846" } },
    { "name": "Earthy", "palette": { "a": "#bf6d46", "b": "#f1ab86", "lines": "#bf6d46" } },
    { "name": "Sky",    "palette": { "a": "#445398", "b": "#92aae3", "lines": "#445398" } },
    { "name": "Green",  "palette": { "a": "#4e5c15", "b": "#AEC772", "lines": "#4e5c15" } },
    { "name": "Grey",   "palette": { "a": "#141414", "b": "#444444", "lines": "#0a0a0a" } },
    { "name": "Officer",   "palette": { "a": "#EC994B", "b": "#15133C", "lines": "#15133C" } },
  ]
  let palette = palettes[3]

  // Create an ID based on the coordinates of the point - same coordinates will give consistent ID
  // Used to prevent duplicate points in node Map and destination Set
  function getId(point) {
    return point.re*(1000)+point.im
  }

  // Build the nodes array. Each node will have an origin point, plus a list of the destinations
  // Later, we will also calculate the node type, and which direction we should deform it in
  function incrementNode(nodeOrigin, nodeDest) {

    node = nodeMap.get(getId(nodeOrigin))
    if(!node)
      nodeMap.set(getId(nodeOrigin), new Node(nodeOrigin, nodeDest))
    else
      node.destinations.set(getId(nodeDest), nodeDest)
  }

  // Keep references to the associated triangles for use determining node type later
  function addTriangle(vert, triangle) {
    node = nodeMap.get(getId(vert))
    if(triangle.type == 0)
      node.redTriangles.add(triangle)
    else
      node.blueTriangles.add(triangle)
  }

  // For a given triangle, we add each edge vertex to the node list (A->B gets added, but so does B->A, etc)
  function addTriangleNodes(triangle) {
    incrementNode(triangle.vertA, triangle.vertB)
    incrementNode(triangle.vertA, triangle.vertC)
    incrementNode(triangle.vertB, triangle.vertA)
    incrementNode(triangle.vertB, triangle.vertC)
    incrementNode(triangle.vertC, triangle.vertA)
    incrementNode(triangle.vertC, triangle.vertB)
    addTriangle(triangle.vertA, triangle)
    addTriangle(triangle.vertB, triangle)
    addTriangle(triangle.vertC, triangle)
  }

  // Very useful for readability during debugging
  function approx(node, decimals = 5) {

    if(typeof node == "number")
      return Math.round(node * Math.pow(10, decimals)) / Math.pow(10, decimals)

    node.re = Math.round(node.re * Math.pow(10, decimals)) / Math.pow(10, decimals)
    node.im = Math.round(node.im * Math.pow(10, decimals)) / Math.pow(10, decimals)
    return node
  }

  function subdivide(triangles) {

    let result = []

    for(let triangle of triangles) {

      if(triangle.type == 0) {

        // Calculate new verticies
        let P = approx(math.add(triangle.vertA, math.divide(math.subtract(triangle.vertB, triangle.vertA), goldenRatio)))

        let triangle1 = { type: 0, vertA: triangle.vertC, vertB: P, vertC: triangle.vertB }
        let triangle2 = { type: 1, vertA: P, vertB: triangle.vertC, vertC: triangle.vertA }

        result.push(triangle1, triangle2)

      } else {

        // Calculate new verticies
        let Q = approx(math.add(triangle.vertB, math.divide(math.subtract(triangle.vertA, triangle.vertB), goldenRatio)))
        let R = approx(math.add(triangle.vertB, math.divide(math.subtract(triangle.vertC, triangle.vertB), goldenRatio)))

        let triangle1 = { type: 1, vertA: R, vertB: triangle.vertC, vertC: triangle.vertA }
        let triangle2 = { type: 1, vertA: Q, vertB: R, vertC: triangle.vertB }
        let triangle3 = { type: 0, vertA: R, vertB: Q, vertC: triangle.vertA }

        result.push(triangle1, triangle2, triangle3)

      }
    }

    return result

  }

  // Finds any common nodes between two triangles. Used when determining node type
  function commonNodes(triangle1, triangle2) {
    let foundNodes = []

    if(vertMatches(triangle1.vertA, triangle2.vertA) | vertMatches(triangle1.vertA, triangle2.vertB) | vertMatches(triangle1.vertA, triangle2.vertC))
      foundNodes.push(triangle1.vertA)
    if(vertMatches(triangle1.vertB, triangle2.vertA) | vertMatches(triangle1.vertB, triangle2.vertB) | vertMatches(triangle1.vertB, triangle2.vertC))
      foundNodes.push(triangle1.vertB)
    if(vertMatches(triangle1.vertC, triangle2.vertA) | vertMatches(triangle1.vertC, triangle2.vertB) | vertMatches(triangle1.vertC, triangle2.vertC))
      foundNodes.push(triangle1.vertC)

    return foundNodes

  }

  // Helper function to check when two nodes are equivelant
  function vertMatches(vert1, vert2) {
    return (vert1.re == vert2.re && vert1.im == vert2.im)
  }

  // https://stackoverflow.com/questions/3115982/how-to-check-if-two-arrays-are-equal-with-javascript
  function arraysEqual(a, b) {
    if (a === b) return true
    if (a == null || b == null) return false
    if (a.length != b.length) return false

    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.
    // Please note that calling sort on an array will modify that array.
    // you might want to clone your array first.

    for (var i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false
    }
    return true
  }

  function initPenrose(numRecurse) {

    triangles = []
    nodeMap = new Map()
    short = 0
    long = 0

    // Create wheel of red triangles around the origin
    for(let i of Array(10).keys()) {
      let B = 0
      let C = 0
      if(i%2) {
        B = approx(math.Complex.fromPolar(1, (2*i - 1) * Math.PI / 10))
        C = approx(math.Complex.fromPolar(1, (2*i + 1) * Math.PI / 10))
      } else {
        C = approx(math.Complex.fromPolar(1, (2*i - 1) * Math.PI / 10))
        B = approx(math.Complex.fromPolar(1, (2*i + 1) * Math.PI / 10))
      }
      let triangle = { type: 0, vertA: math.complex(0,0), vertB: B, vertC: C }
      triangles.push(triangle)
    }

    //Perform subdivisions
    Array.from(Array(numRecurse)).forEach(() => {
      triangles = subdivide(triangles)
    })

    triangles.forEach(triangle => {
      // Find a unique list of nodes
      addTriangleNodes(triangle)

      // Set the original values of the nodes (before deformation)
      triangle.original = {}
      triangle.original.vertA = triangle.vertA.clone()
      triangle.original.vertB = triangle.vertB.clone()
      triangle.original.vertC = triangle.vertC.clone()
    })

    // Determine which node type each node is
    nodeMap.forEach(node => {

      redTriangles = [...node.redTriangles]
      node.numRed = redTriangles.length
      blueTriangles = [...node.blueTriangles]
      node.numBlue = blueTriangles.length

      if(node.numRed == 4 && node.numBlue == 2) {
        node.type = 1
      } else if(node.numRed == 2 && node.numBlue == 6) {
        node.type = 2
      } else if(node.numRed == 0 && node.numBlue == 10) {
        node.type = 3
      } else if(node.numRed == 2 && node.numBlue == 2) {
        node.type = 4
      } else if(node.numRed == 2 && node.numBlue == 4) {
        node.type = 5
      } else if(node.numRed == 4 && node.numBlue == 6) {
        node.type = 6
      } else if(node.numRed == 2 && node.numBlue == 8) {
        node.type = 7
      } else {
        // Unknown cluster type - possibly on the edge of the diagram
      }

      // Figure out the angle of the deformation.
      // The angle points in a direction which, when applying a positive value for deformation, will darken the overall image
      let angleNode

      let nextBigOne, lastAngle, distHist, i
      switch(node.type) {
        case 1:
          // angleNode is the node which we use to calculate what angle the cluster is at.
          // For type 1, this is the node between the two blue triangles
          angleNode = commonNodes(blueTriangles[0], blueTriangles[1]).filter(n => {
            return (!((n.re == node.nodeOrigin.re) && (n.im == node.nodeOrigin.im)))
          })[0]

          // If we don't have this, then it's possibly a vertex at the edge of the diagram
          if(!angleNode)
            node.type = 0
          else
            node.angle = angleNode.sub(node.nodeOrigin).arg()

          break
        case 2:
        case 4:
        case 7:
          // angleNode is the node which we use to calculate what angle the cluster is at.
          // For types 2, 4 and 7, this is the opposite node between the two red triangles
          angleNode = commonNodes(redTriangles[0], redTriangles[1]).filter(n => {
            return (!((n.re == node.nodeOrigin.re) && (n.im == node.nodeOrigin.im)))
          })[0]

          // If we don't have this, then it's possibly a vertex at the edge of the diagram
          if(!angleNode)
            node.type = 0
          else
            node.angle = angleNode.sub(node.nodeOrigin).arg()+Math.PI

          break
        case 5:

          // For 5 we have to resort to measuring angles between nodeOrigin and the destination nodes
          // angleNode is the node shared between the two blue triangles with the greatest angle (ie. fat side)
          // If we go around the destinations CW or CCW , measuring the angles, we will have a small angle (pi/5 ~= 0.63),
          // then a big one (3pi/5 ~= 1.89). The destination corresponding to the first big one after a small one is the angleNode.

          // Sort destinations by angle
          sortedDests = [...node.destinations.values()].sort((a,b) => (a.sub(node.nodeOrigin).arg() > b.sub(node.nodeOrigin).arg() ? 1 : -1))

          nextBigOne = false
          lastAngle = sortedDests[5].sub(node.nodeOrigin).arg() - 2*Math.PI
          for(let dest of sortedDests) {
            let angle = dest.sub(node.nodeOrigin).arg()
            let delta = angle - lastAngle

            if(nextBigOne && delta > 1) {
              node.angle = angle
              break
            } else if(delta.toFixed(2) == "0.63") {
              nextBigOne = true
            }

            lastAngle = angle
          }
          // If we get to the end without a small->large transition, it must have been the first dest node
          if(typeof node.angle === "undefined")
            node.angle = sortedDests[0].sub(node.nodeOrigin).arg()

          break
        case 6:

          // For 6 we take a similar approach, but this time instead of measuring angle delta, we measure distance
          // angleNode will be the node at the end of the sequence, short short long short short short long SHORT <- this one

          // Sort destinations by angle
          sortedDests = [...node.destinations.values()].sort((a,b) => (a.sub(node.nodeOrigin).arg() > b.sub(node.nodeOrigin).arg() ? 1 : -1))

          distHist = []
          i = 0
          while(typeof node.angle === "undefined") {
            let dest = sortedDests[i++]
            let dist = approx(dest.sub(node.nodeOrigin).abs(), 3) // round value to account for calculation errors
            distHist.push(dist)

            if(dist > long)
              long = dist
            if(dist > short && dist < long)
              short = dist

            if(distHist.length < 8)
              continue

            let last8 = distHist.slice(Math.max(distHist.length - 8, 1))
            if(arraysEqual(last8, [short, short, long, short, short, short, long, short])) {
              node.angle = dest.sub(node.nodeOrigin).arg()
              break
            }
            
            // nodes at the edge of the image can't be computed
            if(distHist.length == 18) {
              node.angle = 0
              break
            }

            // We must have hit the end, loop around and try again
            if(i == node.destinations.size)
              i = 0
          }
          // If we get to the end without a small->large transition, it must have been the first dest node
          if(typeof node.angle === "undefined")
            node.angle = sortedDests[0].sub(node.nodeOrigin).arg()

          break
        case 3:
        case 8:
        default:
          // N/A
          break
      }

    })

  }

  function deformNode(node, phi) {
    node.phi = phi
    if(node.angle) {
      let nodeTriangles = [...node.redTriangles, ...node.blueTriangles]
      // Perform deformation on all matching nodes
      nodeTriangles.forEach(triangle => {
        if(vertMatches(triangle.original.vertA, node.nodeOrigin)) {
          triangle.vertA = triangle.original.vertA.add(math.Complex.fromPolar(phi, node.angle))
        } else if(vertMatches(triangle.original.vertB, node.nodeOrigin)) {
          triangle.vertB = triangle.original.vertB.add(math.Complex.fromPolar(phi, node.angle))
        } else if(vertMatches(triangle.original.vertC, node.nodeOrigin)) {
          triangle.vertC = triangle.original.vertC.add(math.Complex.fromPolar(phi, node.angle))
        }
      })
    }
  }
  
  function manualDeform(p1, p2, p4, p5, p6, p7) {
    nodeMap.forEach(node => {
      let phi = 0
      if(node.type == 1)
        phi = p1
      else if(node.type == 2)
        phi = p2
      else if(node.type == 4)
        phi = p4
      else if(node.type == 5)
        phi = p5
      else if(node.type == 6)
        phi = p6
      else if(node.type == 7)
        phi = p7

      deformNode(node, phi)
    })
  }

  let t = 0

  // helper for writing color to array
  function writePixelValue(image, x, y, c) {
    let index = (x + y * image.width) * 4
    image.pixels[index] = c
    image.pixels[index + 1] = c
    image.pixels[index + 2] = c
    image.pixels[index + 3] = 255
  }

  function deformTriangles(inputImage) {

    // Calculate noise field
    let noiseField = p.createImage(canvasSize/10, canvasSize/10)
    noiseField.loadPixels()
    let SPEED = 10
    let CLOUD_SIZE = 30
    for (let x = 0; x < noiseField.width; x++) {
      for (let y = 0; y < noiseField.height; y++) {
        let c = 192 * p.noise(x/CLOUD_SIZE + t/SPEED, y/CLOUD_SIZE - t/SPEED) + 64
        let alpha = 0.0
        if(t < 1000) {
          alpha = Math.min(t/20, 1.0)
        } else if(t < 1020) {
          alpha = 1.0 - (t-1000)/20
        } else {
          alpha = 0.0
          t = 0
          doExport = false
        }
        writePixelValue(noiseField, x, y, p.int(c * alpha))
      }
    }
    noiseField.updatePixels()
    noiseField.resize(canvasSize, canvasSize)
    t+=1

    // Blend noise field with input image
    let blendedImage = p.createImage(canvasSize, canvasSize)
    blendedImage.copy(noiseField, 0, 0, canvasSize, canvasSize, 0, 0, canvasSize, canvasSize)
    blendedImage.blend(inputImage, 0, 0, canvasSize, canvasSize, 0, 0, canvasSize, canvasSize, p.DARKEST)
    blendedImage.loadPixels()

    nodeMap.forEach(node => {

      // How much do we shift this node type?
      let phi = 0
      let x = p.int(canvasSize*(node.nodeOrigin.re + 1)/2)
      let y = p.int(canvasSize*(node.nodeOrigin.im + 1)/2)
      let nodeBrightness = getPixelVal(blendedImage, x, y)

      /* This is where the actual greyscale to deformation mapping happens
        * Each node type can be deformed within a range, but a pre-determined
        * full-black/full-white preset is used to set the range.
        * These presets are scaled by the "short" length of the penrose tile which
        * was calculated during the node type sorting, to allow for different size tiles.
        * Full-white => t4/t5 = 1, others unchanged
        * Full-black => t4/t5 = -2/3, others unchanged
        */

      switch(node.type) {
        case 4: phi = p.map(nodeBrightness, 0, 255, -2/3, 1)
          break
        case 5: phi = p.map(nodeBrightness, 0, 255, -2/3, 1)
          break
      }
      phi *= short

      deformNode(node, phi)

    })

  }

  function getPixelVal(image, x, y) {
    return image.pixels[4 * (y * image.width + x)]
  }

  function drawIfFast() {
    if(subdivisions <= SUBDIVISION_THRESHOLD)
      p.draw()
  }

  // Function to recalculate the level of detail
  function recalc(img) {
    if(img && img.width) {
      inputImage = img
    }

    inputImage.filter(p.GRAY)
    inputImage.loadPixels()
    subdivisions = p.int(subdivControl.value())
    if(subdivisions <= SUBDIVISION_THRESHOLD) {
      deformButton.attribute("disabled", "")
    } else {
      deformButton.removeAttribute("disabled")
    }
    const t0 = performance.now();
    initPenrose(subdivisions)
    const t1 = performance.now();
    recalcButton.attribute("disabled", "")
    p.draw()
    const t2 = performance.now();
    if(debug.checked()) {
      console.log(`Init took ${t1 - t0} milliseconds.`);
      console.log(`Draw took ${t2 - t1} milliseconds.`);
    }
  }

  function setPalette() {
    palette = { "name": "Custom", "palette": { "a": shadeA.color() , "b": shadeB.color(), "lines": shadeC.color() } }
    p.draw()
  }
  
  function pickPalette(e) {
    let selectedPalette = palettes.filter(a=>{return a.name==e.target.value})[0];
    if(!selectedPalette) { return }
    palette = selectedPalette

    // colorpickers don't appear to have a method to set the value, so we have to recreate :(
    shadeA.remove()
    shadeB.remove()
    shadeC.remove()
    shadeAlabel.remove()
    shadeBlabel.remove()
    shadeClabel.remove()
    drawLines.remove()
    setupColours(shadeOffset)

    p.draw()
  }

  function enableButton() {
    recalcButton.removeAttribute("disabled")
  }

  function imageLoaded(img) {
    inputImage = img
    recalc()
  }

  function imageChanged(e) {
    p.loadImage(e.target.value, imageLoaded)
  }

  // Pads a number with 0s and returns the string, 25 => 0025
  function zeroPad(number) {
    if (number<=9999) { number = ("000"+number).slice(-4); }
    return number;
  }

  let frame = 0
  let running = false

  // Export the current frame
  function exportFrame() {
    filename = `${palette.name}_lod${subdivisions}_${zeroPad(frame)}`
    p.saveCanvas(canvas, filename, 'png')
  }

  // Display the loaded image, and optionally export it (download)
  function showFrame(img) {
    imageLoaded(img)

    if(exportCheck.checked())
      exportFrame()

    if(running)
      animate()
  }

  // Load the next frame
  function animate() {
    p.loadImage(`breathe/${zeroPad(frame)}.png`, showFrame)
    frame = (frame + 1) % 200
  }

  function animateOrStop() {
    if(running) {
      animateButton.html("Animate")
      running = false
    } else {
      running = true
      animateButton.html("Stop")
      animate(0)
    }
  }

  function randomise() {
    // Randomise sliders
    phi1slider.value(p.random(0, SLIDER_RESOLUTION))
    phi2slider.value(p.random(0, SLIDER_RESOLUTION))
    phi4slider.value(p.random(0, SLIDER_RESOLUTION))
    phi5slider.value(p.random(0, SLIDER_RESOLUTION))
    phi6slider.value(p.random(0, SLIDER_RESOLUTION))
    // phi7slider.value(p.random(0, SLIDER_RESOLUTION))
    
    // Randomise palette
    let selectedPalette = palettes[Math.floor(Math.random()*palettes.length)]
    palette = selectedPalette
    colourSelect.value(selectedPalette.name)

    // Randomise subdivisions
    subdivControl.value(p.random(3, 5))
    recalc()
  }

  function exportAnimation() {
    t = 0
    doExport = true
  }

  function toggleManual() {
    let enabled = manualControl.checked()
    if(enabled) {
      phi1slider.removeAttribute("disabled")
      phi2slider.removeAttribute("disabled")
      phi4slider.removeAttribute("disabled")
      phi5slider.removeAttribute("disabled")
      phi6slider.removeAttribute("disabled")
      phi7slider.removeAttribute("disabled")
    } else {
      phi1slider.attribute("disabled", "")
      phi2slider.attribute("disabled", "")
      phi4slider.attribute("disabled", "")
      phi5slider.attribute("disabled", "")
      phi6slider.attribute("disabled", "")
      phi7slider.attribute("disabled", "")
    }
    p.draw()
  }

  function setupColours(y) {
    shadeOffset = y
    shadeA = p.createColorPicker(palette.palette.a)
    shadeA.input(setPalette)
    shadeA.position(canvasSize + 20, y+=30)
    shadeAlabel = p.createSpan("Fill")
    shadeAlabel.position(canvasSize + 100, y+5)
    shadeB = p.createColorPicker(palette.palette.b)
    shadeB.input(setPalette)
    shadeB.position(canvasSize + 20, y+=30)
    shadeBlabel = p.createSpan("Background")
    shadeBlabel.position(canvasSize + 100, y+5)
    shadeC = p.createColorPicker(palette.palette.lines)
    shadeC.input(setPalette)
    shadeC.position(canvasSize + 20, y+=30)
    shadeClabel = p.createSpan("Lines")
    shadeClabel.position(canvasSize + 100, y+5)

    drawLines = p.createCheckbox("Draw lines", true)
    drawLines.changed(p.draw)
    drawLines.position(canvasSize + 100, y+=30)
    return y
  }

  p.preload = function() {
    inputImage = p.loadImage("empty.png")
  }

  p.setup = function() {

    if(inputImage.width > inputImage.height)
      canvasSize = inputImage.width
    else
      canvasSize = inputImage.height

    canvas = p.createCanvas(canvasSize, canvasSize)

    let y = 20
    manualControl = p.createCheckbox("Manual Control", false)
    manualControl.changed(toggleManual)
    manualControl.position(canvasSize + 20, y)

    phi1slider = p.createSlider(0, SLIDER_RESOLUTION, SLIDER_RESOLUTION/2)
    phi2slider = p.createSlider(0, SLIDER_RESOLUTION, SLIDER_RESOLUTION/2)
    phi4slider = p.createSlider(0, SLIDER_RESOLUTION, SLIDER_RESOLUTION/2)
    phi5slider = p.createSlider(0, SLIDER_RESOLUTION, SLIDER_RESOLUTION/2)
    phi6slider = p.createSlider(0, SLIDER_RESOLUTION, SLIDER_RESOLUTION/2)
    phi7slider = p.createSlider(0, SLIDER_RESOLUTION, SLIDER_RESOLUTION/2)
    phi1slider.position(canvasSize + 20, y+=30)
    phi2slider.position(canvasSize + 20, y+=30)
    phi4slider.position(canvasSize + 20, y+=30)
    phi5slider.position(canvasSize + 20, y+=30)
    phi6slider.position(canvasSize + 20, y+=30)
    phi7slider.position(canvasSize + 20, y+=30)
    phi1slider.attribute("disabled", "")
    phi2slider.attribute("disabled", "")
    phi4slider.attribute("disabled", "")
    phi5slider.attribute("disabled", "")
    phi6slider.attribute("disabled", "")
    phi7slider.attribute("disabled", "")
    phi1slider.changed(drawIfFast)
    phi2slider.changed(drawIfFast)
    phi4slider.changed(drawIfFast)
    phi5slider.changed(drawIfFast)
    phi6slider.changed(drawIfFast)
    phi7slider.changed(drawIfFast)

    deformButton = p.createButton("Deform")
    deformButton.position(canvasSize + 20, y+=30)
    deformButton.mousePressed(p.draw)

    debug = p.createCheckbox("Debug", false)
    debug.changed(p.draw)
    debug.position(canvasSize + 110, y)

    animateButton = p.createButton("Animate")
    animateButton.position(canvasSize + 20, y+=30)
    animateButton.mousePressed(animateOrStop)

    exportCheck = p.createCheckbox("Export animation", false)
    exportCheck.changed(exportAnimation)
    exportCheck.position(canvasSize + 110, y)

    exportButton = p.createButton("Export")
    exportButton.position(canvasSize + 20, y+=30)
    exportButton.mousePressed(exportFrame)

    randomiseButton = p.createButton("Randomise")
    randomiseButton.position(canvasSize + 110, y)
    randomiseButton.mousePressed(randomise)

    let detailLabel = p.createSpan("Level of detail")
    detailLabel.position(canvasSize + 20, y+=80)
    subdivControl = p.createSlider(3, 8, subdivisions)
    subdivControl.position(canvasSize + 20, y+=30)
    subdivControl.changed(enableButton)

    recalcButton = p.createButton("Recalculate")
    recalcButton.attribute("disabled", "")
    recalcButton.position(canvasSize + 60, y+=30)
    recalcButton.mousePressed(recalc)

    let imageLabel = p.createSpan("Reference Image")
    imageLabel.position(canvasSize + 20, y+=50)
    let sel = p.createSelect()
    sel.position(canvasSize + 20, y+=20)
    sel.option("empty.png")
    sel.option("ring.png")
    sel.option("dgen.png")
    sel.option("lineargrad.png")
    sel.option("skull.png")
    sel.option("snake.png")
    sel.option("bucwah.png")
    sel.changed(imageChanged)

    let colourLabel = p.createSpan("Color Preset")
    colourLabel.position(canvasSize + 20, y+=50)
    colourSelect = p.createSelect()
    colourSelect.position(canvasSize + 20, y+=20)
    palettes.forEach(palette => {
      colourSelect.option(palette.name)
    })
    colourSelect.changed(pickPalette)

    y = setupColours(y)

    subdivisions = p.int(subdivControl.value())
    if(subdivisions <= SUBDIVISION_THRESHOLD) {
      deformButton.attribute("disabled", "")
    } else {
      deformButton.removeAttribute("disabled")
    }

    inputImage.filter(p.GRAY)
    inputImage.loadPixels()
    initPenrose(subdivisions)

    p.frameRate(15)

  }

  p.draw = function() {

    if(manualControl.checked()) {
      p1 = p.map(phi1slider.value(), 0, SLIDER_RESOLUTION, -short, short)
      p2 = p.map(phi2slider.value(), 0, SLIDER_RESOLUTION, -short, short)
      p4 = p.map(phi4slider.value(), 0, SLIDER_RESOLUTION, -short, short)
      p5 = p.map(phi5slider.value(), 0, SLIDER_RESOLUTION, -short, short)
      p6 = p.map(phi6slider.value(), 0, SLIDER_RESOLUTION, -short, short)
      p7 = p.map(phi7slider.value(), 0, SLIDER_RESOLUTION, -short, short)

      // Clamp to avoid weirdness - this is a bit of a hack, but it gives a nice result
      // In case of a conflict, give p4 and p5 priority (ie. adjust the others to fit)
      p4 = Math.min(short*Math.sin(Math.PI/10)*2, p4)
      p5 = Math.min(short*Math.sin(Math.PI/10)*2, p5)
      p4 = Math.max(-short*Math.sin(Math.PI/10), p4) // This should be -short*2sin(pi/10), but scaling ALL the way creates a fully dark image, which looks crap
      p6 = Math.min(short-p5, p6)

      p1 = Math.max(-short-p7, p1)
      p1 = Math.max((-0.9*short*Math.sin(Math.PI/10)*2-p4)/Math.sin(3*Math.PI/5), p1)
      p1 = Math.max(-short + 3*Math.sin(Math.PI/10)*Math.abs(p6), p1)

      p2 = Math.max(-short*Math.sin(Math.PI/10)*2-p4, p2)
      p2 = Math.min((short-p4)/2, p2)

      p7 = Math.min((short-p5)*0.5, p7)
      p7 = Math.max((-short+p5)*0.5, p7)

      manualDeform(p1, p2, p4, p5, p6, p7)
    } else {
      deformTriangles(inputImage)
    }

    p.background(palette.palette.lines)
    p.strokeWeight(drawLines.checked() ? 2 : 0)
    p.stroke(palette.palette.lines)
    for (let triangle of triangles) {
      if(triangle.type == 0) {
        p.fill(palette.palette.a)
      } else {
        p.fill(palette.palette.b)
      }
      p.beginShape()
      p.vertex(canvasSize*(triangle.vertA.re + 1)/2, canvasSize*(triangle.vertA.im + 1)/2)
      p.vertex(canvasSize*(triangle.vertB.re + 1)/2, canvasSize*(triangle.vertB.im + 1)/2)
      p.vertex(canvasSize*(triangle.vertC.re + 1)/2, canvasSize*(triangle.vertC.im + 1)/2)
      p.vertex(canvasSize*(triangle.vertA.re + 1)/2, canvasSize*(triangle.vertA.im + 1)/2)
      p.endShape()
    }

    p.stroke(palette.palette.lines)
    p.fill("#000")

    if(manualControl.checked()) {
      let y = 35
      p.text("t1 " + p1.toFixed(3), canvasSize - 50, y+=30)
      p.text("t2 " + p2.toFixed(3), canvasSize - 50, y+=30)
      p.text("t4 " + p4.toFixed(3), canvasSize - 50, y+=30)
      p.text("t5 " + p5.toFixed(3), canvasSize - 50, y+=30)
      p.text("t6 " + p6.toFixed(3), canvasSize - 50, y+=30)
      p.text("t7 " + p7.toFixed(3), canvasSize - 50, y+=30)
    }

    if(debug.checked()) {
      p.text("Nodes: " + nodeMap.size, 0, 15)
      p.text("Triangles: " + triangles.length, 0, 30)
      p.text("Short: " + short, 0, 45)
      p.text("Long: " + long, 0, 60)

      nodeMap.forEach(node => {

        if(node.angle) {
          // Green line showing deformation
          p.stroke("#0f0")
          p.beginShape()
          let newVert = node.nodeOrigin.add(math.Complex.fromPolar(node.phi, node.angle))
          p.vertex(canvasSize*(node.nodeOrigin.re + 1)/2, canvasSize*(node.nodeOrigin.im + 1)/2)
          p.vertex(canvasSize*(newVert.re + 1)/2, canvasSize*(newVert.im + 1)/2)
          p.endShape()
        }

        // Red dot at origin
        p.stroke("#f00")
        p.strokeWeight(5)
        p.point(canvasSize*(node.nodeOrigin.re + 1)/2, canvasSize*(node.nodeOrigin.im + 1)/2)
        p.strokeWeight(1)
        
        // Label nodes which can be deformed
        if(node.type && node.type != 3) {
          p.stroke(shadeC.color())
          p.fill("#000")
          p.text(`t${node.type}`, (node.nodeOrigin.re+1)*canvasSize/2, (node.nodeOrigin.im+1)*canvasSize/2)
        }

      })
    } else {
      // Circle crop
      canvas.drawingContext.globalCompositeOperation = 'destination-in'
      canvas.drawingContext.beginPath()
      canvas.drawingContext.arc(canvas.width/2, canvas.height/2, 0.45*canvas.height, 0, Math.PI*2)
      canvas.drawingContext.closePath()
      canvas.drawingContext.fill()
      canvas.drawingContext.globalCompositeOperation = 'source-over'
    }

    if(doExport) {
      p.saveCanvas(canvas, `penrose_${t.toString().padStart(4, "0")}`, "png")
    }

  }
}

new p5(sketch, "penrose")