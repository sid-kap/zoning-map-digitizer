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
    let viewport = page.getViewport(1)
    // let viewport = page.getViewport(0.3)

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

async function pngToImgArray(pngUrl: string): Promise<cv.Mat> {
    let canvas = <HTMLCanvasElement> document.querySelector("canvas#pdfConversion")
    let context = canvas.getContext("2d")
    let img = new Image()
    let imgStatus = await new Promise(resolve => {
        img.onload = function() {
            console.log(img.width)
            console.log(img.height)
            resolve({status: 'ok'})
        }

        img.onerror = () => resolve({status: 'error'})
        img.src = pngUrl
    })
    console.log("img loaded!")

    // console.log("finished! imgStatus = ")
    // console.log(imgStatus)
    // console.log(img.width, img.height)
    canvas.height = img.height
    canvas.width = img.width
    context.drawImage(img, 0, 0, img.width, img.height)
    let imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    let mat = cv.matFromImageData(imageData)

    // Maybe this will save us some memory?
    canvas.height = 0
    canvas.width = 0
    return mat
}

// TODO Leaks memory. Need to call delete() on the matrices after I'm done
function largestSaturatedPart(img: cv.Mat) {
    const maxDimen = 1000
    const ratio = Math.max(img.rows / maxDimen, img.cols / maxDimen)

    const scaledDown = new cv.Mat()
    cv.resize(img, scaledDown, {width: img.cols / ratio, height: img.rows / ratio})

    const hsv = new cv.Mat()
    cv.cvtColor(scaledDown, hsv, cv.COLOR_RGB2HSV)
    const layers = new cv.MatVector()
    cv.split(hsv, layers)
    const saturation = layers.get(1)
    const threshed = new cv.Mat()
    cv.threshold(saturation, threshed, 255 / 5, 255, cv.THRESH_BINARY)
    cv.imshow("output", threshed)

    const main_part = new cv.Mat()
    cv.blur(threshed, main_part, new cv.Size(5,5))
    const main_part_thres = new cv.Mat()
    cv.threshold(main_part, main_part_thres, 20, 255, cv.THRESH_BINARY)
    cv.imshow("output", main_part_thres)

    console.log("finished threshing")

    const labels = new cv.Mat()
    const stats = new cv.Mat()
    const centroids = new cv.Mat()
    const numComponents = cv.connectedComponentsWithStats(main_part_thres, labels, stats, centroids)

    console.log("got connected components")
    console.log("num components = " + numComponents)

    // find largest connected component
    const hist: { [key: number]: number } = {}
    for (let i = 0; i < numComponents; i++) hist[i] = 0;
    for (let ix in labels.data) hist[labels.data[ix]] += 1;

    const sortedHist = Object.entries(hist).sort((x,y) => y[1] - x[1])
    console.log(sortedHist)
    const secondLargest = sortedHist[1][0]

    const largestComponentImg = new cv.Mat()
    const secondLargestMat = cv.matFromArray(1,1, cv.CV_8UC1, [secondLargest]);

    cv.compare(labels, secondLargestMat, largestComponentImg, cv.CMP_EQ)
    // cv.imshow("output", largestComponentImg)
    console.log("found second largest")

    const contours = new cv.MatVector()
    const hierarchy = new cv.Mat()
    cv.findContours(largestComponentImg, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    const contoursImage = new cv.Mat(largestComponentImg.size(), cv.CV_8UC1)
    cv.drawContours(contoursImage, contours, 0, [255,0,0,1])
    // cv.imshow("output", contoursImage)
    console.log("found contour")

    const approxCurve = new cv.Mat()
    cv.approxPolyDP(contours.get(0), approxCurve, 10, true)
    const contoursToDraw = new cv.MatVector()
    contoursToDraw.push_back(approxCurve)
    // negative thickness tells it to fill in the hole
    const mask = new cv.Mat(contoursImage.size().height, contoursImage.size().width, cv.CV_8UC1, new cv.Scalar())
    cv.drawContours(mask, contoursToDraw, 0, [255,0,0,1], -1)
    console.log("found approx polygon")

    const bigMask = new cv.Mat()
    cv.resize(mask, bigMask, img.size())

    const limitedImg = new cv.Mat()
    // scaledDown.copyTo(limitedImg, mask)
    img.copyTo(limitedImg, bigMask)
    cv.imshow("output", limitedImg)
}

export function fetchBerkeley() {
    pngToImgArray("/assets/berkeley.png").then(function(img) {
        console.log("Finished!")
        console.log(img)
        largestSaturatedPart(img)
    })
    return 5
}

// To clear canvas:
// context.clearRect(0, 0, canvas.width, canvas.height);
