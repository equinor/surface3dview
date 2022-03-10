
function imageDataFromSource(image:HTMLImageElement, scale:number) {
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