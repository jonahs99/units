import { averagePoint, circleRectIntersects } from './math.js'

const NUMBER_CHARS = "1234567890)!@#$%^&*()"

export function setInputListeners(con, state, desc, canvas) {
    document.addEventListener('keydown', (event) => {
        if (event.key === "Control") {
            state.inputs.ctrl = true
        } else if (event.key === "Shift") {
            state.inputs.shift = true
        } else if (event.key === "Alt" || event.key === "x") {
            state.inputs.alt = true
        } else if (NUMBER_CHARS.includes(event.key)) {
            const group = NUMBER_CHARS.indexOf(event.key) % 10
            if (state.inputs.alt) { // append & steal to group
                state.selection.forEach(unit => {
                    state.controlGroups[group].push(unit)
                })
                state.controlGroups[group] = [...new Set(state.controlGroups[group])]
                for(let i = 0; i < state.controlGroups.length; i++) {
                    if (i === group) {
                        continue
                    }
                    state.controlGroups[i] = state.controlGroups[i].filter(unit => !state.selection.includes(unit))
                }
            } else if (state.inputs.shift) { // append to group
                state.selection.forEach(unit => {
                    state.controlGroups[group].push(unit)
                })
                state.controlGroups[group] = [...new Set(state.controlGroups[group])]
            } else if (state.inputs.ctrl) { // create group
                state.controlGroups[group] = []
                state.selection.forEach(unit => {
                    state.controlGroups[group].push(unit)
                })
            } else { // select group or jump camera to group (if double-tapped)
                if (!state.controlGroups[group].length) {
                    return
                }

                if (state.inputs.last && state.inputs.last.key === group &&
                    performance.now() - state.inputs.last.time <= 200) { // double-tapped
                    const center = averagePoint(state.selection.map(unit => unit.drawPos))
                    state.camera.x = center.x * state.grid
                    state.camera.y = center.y * state.grid
                } else { // select group
                    state.selection = []
                    state.controlGroups[group].forEach(unit => {
                        state.selection.push(unit)
                    })
                }

                state.inputs.last = {
                    key: group,
                    time: performance.now()
                }
            }
        } else if ("F0" < event.key && event.key < "F5") {
            const idx = parseInt(event.key.substring(1)) - 1
            if (state.inputs.shift) { // create camera group
                state.cameraGroups[idx].set = true
                state.cameraGroups[idx].x = state.camera.x
                state.cameraGroups[idx].y = state.camera.y
            } else { // jump camera to location
                if (state.cameraGroups[idx].set) {
                    state.camera.x = state.cameraGroups[idx].x
                    state.camera.y = state.cameraGroups[idx].y
                }
            }
        }
    })

    document.addEventListener('keyup', (event) => {
        if (event.key === "Control") {
            state.inputs.ctrl = false
        } else if (event.key === "Shift") {
            state.inputs.shift = false
        } else if (event.key === "Alt" || event.key === "x") {
            state.inputs.alt = false
        } 
    })
    
    canvas.addEventListener('mousemove', (event) => {
        if (state.inputs.middleMouseButton) {
            state.camera.x -= event.movementX
            state.camera.y -= event.movementY
            return
        }

        if (state.isPointerLocked) {
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
            const target = screenToWorld(state.cursorPosition, state.camera, state.grid, canvas)
            const cmds = []
            state.selection.forEach((unit) => {
                cmds.push({ id: state.units.indexOf(unit), target })
            })

            con.send({
                Commands: cmds
            })

            state.particles.push({
                x: target.x,
                y: target.y,
                r: 0.5,
                lifeLeft: 300,
                lifeTime: 300
            })
        }
    })

    canvas.addEventListener('mouseup', (event) => {
        if (event.button === 0) { // left mouse button
            state.inputs.leftMouseButton = false
            state.selection = []

            const start = screenToWorld(state.selectionBoxStart, state.camera, state.grid, canvas)
            const end = screenToWorld(state.cursorPosition, state.camera, state.grid, canvas)
            const rect = {
                x1: Math.min(start.x, end.x),
                x2: Math.max(start.x, end.x),
                y1: Math.min(start.y, end.y),
                y2: Math.max(start.y, end.y)
            }

            state.units.forEach(unit => {
                const circle = {
                    x: unit.pos.x,
                    y: unit.pos.y,
                    r: desc.units[unit.ty].size
                }
                if (circleRectIntersects(circle, rect)) {
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

function screenToWorld(pos, camera, grid, canvas) {
    return {
        x: (camera.x + pos.x - canvas.width / 2) / grid,
        y: (camera.y + pos.y - canvas.height / 2) / grid
    }
}
