function imageDataFromSource(image: HTMLImageElement, scale: number) {
    const context = Object.assign(document.createElement('canvas'), {
        width: image.width,
        height: image.height,
    }).getContext('2d')
    if (context) {
        context.imageSmoothingEnabled = false
        context.drawImage(image, 0, 0, image.width * scale, image.height * scale)
        return context.getImageData(0, 0, image.width * scale, image.height * scale)
    }
    return null
}


// Interval functions:
export const union = (a: [number, number], b: [number, number]) => {
    const res: [number, number] = [0, 0]
    res[0] = Math.min(a[0], b[0])
    res[1] = Math.max(a[1], b[1])
    return res
}

export const dist = (a: number[]) => {
    return a[1] - a[0]
}

export const lerp = (r: [number, number], t: number) => {
    return r[0] + (r[1] - r[0]) * t
}

export const mapping = (r1: [number, number], r2: [number, number]) => {
    const f = (v: number) => {
        return r2[0] + ((v - r1[0]) * dist(r2)) / dist(r1)
    }
    return f
}


export { imageDataFromSource }
