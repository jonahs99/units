export function draw(ctx, unitLength, units, selection, inputs, selectionBoxStart, cursorPosition) {
    const canvas = ctx.canvas

    resizeCanvasToDisplaySize(canvas)

    ctx.resetTransform()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.scale(unitLength, unitLength)

    // Draw the grid dots
    ctx.fillStyle = '#888'
    for (let x = 0; x < canvas.width / unitLength; x += 1) {
        for (let y = 0; y < canvas.height / unitLength; y += 1) {
            ctx.beginPath()
            ctx.arc(x, y, 0.05, 0, 2 * Math.PI)
            ctx.fill()
        }
    }

    // Draw units
    units.forEach(unit => {
        if (unit.type === "worker") {
            ctx.lineWidth = 0.1
            ctx.strokeStyle = '#528df2'
            ctx.fillStyle = '#528df2c0'
            ctx.beginPath()
            ctx.arc(unit.x, unit.y, 0.5, 0, 2 * Math.PI)
            ctx.fill()
            ctx.stroke()
        }
        else if (unit.type === "castle") {
            ctx.lineWidth = 0.1
            ctx.strokeStyle = '#f7594a'
            ctx.fillStyle = '#f7594ac0'
            ctx.beginPath()
            ctx.roundRect(unit.x - 2, unit.y - 2, 4, 4, 0.3)
            ctx.fill()
            ctx.stroke()
        }
    })

    // Draw selected unit indicators
    selection.forEach(unit => {
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(unit.x, unit.y, 0.075, 0, 2 * Math.PI)
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