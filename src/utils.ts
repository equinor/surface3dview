
function imageDataFromSource(image:HTMLImageElement, scale:number) {
    console.log("aaaaa")
    // await new Promise<void>(resolve => image.addEventListener('load', () => resolve()));
    const context = Object.assign(document.createElement('canvas'), {
        width: image.width,
        height: image.height
    }).getContext('2d');
    console.log("bbbbb")
    if (context) {
        console.log("ccccc")
        context.imageSmoothingEnabled = false;
        context.drawImage(image, 0, 0, image.width*scale, image.height*scale);
        console.log("ddddd")
        return context.getImageData(0, 0, image.width*scale, image.height*scale);
    }
    return null;
}



export {imageDataFromSource};