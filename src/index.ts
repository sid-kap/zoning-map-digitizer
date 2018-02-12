// Require index.html so it gets copied to dist
require('./index.html');

import * as Lib from "./Lib.ts"
import * as cv from "opencv.js"
import * as L from "leaflet"
const GeoSearch = require("leaflet-geosearch")

// import ColorPolygonsWorker = require("worker-loader!./ColorPolygonsWorker.worker.ts")

main()
makeMap()

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
    let {mat, imageUrl} = await Lib.pdfToImgArray(buffer)
    console.log("got mat")


    const fabricDiv = document.querySelector("div#fabric-container")
    // const divWidth = (<any> fabricDiv).offsetWidth
    // const fabricCanvas = <HTMLCanvasElement> document.querySelector("canvas#fabric-canvas")
    // const height = mat.rows * (divWidth / mat.cols)
    // const fabricCanvasAny = <any> fabricCanvas
    // fabricCanvasAny.width = 3 * divWidth
    // fabricCanvasAny.height = 3 * height
    // const shrunk = new cv.Mat()
    // cv.resize(mat, shrunk, {width: 3 * divWidth, height: 3 * height})

    // const ctx = fabricCanvas.getContext("2d")
    // const imageData = new ImageData(new Uint8ClampedArray(shrunk.data), shrunk.cols, shrunk.rows)
    // ctx.putImageData(imageData,0,0)
    // fabricCanvasAny.style.width = divWidth + "px"
    // fabricCanvasAny.style.height = height + "px"

    // const imageUrl = fabricCanvas.toDataURL()
    // ctx.clearRect(0,0, fabricCanvas.width, fabricCanvas.height)

    // This feels hacky
    // fabricCanvas.parentNode.removeChild(fabricCanvas)
    // fabricCanvas.style.width = "0px"
    // fabricCanvas.style.height = "0px"

    const imgMapEl = document.createElement("div")
    imgMapEl.id = "img-map"
    imgMapEl.style.height = "400px"
    fabricDiv.appendChild(imgMapEl)

    const zoomFactor = 1 / 8
    const zoomedCRS = L.Util.extend(L.CRS.Simple, {
        transformation: new L.Transformation(zoomFactor, 0, -zoomFactor, 0),
    })

    const imgMap = new L.Map("img-map", {
        // crs: L.CRS.Simple,
        crs: zoomedCRS,
        // minZoom: 1,
        // maxZoom: 10,
        center: [mat.cols / 2, mat.rows / 2],
        zoom: 1,
    })

    // const southWest = imgMap.unproject([0, 3 * height],   imgMap.getMaxZoom()-1)
    // const northEast = imgMap.unproject([3 * divWidth, 0], imgMap.getMaxZoom()-1)
    // console.log(southWest, northEast)
    const bounds = L.latLngBounds(L.latLng(0, 0), L.latLng(mat.rows, mat.cols))
    const imgOverlay = L.imageOverlay(imageUrl, bounds).addTo(imgMap)

    for (let i = 0; i < 4; i++) {
        const link = document.createElement("a")

        // TODO add CSS for this class so that the link doesn't turn purple after clicking
        link.classList.add("drop-marker-link")

        link.href = "#"
        link.innerHTML = "Drop marker " + i
        link.onclick = e => {
            // Don't go to top of page
            e.preventDefault()

            if (mapState.konvaMarkers.has(i)) {
                // TODO This is ratchet, don't use alert.
                alert("Marker " + i + " already dropped")
            } else {
                // TODO Make the marker show the marker index
                const marker = L.marker(imgMap.getCenter(), { draggable: true }).addTo(imgMap)
                mapState.konvaMarkers.set(i, marker)
            }
        }
        fabricDiv.appendChild(link)
        fabricDiv.appendChild(document.createElement("br"))
    }

    // let mat3 = new cv.Mat()
    // // drop the alpha
    // cv.cvtColor(mat, mat3, cv.COLOR_RGBA2RGB)
    // mat.delete()
    // let result = compute(mat3, paramsValue)

    // let outputCanvas = <HTMLCanvasElement> document.querySelector("canvas#output")
    // outputCanvas.style.display = "none"
    // cv.imshow("output", result)
    // let output = outputCanvas.toDataURL()

    // let resultLink = document.createElement("a")
    // resultLink.href = output
    // resultLink.innerHTML = "Download result"
    // document.querySelector("div#main").appendChild(resultLink)
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

let mapState = {
    leafletMarkers: new Map<number, L.Marker>(),
    konvaMarkers:   new Map<number, L.Marker>()
}

function makeMap() {
    console.log("making map")
    const main = document.querySelector("div#main")
    const mapDiv = document.createElement("div")
    mapDiv.id = "map-container"
    mapDiv.style.display = "grid"

    // hack because the type declaration doesn't know about grid-*
    const mapDivAny = <any> mapDiv
    mapDivAny.style["grid-template-columns"] = "repeat(2, 1fr)"
    mapDivAny.style["grid-gap"] = "10px"
    // grid-template-columns: repeat(3, 1fr);
    // grid-gap: 10px;
    // grid-auto-rows: minmax(100px, auto);

    main.appendChild(mapDiv)

    const fabricDiv = document.createElement("div")
    fabricDiv.id = "fabric-container"
    mapDiv.appendChild(fabricDiv)
    const fabricDivAny = <any> fabricDiv
    fabricDivAny.style["grid-row"] = "1"
    fabricDivAny.style["grid-column"] = "1"

    const fabricCanvas = document.createElement("canvas")
    fabricCanvas.id = "fabric-canvas"
    fabricDiv.appendChild(fabricCanvas)

    const leafletDiv = document.createElement("div")
    leafletDiv.id = "leaflet-container"
    mapDiv.appendChild(leafletDiv)
    const leafletDivAny = <any> mapDiv
    leafletDivAny.style["grid-row"] = "1;"
    leafletDivAny.style["grid-column"] = "2;"

    const mapEl = document.createElement("div")
    mapEl.id = "map"
    mapEl.style.height = "400px"
    leafletDiv.appendChild(mapEl)

    const provider = new GeoSearch.OpenStreetMapProvider()

    const searchControl = new GeoSearch.GeoSearchControl({
        provider: provider,
    })

    const map = new L.Map('map').setView([37.773972, -122.431297], 13)
    L.tileLayer(
        "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
        maxZoom: 18,
        id: "mapbox.streets",
        accessToken: "pk.eyJ1Ijoic2lkLWthcCIsImEiOiJjamRpNzU2ZTMxNWE0MzJtZjAxbnphMW5mIn0.b6m4jgFhPOPOYOoaNGmogQ",
    }).addTo(map);
    map.addControl(searchControl)

    for (let i = 0; i < 4; i++) {
        const link = document.createElement("a")

        // TODO add CSS for this class so that the link doesn't turn purple after clicking
        link.classList.add("drop-marker-link")

        link.href = "#"
        link.innerHTML = "Drop marker " + i
        link.onclick = e => {
            // Don't go to top of page
            e.preventDefault()

            if (mapState.leafletMarkers.has(i)) {
                // TODO This is ratchet, don't use alert.
                alert("Marker " + i + " already dropped")
            } else {
                // TODO Make the marker show the marker index
                const marker = L.marker(map.getCenter(), { draggable: true }).addTo(map)
                mapState.leafletMarkers.set(i, marker)
            }
        }
        leafletDiv.appendChild(link)
        leafletDiv.appendChild(document.createElement("br"))
    }
}
