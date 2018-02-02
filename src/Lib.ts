import * as cv from "opencv.js"
import { PDFJS } from "pdfjs-dist"

// PDFJS.workerSrc = '../pdf.worker.bundle.js';

async function pdfToPng(pdfUrl: string): Promise<string> {
    let response = await fetch(pdfUrl)
    let pdfArray = await response.arrayBuffer()
    let pdf = await PDFJS.getDocument(pdfArray)
    let page = await pdf.getPage(1)

    let canvas = <HTMLCanvasElement> document.querySelector("canvas#pdfConversion")
    await page.render({
        canvasContext: canvas.getContext("2d"),
        viewport: page.getViewport(1)
    })
    let png = canvas.toDataURL("image/png")
    return png
}

function getHighSaturationRegion(img: cv.Mat): cv.Mat {
    let hsv = cv.Mat()
    cv.cvtColor(img, hsv, cv.COLOR_RGB2HSV)
    let layers = cv.MatVector()
    cv.split(hsv, layers)
    let saturation = layers.get(1)
    return saturation
}

async function pdfToImgArray(pdfUrl: string): Promise<cv.Mat> {
    let response = await fetch(pdfUrl)
    let pdfArray = await response.arrayBuffer()
    let pdf = await PDFJS.getDocument(pdfArray)
    let page = await pdf.getPage(1)
    let viewport = page.getViewport(0.3)

    let canvas = <HTMLCanvasElement> document.querySelector("canvas#pdfConversion")
    let context = canvas.getContext("2d")

    console.log("about to render page")
    canvas.height = viewport.height
    canvas.width = viewport.width
    await page.render({
        canvasContext: context,
        viewport: viewport
    })
    console.log("page rendered")

    let imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    console.log("got image array!")

    let mat = cv.matFromImageData(imageData)
    console.log("made mat!")
    console.log(mat.size())
    console.log(mat.depth())
    console.log(mat.channels())
    return mat
}

export function fetchBerkeley() {
    pdfToImgArray("/assets/berkeley.pdf").then(function(mat) {
        console.log("Finished!")
        console.log(mat)
    })
    return 5
}


// To clear canvas:
// context.clearRect(0, 0, canvas.width, canvas.height);

