import * as cv from "opencv.js"

import { PDFJSStatic } from "pdfjs-dist"
const PDFJS: PDFJSStatic = require("pdfjs-dist/webpack")
PDFJS.workerSrc = "/pdf.worker.js"

// const loadRust = require("./lib.rs")

// let add: (a: number, b: number) => number

// export async function loadAndUseRust() {
//     loadRust().then((result: any) => {
//         add = result.instance.exports['add']
//         console.log("rust loaded!")
//         console.log("the answer is", add(2,3))
//     })
// }

export type SerializedMat = {
    rows: number,
    cols: number,
    type: cv.MatType,
    data: ArrayBuffer
}

export async function pdfToImgArray(buffer: ArrayBuffer): Promise<{ mat: cv.Mat, imageUrl: string}> {
    // let response = await fetch(pdfUrl)
    // let pdfArray = await response.arrayBuffer()
    console.log("in pdfToImgArray")
    let pdf = await PDFJS.getDocument(new Uint8Array(buffer))
    console.log("got document")
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

    let imageUrl = canvas.toDataURL()

    let mat = cv.matFromImageData(imageData)
    canvas.style.display = "none"
    console.log("made mat!")
    // console.log(mat.size())
    // console.log(mat.depth())
    // console.log(mat.channels())
    return {mat, imageUrl}
}

function getHighSaturationRegion(img: cv.Mat): cv.Mat {
    let hsv = new cv.Mat()
    cv.cvtColor(img, hsv, cv.COLOR_RGB2HSV)
    let layers = new cv.MatVector()
    cv.split(hsv, layers)
    let saturation = layers.get(1)

    hsv.delete()
    layers.delete()
    return saturation
}

export type Params = {
    maxComputeDimension: number,
    saturationThreshold: number,
    distanceToHighSaturation: number,
    polyAccuracy: number,
}

export const defaultParams: Params = {
    maxComputeDimension: 1000,
    saturationThreshold: 20,
    distanceToHighSaturation: 5,
    polyAccuracy: 10,
}

export function getColorPolygons(labeledByColorIndex: cv.Mat, colorIndex: number): Array<cv.Mat>
    {
    const mask = new cv.Mat()
    const colorIndexMat = cv.matFromArray(1,1, cv.CV_8U, [colorIndex])
    cv.compare(labeledByColorIndex, colorIndexMat, mask, cv.CMP_EQ)
    console.log("finished masking")

    const blurred = new cv.Mat()
    cv.blur(mask, blurred, {width: 10, height: 10})

    const threshed = new cv.Mat()
    cv.threshold(blurred, threshed, 20, 255, cv.THRESH_BINARY)

    console.log("finished blurring and threshing")

    const componentsLabeled = new cv.Mat()
    const numComponents = cv.connectedComponents(threshed, componentsLabeled)
    console.log(`numComponents = ${numComponents}`)

    mask.delete()
    colorIndexMat.delete()
    blurred.delete()

    if (numComponents < 200) {
        // otherwise its probably shit.
        const hist = imageHist(componentsLabeled, numComponents)

        console.log(hist)
        const contours = new Array<cv.Mat>()

        for (let ix in hist) {
            const component = hist[ix][0]
            const freq = hist[ix][1]
            if (component != 0 && freq > 50) {
                console.log(`doing shit for component ${component}`)

                const contour = getBlobContour(componentsLabeled, component)

                console.log("contour for component", component, "length", contour.length)
                console.log(contour)

                // **Very important**: OpenCV represents contour points in (x,y) format,
                // which is flipped from (row,col) order.
                // See https://stackoverflow.com/questions/25642532/opencv-pointx-y-represent-column-row-or-row-column
                const contoursFlattened = ([] as number[]).concat(...(contour.map(x => [x.col, x.row])))
                const contourMat = cv.matFromArray(contour.length, 2, cv.CV_32S, contoursFlattened)
                const approxCurve = new cv.Mat()
                cv.approxPolyDP(contourMat, approxCurve, 5, true)

                contours.push(approxCurve)

                // edges.delete()
                // componentMask.delete()
                // colorIndexMat.delete()
                // contourVec.delete()
            }
        }

        console.log("done with all contours")

        return contours
        // let canvas = document.createElement("canvas")
        // main.appendChild(canvas)
        // canvas.id = `color-${i}`
        // cv.imshow(`color-${i}`, threshed)
    } else {
        return []
    }

}

// only works with 32S (C1) arrays
// Code basically copied from https://chaosinmotion.blog/2014/08/21/finding-the-boundary-of-a-one-bit-per-pixel-monochrome-blob/
function getBlobContour(blobs: cv.Mat, blobIndex: number) {

    const data = blobs.data32S

    const numRows = blobs.rows
    const numCols = blobs.cols

    function isPixel(r: number, c: number): boolean {
        return data[r * numCols + c] == blobIndex
    }

    function getStartingPoint(): {row: number, col: number} | null {
        for (let r = 0; r < numRows; r++) {
            for (let c = 0; c < numCols; c++) {
                if (isPixel(r,c)) {
                    return {row: r, col: c}
                }
            }
        }
        return null
    }

    function getPixelState(r: number, c: number): number {
        let ret = 0

        // (x-1, y-1)
        if (isPixel(r-1, c-1)) ret |= 1
        // (x, y-1)
        if (isPixel(r-1, c)) ret |= 2
        // (x-1, y)
        if (isPixel(r,c-1)) ret |= 4
        // (x,y)
        if (isPixel(r,c)) ret |= 8
        return ret
    }

    type Direction = "up" | "down" | "left" | "right"

    function nextMove(state: number, dir: Direction): Direction | "illegal" {
        if (state == 1) return "left"
        if (state == 2) return "up"
        if (state == 3) return "left"
        if (state == 4) return "down"
        if (state == 5) return "down"
        if (state == 6 && dir == "right") return "down"
        if (state == 6 && dir == "left") return "up"
        if (state == 7) return "down"
        if (state == 8) return "right"
        if (state == 9 && dir == "down") return "left"
        if (state == 9 && dir == "up") return "right"
        if (state == 10) return "up"
        if (state == 11) return "left"
        if (state == 12) return "right"
        if (state == 13) return "right"
        if (state == 14) return "up"

        console.error(`illegal move, state=${state}, dir=${dir}`)
        return 'illegal'
    }

    const startingPoint = getStartingPoint()
    if (startingPoint == null) {
        throw new Error(`${blobIndex} not found in array.`)
    }

    const points = [startingPoint]
    let r = startingPoint.row
    let c = startingPoint.col
    let dir: Direction = 'up'
    do {
        const state = getPixelState(r,c)
        const move = nextMove(state, dir)
        if (move == "illegal") throw new Error("Illegal move!")
        if (move == "up") r -= 1
        if (move == "down") r += 1
        if (move == "left") c -= 1
        if (move == "right") c += 1
        dir = move

        points.push({row: r, col: c})

    } while (r != startingPoint.row || c != startingPoint.col)

    return points
}

// computes histogram of an image, assuming image type is integral (not floating)
// and the values in the image are integers in [0, numValues)
// assumes 1 channel
export function imageHist(img: cv.Mat, numValues: number): [number, number][] {
    if (img.channels() != 1) throw new Error(`Channels should equal 1. Found: ${img.channels()}`)

    const hist = new Array<number>()
    for (let i = 0; i < numValues; i++) hist[i] = 0;

    let data
    if (img.type() == cv.CV_8U) {
        data = img.data
    } else if (img.type() == cv.CV_32S) {
        data = img.data32S
    } else {
        throw new Error(`Image type is ${img.type()}, only 8U and 32U supported`)
    }

    const numRows = img.rows
    const numCols = img.cols
    for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
            hist[data[r * numCols + c]] += 1
        }
    }

    const sortedHist = Object.entries(hist).sort((x,y) => y[1] - x[1])

    // acrobatics to convince the compiler that this does, indeed, return an array
    // where each element is an array of length 2, and contains numbers
    const retArray = new Array<[number, number]>()
    for (let ix = 0; ix < numValues; ix++) retArray.push([+sortedHist[ix][0], +sortedHist[ix][1]])
    // console.log(retArray)

    return retArray
}

export function largestSaturatedPart(img: cv.Mat, scaledDown: cv.Mat, params: Params):
    {maskedImage: cv.Mat, smallerMaskedImage: cv.Mat} {

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
    const numComponents = cv.connectedComponents(main_part_thres, labels)

    console.log("got connected components")
    console.log("num components = " + numComponents)

    const sortedHist = imageHist(labels, numComponents)
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

    const maskedImage = new cv.Mat()
    img.copyTo(maskedImage, bigMask)

    const smallerMaskedImage = new cv.Mat()
    scaledDown.copyTo(smallerMaskedImage, mask)

    // Clear memory
    hsv.delete()
    layers.delete()
    threshed.delete()
    main_part.delete()
    main_part_thres.delete()
    labels.delete()
    largestComponentImg.delete()
    secondLargestMat.delete()
    contours.delete()
    hierarchy.delete()
    contoursImage.delete()
    approxCurve.delete()
    contoursToDraw.delete()
    mask.delete()
    bigMask.delete()

    return {maskedImage, smallerMaskedImage}
}

export function getColors(img: cv.Mat, K: number): cv.Mat {
    const labels = new cv.Mat()
    const centers = new cv.Mat()
    // const criteria = new cv.TermCriteria(cv.TermCriteria_EPS + cv.TermCriteria_MAX_ITER, 100, 0.1)
    const criteria = new cv.TermCriteria(cv.TermCriteria_EPS + cv.TermCriteria_MAX_ITER, 10, 1)
    const flags = cv.KMEANS_PP_CENTERS
    // const flags = cv.KMEANS_RANDOM_CENTERS

    let continuousImg
    if (img.isContinuous()) {
        continuousImg = img
    } else {
        console.log("Image was not continuous for some reason, this is unexpected. Also, we leaking.")
        continuousImg = img.clone()
    }

    // from R x C x 3 matrix to (R*C) x 3 x 1 matrix
    // console.log("about to reshape")
    const imgFloat = new cv.Mat()
    img.convertTo(imgFloat, cv.CV_32F)
    // debugMatrix(img)
    // debugMatrix(imgFloat)
    const pixels = cv.matFromArray(imgFloat.rows * imgFloat.cols,
                                   imgFloat.channels(), cv.CV_32F,
                                   Array.from(imgFloat.data32F))
    // debugMatrix(pixels)
    // console.log("done reshaping")
    console.log("Running KMeans")
    // const iterations = 10

    const iterations = 1 // temporarily, since I'm running this a lot
    cv.kmeans(pixels, K, labels, criteria, iterations, flags, centers)
    console.log("Kmeans finished")

    const centers8U = cv.matFromArray(centers.rows, centers.cols, cv.CV_8U,
                                      Array.from(centers.data32F))

    imgFloat.delete()
    pixels.delete()
    labels.delete()
    centers.delete()

    return centers8U
}

function debugMatrix(mat: cv.Mat) {
    console.log(`${mat.rows} ${mat.cols} ${mat.channels()} ${mat.type()} ${mat.data.length} ${mat.data32F.length}`)
}

// Returns a new image, same size as `img` (but with only one channel), where each
// pixel contains the (index of the) color in `colors` that is closest.
// TODO if this is too slow, rewrite it in rust :P
export function labelImageByColors(img: cv.Mat, colors: cv.Mat): {labeledByColorIndex: cv.Mat, labeledRGB: cv.Mat} {
    let continuousImg
    if (img.isContinuous()) {
        continuousImg = img
    } else {
        console.log("Image was not continuous for some reason, this is unexpected. Also, we leaking.")
        continuousImg = img.clone()
    }

    const labeledRGB = new cv.Mat(img.size(), cv.CV_8UC3)
    const labeledByColorIndex = new cv.Mat(img.size(), cv.CV_8U)
    const rows = labeledRGB.rows
    const cols = labeledRGB.cols
    const numColors = colors.rows
    const numChannels = colors.cols

    console.log(`Img: ${img.rows} ${img.cols} ${img.channels()}`)
    console.log(`Colors: ${colors.rows} ${colors.cols} ${colors.channels()}`)
    if (img.channels() != numChannels) {
        console.error("Number of channels are not equal! Things are about to get very screwed up.")
    }
    if (numChannels != 3) {
        throw new Error("This code only works with 3-channel images.")
    }
    if (img.type() != cv.CV_8UC3) {
        throw new Error("img should be unsigned 8-bit 3-channel")
    }
    if (colors.type() != cv.CV_8U) {
        throw new Error("colors should be unsigned 8-bit 1-channel")
    }
    console.log(colors.data)

    // Premature optimization
    const colorsData = colors.data
    const imageData = img.data
    const labeledRGBData = labeledRGB.data
    const labeledByColorIndexData = labeledByColorIndex.data

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let best = 0
            let shortestDist = Number.MAX_VALUE
            for (let i = 0; i < numColors; i++) {
                const colorStart = i * numChannels
                const imgStart = r * cols * numChannels + c * numChannels
                let dist = 0
                for (let channel = 0; channel < numChannels; channel++) {
                    let diff = colorsData[colorStart + channel] - imageData[imgStart + channel]
                    dist += diff * diff
                }
                if (dist < shortestDist) {
                    shortestDist = dist
                    best = i
                }
                for (let channel = 0; channel < numChannels; channel++) {
                    labeledRGBData[(r * cols + c) * numChannels + channel] = colorsData[best * numChannels + channel]
                }
                labeledByColorIndexData[r * cols + c] = best
            }
        }
    }
    return {labeledByColorIndex, labeledRGB}
}

function reshapeMat(mat: cv.Mat, rows: number, cols: number, newTpe: cv.MatType): cv.Mat {
    // should check that rows * cols * new channels = old rows * cols * channels
    // but idk how, sounds v tedious
    // so use this function very carefully
    return cv.matFromArray(rows, cols, newTpe, Array.from(mat.data))
}

// To clear canvas:
// context.clearRect(0, 0, canvas.width, canvas.height);
