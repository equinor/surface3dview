import { DoubleSide, DataTexture, Texture, Vector3, BufferGeometry, PlaneBufferGeometry } from 'three'
import { Suspense, useEffect, useRef, useState } from 'react'
import { imageDataFromSource } from './utils'
import { ThreeEvent } from '@react-three/fiber'
import { Html } from './Html'

interface IProps {
    depth: DataTexture | Texture
    scale: Vector3

    clickMarker?: boolean
    continousMarker?: boolean
    positionToMarkerText?: (x: number, y: number) => string
    showMarkerHitbox?: boolean
}

/**
 * MarkerSurface
 * Surface to add marker support. Surface will be scaled down to ca 2000 faces such that the raycaster is faster.
 *
 * Depth ~ bump scale texture (gray scale, using the g channel)
 * Scale ~ vector of how to scale the surface
 */
const MarkerSurface = ({ depth, scale, ...props }: IProps) => {

    const [markerGeom, setMarkerGeom] = useState(new PlaneBufferGeometry(1, 1, 2, 2))

    useEffect(
        () => {
            depth.onUpdate = () => {
                updateDepth(depth)
            }

            updateDepth(depth)

            return () => {
                //@ts-ignore
                depth.onUpdate = null
            }
        }, [depth]
    )

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
        const pos = geomn.getAttribute("position")
        const pa = pos.array as number[]

        for (let j = 0; j < y; j++) {
            for (let i = 0; i < x; i++) {
                const di = Math.floor(i * (n - 1) / (x - 1))
                const dj = Math.floor(j * (m - 1) / (y - 1))
                const didx = dj * n + di

                let d = image.data[4 * didx + 1]
                if (isNaN(d))
                    d = 0

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
        }
        else {
            setMouseClicked(true)
            // According to this it is not possible to fetch double click timing from the OS
            // https://stackoverflow.com/questions/8333764/can-i-query-detect-the-double-click-speed-for-a-webpage-user
            setTimeoutId(setTimeout(() => setMouseClicked(false), 500)) // 0.5 s is default doubleclick time in windows
        }
    }

    const onMouseHover = useContinousMarker ? handleMouseHover : undefined
    const onMouseEnter = useContinousMarker ? handleMouseEnter : undefined
    const onMouseExit = useContinousMarker ? handleMouseExit : undefined

    const onMouseDownClick = useClickMarker ? handleMouseDownClick : undefined


    return (
        <Suspense fallback={null}>
            <mesh position={[0.5 * scale.x, 0.5 * scale.y, 0]} scale={scale} onPointerDown={onMouseDownClick} onPointerMove={onMouseHover} onPointerEnter={onMouseEnter} onPointerLeave={onMouseExit} geometry={markerGeom}>
                <meshBasicMaterial
                    transparent={!props.showMarkerHitbox}
                    opacity={props.showMarkerHitbox ? 1 : 0}
                    wireframe
                    color={"purple"}
                    side={DoubleSide}
                />
            </mesh>
            <Marker position={continousMarkerPos} visible={useContinousMarker && renderContinousMarker} positionToMarkerText={props.positionToMarkerText} />
            <Marker position={clickMarkerPos} visible={useClickMarker && renderClickMarker} positionToMarkerText={props.positionToMarkerText} onCloseMarkerClick={(v) => setRenderClickMarker(false)} />
        </Suspense>

    )
}


interface IMarkerProps {
    position: Vector3

    positionToMarkerText?: (x: number, y: number) => string
    onCloseMarkerClick?: React.MouseEventHandler<HTMLButtonElement>
    visible?: boolean
}

const Marker = ({ position, ...props }: IMarkerProps) => {

    const [textPos, setTextPos] = useState(position)
    const [textValue, setTextValue] = useState('')
    const line = useRef(new BufferGeometry().setFromPoints([position, position]))

    useEffect(
        () => {
            const pos = line.current.getAttribute("position")
            const pa = pos.array as number[]

            const z = position.z + Math.max((0.5 - position.z), 0.1)
            setTextPos(new Vector3(position.x, position.y, z))

            pa[0] = position.x
            pa[3] = position.x

            pa[1] = position.y
            pa[4] = position.y

            pa[2] = position.z
            pa[5] = z
            pos.needsUpdate = true

            let txt = ''
            if (props.positionToMarkerText) {
                txt = props.positionToMarkerText(position.x, position.y)
            }
            else {
                txt = (Math.round(position.z * 1000) / 1000).toString()
            }
            setTextValue(txt)
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
                    {...props}
                />
            </line_>

            <Billboard name={textValue.toString()} position={textPos} onCloseButtonClick={props.onCloseMarkerClick} {...props} />
        </Suspense>
    )
}

interface IBillboard {
    position: Vector3,
    name: string

    visible?: boolean
    onCloseButtonClick?: React.MouseEventHandler<HTMLButtonElement>
}

const Billboard = ({ position, name, ...props }: IBillboard) => {
    // Cound not get visible prop on Html to work.
    if (!props.visible) {
        return (<></>)
    }
    return (
        <Html position={position} center>
            <div style={{ background: 'white', width: '300px', height: '60px', boxShadow: '0px 0px 5px 0px black', borderRadius: "20px", display: 'grid', gridTemplateColumns: '20px auto 20px', gridTemplateRows: '20px auto 20px' }}>
                <div style={{ gridColumn: '2', gridRow: '2' }}>
                    {name}
                </div>
                <button style={{ gridColumn: '3', gridRow: '0' }} type='button' onClick={props.onCloseButtonClick}>
                </button>
            </div>
        </Html>
    )
}

const GRIDOffsetFactor = 10
const GRIDOffsetUnits = 1

export default MarkerSurface