export function circleRectIntersects(circle, rect) {
    const distanceX = Math.abs(circle.x - rect.x)
    const distanceY = Math.abs(circle.y - rect.y)
    const halfRectWidth = rect.width / 2
    const halfRectHeight = rect.height / 2

    if (distanceX > (halfRectWidth + circle.r) ||
        distanceY > (halfRectHeight + circle.r)) {
        return false
    }

    if (distanceX <= halfRectWidth ||
        distanceY <= halfRectHeight) {
        return true
    }

    const cornerDistanceSquared = (distanceX - halfRectWidth)**2 + (distanceY - halfRectHeight)**2
    return cornerDistanceSquared <= circle.r**2
}
