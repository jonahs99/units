import { draw } from './draw.js'
import { connect_to_server } from './server.js'

const canvas = document.createElement('canvas')
canvas.style.backgroundColor = '#aaa'
document.body.appendChild(canvas)

async function main() {
    const con = await connect_to_server('room')

    let client
    const state = {
        cursorPosition: {},
        grid: 32,
        inputs: {},
        selectionBoxStart: {},
        selection: [],
        units: []
    }

    con.on((msg) => {
        const { Room, Update } = msg
        if (Room) {
            console.log(`We are client: ${Room.client_id} in room "${Room.room}"`)
            client = Room.client_id
        } else if (Update) {
            //console.log('Last message:\n' + JSON.stringify(Update, null, '  '))

            Update.unit_create.forEach(unit => {
                state.units.push(unit)
            })

            Update.unit_change.forEach((unit, i) => {
                state.units[i].pos = unit.pos
                state.units[i].vel = unit.vel
            })
        }
    })

    function gameLoop() {
        draw(canvas.getContext('2d'), state)

        requestAnimationFrame(gameLoop)
    }

    requestAnimationFrame(gameLoop)

    canvas.addEventListener('mousemove', (event) => {
        state.cursorPosition.x = event.clientX
        state.cursorPosition.y = event.clientY
    })

    canvas.addEventListener('mousedown', (event) => {
        if (event.button === 0) { // left mouse button
            state.inputs.leftMouseButton = true
            state.selectionBoxStart.x = event.x
            state.selectionBoxStart.y = event.y
        }
        else if (event.button === 2) { // right mouse button
            const target = screenToWorld(event, state.grid)
            const cmds = []
            state.selection.forEach((unit) => {
                cmds.push({ id: state.units.indexOf(unit), target })
            })

            con.send({
                Commands: cmds
            })
        }
    })

    canvas.addEventListener('mouseup', (event) => {
        if (event.button === 0) {
            state.inputs.leftMouseButton = false

            const start = screenToWorld(state.selectionBoxStart, state.grid)
            const end = screenToWorld(state.cursorPosition, state.grid)

            const x1 = Math.min(start.x, end.x)
            const x2 = Math.max(start.x, end.x)
            const y1 = Math.min(start.y, end.y)
            const y2 = Math.max(start.y, end.y)

            state.selection = []
            state.units.forEach(unit => {
                if (x1 <= unit.pos.x && unit.pos.x <= x2 && y1 <= unit.pos.y && unit.pos.y <= y2) {
                    state.selection.push(unit)
                }
            })
        }
    })

    canvas.addEventListener('contextmenu', (event) => { event.preventDefault() })
}

function screenToWorld(pos, grid) {
    return {
        x: (pos.x - canvas.width / 2) / grid,
        y: (pos.y - canvas.height / 2) / grid
    }
}

main()