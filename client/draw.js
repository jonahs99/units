export function draw(ctx, state) {
    const canvas = ctx.canvas
    const { camera, cursorPosition, grid, inputs, selectionBoxStart, selection, units } = state

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
        {
            stroke: '#f7594a',
            fill: '#f7594ac0'
        },
        {
            stroke: '#528df2',
            fill: '#528df2c0'
        }
    ]

    // Draw units
    units.forEach(unit => {
        if (unit.ty === 1) {
            ctx.lineWidth = 0.1
            ctx.strokeStyle = '#ffffffd0'
            ctx.shadowBlur = 10;
            ctx.shadowColor = teamColors[unit.client].stroke
            ctx.beginPath()
            ctx.arc(unit.pos.x, unit.pos.y, 0.5, 0, 2 * Math.PI)
            ctx.stroke()
        }
        else if (unit.ty === 0) {
            ctx.lineWidth = 0.1
            ctx.strokeStyle = '#ffffffd0'
            ctx.shadowBlur = 10;
            ctx.shadowColor = teamColors[unit.client].stroke
            ctx.beginPath()
            ctx.roundRect(unit.pos.x - 1, unit.pos.y - 1, 2, 2, 0.3)
            ctx.stroke()
        }
    })

    ctx.shadowColor = "transparent"

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
    ctx.lineWidth = 1
    ctx.strokeStyle = '#000'
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(cursorPosition.x, cursorPosition.y, 5, 0, 2 * Math.PI)
    ctx.fill()
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