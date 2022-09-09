export function arrayOfSize(size, fn) {
    return (new Array(size)).fill(undefined).map(() => fn())
}
