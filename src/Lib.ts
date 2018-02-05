import * as cv from "opencv.js"

import { PDFJSStatic } from "pdfjs-dist"
let PDFJS: PDFJSStatic = require("pdfjs-dist")

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

    function makeNumberInput(name: string, labelText: string, defaultValue: number) {
        const input = document.createElement("input")
        input.type = "number"
        input.name = name
        input.value = defaultValue.toString()
        input.onchange = () => console.log("changed")

        const label = document.createElement("label")
        label.innerText = labelText
        label.appendChild(input)
        return label
    }
    const maxComputeDimension = makeNumberInput("maxComputeDimension", "Max image dimension",
                                                defaultParams.maxComputeDimension)
    const saturationThreshold = makeNumberInput("saturationThreshold", "Saturation threshold",
                                                defaultParams.saturationThreshold)
    const distanceToHighSaturation = makeNumberInput("distanceToHighSaturation", "Distance to high saturation",
                                                     defaultParams.distanceToHighSaturation)
    const polyAccuracy = makeNumberInput("polyAccuracy", "Poly accuracy",
                                         defaultParams.polyAccuracy)

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

    let mat = cv.matFromImageData(imageData)
    canvas.style.display = "none"
    console.log("made mat!")
    // console.log(mat.size())
    // console.log(mat.depth())
    // console.log(mat.channels())
    return mat
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
    let mat3 = new cv.Mat()
    // drop the alpha
    cv.cvtColor(mat, mat3, cv.COLOR_RGBA2RGB)
    mat.delete()
    let result = compute(mat3, paramsValue)

    let outputCanvas = <HTMLCanvasElement> document.querySelector("canvas#output")
    outputCanvas.style.display = "none"
    cv.imshow("output", result)
    let output = outputCanvas.toDataURL()

    let resultLink = document.createElement("a")
    resultLink.href = output
    resultLink.innerHTML = "Download result"
    document.querySelector("div#main").appendChild(resultLink)
}

function compute(img: cv.Mat, params: Params): cv.Mat {
    const ratio = Math.max(img.rows / params.maxComputeDimension, img.cols / params.maxComputeDimension)

    const scaledDown = new cv.Mat()
    cv.resize(img, scaledDown, {width: img.cols / ratio, height: img.rows / ratio})

    // The original image and the scaled-down image with irrelevant parts blacked/zeroed out.
    const {maskedImage, smallerMaskedImage} = largestSaturatedPart(img, scaledDown, params)

    // Do k-means to get the colors from the scaledDown image.
    // (We use the smaller image because it's faster.)
    const numColors = 25
    const centers = getColors(smallerMaskedImage, numColors)

    const {labeledByColorIndex: largeImageColor, labeledRGB: largeImageQuantized} = labelImageByColors(maskedImage, centers)

    console.log("Histogram of colors in image:")
    const hist = imageHist(largeImageColor, numColors)
    console.log(hist)
    const largestColor = hist[0][0]

    const polygons = new Array<cv.Mat>()
    const main = document.querySelector("div#main")

    for (let i = 0; i < numColors; i++) {
        // Skip the background color
        if (i != largestColor) {
            console.log(`Computing polygons for color ${i}`)
            const polys = getColorPolygons(largeImageColor, i)
            polygons.push(polys)

            let canvas = document.createElement("canvas")
            main.appendChild(canvas)
            canvas.id = `color-${i}`
            cv.imshow(`color-${i}`, polys)
        }
    }

    scaledDown.delete()
    maskedImage.delete()
    smallerMaskedImage.delete()
    centers.delete()

    return largeImageQuantized
}

function getColorPolygons(labeledByColorIndex: cv.Mat, colorIndex: number): cv.Mat {
    const mask = new cv.Mat()
    const colorIndexMat = cv.matFromArray(1,1, cv.CV_8U, [colorIndex])
    cv.compare(labeledByColorIndex, colorIndexMat, mask, cv.CMP_EQ)
    console.log("finished masking")

    const blurred = new cv.Mat()
    cv.blur(mask, blurred, {width: 10, height: 10})

    const threshed = new cv.Mat()
    cv.threshold(blurred, threshed, 20, 255, cv.THRESH_BINARY)

    // const dilated = new cv.Mat()
    // const kernel = cv.Mat.ones(10, 10, cv.CV_8U)
    // cv.dilate(mask, dilated, kernel)
    // console.log("finished dilating")
    console.log("finished blurring and threshing")

    // cv.imshow("output", dilated)
    cv.imshow("output", threshed)

    // const labels = new cv.Mat()
    // const numComponents = cv.connectedComponents(dilated, labels)
    // console.log(`numComponents = ${numComponents}`)

    mask.delete()
    colorIndexMat.delete()
    blurred.delete()

    return threshed
    // firs

    // const contours = new cv.MatVector()
    // cv.findContours(dilated, contours, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    // console.log("found contours")

    // const simpleContours = new cv.MatVector()
    // for (let i = 0; i < contours.size(); i++) {
    //     const contour = contours.get(i)
    //     const approxCurve = new cv.Mat()
    //     cv.approxPolyDP(contour, approxCurve, 10, true)
    //     simpleContours.push_back(approxCurve)
    // }
    // console.log("found approx polygons")

    // const polygonsFound = new cv.Mat(labeledByColorIndex.size(), cv.CV_8UC3)
    // for (let i = 0; i < simpleContours.size(); i++) {
    //     cv.drawContours(polygonsFound, simpleContours, i, [255,0,0,0],
    //                     4 // thickness
    //                    )
    // }
    // console.log("drew polygons")

    // return polygonsFound

}

// computes histogram of an image, assuming image type is integral (not floating)
// and the values in the image are integers in [0, numValues)
function imageHist(img: cv.Mat, numValues: number): [number, number][] {
    const hist = new Array<number>()
    for (let i = 0; i < numValues; i++) hist[i] = 0;

    const data = img.data
    for (let ix in img.data) hist[data[ix]] += 1;

    const sortedHist = Object.entries(hist).sort((x,y) => y[1] - x[1])

    // acrobatics to convince the compiler that this does, indeed, return an array
    // where each element is an array of length 2, and contains numbers
    const retArray = new Array<[number, number]>()
    for (let ix = 0; ix < numValues; ix++) retArray.push([+sortedHist[ix][0], +sortedHist[ix][1]])
    // console.log(retArray)

    return retArray
}

function largestSaturatedPart(img: cv.Mat, scaledDown: cv.Mat, params: Params):
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

function getColors(img: cv.Mat, K: number): cv.Mat {
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
    const iterations = 10
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
function labelImageByColors(img: cv.Mat, colors: cv.Mat): {labeledByColorIndex: cv.Mat, labeledRGB: cv.Mat} {
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
