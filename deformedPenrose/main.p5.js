let sketch = function(p) {
  let goldenRatio = (1 + Math.sqrt(5)) / 2
  let NUM_SUBDIVISIONS = 7
  let canvasSize
  let triangles = []
  let nodes = []
  let inputImage
  let short = 0
  let long = 0

  // Controls
  let shadeA, shadeB, shadeC, subdivControl
  let drawLines, debug, manualControl, recalcButton, deformButton
  let phi1slider, phi2slider, phi4slider, phi5slider, phi6slider, phi7slider
  let palette = { "a": "#683257", "b": "#bd4089", "lines": "#683257" }

  // Find the matching node in an array of nodes
  function findNode(nodes, node, searchKey) {

    let retVal = []

    if(searchKey) {
      retVal = nodes.filter(matchedNode => {
        return (matchedNode[searchKey].im == node.im && matchedNode[searchKey].re == node.re)
      })
    } else {
      retVal = nodes.filter(matchedNode => {
        return (matchedNode.im == node.im && matchedNode.re == node.re)
      })
    }
    return retVal
  }

  // Build the nodes array. Each node will have an origin point, plus a list of the destinations
  // Later, we will also calculate the node type, and which direction we should deform it in
  function incrementNode(nodeOrigin, nodeDest) {

    let matchingNodes = findNode(nodes, nodeOrigin, "nodeOrigin")
    if(matchingNodes.length == 0) {
      // If node isn't already in nodes[] then we add it
      nodes.push({ nodeOrigin: nodeOrigin, destinations: [ nodeDest ]})
    } else {

      // If it's already in nodes[] then we add this destination
      matchingNodes.forEach(node => {

        // But only if it's not already in the destination list
        let matchedDestinations = findNode(node.destinations, nodeDest)
        if(matchedDestinations.length == 0) {
          node.destinations.push(nodeDest)
        }

      })

    }

  }

  // For a given triangle, we add each edge vertex to the node list (A->B gets added, but so does B->A, etc)
  function addTriangleNodes(triangle) {
    incrementNode(triangle.vertA, triangle.vertB)
    incrementNode(triangle.vertA, triangle.vertC)
    incrementNode(triangle.vertB, triangle.vertA)
    incrementNode(triangle.vertB, triangle.vertC)
    incrementNode(triangle.vertC, triangle.vertA)
    incrementNode(triangle.vertC, triangle.vertB)
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
    nodes = []
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
    nodes.forEach(node => {

      let nodeTriangles = triangles.filter(triangle => {
        let vertAMatches = vertMatches(triangle.vertA, node.nodeOrigin)
        let vertBMatches = vertMatches(triangle.vertB, node.nodeOrigin)
        let vertCMatches = vertMatches(triangle.vertC, node.nodeOrigin)
        return (vertAMatches | vertBMatches | vertCMatches)
      })

      let redTriangles = nodeTriangles.filter(triangle => {
        return (triangle.type == 0)
      })
      node.numRed = redTriangles.length

      let blueTriangles = nodeTriangles.filter(triangle => {
        return (triangle.type == 1)
      })
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
          // If we go around the destinations CW or CCW , measuring the angles, we will have a small angle (0.63),
          // then a big one (1.89). The destination corresponding to the first big one after a small one is the angleNode.

          // Sort destinations by angle
          node.destinations.sort((a,b) => (a.sub(node.nodeOrigin).arg() > b.sub(node.nodeOrigin).arg() ? 1 : -1))

          nextBigOne = false
          lastAngle = node.destinations[5].sub(node.nodeOrigin).arg() - 2*Math.PI
          for(let dest of node.destinations) {
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
            node.angle = node.destinations[0].sub(node.nodeOrigin).arg()

          break
        case 6:

          // For 6 we take a similar approach, but this time instead of measuring angle delta, we measure distance
          // angleNode will be the node at the end of the sequence, short short long short short short long SHORT <- this one

          // Sort destinations by angle
          node.destinations.sort((a,b) => (a.sub(node.nodeOrigin).arg() > b.sub(node.nodeOrigin).arg() ? 1 : -1))

          distHist = []
          i = 0
          while(typeof node.angle === "undefined") {
            let dest = node.destinations[i++]
            let dist = approx(dest.sub(node.nodeOrigin).abs(), 3) // round value to account for calculation errors
            distHist.push(dist)

            if(dist > long)
              long = dist
            if(dist > short && dist < long)
              short = dist

            if(distHist.length < 8)
              continue

            if(distHist.length == 9)
              distHist.shift()

            if(arraysEqual(distHist, [short, short, long, short, short, short, long, short])) {
              node.angle = dest.sub(node.nodeOrigin).arg()
              break
            }

            // We must have hit the end, loop around and try again
            if(i == node.destinations.length)
              i = 0
          }
          // If we get to the end without a small->large transition, it must have been the first dest node
          if(typeof node.angle === "undefined")
            node.angle = node.destinations[0].sub(node.nodeOrigin).arg()

          break
        case 3:
        case 8:
        default:
          // N/A
          break
      }

    })

  }

  function deformTriangles(p1, p2, p4, p5, p6, p7) {

    nodes.forEach(node => {

      // How much do we shift this node type?
      let phi = 0

      if(manualControl.checked()) {
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
      } else {
        let x = p.int(canvasSize*(node.nodeOrigin.re + 1)/2)
        let y = p.int(canvasSize*(node.nodeOrigin.im + 1)/2)


        /* This is where the actual greyscale to deformation mapping happens
         * Each node type can be deformed within a range, but I have pre-determined
         * a fully black, and fully white presets, which we use to set the range.
         * These presets are scaled by the "short" length of the penrose tile which
         * was calculated during the node type sorting.
         * Fullly white => t4,5,6 = short
         * Full black => t1 = -short, t2,4 = -short/3 
         */

        switch(node.type) {
          case 1:
            phi = p.map(getPixelVal(x, y), 0, 255, 0, 1)
            break
          case 2:
            phi = p.map(getPixelVal(x, y), 0, 255, -1/3, 0)
            break
          case 4:
            phi = p.map(getPixelVal(x, y), 0, 255, -1/3, 1)
            break
          case 5:
            phi = p.map(getPixelVal(x, y), 0, 255, 0, 1)
            break
        }
        phi *= short

      }

      // Find all the triangles which have this node
      let nodeTriangles = triangles.filter(triangle => {
        let vertAMatches = vertMatches(triangle.original.vertA, node.nodeOrigin)
        let vertBMatches = vertMatches(triangle.original.vertB, node.nodeOrigin)
        let vertCMatches = vertMatches(triangle.original.vertC, node.nodeOrigin)
        return (vertAMatches | vertBMatches | vertCMatches)
      })

      if(node.angle) {
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
    })

  }

  function getPixelVal(x, y) {
    return inputImage.pixels[4 * (y * inputImage.width + x)]
  }

  // Function to recalculate the level of detail
  function recalc(img) {
    if(img) {
      inputImage = img
    }

    inputImage.filter(p.GRAY)
    inputImage.loadPixels()
    initPenrose(p.int(subdivControl.value()))
    recalcButton.attribute("disabled", "")
    p.draw()
  }

  function setPalette() {
    palette = { "a": shadeA.color() , "b": shadeB.color(), "lines": shadeC.color() }
    p.draw()
  }

  function pickPalette(e) {
    switch(e.target.value) {
      case "Purple":
      default:
        palette = { "a": "#683257", "b": "#bd4089", "lines": "#683257" }
        break
      case "Earthy":
        palette = { "a": "#c57b57", "b": "#f1ab86", "lines": "#c57b57" }
        break
      case "Sky":
        palette = { "a": "#445398", "b": "#92aae3", "lines": "#445398" }
        break
      case "Green":
        palette = { "a": "#4e5c15", "b": "#AEC772", "lines": "#4e5c15" }
        break
      case "Grey":
        palette = { "a": "#141414", "b": "#2d2d2d", "lines": "#0a0a0a" }
        break
    }

    // colorpickers don't appear to have a method to set the value, so we have to recreate :(
    shadeA.remove()
    shadeA = p.createColorPicker(palette.a)
    shadeA.input(setPalette)
    shadeB.remove()
    shadeB = p.createColorPicker(palette.b)
    shadeB.input(setPalette)
    shadeC.remove()
    shadeC = p.createColorPicker(palette.lines)
    shadeC.input(setPalette)

    p.draw()
  }

  function enableButton() {
    recalcButton.removeAttribute("disabled")
  }

  function newImage(e) {
    p.loadImage(e.target.value, recalc)
  }

  p.preload = function() {
    inputImage = p.loadImage("dgen.png")
  }

  p.setup = function() {

    if(inputImage.width > inputImage.height)
      canvasSize = inputImage.width
    else
      canvasSize = inputImage.height

    let canvas = p.createCanvas(canvasSize, canvasSize)
    canvas.style('border-radius', 50 + 'px')

    let y = 20
    manualControl = p.createCheckbox("Manual Control", false)
    manualControl.changed(p.draw)
    manualControl.position(canvasSize + 20, y)

    phi1slider = p.createSlider(0, 20, 10)
    phi1slider.position(canvasSize + 20, y+=30)
    phi2slider = p.createSlider(0, 20, 10)
    phi2slider.position(canvasSize + 20, y+=30)
    phi4slider = p.createSlider(0, 20, 10)
    phi4slider.position(canvasSize + 20, y+=30)
    phi5slider = p.createSlider(0, 20, 10)
    phi5slider.position(canvasSize + 20, y+=30)
    phi6slider = p.createSlider(0, 20, 10)
    phi6slider.position(canvasSize + 20, y+=30)
    phi7slider = p.createSlider(0, 20, 10)
    phi7slider.position(canvasSize + 20, y+=30)

    deformButton = p.createButton("Deform")
    deformButton.position(canvasSize + 20, y+=30)
    deformButton.mousePressed(p.draw)

    debug = p.createCheckbox("Debug", false)
    debug.changed(p.draw)
    debug.position(canvasSize + 120, y)

    let detailLabel = p.createSpan("Level of detail")
    detailLabel.position(canvasSize + 20, y+=80)
    subdivControl = p.createSlider(1, 8, NUM_SUBDIVISIONS)
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
    sel.option("dgen.png")
    sel.option("lineargrad.png")
    sel.option("skull.png")
    sel.option("snake.png")
    sel.option("bucwah.png")
    sel.changed(newImage)

    drawLines = p.createCheckbox("Draw lines", true)
    drawLines.changed(p.draw)
    drawLines.position(canvasSize + 120, canvasSize - 40)

    let colourLabel = p.createSpan("Color Preset")
    colourLabel.position(canvasSize + 20, y+=50)
    let colourSelect = p.createSelect()
    colourSelect.position(canvasSize + 20, y+=20)
    colourSelect.option("Purple")
    colourSelect.option("Earthy")
    colourSelect.option("Sky")
    colourSelect.option("Green")
    colourSelect.option("Grey")
    colourSelect.changed(pickPalette)

    shadeA = p.createColorPicker(palette.a)
    shadeA.input(setPalette)
    shadeB = p.createColorPicker(palette.b)
    shadeB.input(setPalette)
    shadeC = p.createColorPicker(palette.lines)
    shadeC.input(setPalette)

    inputImage.filter(p.GRAY)
    inputImage.loadPixels()
    initPenrose(NUM_SUBDIVISIONS)

    p.noLoop()

  }

  p.draw = function() {

    let p1 = p.map(phi1slider.value(), 0, 20, -0.05, 0.05)
    let p2 = p.map(phi2slider.value(), 0, 20, -0.05, 0.05)
    let p4 = p.map(phi4slider.value(), 0, 20, -0.05, 0.05)
    let p5 = p.map(phi5slider.value(), 0, 20, -0.05, 0.05)
    let p6 = p.map(phi6slider.value(), 0, 20, -0.05, 0.05)
    let p7 = p.map(phi7slider.value(), 0, 20, -0.05, 0.05)

    deformTriangles(p1, p2, p4, p5, p6, p7)

    p.background(palette.lines)
    p.strokeWeight(drawLines.checked() ? 1 : 0)
    p.stroke(palette.lines)
    for (let triangle of triangles) {
      if(triangle.type == 0) {
        p.fill(palette.a)
      } else {
        p.fill(palette.b)
      }
      p.beginShape()
      p.vertex(canvasSize*(triangle.vertA.re + 1)/2, canvasSize*(triangle.vertA.im + 1)/2)
      p.vertex(canvasSize*(triangle.vertB.re + 1)/2, canvasSize*(triangle.vertB.im + 1)/2)
      p.vertex(canvasSize*(triangle.vertC.re + 1)/2, canvasSize*(triangle.vertC.im + 1)/2)
      p.vertex(canvasSize*(triangle.vertA.re + 1)/2, canvasSize*(triangle.vertA.im + 1)/2)
      p.endShape()
    }

    p.stroke(palette.lines)
    p.fill("#000")

    if(manualControl.checked()) {
      let y = 30
      p.text("phi1: " + p1.toFixed(2), canvasSize - 60, y+=35)
      p.text("phi2: " + p2.toFixed(2), canvasSize - 60, y+=30)
      p.text("phi4: " + p4.toFixed(2), canvasSize - 60, y+=30)
      p.text("phi5: " + p5.toFixed(2), canvasSize - 60, y+=30)
      p.text("phi6: " + p6.toFixed(2), canvasSize - 60, y+=30)
      p.text("phi7: " + p7.toFixed(2), canvasSize - 60, y+=30)
    }

    if(debug.checked()) {
      p.text("Nodes: " + nodes.length, 0, 15)
      p.text("Triangles: " + triangles.length, 0, 30)

      nodes.forEach(node => {

        let nodeText = ""
        if(node.type)
          nodeText = "t" + node.type
        if(node.angle) {
          p.stroke("#0f0")
          p.beginShape()
          let newVert = node.nodeOrigin.add(math.Complex.fromPolar(0.05,node.angle))
          p.vertex(canvasSize*(node.nodeOrigin.re + 1)/2, canvasSize*(node.nodeOrigin.im + 1)/2)
          p.vertex(canvasSize*(newVert.re + 1)/2, canvasSize*(newVert.im + 1)/2)
          p.endShape()
        }
        p.stroke(shadeC.color())
        p.fill("#000")
        p.text(nodeText, (node.nodeOrigin.re+1)*canvasSize/2, (node.nodeOrigin.im+1)*canvasSize/2)

      })
    }

  }
}

new p5(sketch, "penrose")