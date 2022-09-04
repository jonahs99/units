export function draw(ctx, state, desc) {
    const canvas = ctx.canvas
    const { camera, cursorPosition, damage, grid, inputs, isPointerLocked, selectionBoxStart, selection, units } = state

    resizeCanvasToDisplaySize(canvas)

    ctx.resetTransform()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.translate(camera.x + canvas.width / 2, camera.y + canvas.height / 2)
    ctx.scale(grid, grid)

    // Draw the grid dots
    for (let x = -20; x < 20; x += 1) {
        for (let y = -20; y < 20; y += 1) {
            ctx.fillStyle = '#888'
            if (x == 0 || y == 0) {
                ctx.fillStyle = '#777'
            }
            ctx.beginPath()
            ctx.arc(x, y, 0.05, 0, 2 * Math.PI)
            ctx.fill()
        }
    }

    const teamColors = [
        ['#f7594a', '#f7594a'],
        ['#528df2', '#528df2']
    ]

    // Draw units
    units.forEach(unit => {
        ctx.save()
        ctx.translate(unit.drawPos.x, unit.drawPos.y)
        ctx.rotate(Math.atan2(unit.disp.y, unit.disp.x) + Math.PI / 2)

        if (unit.ty === 0) {
            drawCastle(ctx, teamColors[unit.client])
        }
        else if (unit.ty === 1) {
            drawWorker(ctx, teamColors[unit.client])
        }
        else if (unit.ty === 2) {
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

    // Draw health bars
    units.forEach(unit => {
        const percent = (unit.hp / desc.units[unit.ty].hp)
        const colors = ['#9c0e0e', '#e33310', '#e38b10', '#e3b910', '#27d939']

        if (percent === 1) {
            return
        }

        ctx.save()
        ctx.translate(unit.drawPos.x, unit.drawPos.y - desc.units[unit.ty].size / 2 - 0.25)

        ctx.lineCap = "round"
        ctx.lineWidth = 0.2
        ctx.strokeStyle = '#00000080'
        ctx.beginPath()
        ctx.moveTo(-0.5, 0)
        ctx.lineTo(0.5, 0)
        ctx.stroke()

        ctx.lineWidth = 0.2
        if (percent < 0.1) {
            ctx.strokeStyle = colors[0]
        }
        else if (percent < 0.2) {
            ctx.strokeStyle = colors[1]
        }
        else if (percent < 0.4) {
            ctx.strokeStyle = colors[2]
        }
        else if (percent < 0.7) {
            ctx.strokeStyle = colors[3]
        }
        else {
            ctx.strokeStyle = colors[4]
        }

        ctx.beginPath()
        ctx.moveTo(-0.5, 0)
        ctx.lineTo(percent - 0.5, 0)
        ctx.stroke()

        ctx.restore()
    })

    // Draw selected unit indicators
    selection.forEach(unit => {
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(unit.drawPos.x, unit.drawPos.y, 0.075, 0, 2 * Math.PI)
        ctx.fill()
    })

    // Draw selection drag-box
    ctx.resetTransform()
    if (inputs.leftMouseButton) {
        ctx.lineWidth = 1
        ctx.strokeStyle = '#ffffff'
        ctx.fillStyle = '#ffffff60'
        ctx.beginPath()
        ctx.rect(selectionBoxStart.x, selectionBoxStart.y, cursorPosition.x - selectionBoxStart.x, cursorPosition.y - selectionBoxStart.y)
        ctx.fill()
        ctx.stroke()
    }

    // Draw cursor
    if (isPointerLocked) {
        ctx.lineWidth = 1
        ctx.strokeStyle = '#000'
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(cursorPosition.x, cursorPosition.y, 5, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
    }
}

function drawCastle(ctx, colors) {
    ctx.beginPath()
    ctx.roundRect(-1, -1, 2, 2, 0.2)

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
        [0, -0.3],
        [-0.5, 0.3],
        [0, 0.2],
        [0.5, 0.3],
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
    ctx.shadowBlur = 10;
    ctx.shadowColor = colors[1]
    ctx.stroke()

    ctx.lineWidth = 0.1
    ctx.strokeStyle = '#ffffff'
    ctx.shadowColor = "transparent"
    ctx.stroke()
}

function resizeCanvasToDisplaySize(canvas, multiplier) {
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
