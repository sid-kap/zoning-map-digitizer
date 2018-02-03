import * as React from "react"
import * as DOM from "react-dom"

type Params = {
    maxComputeDimension: number,
    saturationThreshold: number,
    distanceToHighSaturation: number,
    polyAccuracy: number,
}
/* type PartialParams = Pick<Params, "maxComputeDimension" | "saturationThreshold" | "distanceToHighSaturation" | "polyAccuracy">*/

class ParamsForm extends React.Component<{},Params> {
    constructor(props: {}) {
        super(props)
        this.state = {
            maxComputeDimension: 1000,
            saturationThreshold: 20,
            distanceToHighSaturation: 5,
            polyAccuracy : 10
        }
    }

    // Hacky but works. (The only problem is this gets called multiple times if you click
    // up/down repeatedly. So we should have a way of pre-empting any computation that gets
    // triggered.)
    update() {
        console.log("updated! new state")
        console.log(this.state)
    }

    public render() {
        return (
            <form>
                <label> Max compute dimension:
                    <input type="number"
                           value={this.state.maxComputeDimension}
                           onChange={e => this.setState({maxComputeDimension: +e.target.value}, this.update)} />
                </label><br />
                <label> Saturation threshold (0-255):
                    <input type="number"
                           value={this.state.saturationThreshold}
                           onChange={e => this.setState({saturationThreshold: +e.target.value}, this.update)} />
                </label><br />
                <label> Distance to high saturation (width of road?):
                    <input type="number"
                           value={this.state.distanceToHighSaturation}
                           onChange={e => this.setState({distanceToHighSaturation: +e.target.value}, this.update)} />
                </label><br />
                <label> Polygon point accuracy:
                    <input type="number"
                           value={this.state.polyAccuracy}
                           onChange={e => this.setState({polyAccuracy: +e.target.value}, this.update)} />
                </label>
            </form>
        )
    }
}

export function App() {
    return (
        <div className="App">
            <h1>Zoning Map Digitizer</h1>
            <ParamsForm />
            <canvas style={{display: "none"}} id="pdfConversion" />
            <canvas id="original-preview"></canvas>
            <canvas id="step-1-preview"></canvas>
        </div>
    );
}
