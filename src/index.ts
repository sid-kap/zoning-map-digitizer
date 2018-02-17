// Require index.html so it gets copied to dist
import "./index.pug"
import "./index.scss"

import * as Lib from "./Lib.ts"
import * as cv from "opencv.js"
import * as L from "leaflet"
const GeoSearch = require("leaflet-geosearch")

// import ColorPolygonsWorker = require("worker-loader!./ColorPolygonsWorker.worker.ts")

main()

let paramsValue: Lib.Params = Lib.defaultParams

function makeUploadStep(wrapper: HTMLDivElement) {
    wrapper.style.maxWidth = "70em"

    const fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.multiple = false
    fileInput.name = "file"
    fileInput.onchange = fileChanged
    const fileLabel = document.createElement("label")
    fileLabel.innerHTML = "Upload PDF file"
    fileLabel.appendChild(fileInput)
    setGridLoc(fileLabel, "2", "1 / 2")

    const description = document.createElement("p")
    description.innerHTML = "..."
    setGridLoc(description, "3", "1 / 2")

    wrapper.style.display = "grid"
    setPropAny(wrapper.style, "grid-template-columns", "repeat(2, 1fr)")
    setPropAny(wrapper.style, "grid-auto-rows", "minmax(10px, auto)")
    setPropAny(wrapper.style, "grid-gap", "10px")

    wrapper.appendChild(fileLabel)
    wrapper.appendChild(description)

    const previewDiv = document.createElement("div")
    previewDiv.style.width = "500px"
    previewDiv.style.height = "500px"
    previewDiv.style.backgroundColor = "#555555"
    setGridLoc(previewDiv, "2 / 3", "2 / 3")

    const preview = document.createElement("img")
    preview.id = "original-preview"
    preview.style.maxHeight = "100%"
    preview.style.maxWidth = "100%"

    const loader = document.createElement("div")
    loader.classList.add("loader")
    loader.id = "original-preview-loader"
    loader.style.zIndex = "10"
    loader.style.margin = "auto"
    loader.style.display = "none"

    previewDiv.appendChild(preview)
    previewDiv.appendChild(loader)

    wrapper.appendChild(previewDiv)
}

function setPropAny<T>(x: T, key: string, val: string) {
    const xAny = <any> x
    xAny[key] = val
}

function makeCanvas(id: string): HTMLCanvasElement {
    const preview = <HTMLCanvasElement> document.createElement("canvas")
    preview.id = id
    preview.width = 500
    preview.height = 500
    preview.style.width = "500px"
    preview.style.height = "500px"
    preview.style.backgroundColor = "#555555"

    return preview
}

function setGridLoc(el: HTMLElement, gridRow: string, gridColumn: string) {
    setPropAny(el.style, "grid-row", gridRow)
    setPropAny(el.style, "grid-column", gridColumn)
}

function makeSegmentationStep(wrapper: HTMLDivElement) {
    wrapper.style.maxWidth = "70em"

    wrapper.style.display = "grid"
    setPropAny(wrapper.style, "grid-template-columns", "repeat(2, 1fr)")
    setPropAny(wrapper.style, "grid-gap", "10px")

    const preview = <HTMLImageElement> document.createElement("img") // makeCanvas("segmentation-preview")
    setGridLoc(preview, "2", "2 / 3")
    preview.style.maxWidth = "100%"
    preview.style.maxHeight = "100%"

    const maxComputeDimension =
        makeNumberInput("maxComputeDimension", "Max image dimension",
                        Lib.defaultParams.maxComputeDimension, true)
    const saturationThreshold =
        makeNumberInput("saturationThreshold", "Saturation threshold",
                        Lib.defaultParams.saturationThreshold, true)
    const distanceToHighSaturation =
        makeNumberInput("distanceToHighSaturation",
                        "Distance to high saturation",
                        Lib.defaultParams.distanceToHighSaturation, true)

    const button = document.createElement("button")
    button.type = "button"
    button.innerHTML = "Segment image"

    // since the whole panel is disabled right now
    button.disabled = true

    button.onclick = () => {
        button.disabled = true
        segmentationStep(+maxComputeDimension.input.value, +saturationThreshold.input.value,
                         +distanceToHighSaturation.input.value)
        button.disabled = false
        const imageUrl = Lib.matToDataURL(appState.maskedImage, <HTMLCanvasElement> document.querySelector("canvas#pdfConversion"))
        preview.src = imageUrl
    }

    const controls = document.createElement("div")
    setGridLoc(controls, "2", "1 / 2")
    for (const x of [maxComputeDimension, saturationThreshold, distanceToHighSaturation]) {
        controls.appendChild(x.label)
        controls.appendChild(document.createElement("br"))
    }
    controls.appendChild(button)

    wrapper.classList.add("step-disabled")
    wrapper.appendChild(controls)
    wrapper.appendChild(preview)
}

function makeNumberInput(name: string, labelText: string, defaultValue: number,
                         disabled: boolean): {label: HTMLLabelElement, input: HTMLInputElement} {
    const input = document.createElement("input")
    input.type = "number"
    input.name = name
    input.value = defaultValue.toString()
    input.onchange = () => console.log("changed")
    input.disabled = disabled

    const label = document.createElement("label")
    label.innerText = labelText
    label.appendChild(input)
    return {label, input}
}

function main() {
    // Make all the HTML elements here because (1) I'm a savage and (2) this is strongly typed, yo.
    const body = document.querySelector("body")
    body.style.backgroundColor = "#fbf7ea"
    body.style.color = "#444444"

    const main = <HTMLElement> document.querySelector("div#main")

    makeUploadStep(document.querySelector("div#step1"))

    makeSegmentationStep(document.querySelector("div#step2"))

    const polyAccuracy = makeNumberInput("polyAccuracy", "Poly accuracy",
                                         Lib.defaultParams.polyAccuracy, true)

    const hiddenCanvas = document.createElement("canvas")
    hiddenCanvas.style.display = "none"
    hiddenCanvas.id = "pdfConversion"
    main.appendChild(hiddenCanvas)

    const step4 = <HTMLElement> document.querySelector("div#step4")

    step4.style.maxWidth = "70em"
    step4.appendChild(polyAccuracy.label)
    step4.appendChild(document.createElement("br"))

    makeMap(document.querySelector("div#step3"))
}

async function fileChanged(e: Event) {
    console.log("in fileChanged")
    let input = <any> document.querySelector("input[name=file]")
    let fileList: FileList = input.files
    let file: File = fileList[0]
    let fileReader = new FileReader()

    // document.querySelector("img#original-preview").classList.add("loader")
    const loader = <HTMLElement> document.querySelector("div#original-preview-loader")
    loader.style.removeProperty("display")

    let buffer: ArrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        fileReader.onload = () => resolve(fileReader.result)
        fileReader.onerror = err => reject(err)

        fileReader.readAsArrayBuffer(file)
    })
    console.log("got buffer")
    let {mat, imageUrl} = await Lib.pdfToImgArray(buffer)
    appState.originalImg = mat
    console.log("got mat")
    loader.style.display = "none"

    let img = <HTMLImageElement> document.querySelector("img#original-preview")
    img.src = imageUrl

    setupCorrespondenceImgMap(imageUrl, mat)

    // Unblock step 2
    document.querySelector("div#step2").classList.remove("step-disabled")
    for (const input of Array.from(document.querySelectorAll("div#step2 input"))) {
        const inp = <HTMLInputElement> input
        inp.disabled = false
    }
    let button = <HTMLButtonElement> document.querySelector("div#step2 button")
    button.disabled = false



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

// TODO should be able to pass a cv.Shape type here instead of the actual mat
function setupCorrespondenceImgMap(imageUrl: string, mat: cv.Mat) {
    const fabricDiv = document.querySelector("div#leaflet-img-container")

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

            if (appState.konvaMarkers.has(i)) {
                // TODO This is ratchet, don't use alert.
                alert("Marker " + i + " already dropped")
            } else {
                // TODO Make the marker show the marker index
                const marker = L.marker(imgMap.getCenter(), { draggable: true }).addTo(imgMap)
                appState.konvaMarkers.set(i, marker)
                marker.on("moveend", recomputeCorrespondence)
            }
        }
        fabricDiv.appendChild(link)
        fabricDiv.appendChild(document.createElement("br"))
    }
}

function segmentationStep(maxComputeDimension: number, saturationThreshold: number,
                          distanceToHighSaturation: number) {
    const img = appState.originalImg

    const ratio = Math.max(img.rows / maxComputeDimension, img.cols / maxComputeDimension)

    const scaledDown = new cv.Mat()
    cv.resize(img, scaledDown, {width: img.cols / ratio, height: img.rows / ratio})

    // The original image and the scaled-down image with irrelevant parts blacked/zeroed out.
    const {maskedImage, smallerMaskedImage} = Lib.largestSaturatedPart(img, scaledDown, saturationThreshold, distanceToHighSaturation)
    console.log("Done finding saturated part!")

    appState.scaledDown = scaledDown

    appState.maskedImage = maskedImage
    appState.smallerMaskedImage = smallerMaskedImage
}

function compute(): cv.Mat {
    // Do k-means to get the colors from the scaledDown image.
    // (We use the smaller image because it's faster.)
    const numColors = 25
    const centers = Lib.getColors(appState.smallerMaskedImage, numColors)

    const {labeledByColorIndex: largeImageColor, labeledRGB: largeImageQuantized} = Lib.labelImageByColors(appState.maskedImage, centers)

    console.log("Histogram of colors in image:")
    const hist = Lib.imageHist(largeImageColor, numColors)
    console.log(hist)
    const largestColor = hist[0][0]

    const polygons = new cv.MatVector()
    const main = document.querySelector("div#main")

    // const serializedImg: Lib.SerializedMat = {
    //     rows: largeImageColor.rows,
    //     cols: largeImageColor.cols,
    //     type: largeImageColor.type(),
    //     data: largeImageColor.data.buffer
    // }

    for (let i = 0; i < numColors; i++) {
        // Skip the background color
        if (i != largestColor) {
            console.log(`Computing polygons for color ${i}`)

            // TODO I wanted to parallelize this, but using webworkers
            // was surprisingly slow. I will probably try again at some point?
            // const worker = new ColorPolygonsWorker()
            // worker.postMessage({serializedImg, colorIndex: i})

            const polys = Lib.getColorPolygons(largeImageColor, i)
            for (let poly of polys) {
                // TODO also save the color index with it!
                polygons.push_back(poly)
            }
        }
    }

    console.log("about to draw")
    // negative number means draw all contours
    cv.drawContours(largeImageQuantized, polygons, -1, [0,0,255,0], 4)

    // TODO delete these? or leave them in case we want to re-run this step with
    // different params?
    // scaledDown.delete()
    // maskedImage.delete()
    // smallerMaskedImage.delete()
    centers.delete()

    return largeImageQuantized
}

let appState = {
    originalImg: <cv.Mat> null,
    scaledDown: <cv.Mat> null,
    maskedImage: <cv.Mat> null,
    smallerMaskedImage: <cv.Mat> null,
    leafletMarkers: new Map<number, L.Marker>(),
    konvaMarkers:   new Map<number, L.Marker>()
}

function makeMap(wrapper: HTMLDivElement) {
    wrapper.classList.add("step-disabled")
    const leafletDiv = <HTMLElement> document.querySelector("div#leaflet-map-container")

    const mapEl = document.createElement("div")
    mapEl.id = "map"
    mapEl.style.height = "400px"
    leafletDiv.appendChild(mapEl)

    const searchControl = new GeoSearch.GeoSearchControl({
        provider: new GeoSearch.OpenStreetMapProvider(),
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

            if (appState.leafletMarkers.has(i)) {
                // TODO This is ratchet, don't use alert.
                alert("Marker " + i + " already dropped")
            } else {
                // TODO Make the marker show the marker index
                const marker = L.marker(map.getCenter(), { draggable: true }).addTo(map)
                appState.leafletMarkers.set(i, marker)
                marker.on("moveend", recomputeCorrespondence)
            }
        }
        leafletDiv.appendChild(link)
        leafletDiv.appendChild(document.createElement("br"))
    }
}

function recomputeCorrespondence() {
    const pairs = new Array<[L.LatLng, L.LatLng]>()
    for (let entry of appState.konvaMarkers) {
        if (appState.leafletMarkers.has(entry[0])) {
            pairs.push([entry[1].getLatLng(),
                        appState.leafletMarkers.get(entry[0]).getLatLng()])
        }
    }
    if (pairs.length > 1) {
        console.log(Lib.regressLatLong(pairs))
    } else {
        console.log("Tried to recompute but not enough points")
    }
}
