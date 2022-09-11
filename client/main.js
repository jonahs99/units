import { draw } from './draw.js'
import { setInputListeners } from './input.js'
import { add, scale, vec } from './math.js'
import { connect_to_server } from './server.js'
import { arrayOfSize } from './util.js'

const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')
document.body.appendChild(canvas)

async function main() {
    const desc = await (await fetch('desc')).json()
    const con = await connect_to_server('room')

    let client
    let lastTickTime = performance.now()
    let lastDrawTime = performance.now()

    const state = {
        camera: {
            translate: vec(0, 0),
            scale: 24
        },
        cameraGroups: arrayOfSize(4, () => ({})),
        controlGroups: arrayOfSize(10, () => []),
        cursor: {
            pos: vec(10, 10),
            dragFrom: vec(0, 0)
        },
        damage: [],
        inputs: {},
        isPointerLocked: false,
        particles: [],
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

            state.units = state.units.filter(unit => !unit.dead)
            state.selection = state.selection.filter(unit => !unit.dead)
            for (let i = 0; i < state.controlGroups.length; i++) {
                state.controlGroups[i] = state.controlGroups[i].filter(unit => !unit.dead)
            }

            Update.unit_create.forEach(unit => { state.units.push(unit) })

            Update.unit_change.forEach((unit, i) => {
                state.units[i].pos = unit.pos
                state.units[i].disp = unit.disp
                state.units[i].dead = unit.dead
                state.units[i].hp = unit.hp
            })

            state.damage = Update.damage
        }
    })

    function drawLoop(time) {
        const timeSinceTick = time - lastTickTime

        calcDrawPositions(timeSinceTick / (desc.dt * 1000))
        moveCamera(time - lastDrawTime)
        updateParticles(time - lastDrawTime)
        draw(ctx, state, desc)

        lastDrawTime = time
        requestAnimationFrame(drawLoop)
    }


    function calcDrawPositions(delta) {
        if (delta > 1) {
            delta = 2 - Math.exp(-delta + 1)
        }
        state.units.forEach(unit => {
            unit.drawPos = add(unit.pos, scale(unit.disp, delta))
        })
    }

    function moveCamera(dt) {
        const pad = 5
        const panSpeed = 1
        if (state.cursor.pos.x < pad) {
            state.camera.translate.x -= panSpeed * dt / state.camera.scale
        }
        if (state.cursor.pos.x > canvas.width - pad) {
            state.camera.translate.x += panSpeed * dt / state.camera.scale
        }
        if (state.cursor.pos.y < pad) {
            state.camera.translate.y -= panSpeed * dt / state.camera.scale
        }
        if (state.cursor.pos.y > canvas.height - pad) {
            state.camera.translate.y += panSpeed * dt / state.camera.scale
        }
    }

    function updateParticles(dt) {
        state.particles.forEach(p => { p.lifeLeft -= dt })
        state.particles = state.particles.filter(p => p.lifeLeft > 0)
    }

    setInputListeners(con, state, desc, canvas)
    requestAnimationFrame(drawLoop)
}

main()
