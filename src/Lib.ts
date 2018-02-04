// Apparently I have to do this for my local bindings to work... not sure why.
// const cv = require("opencv.js")
import * as cv from "opencv.js"

import { PDFJSStatic } from "pdfjs-dist"
let PDFJS: PDFJSStatic = require("pdfjs-dist")

// PDFJS.workerSrc = '../pdf.worker.bundle.js';
// var PDFJS: PDFJSStatic

async function pdfToPng(pdfUrl: string): Promise<string> {
    let response = await fetch(pdfUrl)
    let pdfArray = await response.arrayBuffer()
    // ArrayBuffer worked for me earlier, just doing this conversion to please the type-checker
    let pdf = await PDFJS.getDocument(new Uint8Array(pdfArray))
    let page = await pdf.getPage(1)

    let canvas = <HTMLCanvasElement> document.querySelector("canvas#pdfConversion")
    await page.render({
        canvasContext: canvas.getContext("2d"),
        viewport: page.getViewport(1)
    })
    let png = canvas.toDataURL("image/png")
    canvas.style.display = "none"
    return png
}

function getHighSaturationRegion(img: cv.Mat): cv.Mat {
    let hsv = new cv.Mat()
    cv.cvtColor(img, hsv, cv.COLOR_RGB2HSV)
    let layers = new cv.MatVector()
    cv.split(hsv, layers)
    let saturation = layers.get(1)
    return saturation
}

export type Params = {
    maxComputeDimension: number,
    saturationThreshold: number,
    distanceToHighSaturation: number,
    polyAccuracy: number,
}

const defaultParams: Params = {
    maxComputeDimension: 1000,
    saturationThreshold: 20,
    distanceToHighSaturation: 5,
    polyAccuracy: 10,
}

let paramsValue: Params = defaultParams

async function fileChanged(e: Event) {
    let input = <any> document.querySelector("input[name=file]")
    let fileList: FileList = input.files
    let file: File = fileList[0]
    let fileReader = new FileReader()
    let buffer: ArrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        fileReader.onload = () => resolve(fileReader.result)
        fileReader.onerror = err => reject(err)

        fileReader.readAsArrayBuffer(file)
    })
    let mat = await pdfToImgArray(buffer)
    let largestPart = largestSaturatedPart(mat, paramsValue)
    cv.imshow("output", largestPart)

    let outputCanvas = <HTMLCanvasElement> document.querySelector("canvas#output")
    outputCanvas.style.display = "none"
    let output = outputCanvas.toDataURL()

    let resultLink = document.createElement("a")
    resultLink.href = output
    resultLink.innerHTML = "Download result"
    document.querySelector("div#main").appendChild(resultLink)
}

export function main() {
    // Make all the HTML elements here because (1) I'm a savage and (2) this is strongly typed, yo.
    const main = document.querySelector("div#main")

    const fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.multiple = false
    fileInput.name = "file"
    fileInput.onchange = fileChanged
    const fileLabel = document.createElement("label")
    fileLabel.innerHTML = "Upload PDF file"
    fileLabel.appendChild(fileInput)

    function makeNumberInput(name: string, labelText: string) {
        const input = document.createElement("input")
        input.type = "number"
        input.name = name
        input.onchange = () => console.log("changed")

        const label = document.createElement("label")
        label.innerText = labelText
        label.appendChild(input)
        return label
    }
    const maxComputeDimension = makeNumberInput("maxComputeDimension", "Max image dimension")
    const saturationThreshold = makeNumberInput("saturationThreshold", "Saturation threshold")
    const distanceToHighSaturation = makeNumberInput("distanceToHighSaturation", "Distance to high saturation")
    const polyAccuracy = makeNumberInput("polyAccuracy", "Poly accuracy")

    const hiddenCanvas = document.createElement("canvas")
    hiddenCanvas.style.display = "none"
    hiddenCanvas.id = "pdfConversion"

    const outputCanvas = document.createElement("canvas")
    outputCanvas.id = "output"

    main.appendChild(fileLabel)
    main.appendChild(document.createElement("br"))
    main.appendChild(maxComputeDimension)
    main.appendChild(document.createElement("br"))
    main.appendChild(distanceToHighSaturation)
    main.appendChild(document.createElement("br"))
    main.appendChild(polyAccuracy)
    main.appendChild(document.createElement("br"))
    main.appendChild(hiddenCanvas)
    main.appendChild(outputCanvas)
}

async function pdfToImgArray(buffer: ArrayBuffer): Promise<cv.Mat> {
    // let response = await fetch(pdfUrl)
    // let pdfArray = await response.arrayBuffer()
    let pdf = await PDFJS.getDocument(new Uint8Array(buffer))
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
    canvas.style.display = "none"
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
function largestSaturatedPart(img: cv.Mat, params: Params) {
    const ratio = Math.max(img.rows / params.maxComputeDimension, img.cols / params.maxComputeDimension)

    const scaledDown = new cv.Mat()
    cv.resize(img, scaledDown, {width: img.cols / ratio, height: img.rows / ratio})

    const hsv = new cv.Mat()
    cv.cvtColor(scaledDown, hsv, cv.COLOR_RGB2HSV)
    const layers = new cv.MatVector()
    cv.split(hsv, layers)
    const saturation = layers.get(1)
    const threshed = new cv.Mat()
    cv.threshold(saturation, threshed, params.saturationThreshold, 255, cv.THRESH_BINARY)
    // cv.imshow("output", threshed)

    const main_part = new cv.Mat()
    cv.blur(threshed, main_part,
            {width: params.distanceToHighSaturation, height: params.distanceToHighSaturation})
    const main_part_thres = new cv.Mat()
    cv.threshold(main_part, main_part_thres, 20, 255, cv.THRESH_BINARY)
    // cv.imshow("output", main_part_thres)

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
    const secondLargest: number = +sortedHist[1][0]

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
    return limitedImg
}

export function fetchBerkeley(params: Params) {
    pngToImgArray("/assets/berkeley.png").then(function(img) {
        console.log("Finished!")
        console.log(img)
        largestSaturatedPart(img, params)
    })
    return 5
}

// To clear canvas:
// context.clearRect(0, 0, canvas.width, canvas.height);
