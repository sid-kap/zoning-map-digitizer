// Require index.html so it gets copied to dist
import "./index.pug"
import "./index.scss"

import * as Lib from "./Lib.ts"
import * as cv from "opencv.js"
import * as L from "leaflet"
import * as tinycolor from "tinycolor2"
const GeoSearch = require("leaflet-geosearch")
import Dexie from "dexie"

// import ColorPolygonsWorker = require("worker-loader!./ColorPolygonsWorker.worker.ts")

class MyAppDatabase extends Dexie {
    maps: Dexie.Table<IStoredAppState, number> // number = type of the primkey

    // Stores only the filenames for the dropdown, then you can use the filename to
    // get the actual record from the `maps` table.
    // (The benefit of having two separate tables is that now  you can get all the
    // filenames without loading the whole record into memory, which would be quite
    // large/memory-intensive.)
    mapFilenames: Dexie.Table<IFilename, number>

    constructor () {
        super("MyAppDatabase")
        this.version(1).stores({
            maps: '++id, filename, originalImg, scaledDown, maskedImage, smallerMaskedImage, correspondence, leafletMarkers, konvaMarkers, colors, colorPolygons',
            mapFilenames: '++id, filename'
        })
    }
}

interface IStoredAppState {
    id?: number,
    filename: string,
    originalImg: Lib.SerializedMat,
    scaledDown:  Lib.SerializedMat,
    maskedImage: Lib.SerializedMat,
    smallerMaskedImage: Lib.SerializedMat,
    correspondence: number[][],
    leafletMarkers: Map<number, L.LatLng>,
    konvaMarkers:   Map<number, L.LatLng>,
    colors: Array<[number,number,number]>,
    colorPolygons: {colorIndex: number, polygon: GeoJSON.Polygon}[],
}

interface IFilename {
    id?: number,
    filename: string,
}

let appState = {
    name: <string> null,
    originalImg: <cv.Mat> null,
    scaledDown: <cv.Mat> null,
    maskedImage: <cv.Mat> null,
    smallerMaskedImage: <cv.Mat> null,
    userInputCorrespondence: false,
    correspondence: <number[][]> null,
    leafletMarkers: new Map<number, L.Marker>(),
    konvaMarkers:   new Map<number, L.Marker>(),
    colors: <Array<[number,number,number]>> null,
    colorPolygons: <{colorIndex: number, polygon: GeoJSON.Polygon}[]> null,
}

let appRefs = {
    polygonsMap: <L.Map> null,
}

const db = new MyAppDatabase()
main()

let paramsValue: Lib.Params = Lib.defaultParams

function backupState() {

}

function makeUploadStep(wrapper: HTMLDivElement) {
    async function fileChanged(e: Event) {
        console.log("in fileChanged")
        let input = <any> document.querySelector("input[name=file]")
        let fileList: FileList = input.files
        let file: File = fileList[0]
        appState.name = file.name
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

        let mat3 = new cv.Mat()
        // drop the alpha
        cv.cvtColor(mat, mat3, cv.COLOR_RGBA2RGB)
        mat.delete()

        appState.originalImg = mat3
        console.log("got mat")
        loader.style.display = "none"

        let img = <HTMLImageElement> document.querySelector("img#original-preview")
        img.src = imageUrl

        setupCorrespondenceImgMap(imageUrl, mat3)

        // Unblock step 2
        toggleStep(document.querySelector("div#step2"), true)

        // make this saveable
        const newFileOption = <HTMLOptionElement> document.querySelector("option#new-file-option")
        newFileOption.value = appState.name
        newFileOption.innerHTML = appState.name + " (new file)"
    }

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
                        Lib.defaultParams.maxComputeDimension)
    const saturationThreshold =
        makeNumberInput("saturationThreshold", "Saturation threshold",
                        Lib.defaultParams.saturationThreshold)
    const distanceToHighSaturation =
        makeNumberInput("distanceToHighSaturation",
                        "Distance to high saturation",
                        Lib.defaultParams.distanceToHighSaturation)

    const button = document.createElement("button")
    button.type = "button"
    button.innerHTML = "Segment image"

    button.onclick = () => {
        button.disabled = true
        segmentationStep(+maxComputeDimension.input.value, +saturationThreshold.input.value,
                         +distanceToHighSaturation.input.value)
        button.disabled = false
        const imageUrl = Lib.matToDataURL(appState.maskedImage, <HTMLCanvasElement> document.querySelector("canvas#pdfConversion"))
        preview.src = imageUrl
        toggleStep(document.querySelector("div#step3"), true)
        toggleStep(document.querySelector("div#step4"), true)
    }

    const controls = document.createElement("div")
    setGridLoc(controls, "2", "1 / 2")
    for (const x of [maxComputeDimension, saturationThreshold, distanceToHighSaturation]) {
        controls.appendChild(x.label)
        controls.appendChild(document.createElement("br"))
    }
    controls.appendChild(button)

    wrapper.appendChild(controls)
    wrapper.appendChild(preview)
}

function makeNumberInput(name: string, labelText: string, defaultValue: number): {label: HTMLLabelElement, input: HTMLInputElement} {
    const input = document.createElement("input")
    input.type = "number"
    input.name = name
    input.value = defaultValue.toString()
    input.onchange = () => console.log("changed")

    const label = document.createElement("label")
    label.innerText = labelText
    label.appendChild(input)
    return {label, input}
}

function makePolygonSelector(wrapper: HTMLDivElement) {
    const numColors = makeNumberInput("numColors", "Number of colors",
                                         Lib.defaultNumColors)
    const kMeansIterations = makeNumberInput("kMeansIterations", "K-means iterations",
                                         Lib.defaultKMeansIterations)
    // const polyAccuracy = makeNumberInput("polyAccuracy", "Poly accuracy",
    //                                      Lib.defaultParams.polyAccuracy)

    const button = document.createElement("button")
    button.type = "button"
    button.innerHTML = "Find polygons"

    button.onclick = () => {
        button.disabled = true
        const result = findPolygons(+numColors.input.value, +kMeansIterations.input.value) // , +polyAccuracy.input.value)
        appState.colorPolygons = result.polygons
        appState.colors = result.colors
        polygonsChanged()
        button.disabled = false
        // const imageUrl = Lib.matToDataURL(appState.maskedImage, <HTMLCanvasElement> document.querySelector("canvas#pdfConversion"))
        // preview.src = imageUrl
        // toggleStep(document.querySelector("div#step3"), true)
        // toggleStep(document.querySelector("div#step4"), true)
    }


    wrapper.style.maxWidth = "100em"

    const controls = document.createElement("div")
    setGridLoc(controls, "2", "1 / 2")
    controls.appendChild(numColors.label)
    controls.appendChild(document.createElement("br"))
    controls.appendChild(kMeansIterations.label)
    controls.appendChild(document.createElement("br"))
    // wrapper.appendChild(polyAccuracy.label)
    // wrapper.appendChild(document.createElement("br"))
    controls.appendChild(button)

    wrapper.appendChild(controls)

    const leafletDiv = <HTMLElement> document.querySelector("div#polygons-map-container")
    leafletDiv.style.height = "800px"
    leafletDiv.style.width = "100%"

    const map = new L.Map("polygons-map-container").setView([37.773972, -122.431297], 13)
    L.tileLayer(
        "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
        maxZoom: 18,
        id: "mapbox.streets",
        accessToken: "pk.eyJ1Ijoic2lkLWthcCIsImEiOiJjamRpNzU2ZTMxNWE0MzJtZjAxbnphMW5mIn0.b6m4jgFhPOPOYOoaNGmogQ",
    }).addTo(map)

    appRefs.polygonsMap = map

    // const polygonsList = document.querySelector("div#polygons-list")

    // const poly: GeoJSON.Polygon = { type: "Polygon", coordinates: [] }
    // const sample1 =
    //     {
    //         colorIndex: 1,
    //         color: [50, 40, 30],
    //         polygon: poly,
    //     }
    // const sample2 =
    //     {
    //         colorIndex: 2,
    //         color: [50, 40, 30],
    //         polygon: poly,
    //     }
    // const samplePolygons = [
    //     sample1,
    //     sample1,
    //     sample1,
    //     sample1,
    //     sample1,
    //     sample1,
    //     sample1,
    //     sample2,
    //     sample2,
    //     sample2,
    //     sample2,
    //     sample2,
    //     sample2,
    //     sample2,
    // ]

    // for (const poly of samplePolygons) {
    //     const listElement = document.createElement("div")
    //     renderPolygon(poly.colorIndex, poly.polygon, listElement)
    //     polygonsList.appendChild(listElement)
    // }
}

function getCenter(): L.LatLng {
    // const x0 = appState.correspondence[2][0]
    // const y0 = appState.correspondence[2][1]

    // const x1 = appState.correspondence[0][0] * appState.originalImg.cols +
    //     appState.correspondence[1][0] * appState.originalImg.rows +
    //     appState.correspondence[2][0] * 1

    // const y1 = appState.correspondence[0][1] * appState.originalImg.cols +
    //     appState.correspondence[1][1] * appState.originalImg.rows +
    //     appState.correspondence[2][1] * 1

    // return [(x0 + x1) / 2, (y0 + y1) / 2]

    const p0 = pixelToLatLng(L.latLng(0, 0))
    const p1 = pixelToLatLng(L.latLng(appState.originalImg.cols, appState.originalImg.rows))
    return L.latLng((p0.lat + p1.lat) / 2, (p0.lng + p1.lng) / 2)
}

function pixelToLatLng(pixel: L.LatLng) {
    const lat = appState.correspondence[0][0] * pixel.lat +
        appState.correspondence[1][0] * pixel.lng +
        appState.correspondence[2][0] * 1

    const lng = appState.correspondence[0][1] * pixel.lat +
        appState.correspondence[1][1] * pixel.lng +
        appState.correspondence[2][1] * 1
    return L.latLng(lat, lng)
}

function renderPolygon(colorIndex: number, index: string, polygon: GeoJSON.Polygon,
                       div: HTMLDivElement) {
    div.classList.add("polygon-list-element")

    const colorPreview = document.createElement("div")
    const color = appState.colors[colorIndex]
    colorPreview.style.backgroundColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`
    colorPreview.classList.add("color-preview")

    const title = document.createElement("div")
    title.classList.add("title")
    title.innerHTML = "Color index: " + colorIndex

    div.dataset.polygonIndex = index

    const polyImgCoords = L.GeoJSON.coordsToLatLngs(polygon.coordinates, 1)
    const polyLatLng = polyImgCoords.map(
        v => v.map( (point: L.LatLng) => pixelToLatLng(point)))

    const leafletPoly = L.polygon(polyLatLng,
                                  { color: tinycolor({r: color[0],
                                                      g: color[1],
                                                      b: color[2]}).toHexString() })
    console.log(leafletPoly)
    div.onmouseenter = () => {
        console.log("mouse entered")
        appRefs.polygonsMap.addLayer(leafletPoly)
    }
    div.onmouseleave = () => appRefs.polygonsMap.removeLayer(leafletPoly)

    div.appendChild(colorPreview)
    div.appendChild(title)
}

function polygonsChanged() {
    const polygonsList = document.querySelector("div#polygons-list")
    for (const ix in appState.colorPolygons) {
        const poly = appState.colorPolygons[ix]
        const listElement = document.createElement("div")
        renderPolygon(poly.colorIndex, ix, poly.polygon, listElement)
        polygonsList.appendChild(listElement)
    }
}

async function setupStorageStep() {
    const defaultOption = document.createElement("option")
    defaultOption.innerHTML = "New file"
    defaultOption.selected = true
    defaultOption.id = "new-file-option"

    const select = <HTMLSelectElement> document.querySelector("select#load-select")
    select.appendChild(defaultOption)

    const filenames = await db.mapFilenames.toArray()
    for (const filename of filenames) {
        const option = document.createElement("option")
        option.innerHTML = filename.filename
        option.value = filename.filename
        select.appendChild(option)
    }

    select.onchange = async () => {
        // TODO if unsaved changes, maybe we should give a popup saying you've changed your file, do you want to save your changes?
        // Can do this by adding a dirty bit to appState
        const selectedFilename = select.options[select.selectedIndex].value
        if (selectedFilename != appState.name) {
            console.log("loading other file. May be discarding work in progress, who knows??")

            function deserializeIfNotNull(m: Lib.SerializedMat): cv.Mat {
                if (m === null) return null
                return Lib.deserializeMat(m)
            }

            function deserializeMarkerMap<T>(m: Map<T, L.LatLng>) {
                const newMap = new Map<T, L.Marker>()
                for (const ix of m.keys()) {
                    newMap.set(ix, L.marker(m.get(ix)))
                }
                return newMap
            }

            const results = await db.maps.where({filename: selectedFilename}).toArray()
            const savedState = results[0]

            appState = {
                name: selectedFilename,
                originalImg: deserializeIfNotNull(savedState.originalImg),
                scaledDown: deserializeIfNotNull(savedState.scaledDown),
                maskedImage: deserializeIfNotNull(savedState.maskedImage),
                smallerMaskedImage: deserializeIfNotNull(savedState.smallerMaskedImage),
                userInputCorrespondence: savedState.correspondence !== null,
                correspondence: savedState.correspondence,
                leafletMarkers: deserializeMarkerMap(savedState.leafletMarkers),
                konvaMarkers: deserializeMarkerMap(savedState.konvaMarkers),
                colors: savedState.colors,
                colorPolygons: savedState.colorPolygons,
            }

            console.log(appState)

            // TODO need to reflect app state in the HTML elements! Here is where purity
            // and React/Redux would have come in handy...
        }
    }

    const button = <HTMLButtonElement> document.querySelector("button#save")
    button.onclick = async () => {
        if (appState.name) {
            const existingFilename = await db.mapFilenames.where({filename: appState.name}).toArray()
            let mapsPrimaryKey: number

            function serializeIfNotNull(m: cv.Mat): Lib.SerializedMat {
                if (m === null) return null
                return Lib.serializeMat(m)
            }

            function serializeMarkerMap<T>(m: Map<T, L.Marker>) {
                const newMap = new Map<T, L.LatLng>()
                for (const ix of m.keys()) {
                    newMap.set(ix, m.get(ix).getLatLng())
                }
                return newMap
            }

            const storedState: IStoredAppState = {
                filename: appState.name,
                originalImg: serializeIfNotNull(appState.originalImg),
                scaledDown: serializeIfNotNull(appState.scaledDown),
                maskedImage: serializeIfNotNull(appState.maskedImage),
                smallerMaskedImage: serializeIfNotNull(appState.smallerMaskedImage),
                correspondence: appState.correspondence,
                leafletMarkers: serializeMarkerMap(appState.leafletMarkers),
                konvaMarkers: serializeMarkerMap(appState.konvaMarkers),
                colors: appState.colors,
                colorPolygons: appState.colorPolygons,
            }

            if (existingFilename.length == 0) {
                db.mapFilenames.add({filename: appState.name})
                await db.maps.add(storedState)
                console.log("added new record in db")
            } else {
                // it should be in the database
                const names = await db.maps.where({filename: appState.name}).toArray()
                const pk = names[0].id
                await db.maps.update(pk, storedState)
                console.log("updated record in db")
            }
        } else {
            alert("Cannot save because you haven't uploaded a file!")
        }
    }
}

function main() {
    setupStorageStep()
    makeUploadStep(document.querySelector("div#step1"))
    makeSegmentationStep(document.querySelector("div#step2"))
    makeCorrespondenceMap(document.querySelector("div#step3"))
    makePolygonSelector(document.querySelector("div#step4"))

    // Disable steps 2, 3, and 4 initially
    toggleStep(document.querySelector("div#step2"), false)
    toggleStep(document.querySelector("div#step3"), false)
    toggleStep(document.querySelector("div#step4"), false)

    const main = <HTMLElement> document.querySelector("div#main")
    const hiddenCanvas = document.createElement("canvas")
    hiddenCanvas.style.display = "none"
    hiddenCanvas.id = "pdfConversion"
    main.appendChild(hiddenCanvas)
}

// TODO should be able to pass a cv.Shape type here instead of the actual mat
function setupCorrespondenceImgMap(imageUrl: string, mat: cv.Mat) {
    const fabricDiv = document.querySelector("div#leaflet-img-container")

    const imgMapEl = document.createElement("div")
    imgMapEl.id = "img-map"
    imgMapEl.style.height = "400px"
    fabricDiv.appendChild(imgMapEl)

    const zoomFactor = 1 / 8
    // const zoomedCRS = L.Util.extend(L.CRS.Simple, {
    //     transformation: new L.Transformation(zoomFactor, 0, -zoomFactor, 0),
    // })

    const imgMap = new L.Map("img-map", {
        crs: L.CRS.Simple,
        // crs: zoomedCRS,
        minZoom: -10,
        maxZoom: 10,
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

function findPolygons(numColors: number, kMeansIterations: number):
    {colors: Array<[number,number,number]>,
    polygons: {colorIndex: number, polygon: GeoJSON.Polygon}[]} {
    // Do k-means to get the colors from the scaledDown image.
    // (We use the smaller image because it's faster.)
    const centers = Lib.getColors(appState.smallerMaskedImage, numColors, kMeansIterations)

    const {labeledByColorIndex: largeImageColor, labeledRGB: largeImageQuantized} = Lib.labelImageByColors(appState.maskedImage, centers)

    // console.log("Histogram of colors in image:")
    const hist = Lib.imageHist(largeImageColor, numColors)
    // console.log(hist)
    const largestColor = hist[0][0]

    // const polygons = new cv.MatVector()

    // const serializedImg: Lib.SerializedMat = {
    //     rows: largeImageColor.rows,
    //     cols: largeImageColor.cols,
    //     type: largeImageColor.type(),
    //     data: largeImageColor.data.buffer
    // }

    const numRows = largeImageColor.rows
    const geojsonPolygons: {colorIndex: number, polygon: GeoJSON.Polygon}[] = []

    for (let i = 0; i < numColors; i++) {
        // Skip the background color
        if (i != largestColor) {
            console.log(`Computing polygons for color ${i}`)

            // TODO I wanted to parallelize this, but using webworkers
            // was surprisingly slow. I will probably try again at some point?
            // const worker = new ColorPolygonsWorker()
            // worker.postMessage({serializedImg, colorIndex: i})

            const polys = Lib.getColorPolygons(largeImageColor, i)
            for (const poly of polys) {
            //     // TODO also save the color index with it!
            //     console.log(poly.type())
            //     polygons.push_back(poly)
                geojsonPolygons.push({colorIndex: i, polygon: Lib.contourToGeoJSON(poly, numRows)})
            }

        }
    }

    const colors = new Array<[number,number,number]>()
    for (let i = 0; i < centers.rows; i++) {
        colors.push([centers.data[3 * i],
                     centers.data[3 * i + 1],
                     centers.data[3 * i + 2]])
    }

    // console.log("about to draw")
    // negative number means draw all contours
    // cv.drawContours(largeImageQuantized, polygons, -1, [0,0,255,0], 4)

    centers.delete()

    return {colors, polygons: geojsonPolygons}
}

function makeCorrespondenceMap(wrapper: HTMLDivElement) {
    const leafletDiv = <HTMLElement> document.querySelector("div#leaflet-map-container")

    const imgMapEl = document.createElement("div")
    imgMapEl.id = "img-map"
    imgMapEl.style.height = "400px"
    leafletDiv.appendChild(imgMapEl)

    const searchControl = new GeoSearch.GeoSearchControl({
        provider: new GeoSearch.OpenStreetMapProvider(),
    })

    const map = new L.Map("img-map").setView([37.773972, -122.431297], 13)
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

    const matrixInput = document.createElement("input")
    matrixInput.oninput = () => {
        const val = JSON.parse(matrixInput.value)
        if (val instanceof Array && val.length == 3
            && val[0].length == 2
            && val[1].length == 2
            && val[2].length == 2) {
            appState.correspondence = val
            appState.userInputCorrespondence = true
            matrixOutput.innerHTML = "Using inputted transformation: " + val
            correspondenceChanged()
        } else {
            appState.userInputCorrespondence = false
            console.log("Found", val, "not expected form of array")
            matrixOutput.outerHTML = "Found " +  val + ", which is not in expected form"
        }
    }
    const matrixOutput = document.createElement("p")
    matrixOutput.id = "correspondences-output"
    matrixOutput.innerHTML = "Waiting for you to select coordinates..."

    setGridLoc(matrixInput, "3", "1 / 3")
    setGridLoc(matrixOutput, "4", "1 / 3")

    wrapper.appendChild(matrixInput)
    wrapper.appendChild(matrixOutput)
}

function recomputeCorrespondence() {
    if (!appState.userInputCorrespondence) {
        const pairs = new Array<[L.LatLng, L.LatLng]>()
        for (let entry of appState.konvaMarkers) {
            if (appState.leafletMarkers.has(entry[0])) {
                const imgLL = entry[1].getLatLng()
                const trueLL = appState.leafletMarkers.get(entry[0]).getLatLng()
                pairs.push([L.latLng(imgLL.lat, imgLL.lng),
                            L.latLng(trueLL.lat, trueLL.lng)])
            }
        }

        const matrixOutput = document.querySelector("p#correspondences-output")
        if (pairs.length > 1) {
            const correspondence = Lib.regressLatLong(pairs)
            appState.correspondence = correspondence
            matrixOutput.innerHTML = "Found correspondence: " + JSON.stringify(correspondence)
            console.log("Found correspondence", correspondence)
            correspondenceChanged()
        } else {
            console.log("Tried to recompute but not enough points")
            matrixOutput.innerHTML = "Tried to recompute but not enough points"
        }
    }
}

function correspondenceChanged() {
    appRefs.polygonsMap.setView(getCenter(), 13)
}

function toggleStep(div: HTMLElement, enable: boolean) {
    if (enable) {
        div.classList.remove("step-disabled")
    } else {
        div.classList.add("step-disabled")
    }
    for (const input of <[HTMLInputElement]> Array.from(div.querySelectorAll("input"))) {
        input.disabled = !enable
    }
    for (const button of <HTMLButtonElement[]> Array.from(div.querySelectorAll("button"))) {
        button.disabled = !enable
    }
}
