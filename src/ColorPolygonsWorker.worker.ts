import * as Lib from "./Lib.ts"
import * as cv from "opencv.js"

const ctx: Worker = self as any;

// Post data to parent thread
ctx.postMessage({ foo: "foo" });

// Respond to message from parent thread
ctx.addEventListener("message", processEvent);

function processEvent(event: any): Array<Lib.SerializedMat> {
    const serializedMat: Lib.SerializedMat = event.data.serializedImg
    const mat = cv.matFromArray(serializedMat.rows, serializedMat.cols,
                                serializedMat.type, serializedMat.data)

    console.log(`getColorPolygons started for color ${event.data.colorIndex}`)
    const res = Lib.getColorPolygons(mat, event.data.colorIndex)
    console.log(`getColorPolygons finished for color ${event.data.colorIndex}`)
    const ret = new Array<Lib.SerializedMat>()
    for (let ix in res) {
        const m = res[ix]
        ret.push({rows: m.rows, cols: m.cols, type: m.type(), data: m.data.buffer})
    }
    return ret
}
