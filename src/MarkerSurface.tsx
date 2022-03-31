import { DoubleSide, DataTexture, Texture, Vector3, BufferGeometry, PlaneBufferGeometry } from 'three'
import { Suspense, useEffect, useRef, useState } from 'react'
import { imageDataFromSource } from './utils'
import { ThreeEvent, useThree } from '@react-three/fiber'
import { Html } from './Html'

interface IProps {
    depth: DataTexture | Texture
    scale: Vector3

    position?:Vector3

    clickMarker?: boolean
    onClickPositionChanged?: (v: Vector3) => void
    clickContent?: JSX.Element

    continousMarker?: boolean
    onContinousPositionChanged?: (v: Vector3) => void
    continousContent?: JSX.Element

    showMarkerHitbox?: boolean
}

/**
 * MarkerSurface
 * Surface to add marker support. Surface will be scaled down to ca 2000 faces such that the raycaster is faster.
 *
 * Depth ~ bump scale texture (gray scale, using the g channel)
 * Scale ~ vector of how to scale the surface
 */
const MarkerSurface = ({ depth, scale, position, ...props }: IProps) => {
    const [markerGeom, setMarkerGeom] = useState(new PlaneBufferGeometry(1, 1, 2, 2))

    useEffect(() => {
        depth.onUpdate = () => {
            updateDepth(depth)
        }

        updateDepth(depth)

        return () => {
            //@ts-ignore
            depth.onUpdate = null
        }
    }, [depth])

    const updateDepth = (depth: Texture | DataTexture) => {
        let image = depth.image

        if (!(image instanceof ImageData)) {
            try {
                image = imageDataFromSource(image, 1)
            } catch (error) {
                image = null
            }
        }

        if (image != null) {
            updateMarkerGeometry(image, depth.flipY)
        }
    }

    const updateMarkerGeometry = (image: ImageData, flipY: boolean) => {
        const t = 2000
        const n = image.width
        const m = image.height

        let x = image.width
        let y = image.height
        if (x * y > t) {
            const r = n / m
            y = Math.floor(Math.sqrt(t / r))
            x = Math.floor(r * y)
        }

        const geomn = new PlaneBufferGeometry(1, 1, x - 1, y - 1)
        const pos = geomn.getAttribute('position')
        const pa = pos.array as number[]

        for (let j = 0; j < y; j++) {
            for (let i = 0; i < x; i++) {
                const di = Math.floor((i * (n - 1)) / (x - 1))
                const dj = Math.floor((j * (m - 1)) / (y - 1))
                const didx = dj * n + di

                let d = image.data[4 * didx + 1]
                if (isNaN(d)) d = 0

                const idx = j * x + i
                pa[3 * idx + 2] = d / 255
            }
        }

        setMarkerGeom(geomn)
    }

    const [continousMarkerPos, setContinousMarkerPos] = useState(new Vector3(0, 0, 0))
    const [clickMarkerPos, setClickMarkerPos] = useState(new Vector3(0, 0, 0))
    const [renderContinousMarker, setRenderContinousMarker] = useState(false)
    const [renderClickMarker, setRenderClickMarker] = useState(false)

    const [mouseClicked, setMouseClicked] = useState(false)
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | undefined>(undefined)

    const useContinousMarker = props.continousMarker
    const useClickMarker = props.clickMarker

    const handleMouseHover = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        setContinousMarkerPos(e.point)
    }

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
            if (timeoutId) clearTimeout(timeoutId)
            setMouseClicked(false)
        } else {
            setMouseClicked(true)
            // According to this it is not possible to fetch double click timing from the OS
            // https://stackoverflow.com/questions/8333764/can-i-query-detect-the-double-click-speed-for-a-webpage-user
            setTimeoutId(setTimeout(() => setMouseClicked(false), 500)) // 0.5 s is default doubleclick time in windows
        }
    }

    useEffect(() => {
        if (props.onContinousPositionChanged) props.onContinousPositionChanged(continousMarkerPos)
    }, [continousMarkerPos])

    useEffect(() => {
        if (props.onClickPositionChanged) props.onClickPositionChanged(clickMarkerPos)
    }, [clickMarkerPos])

    const onMouseHover = useContinousMarker ? handleMouseHover : undefined
    const onMouseEnter = useContinousMarker ? handleMouseEnter : undefined
    const onMouseExit = useContinousMarker ? handleMouseExit : undefined

    const onMouseDownClick = useClickMarker ? handleMouseDownClick : undefined

    const continousContent = props.continousContent ? props.continousContent : <></>
    const clickContent = props.clickContent ? props.clickContent : <></>

    const p = position ? position : new Vector3(0.5*scale.x,0.5*scale.y, 0);
    
    return (
        <Suspense fallback={null}>
            <mesh
                position={p}
                scale={scale}
                onPointerDown={onMouseDownClick}
                onPointerMove={onMouseHover}
                onPointerEnter={onMouseEnter}
                onPointerLeave={onMouseExit}
                geometry={markerGeom}
            >
                <meshBasicMaterial
                    transparent={!props.showMarkerHitbox}
                    opacity={props.showMarkerHitbox ? 1 : 0}
                    wireframe
                    color={'purple'}
                    side={DoubleSide}
                />
            </mesh>
            <Marker content={continousContent} position={continousMarkerPos} visible={useContinousMarker && renderContinousMarker} />
            <Marker
                content={clickContent}
                position={clickMarkerPos}
                visible={useClickMarker && renderClickMarker}
                onCloseMarkerClick={(v) => setRenderClickMarker(false)}
            />
        </Suspense>
    )
}

interface IMarkerProps {
    position: Vector3
    content: JSX.Element

    onCloseMarkerClick?: React.MouseEventHandler<SVGSVGElement>
    visible?: boolean
}

const Marker = ({ position, content, ...props }: IMarkerProps) => {
    const [textPos, setTextPos] = useState(position)
    const {camera} = useThree();
    const line = useRef(new BufferGeometry().setFromPoints([position, position]))

    useEffect(() => {
        const pos = line.current.getAttribute('position')
        const pa = pos.array as number[]
        
        const screenTarget = 0.7;
        const t1 = 0;
        const t2 = 0.5;
        const t3 = 1;
        const p1w = position.clone();
        const p2w = p1w.clone().add(new Vector3(0,0,t2));
        const p3w = p1w.clone().add(new Vector3(0,0,t3));

        const p1c = p1w.clone().project(camera);
        const p2c = p2w.clone().project(camera);
        const p3c = p3w.clone().project(camera);
        camera.getWorldPosition

        const p1y = p1c.y;
        const p2y = p2c.y;
        const p3y = p3c.y;

        // // t is length along line in world space (z coordinate along stick)
        // // t1,t2,t3 are t values giving screen y values p1y, p2y, p3y.
        // const t =-((((p3y-p2y)*t2+(p1y-p3y)*t1)*t3+(p2y-p1y)*t1*t2)*screenTarget+((p1y*p2y-p1y*p3y)*t2+(p2y*p3y-p1y*p2y)*t1)*t3+
        // (p1y-p2y)*p3y*t1*t2)/(((p2y-p1y)*t3+(p1y-p3y)*t2+(p3y-p2y)*t1)*screenTarget+(p1y-p2y)*p3y*t3+(p2y*p3y-p1y*p2y)*t2+
        // (p1y*p2y-p1y*p3y)*t1)

        // @ts-ignore
        const projT = (target, x1,x2,x3) => {return -((((x3-x2)*t2+(x1-x3)*t1)*t3+(x2-x1)*t1*t2)*target+((x1*x2-x1*x3)*t2+(x2*x3-x1*x2)*t1)*t3+
            (x1-x2)*x3*t1*t2)/(((x2-x1)*t3+(x1-x3)*t2+(x3-x2)*t1)*target+(x1-x2)*x3*t3+(x2*x3-x1*x2)*t2+
            (x1*x2-x1*x3)*t1)}

        const ty = projT(screenTarget,p1c.y,p2c.y,p3c.y);
        const txmin = projT(-1,p1c.x,p2c.x,p3c.x);
        const txmax = projT(1,p1c.x,p2c.x,p3c.x);

        console.log(ty);
        console.log(txmin)
        console.log(txmax)

        const tx = Math.max(txmax,txmin);
        const t = Math.min(ty, tx);
        console.log(t);

        const z = position.z + Math.max(t,0);
        setTextPos(new Vector3(position.x, position.y, z))

        pa[0] = position.x
        pa[3] = position.x

        pa[1] = position.y
        pa[4] = position.y

        pa[2] = position.z
        pa[5] = z
        pos.needsUpdate = true
    }, [position])

    return (
        <Suspense fallback={null}>
            <line_ key={line.current.uuid} geometry={line.current} {...props}>
                <meshBasicMaterial
                    attach="material"
                    color={'black'}
                    polygonOffset
                    polygonOffsetFactor={GRIDOffsetFactor}
                    polygonOffsetUnits={GRIDOffsetUnits}
                    {...props}
                />
            </line_>

            <Billboard content={content} position={textPos} onCloseButtonClick={props.onCloseMarkerClick} {...props} />
        </Suspense>
    )
}

interface IBillboard {
    position: Vector3
    content: JSX.Element

    visible?: boolean
    onCloseButtonClick?: React.MouseEventHandler<SVGSVGElement>
}

const Billboard = ({ position, content, ...props }: IBillboard) => {
    // Cound not get visible prop on Html to work.
    if (!props.visible) {
        return <></>
    }
    return (
        <Html position={position} center>
            <div
                style={{
                    background: 'white',
                    display: 'grid',
                    gridTemplateColumns: '10px auto 13px',
                    gridTemplateRows: '13px auto 10px',
                    minWidth: '30px',
                    minHeight: '30px',
                    boxShadow: '0px 0px 5px 0px black',
                    borderRadius: '10px',
                }}
            >
                <div style={{ gridColumn: '2', gridRow: '1/span 3' }}>{content}</div>
                <Cross
                    size={10}
                    onClick={props.onCloseButtonClick}
                    style={{ gridColumn: '3', gridRow: '1', alignSelf: 'end', justifySelf: 'left' }}
                />
            </div>
        </Html>
    )
}

interface ICrossProps extends React.SVGProps<SVGSVGElement> {
    size: number
}

const Cross = ({ size, ...props }: ICrossProps) => {
    const [hover, setHover] = useState<boolean>(false)
    const color = hover ? 'grey' : 'black'
    const s = size
    const tl = [1, s - 1]
    const tr = [s - 1, s - 1]
    const bl = [1, 1]
    const br = [s - 1, 1]
    return (
        <svg width={s} height={s} onMouseOver={() => setHover(true)} onMouseOut={() => setHover(false)} {...props}>
            <line x1={bl[0]} y1={bl[1]} x2={tr[0]} y2={tr[1]} stroke={color} strokeWidth={2} />
            <line x1={tl[0]} y1={tl[1]} x2={br[0]} y2={br[1]} stroke={color} strokeWidth={2} />
        </svg>
    )
}

const GRIDOffsetFactor = 10
const GRIDOffsetUnits = 1

export default MarkerSurface
