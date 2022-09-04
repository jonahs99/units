import { draw } from './draw.js'
import { connect_to_server } from './server.js'

const canvas = document.createElement('canvas')
canvas.style.backgroundColor = '#aaa'
document.body.appendChild(canvas)

const ctx = canvas.getContext('2d')

async function main() {
    const desc = await (await fetch('desc')).json()
    const con = await connect_to_server('room')

    let client
    let lastTickTime
    let lastDrawTime

    const state = {
        camera: { x: 0, y: 0 },
        cursorPosition: {},
        grid: 32,
        inputs: {},
        isPointerLocked: false,
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
            lastTickTime = performance.now()

            Update.unit_create.forEach(unit => {
                state.units.push(unit)
            })

            Update.unit_change.forEach((unit, i) => {
                state.units[i].pos = unit.pos
                state.units[i].disp = unit.disp
                state.units[i].dead = unit.dead
            })

            state.units = state.units.filter(unit => !unit.dead)
        }
    })

    function gameLoop(time) {
        const timeSinceTick = time - lastTickTime

        calcDrawPositions(timeSinceTick / (desc.dt * 1000))
        moveCamera(time - lastDrawTime)
        draw(ctx, state, desc)

        lastDrawTime = time
        requestAnimationFrame(gameLoop)
    }

    requestAnimationFrame(gameLoop)

    function calcDrawPositions(delta) {
        state.units.forEach(unit => {
            unit.drawPos = {
                x: unit.pos.x + unit.disp.x * delta,
                y: unit.pos.y + unit.disp.y * delta
            }
        })
    }

    function moveCamera(dt) {
        const pad = 5
        const panSpeed = 1
        if (state.cursorPosition.x < pad) {
            state.camera.x += panSpeed * dt
        }
        if (state.cursorPosition.x > canvas.width - pad) {
            state.camera.x -= panSpeed * dt
        }
        if (state.cursorPosition.y < pad) {
            state.camera.y += panSpeed * dt
        }
        if (state.cursorPosition.y > canvas.height - pad) {
            state.camera.y -= panSpeed * dt
        }
    }

    canvas.addEventListener('mousemove', (event) => {
        if (state.isPointerLocked) {
            if (state.inputs.middleMouseButton) {
                state.camera.x -= event.movementX
                state.camera.y -= event.movementY
                return
            }

            state.cursorPosition.x += event.movementX
            state.cursorPosition.y += event.movementY

            state.cursorPosition.x = Math.min(Math.max(state.cursorPosition.x, 0), canvas.width)
            state.cursorPosition.y = Math.min(Math.max(state.cursorPosition.y, 0), canvas.height)
        } else {
            state.cursorPosition.x = event.x
            state.cursorPosition.y = event.y
        }
    })

    canvas.addEventListener('mousedown', (event) => {
        if (!state.isPointerLocked && !localStorage.getItem('nopointerlock')) {
            canvas.requestPointerLock()
            state.cursorPosition.x = event.clientX
            state.cursorPosition.y = event.clientY
            return
        }

        if (event.button === 0) { // left mouse button
            state.inputs.leftMouseButton = true
            state.selectionBoxStart.x = state.cursorPosition.x
            state.selectionBoxStart.y = state.cursorPosition.y
        }
        else if (event.button === 1) { // middle mouse button
            state.inputs.middleMouseButton = true
        }
        else if (event.button === 2) { // right mouse button
            const target = screenToWorld(state.cursorPosition, state.camera, state.grid)
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
        if (event.button === 0) { // left mouse button
            state.inputs.leftMouseButton = false

            const start = screenToWorld(state.selectionBoxStart, state.camera, state.grid)
            const end = screenToWorld(state.cursorPosition, state.camera, state.grid)

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
        else if (event.button === 1) { // middle mouse button
            state.inputs.middleMouseButton = false
        }
    })

    canvas.addEventListener('wheel', (event) => {
        state.grid -= event.deltaY * 0.04
    })

    canvas.addEventListener('contextmenu', (event) => { event.preventDefault() })

    document.addEventListener('pointerlockchange', () => {
        state.isPointerLocked = (document.pointerLockElement === canvas)
    })
}

function screenToWorld(pos, camera, grid) {
    return {
        x: (-camera.x + pos.x - canvas.width / 2) / grid,
        y: (-camera.y + pos.y - canvas.height / 2) / grid
    }
}

main()
