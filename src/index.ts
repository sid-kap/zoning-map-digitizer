// Require index.html so it gets copied to dist
require('./index.html');

import * as Lib from "./Lib.ts"
import * as cv from "opencv.js"

// import ColorPolygonsWorker = require("worker-loader!./ColorPolygonsWorker.worker.ts")

main()

let paramsValue: Lib.Params = Lib.defaultParams

function main() {
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
                                                Lib.defaultParams.maxComputeDimension)
    const saturationThreshold = makeNumberInput("saturationThreshold", "Saturation threshold",
                                                Lib.defaultParams.saturationThreshold)
    const distanceToHighSaturation = makeNumberInput("distanceToHighSaturation", "Distance to high saturation",
                                                     Lib.defaultParams.distanceToHighSaturation)
    const polyAccuracy = makeNumberInput("polyAccuracy", "Poly accuracy",
                                         Lib.defaultParams.polyAccuracy)

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

async function fileChanged(e: Event) {
    console.log("in fileChanged")
    let input = <any> document.querySelector("input[name=file]")
    let fileList: FileList = input.files
    let file: File = fileList[0]
    let fileReader = new FileReader()
    let buffer: ArrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        fileReader.onload = () => resolve(fileReader.result)
        fileReader.onerror = err => reject(err)

        fileReader.readAsArrayBuffer(file)
    })
    console.log("got buffer")
    let mat = await Lib.pdfToImgArray(buffer)
    console.log("got mat")
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

function compute(img: cv.Mat, params: Lib.Params): cv.Mat {
    const ratio = Math.max(img.rows / params.maxComputeDimension, img.cols / params.maxComputeDimension)

    const scaledDown = new cv.Mat()
    cv.resize(img, scaledDown, {width: img.cols / ratio, height: img.rows / ratio})

    // The original image and the scaled-down image with irrelevant parts blacked/zeroed out.
    const {maskedImage, smallerMaskedImage} = Lib.largestSaturatedPart(img, scaledDown, params)

    // Do k-means to get the colors from the scaledDown image.
    // (We use the smaller image because it's faster.)
    const numColors = 25
    const centers = Lib.getColors(smallerMaskedImage, numColors)

    const {labeledByColorIndex: largeImageColor, labeledRGB: largeImageQuantized} = Lib.labelImageByColors(maskedImage, centers)

    console.log("Histogram of colors in image:")
    const hist = Lib.imageHist(largeImageColor, numColors)
    console.log(hist)
    const largestColor = hist[0][0]

    const polygons = new cv.MatVector()
    const main = document.querySelector("div#main")

    const serializedImg: Lib.SerializedMat = {
        rows: largeImageColor.rows,
        cols: largeImageColor.cols,
        type: largeImageColor.type(),
        data: largeImageColor.data.buffer
    }

    for (let i = 0; i < numColors; i++) {
        // Skip the background color
        if (i != largestColor) {
            console.log(`Computing polygons for color ${i}`)

            // TODO I wanted to parallelize this, but using webworkers
            // was surprisingly slow. I will probably try again at some point?
            // const worker = new ColorPolygonsWorker()
            // worker.postMessage({serializedImg, colorIndex: i})

            const polys = Lib.getColorPolygons(largeImageColor, i)
            for (let ix in polys) {
                // TODO also save the color index with it!
                polygons.push_back(polys[ix])
            }
        }
    }

    console.log("about to draw")
    // negative number means draw all contours
    cv.drawContours(largeImageQuantized, polygons, -1, [0,0,255,0], 4)

    scaledDown.delete()
    maskedImage.delete()
    smallerMaskedImage.delete()
    centers.delete()

    return largeImageQuantized
}
