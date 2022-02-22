
import { ThreeEvent, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useState } from 'react';
import { DoubleSide, DataTexture, Texture, Vector3, Vector2, Shape, BufferGeometry, PlaneBufferGeometry, CanvasTexture, LinearFilter, ClampToEdgeWrapping, SpriteMaterial, Sprite, ShapeGeometry, TextureLoader, ShapeBufferGeometry } from 'three'
import { Html } from './Html'


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
    positionToMarkerText?: (x: number, y:number) => string

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
            const n = depth.n;
            const m = depth.m;

            const geomn = new PlaneBufferGeometry(1, 1, n-1, m-1)
            const pos = geomn.getAttribute("position");
            const pa = pos.array as number[];

            for (let j = 0; j < m; j++) {
                for (let i = 0; i < n; i++) {
                    const idx = j * n + i;
                    let d = depth.data[idx];
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
        // Register double click.
        if (mouseClicked) {
            setClickMarkerPos(e.point)
            setRenderClickMarker(true)
            if (timeoutId) clearTimeout(timeoutId);
            setMouseClicked(false)
        }
        else {
            setMouseClicked(true);
            // According to this it is not possible to fetch double click timing from the OS
            // https://stackoverflow.com/questions/8333764/can-i-query-detect-the-double-click-speed-for-a-webpage-user
            setTimeoutId(setTimeout(() => setMouseClicked(false), 500)); // 0.5 s is default doubleclick time in windows
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

            <Marker position={continousMarkerPos} visible={useContinousMarker && renderContinousMarker} positionToMarkerText={props.positionToMarkerText} />
            <Marker position={clickMarkerPos} visible={useClickMarker && renderClickMarker} positionToMarkerText={props.positionToMarkerText} onCloseMarkerClick={(v) => setRenderClickMarker(false)}/>

        </Suspense>
    )
}

interface IMarkerProps {
    position: Vector3

    positionToMarkerText?: (x: number, y:number) => string
    onCloseMarkerClick?: React.MouseEventHandler<HTMLButtonElement>
    visible?: boolean
}

const Marker = ({ position, ...props }: IMarkerProps) => {

    const [textPos, setTextPos] = useState(position)
    const [textValue, setTextValue] = useState('');
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

            let txt = ''
            if(props.positionToMarkerText){
                txt = props.positionToMarkerText(position.x, position.y)
            }
            else{
                txt = (Math.round(position.z * 1000) / 1000).toString()
            }
            setTextValue(txt);
        }, [position]
    )



    return (
        <Suspense fallback={null}>
            <line_ key={line.current.uuid} geometry={line.current}  {...props}>
                <meshBasicMaterial
                    attach="material"
                    color={'black'}
                    polygonOffset
                    polygonOffsetFactor={GRIDOffsetFactor}
                    polygonOffsetUnits={GRIDOffsetUnits}
                />
            </line_>
            
            <Billboard name={textValue.toString()} position={textPos} onCloseButtonClick={props.onCloseMarkerClick} {...props}/>
        </Suspense>
    )
}
interface IBillboard {
    position: Vector3,
    name: string

    visible?:boolean
    onCloseButtonClick?: React.MouseEventHandler<HTMLButtonElement>
}

const Billboard = ({ position, name, ...props}: IBillboard) =>{
    // Cound not get visible prop on Html to work.
    if(!props.visible){
        return(<></>)
    } 
    return(
        <Html position={position} center>
            <div style={{background:'white', width:'300px', height:'60px', boxShadow:'0px 0px 5px 0px black', borderRadius:"20px", display:'grid', gridTemplateColumns:'20px auto 20px', gridTemplateRows:'20px auto 20px'}}>
                <div style={{gridColumn:'2', gridRow:'2'}}>
                    {name}
                </div>
                <button style={{gridColumn:'3', gridRow:'0'}} type='button' onClick={props.onCloseButtonClick}>
                </button>
            </div>
        </Html>
    )
}


export default Surface

const GRIDOffsetFactor = 10
const GRIDOffsetUnits = 1