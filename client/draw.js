export function draw(ctx, state) {
    const canvas = ctx.canvas
    const { camera, cursorPosition, grid, inputs, isPointerLocked, selectionBoxStart, selection, units } = state

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
        ctx.translate(unit.pos.x, unit.pos.y)
        ctx.rotate(Math.atan2(unit.vel.y, unit.vel.x) + Math.PI / 2)

        if (unit.ty === 0) {
            drawCastle(ctx, teamColors[unit.client])
        }
        else if (unit.ty === 1) {
            drawWorker(ctx, teamColors[unit.client])
        }
        ctx.restore()
    })

    // Draw selected unit indicators
    selection.forEach(unit => {
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(unit.pos.x, unit.pos.y, 0.075, 0, 2 * Math.PI)
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
    ctx.lineWidth = 0.2
    ctx.strokeStyle = colors[0]
    ctx.shadowBlur = 10;
    ctx.shadowColor = colors[1]
    ctx.beginPath()
    ctx.roundRect(-1, -1, 2, 2, 0.2)
    ctx.stroke()

    ctx.lineWidth = 0.1
    ctx.strokeStyle = '#ffffff'
    ctx.shadowColor = "transparent"
    ctx.beginPath()
    ctx.roundRect(-1, -1, 2, 2, 0.2)
    ctx.stroke()
}

function drawWorker(ctx, colors) {
    ctx.lineJoin = 'round'

    ctx.lineWidth = 0.2
    ctx.strokeStyle = colors[0]
    ctx.shadowBlur = 10;
    ctx.shadowColor = colors[1]
    ctx.beginPath()
    ctx.moveTo(-0.3, 0.3)
    ctx.lineTo(-0.5, -0.3)
    ctx.lineTo(0, -0.2)
    ctx.lineTo(0.5, -0.3)
    ctx.lineTo(0.3, 0.3)
    ctx.closePath()
    ctx.stroke()

    ctx.lineWidth = 0.1
    ctx.strokeStyle = '#ffffff'
    ctx.shadowColor = "transparent"
    ctx.beginPath()
    ctx.moveTo(-0.3, 0.3)
    ctx.lineTo(-0.5, -0.3)
    ctx.lineTo(0, -0.2)
    ctx.lineTo(0.5, -0.3)
    ctx.lineTo(0.3, 0.3)
    ctx.closePath()
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
