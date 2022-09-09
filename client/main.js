import { draw } from './draw.js'
import { setInputListeners } from './input.js'
import { connect_to_server } from './server.js'
import { arrayOfSize } from './util.js'

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
        cameraGroups: arrayOfSize(4, () => {}),
        controlGroups: arrayOfSize(10, () => []),
        cursorPosition: {},
        damage: [],
        grid: 24,
        inputs: {},
        isPointerLocked: false,
        particles: [],
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

    function gameLoop(time) {
        const timeSinceTick = time - lastTickTime

        calcDrawPositions(timeSinceTick / (desc.dt * 1000))
        moveCamera(time - lastDrawTime)
        updateParticles(time - lastDrawTime)
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
            state.camera.x -= panSpeed * dt
        }
        if (state.cursorPosition.x > canvas.width - pad) {
            state.camera.x += panSpeed * dt
        }
        if (state.cursorPosition.y < pad) {
            state.camera.y -= panSpeed * dt
        }
        if (state.cursorPosition.y > canvas.height - pad) {
            state.camera.y += panSpeed * dt
        }
    }

    function updateParticles(dt) {
        state.particles.forEach(p => { p.lifeLeft -= dt })
        state.particles = state.particles.filter(p => p.lifeLeft > 0)
    }

    setInputListeners(con, state, desc, canvas)
}

main()
