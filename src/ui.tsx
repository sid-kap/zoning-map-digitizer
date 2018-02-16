import * as React from "react"
import * as DOM from "react-dom"
import Button from "material-ui/Button"
import AppBar from "material-ui/AppBar"
import Toolbar from "material-ui/Toolbar"
import Typography from "material-ui/Typography"

import "typeface-roboto"

function App() {
    return (
        <div className="App">
        <AppBar position="static" color="default">
            <Toolbar>
            <Typography variant="title" color="inherit">
                Zoning Map Digitizer
            </Typography>
            </Toolbar>
        </AppBar>
        Upload PDF file
        <input type="file" />

        </div>
    )
    /* iconClassNameRight="muidocs-icon-navigation-expand-more"*/
}

export function main() {
    DOM.render(React.createElement(App, null), document.getElementById("main"))
}
