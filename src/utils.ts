
function imageDataFromSource(image:HTMLImageElement, scale:number) {
    // await new Promise<void>(resolve => image.addEventListener('load', () => resolve()));
    const context = Object.assign(document.createElement('canvas'), {
        width: image.width,
        height: image.height
    }).getContext('2d');
    if (context) {
        context.imageSmoothingEnabled = false;
        context.drawImage(image, 0, 0, image.width*scale, image.height*scale);
        return context.getImageData(0, 0, image.width*scale, image.height*scale);
    }
    return null;
}



export {imageDataFromSource};