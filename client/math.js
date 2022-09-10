export const averagePoint = (points) => div(add(...points), points.length)

export function circleRectIntersects(circle, rect) {
    const closestX = clamp(circle.x, rect.x1, rect.x2)
    const closestY = clamp(circle.y, rect.y1, rect.y2)

    const distanceX = circle.x - closestX
    const distanceY = circle.y - closestY

    const distanceSquared = distanceX**2 + distanceY**2
    return distanceSquared <= circle.r**2
}

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max)
}

export const vec = (x, y) => ({x, y})
export const polar = (t, r=1) => vec(Math.cos(t) * r, Math.sin(t) * r)
export const zero = {x: 0, y: 0}
export const add = (...vecs) => vecs.reduce((a, b) => vec(a.x + b.x, a.y + b.y))
export const sub = (...vecs) => vecs.reduce((a, b) => vec(a.x - b.x, a.y - b.y))
export const scale = ({x, y}, a) => vec(x * a, y * a)
export const div = ({x, y}, a) => vec(x / a, y / a)
export const mag2 = ({x, y}) => x*x + y*y
export const heading = ({x, y}) => Math.atan2(y, x)
