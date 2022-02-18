
import { ThreeEvent, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useState } from 'react';
import { DoubleSide, DataTexture, Texture, Vector3, Vector2, Shape, BufferGeometry, PlaneBufferGeometry, CanvasTexture, LinearFilter, ClampToEdgeWrapping, SpriteMaterial, Sprite, ShapeGeometry, TextureLoader, ShapeBufferGeometry } from 'three'
import { Text } from './Text'


interface IDepth {
    data: number[]
    n: number
    m: number
}

interface IProps {
    map: DataTexture | Texture
    depth: IDepth | null
    scale: Vector3

    clickMarker?: boolean
    continousMarker?: boolean

    metalness?: number
    roughness?: number
    flatShading?: boolean
}

/**
 * Surface
 *
 * Map ~ surface texture
 * Depth ~ bump scale texture (gray scale)
 * Scale ~ vector of how to scale the surface
 */
const Surface = ({ map, depth, scale, ...props }: IProps) => {

    const [geom, setGeom] = useState(new PlaneBufferGeometry())
    useEffect(
        () => {
            if (depth == null) {
                return;
            }
            console.log(depth)
            const t = 2000;

            let x = depth.n;
            let y = depth.m;
            if (x * y > t) {
                const r = depth.n / depth.m;
                y = Math.floor(Math.sqrt(t / r))
                x = Math.floor(r * y);
            }

            const geomn = new PlaneBufferGeometry(1, 1, x, y)
            const pos = geomn.getAttribute("position");
            const pa = pos.array as number[];
            const w = x + 1;
            const h = y + 1;
            for (let j = 0; j < h; j++) {
                for (let i = 0; i < w; i++) {
                    const idx = j * w + i;
                    const imgI = Math.floor((depth.n - 1) * i / (w - 1))
                    const imgJ = Math.floor((depth.m - 1) * j / (h - 1))
                    const idxmap = imgJ * depth.n + imgI
                    let d = depth.data[idxmap];
                    if (isNaN(d))
                        d = 0;
                    pa[3 * idx + 2] = d;
                }
            }

            setGeom(geomn);
        }, [depth]
    )

    const [continousMarkerPos, setContinousMarkerPos] = useState(new Vector3(0, 0, 0))
    const [clickMarkerPos, setClickMarkerPos] = useState(new Vector3(0, 0, 0))
    const [renderContinousMarker, setRenderContinousMarker] = useState(false);
    const [renderClickMarker, setRenderClickMarker] = useState(false);

    const [mouseClicked, setMouseClicked] = useState(false);
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | undefined>(undefined);

    const useContinousMarker = props.continousMarker;
    const useClickMarker = props.clickMarker;

    const handleMouseHover = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        setContinousMarkerPos(e.point)
    };

    const handleMouseEnter = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        setRenderContinousMarker(true)
    }

    const handleMouseExit = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        setRenderContinousMarker(false)
    }

    const handleMouseDownClick = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        if (mouseClicked) {
            setClickMarkerPos(e.point)
            setRenderClickMarker(true)
            if (timeoutId) clearTimeout(timeoutId);
            setMouseClicked(false)
        }
        else {
            setMouseClicked(true);
            setTimeoutId(setTimeout(() => setMouseClicked(false), 500));
        }

    }

    const onMouseHover = useContinousMarker ? handleMouseHover : undefined;
    const onMouseEnter = useContinousMarker ? handleMouseEnter : undefined;
    const onMouseExit = useContinousMarker ? handleMouseExit : undefined;

    const onMouseDownClick = useClickMarker ? handleMouseDownClick : undefined;

    return (
        <Suspense fallback={null}>
            <mesh position={[0.5 * scale.x, 0.5 * scale.y, 0]} scale={scale} onPointerDown={onMouseDownClick} onPointerMove={onMouseHover} onPointerEnter={onMouseEnter} onPointerLeave={onMouseExit} geometry={geom}>
                <meshStandardMaterial
                    map={map}
                    metalness={0.1}
                    roughness={0.6}
                    side={DoubleSide}
                    alphaToCoverage
                    {...props}
                />
            </mesh>

            <Marker position={continousMarkerPos} visible={useContinousMarker && renderContinousMarker} />
            <Marker position={clickMarkerPos} visible={useClickMarker && renderClickMarker} />

        </Suspense>
    )
}

interface IMarkerProps {
    position: Vector3

    visible?: boolean
}

const Marker = ({ position, ...props }: IMarkerProps) => {

    const [textPos, setTextPos] = useState(position)
    const [textValue, setTextValue] = useState(0);
    const line = useRef(new BufferGeometry().setFromPoints([position, position]))

    useEffect(
        () => {
            const pos = line.current.getAttribute("position")
            const pa = pos.array as number[]

            const z = position.z + Math.max((0.5 - position.z), 0.1);
            setTextPos(new Vector3(position.x, position.y, z))

            pa[0] = position.x
            pa[3] = position.x

            pa[1] = position.y
            pa[4] = position.y

            pa[2] = position.z
            pa[5] = z
            pos.needsUpdate = true;

            setTextValue(Math.round(position.z * 1000) / 1000);
        }, [position]
    )



    return (
        <Suspense fallback={null}>
            <line_ key={line.current.uuid} geometry={line.current} {...props}>
                <meshBasicMaterial
                    attach="material"
                    color={'black'}
                    polygonOffset
                    polygonOffsetFactor={GRIDOffsetFactor}
                    polygonOffsetUnits={GRIDOffsetUnits}
                />
            </line_>
            
            <Billboard3 name={textValue.toString()} position={textPos} labelWidth={150} size={32} />


            {/* <Tick x={textValue} anchorX={'right'} position={textPos} {...props} /> */}
        </Suspense>
    )
}


interface ITick {
    x: number
    anchorX: 'right' | 'left'
    position: Vector3

    visible?: boolean
}

const Tick = ({ x, anchorX, position, ...props }: ITick) => {
    const { camera } = useThree()
    const ref = useRef<Text>()

    // Change text rotation
    useFrame(() => {
        // @ts-ignore
        if (ref.current) ref.current.quaternion.copy(camera.quaternion)
    })

    let t = x.toString()
    if (anchorX === 'right') t += '-'
    else t = '-' + t

    return (
        <Text
            ref={ref}
            position={position}
            anchorX={anchorX}
            anchorY="middle"
            outlineColor={'white'}
            outlineWidth={0.0025}
            fontSize={0.025}
            strokeWidth={1}
            strokeColor={'black'}
            fillOpacity={0}
            {...props}
        >
            {t}
        </Text>
    )
}




function makeLabelCanvas(baseWidth: number, size: number, name: string) {
    const borderSize = 2;
    const ctx = document.createElement('canvas').getContext('2d');
    if(!ctx) return undefined
    const font = `${size}px bold sans-serif`;
    
    ctx.font = font;
    // measure how long the name will be
    const textWidth = ctx.measureText(name).width;

    const doubleBorderSize = borderSize * 2;
    const width = baseWidth + doubleBorderSize;
    const height = size + doubleBorderSize;
    ctx.canvas.width = width;
    ctx.canvas.height = height;

    // need to set font again after resizing canvas
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    ctx.fillStyle = 'blue';
    ctx.fillRect(0, 0, width, height);

    // scale to fit but don't stretch
    const scaleFactor = Math.min(1, baseWidth / textWidth);
    ctx.translate(width / 2, height / 2);
    ctx.scale(scaleFactor, 1);
    ctx.fillStyle = 'white';
    ctx.fillText(name, 0, 0);

    return ctx.canvas;
}

interface IBillboard {
    position: Vector3,
    labelWidth: number,
    size: number,
    name: string
}

const Billboard = ({ position, labelWidth, size, name }: IBillboard) => {
    const canvas = makeLabelCanvas(labelWidth, size, name);
    if (!canvas) return (<> </>);
    const texture = new CanvasTexture(canvas);
    // because our canvas is likely not a power of 2
    // in both dimensions set the filtering appropriately.
    texture.minFilter = LinearFilter;
    texture.wrapS = ClampToEdgeWrapping;
    texture.wrapT = ClampToEdgeWrapping;

    const labelMaterial = new SpriteMaterial({
        map: texture,
        transparent: true,
    });
    const labelBaseScale = 0.001;

    const scale = new Vector3(canvas.width * labelBaseScale, canvas.height * labelBaseScale, 1);

    return (
        <sprite scale={scale} material={labelMaterial} position={position} />

    )
}

const Billboard2 = ({ position, labelWidth, size, name }: IBillboard) =>{
    const [map] = useState(new DataTexture());
    useEffect(
        ()=>{
            const img = new ImageData(300,300);
            for (let i = 0; i < 300; i++) {
                for(let j=0; j< 300;j++){
                    const idx = i*300 + j;
                    const r = Math.sqrt(Math.pow((i - 150),2) + Math.pow((j-150),2))
                    const v = r < 150 ? 255 : 0
                    img.data[4*idx ] = v
                    img.data[4*idx +1] = v
                    img.data[4*idx +2] = v
                    img.data[4*idx +3] = 255
                }            
            }
            map.image = img;
            map.needsUpdate = true;
        },[]
    )
    const scale = new Vector3(1,0.3,1)
    return(
        <mesh scale={scale} position={position} >
        <planeBufferGeometry args={[1,1,1,1]} >

        </planeBufferGeometry>
        <meshStandardMaterial
             alphaMap={map}
             alphaToCoverage
            />

        </mesh>
    )
}


function RoundedCornerGeometry(w:number,h:number, r:number){
    let x = -w/2; let y = 0; 
    let h1 = h*0.2;
    let w1 = w*0.1;

    let shape = new Shape();
    shape.moveTo( x, y + r + h1 );
    shape.lineTo( x, y + h - r );
    shape.quadraticCurveTo( x, y + h, x + r, y + h );
    shape.lineTo( x + w - r, y + h );
    shape.quadraticCurveTo( x + w, y + h, x + w, y + h - r );
    shape.lineTo( x + w, y + r + h1);
    shape.quadraticCurveTo( x + w, y + h1, x + w - r, y + h1);
    shape.lineTo( x + w/2 + w1/2, y + h1 );
    shape.lineTo( x + w/2, y);
    shape.lineTo( x + w/2 - w1/2, y + h1 );
    shape.lineTo( x + r, y + h1);
    shape.quadraticCurveTo( x, y + h1, x, y + r + h1);

    const geom = new ShapeBufferGeometry(shape);
    const pos = geom.attributes.position;
    const posa = pos.array;
    const uv = geom.attributes.uv;
    const uva = uv.array as number[];
    for(let i = 0 ; i < pos.count || i < uv.count; i++)
    {
        const px = posa[i*3]
        const py = posa[i*3 + 1]

        uva[i*2] = (px-x)/w;
        uva[i*2 + 1] = (py-y)/h;
    }
    uv.needsUpdate = true;

    return geom;
}



const Billboard3 = ({ position, labelWidth, size, name }: IBillboard) =>{
    const { camera } = useThree()
    const ref = useRef();
    useFrame(() => {
        if (ref.current) {
            // @ts-ignore
            ref.current.quaternion.copy(camera.quaternion)
            const d = camera.position.distanceTo(position)
            // @ts-ignore
            ref.current.scale.set(d,d,d);
        }
    })


    let height = 30; 
    const texture = dcText(name,15,height,50)
    const geom = RoundedCornerGeometry(0.2,0.1,0.02)
    //console.log(geom)
    //const geom = new PlaneBufferGeometry(0.1,0.05)

    return(
        <mesh ref={ref} position={position} geometry={geom}>
            <meshBasicMaterial map={texture} side={DoubleSide}/>
        </mesh>
    )
}


function dcText(txt:string, hWorldTxt:number, hWorldAll:number, hPxTxt:number) { // the routine
    // txt is the text.
    // hWorldTxt is world height of text in the plane.
    // hWorldAll is world height of whole rectangle containing the text.
    // hPxTxt is px height of text in the texture canvas; larger gives sharper text.
    // The plane and texture canvas are created wide enough to hold the text.
    // And wider if hWorldAll/hWorldTxt > 1 which indicates padding is desired.
    var kPxToWorld = hWorldTxt/hPxTxt;                // Px to World multplication factor
    // hWorldTxt, hWorldAll, and hPxTxt are given; get hPxAll
    var hPxAll = Math.ceil(hWorldAll/kPxToWorld);     // hPxAll: height of the whole texture canvas
    // create the canvas for the texture
    var txtcanvas = document.createElement("canvas"); // create the canvas for the texture
    var ctx = txtcanvas.getContext("2d");
    if(!ctx) return undefined;
    ctx.font = hPxTxt + "px sans-serif";        
    // now get the widths
    var wPxTxt = ctx.measureText(txt).width;         // wPxTxt: width of the text in the texture canvas
    var wWorldTxt = wPxTxt*kPxToWorld;               // wWorldTxt: world width of text in the plane
    var wWorldAll = wWorldTxt+(hWorldAll-hWorldTxt); // wWorldAll: world width of the whole plane
    var wPxAll = Math.ceil(wWorldAll/kPxToWorld);    // wPxAll: width of the whole texture canvas

    // next, resize the texture canvas and fill the text
    txtcanvas.width =  wPxAll;
    txtcanvas.height = hPxAll;

    ctx.fillStyle = "blue"
    ctx.fillRect( 0,0, wPxAll,hPxAll);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle"; 
    ctx.fillStyle = "white"
    ctx.font = hPxTxt + "px sans-serif";   // needed after resize
    ctx.fillText(txt, wPxAll/2, hPxAll/2); // the deed is done
    const data = ctx.getImageData(0, 0, wPxAll, hPxAll);
    // next, make the texture
    var texture = new Texture(txtcanvas); // now make texture

    texture.minFilter = LinearFilter;     // eliminate console message
    texture.needsUpdate = true;                 // duh
    // and make the world plane with the texture
    
    return texture;
  }


function getTexture(txt:string){
        // txt is the text.
    // hWorldTxt is world height of text in the plane.
    // hWorldAll is world height of whole rectangle containing the text.
    // hPxTxt is px height of text in the texture canvas; larger gives sharper text.
    // The plane and texture canvas are created wide enough to hold the text.
    // And wider if hWorldAll/hWorldTxt > 1 which indicates padding is desired.
    // create the canvas for the texture
    var txtcanvas = document.createElement("canvas"); // create the canvas for the texture
    var ctx = txtcanvas.getContext("2d");
    if(!ctx) return undefined
    ctx.font = 32 + "px sans-serif";        
    // now get the widths
    var wPxTxt = ctx.measureText(txt).width;         // wPxTxt: width of the text in the texture canvas
    // next, resize the texture canvas and fill the text
    txtcanvas.width =  wPxTxt + 10;
    txtcanvas.height = 32 + 10;
    
    ctx.fillStyle = "blue"
    ctx.fillRect( 0,0, txtcanvas.width,txtcanvas.height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle"; 
    ctx.fillStyle = "white" // fgcolor
    ctx.font = 32 + "px sans-serif";   // needed after resize
    ctx.fillText(txt, txtcanvas.width/2, txtcanvas.height/2); // the deed is done
    // next, make the texture
    var texture = new Texture(txtcanvas); // now make texture
    texture.minFilter = LinearFilter;     // eliminate console message
    texture.needsUpdate = true;                 // duh
    return texture;
}




export default Surface

const GRIDOffsetFactor = 10
const GRIDOffsetUnits = 1