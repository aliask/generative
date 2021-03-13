let { createCanvas, loadImage } = require('canvas')
const fs = require('fs')
const process = require('process')

const FPS = 20
const DURATION = 10000
const SIZE = 700

function getSinusoidalEase(currentProgress, start, distance, steps) {
  return -distance/2 * (Math.cos(Math.PI*currentProgress/steps) - 1) + start
}
  
function createOffscreenCanvas(canvasWidth, canvasHeight) {
  return offScreenCanvas = createCanvas(canvasWidth, 2*canvasHeight)
}

function fillCanvas(canvas) {
  var context = canvas.getContext("2d")
  var gradient = context.createLinearGradient(0, 0, 0, canvas.height)
  gradient.addColorStop(0, 'white')
  gradient.addColorStop(0.1, 'white')
  gradient.addColorStop(0.45, 'black')
  gradient.addColorStop(0.55, 'black')
  gradient.addColorStop(0.9, 'white')
  gradient.addColorStop(1, 'white')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)
}

function zeroPad(number) {
  if (number<=9999) { number = ("000"+number).slice(-4); }
  return number;
}

function drawGrad(canvas) {
  var ctx = canvas.getContext('2d')
  let pos = 0                           // the offset of the doublesize gradient
  let start = 0, stop = canvas.height   // the limits of offset
  let elapsed = 0                       // milliseconds from start
  let frame = 0                         // frame number, mainly for filename

  function draw() {
    elapsed = (frame * 1000/FPS) + 1 // avoid 0, things get weird with Math.cos()

    pos = getSinusoidalEase(elapsed, start, stop, 5000)
    if(pos <= 0 || pos >= canvas.height) {
      [start, stop] = [stop, start]
    }

    // draw the doublesize gradient within the viewport
    ctx.drawImage(offScreenCanvas,
                    0, pos,                       // src_x, src_y
                    canvas.width, canvas.height,  // src_w, src_h
                    0, 0,                         // dst_x, dst_y
                    canvas.width, canvas.height   // dst_w, dst_h
                  )

    if(elapsed <= DURATION) {
      var dataURL = canvas.toDataURL( "image/png" );
      var blob = Buffer.from(dataURL.substring( "data:image/png;base64,".length ), 'base64')
      fs.writeFile(`breathe/${zeroPad(frame++)}.png`, blob, (err) => {
        if (err) throw err;
      })
    } else {
      process.exit()
    }
  }
  offScreenCanvas = createOffscreenCanvas(canvas.width, canvas.height)
  fillCanvas(offScreenCanvas)
  setInterval(draw, 1000/FPS);
}

const canvas = createCanvas(SIZE, SIZE)
drawGrad(canvas)