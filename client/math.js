export function circleRectIntersects(circle, rect) {
    const closestX = clamp(circle.x, rect.x1, rect.x2)
    const closestY = clamp(circle.y, rect.y1, rect.y2)

    const distanceX = circle.x - closestX
    const distanceY = circle.y - closestY

    const distanceSquared = distanceX**2 + distanceY**2
    return distanceSquared <= circle.r**2
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max)
}
