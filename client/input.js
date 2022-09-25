import { add, averagePoint, circleRectIntersects, clamp, div, scale, screenToWorld, sub, vec } from './math.js'

const NUMBER_CHARS = "1234567890!@#$%^&*()"
const FN_KEYS = [ "F1", "F2", "F3", "F4" ]

export function addEventListeners(con, state, desc, canvas) {
    document.addEventListener('keydown', (event) => _onkeydown(event, state, con, desc))
    document.addEventListener('keyup', (event) => _onkeyup(event, state))
    document.addEventListener('pointerlockchange', () => _onpointerlockchange(state, canvas))
    canvas.addEventListener('mousemove', (event) => _onmousemove(event, state, canvas))
    canvas.addEventListener('mousedown', (event) => _onmousedown(event, state, canvas, con))
    canvas.addEventListener('mouseup', (event) => _onmouseup(event, state, canvas, desc))
    canvas.addEventListener('wheel', (event) => _onwheel(event, state, canvas))
    canvas.addEventListener('contextmenu', (event) => { event.preventDefault() })
}

function _onkeydown(event, state, con, desc) {
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
                if (i === group) { continue }
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
            if (!state.controlGroups[group].length) { return }

            if (state.inputs.last && state.inputs.last.key === group &&
                performance.now() - state.inputs.last.time <= 200) { // double-tapped
                state.camera.translate = averagePoint(state.selection.map(unit => unit.drawPos))
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
    } else if (FN_KEYS.includes(event.key)) {
        const idx = parseInt(event.key.substring(1)) - 1
        if (state.inputs.shift) { // create camera group
            state.cameraGroups[idx] = { set: true, ...state.camera.translate }
        } else if (state.cameraGroups[idx].set) { // jump camera to location
            state.camera.translate = { ...state.cameraGroups[idx] }
        }
    } else {
        state.selection.forEach(unit => {
            const summon = desc.units[unit.ty].summons?.find(summon => summon.hotkey === event.key)
            if (summon) {
                const cmd = [ state.units.indexOf(unit), { Summon: desc.units.findIndex(unit_desc => unit_desc.key === summon.key) } ]
                con.send({ Commands: [cmd] })
            }
        })
    }
}

function _onkeyup(event, state) {
    if (event.key === "Control") {
        state.inputs.ctrl = false
    } else if (event.key === "Shift") {
        state.inputs.shift = false
    } else if (event.key === "Alt" || event.key === "x") {
        state.inputs.alt = false
    } 
}

function _onmousemove(event, state, canvas) {
    if (state.inputs.middleMouseButton) {
        state.camera.translate = sub(state.camera.translate, div(vec(event.movementX, event.movementY), state.camera.scale))
        return
    }

    if (state.isPointerLocked) {
        state.cursor.pos.x = clamp(state.cursor.pos.x + event.movementX, 0, canvas.width)
        state.cursor.pos.y = clamp(state.cursor.pos.y + event.movementY, 0, canvas.height)
    } else {
        state.cursor.pos = vec(event.x, event.y)
    }
}


function _onmousedown(event, state, canvas, con) {
    if (!state.isPointerLocked && !localStorage.getItem('nopointerlock')) {
        canvas.requestPointerLock()
        state.cursor.pos = vec(event.clientX, event.clientY)
        return
    }

    if (event.button === 0) { // left mouse button
        state.inputs.leftMouseButton = true
        state.cursor.dragFrom = vec(state.cursor.pos.x, state.cursor.pos.y)
    }
    else if (event.button === 1) { // middle mouse button
        state.inputs.middleMouseButton = true
    }
    else if (event.button === 2) { // right mouse button
        const target = screenToWorld(state.cursor.pos, state.camera, canvas)
        const cmds = []
        state.selection.forEach((unit) => {
            cmds.push([ state.units.indexOf(unit), { Target: target } ])
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
}

function _onmouseup(event, state, canvas, desc) {
    // Left mouse button up
    if (event.button === 0) {
        state.inputs.leftMouseButton = false
        state.selection = []
        const start = screenToWorld(state.cursor.dragFrom, state.camera, canvas)
        const end = screenToWorld(state.cursor.pos, state.camera, canvas)
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
    
    // Middle mouse buttun up
    } else if (event.button === 1) {
        state.inputs.middleMouseButton = false

    // Right mouse button up
    } else if (event.button === 2) {
        state.inputs.rightMouseButton = false
    }
}

function _onwheel(event, state, canvas) {
    const scale = clamp(state.camera.scale - (event.deltaY * 0.04), 8, 512) / state.camera.scale
    const origin_world = screenToWorld(state.cursor.pos, state.camera, canvas)
    state.camera.translate = add(div(sub(state.camera.translate, origin_world), scale), origin_world)
    state.camera.scale *= scale
}

function _onpointerlockchange(state, canvas) {
        state.isPointerLocked = (document.pointerLockElement === canvas)
}
