import { add, scale, sub, vec } from './math.js'

export function draw(ctx, state, desc) {
    const canvas = ctx.canvas
    const { camera, cursor, damage, inputs, isPointerLocked, particles, selection, units } = state

    resizeCanvas(canvas)

    ctx.resetTransform()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.scale(camera.scale, camera.scale)
    ctx.translate(-camera.translate.x, -camera.translate.y)

    // Draw the grid dots
    const tl = vec(-50, -50) // top-left
    const br = vec(50, 50) // bottom-right
    ctx.fillStyle = '#aca'
    ctx.beginPath()
    ctx.rect(tl.x, tl.y, br.x - tl.x, br.y - tl.y)
    ctx.fill()
    for (let x = tl.x + 1; x < br.x; x++) {
        for (let y = tl.y + 1; y < br.y; y++) {
            if (!isOnScreen(vec(x, y), camera, canvas)) { continue }
            ctx.fillStyle = '#787'
            if (x == 0 || y == 0) {
                ctx.fillStyle = '#565'
            }
            ctx.beginPath()
            ctx.arc(x, y, 0.05, 0, 2 * Math.PI)
            ctx.fill()
        }
    }

    const teamColors = [ ['#f7594a'], ['#528df2'] ]

    // Draw selected unit indicators
    selection.forEach(unit => {
        ctx.lineWidth = 0.05
        ctx.strokeStyle = '#ffffffc0'
        ctx.beginPath()
        ctx.arc(unit.drawPos.x, unit.drawPos.y, desc.units[unit.ty].size, 0, 2 * Math.PI)
        ctx.stroke()
    })

    // Draw move command indicators
    particles.forEach(p => {
        const r = (p.lifeLeft / p.lifeTime) * p.r

        ctx.save()
        ctx.translate(p.x, p.y)

        ctx.lineWidth = 0.1
        ctx.strokeStyle = '#00ff00'
        ctx.shadowColor = '#00000080'
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, 2 * Math.PI)
        ctx.stroke()

        ctx.restore()
    })

    // Draw units
    units.forEach(unit => {
        ctx.save()
        ctx.translate(unit.drawPos.x, unit.drawPos.y)
        ctx.rotate(Math.atan2(unit.disp.y, unit.disp.x) + Math.PI / 2)

        if (unit.ty === 0) {
            const size = desc.units[0].size
            drawCastle(ctx, teamColors[unit.client], size * 0.8)
        } else if (unit.ty === 1) {
            drawWorker(ctx, teamColors[unit.client])
        } else if (unit.ty === 2) {
            drawArcher(ctx, teamColors[unit.client])
        }
        ctx.restore()
    })

    // Draw lazors
    damage.forEach(dmg => {
        ctx.lineCap = "round"
        ctx.lineWidth = 0.1
        ctx.strokeStyle = teamColors[units[dmg.from].client][0]
        ctx.beginPath()
        ctx.moveTo(units[dmg.from].drawPos.x, units[dmg.from].drawPos.y)
        ctx.lineTo(units[dmg.to].drawPos.x, units[dmg.to].drawPos.y)
        ctx.stroke()
    })

    // Health bars
    units.forEach(unit => {
        const percent = (unit.hp / desc.units[unit.ty].hp)
        if (percent === 1) { return }

        const colors = ['#9c0e0e', '#e33310', '#e38b10', '#e3b910', '#27d939']
        let i = 4
        if (percent < 0.1) { i = 0 }
        else if (percent < 0.2) { i = 1 }
        else if (percent < 0.4) { i = 2 }
        else if (percent < 0.7) { i = 3 }

        ctx.save()
        ctx.translate(unit.drawPos.x, unit.drawPos.y - desc.units[unit.ty].size - 0.25)
        progressBar(ctx, percent, '#00000080', colors[i])
        ctx.restore()
    })

    // Summon bars
    //units.forEach(unit => {
    //    ctx.save()
    //    ctx.translate(unit.drawPos.x, unit.drawPos.y - desc.units[unit.ty].size)
    //    progressBar(ctx, 0.6, '#00000080', '#eee')
    //    ctx.restore()
    //})

    // Draw selection drag-box
    ctx.resetTransform()
    if (inputs.leftMouseButton) {
        ctx.lineWidth = 1
        ctx.strokeStyle = '#ffffff'
        ctx.fillStyle = '#ffffff60'
        ctx.beginPath()
        ctx.rect(cursor.dragFrom.x, cursor.dragFrom.y, cursor.pos.x - cursor.dragFrom.x, cursor.pos.y - cursor.dragFrom.y)
        ctx.fill()
        ctx.stroke()
    }

    // Draw cursor
    if (isPointerLocked) {
        ctx.lineWidth = 1
        ctx.strokeStyle = '#000'
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(cursor.pox.x, cursor.pox.y, 5, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
    }
}

function drawCastle(ctx, colors, size) {
    ctx.beginPath()
    ctx.roundRect(-size, -size, size*2, size*2, 0.2)

    glowStroke(ctx, colors)
}

function drawWorker(ctx, colors) {
    polygonPath(ctx, [
        [-0.2, 0.2],
        [-0.3, -0.2],
        [0, -0.13],
        [0.3, -0.2],
        [0.2, 0.2],
    ])

    glowStroke(ctx, colors)
}

function drawArcher(ctx, colors) {
    polygonPath(ctx, [
        [0, -0.4],
        [-0.4, 0.3],
        [0, 0.2],
        [0.4, 0.3],
    ])

    glowStroke(ctx, colors)
}

function polygonPath(ctx, points) {
    ctx.beginPath()
    points.forEach(([x, y], i) => {
        if (i == 0) {
            ctx.moveTo(x, y)
        } else {
            ctx.lineTo(x, y)
        }
    })
    ctx.closePath()
}

function glowStroke(ctx, colors) {
    ctx.lineJoin = 'round'

    ctx.lineWidth = 0.2
    ctx.strokeStyle = colors[0]
    ctx.shadowBlur = 10
    ctx.shadowColor = colors[0]
    ctx.stroke()

    ctx.lineWidth = 0.1
    ctx.strokeStyle = '#ffffff'
    ctx.shadowColor = "transparent"
    ctx.stroke()
}

function progressBar(ctx, percent, bg, fg) {
    ctx.lineCap = "round"
    ctx.lineWidth = 0.2

    ctx.strokeStyle = bg
    ctx.beginPath()
    ctx.moveTo(-0.5, 0)
    ctx.lineTo(0.5, 0)
    ctx.stroke()

    ctx.strokeStyle = fg
    ctx.beginPath()
    ctx.moveTo(-0.5, 0)
    ctx.lineTo(percent - 0.5, 0)
    ctx.stroke()
}

function isOnScreen(pos, camera, canvas) {
    const screenPos = worldToScreen(pos, camera, canvas)
    return (0 < screenPos.x &&
        screenPos.x < canvas.width &&
        0 < screenPos.y &&
        screenPos.y < canvas.height)
}

function worldToScreen(pos, camera, canvas) {
    const midScreen = vec(canvas.width / 2, canvas.height / 2)
    return add(midScreen, scale(sub(pos, camera.translate), camera.scale))
}

function resizeCanvas(canvas, multiplier) {
    multiplier = multiplier || 1;
    const width = canvas.clientWidth * multiplier | 0;
    const height = canvas.clientHeight * multiplier | 0;
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        return true;
    }
    return false;
}

CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
}
