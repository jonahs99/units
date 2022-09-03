import { draw } from './draw.js'

function main() {
    const canvas = document.createElement('canvas')
    canvas.style.backgroundColor = '#aaa'
    document.body.appendChild(canvas)

    const unitLength = 32

    const units = [
        { type: "worker", x: 3, y: 6 },
        { type: "castle", x: 6, y: 11 },
        { type: "worker", x: 10, y: 15 },
        { type: "worker", x: 15, y: 10 }
    ]

    const inputs = {}
    const selectionBoxStart = {}
    const cursorPosition = {}

    let selection = []

    canvas.addEventListener('mousemove', (event) => {
        cursorPosition.x = event.clientX
        cursorPosition.y = event.clientY
    })

    canvas.addEventListener('mousedown', (event) => {
        if (event.button === 0) { // left mouse button
            inputs.leftMouseButton = true
            selectionBoxStart.x = event.x
            selectionBoxStart.y = event.y
        }
        else if (event.button === 2) { // right mouse button
            console.log('right click down')
        }
    })

    canvas.addEventListener('mouseup', (event) => {
        if (event.button === 0) {
            inputs.leftMouseButton = false
            const x1 = Math.min(selectionBoxStart.x, cursorPosition.x) / unitLength
            const x2 = Math.max(selectionBoxStart.x, cursorPosition.x) / unitLength
            const y1 = Math.min(selectionBoxStart.y, cursorPosition.y) / unitLength
            const y2 = Math.max(selectionBoxStart.y, cursorPosition.y) / unitLength
            selection = []
            units.forEach(unit => {
                if (x1 <= unit.x && unit.x <= x2 && y1 <= unit.y && unit.y <= y2) {
                    selection.push(unit)
                }
            })
        }
    })

    canvas.addEventListener('contextmenu', (event) => { event.preventDefault() })

    function gameLoop() {


        draw(canvas.getContext('2d'), unitLength, units, selection, inputs, selectionBoxStart, cursorPosition)

        requestAnimationFrame(gameLoop)
    }

    requestAnimationFrame(gameLoop)
}

main()