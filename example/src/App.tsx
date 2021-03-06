import { Suspense, useState, useMemo, useEffect } from 'react'
import { Object3D, Vector3, TextureLoader, DataTexture, Texture } from 'three'
import { Canvas, useLoader, useThree } from '@react-three/fiber'
import { Stats, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Grid, Surface, MarkerSurface, MultiSurfaceContainer } from 'surface-3d-viewer'

import Control from './Control'
import GpuCheck from './GpuCheck'
import { randInt } from 'three/src/math/MathUtils'

Object3D.DefaultUp.set(0, 0, 1)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SurfaceMultiContainerTest = ({ scale }: any) => {
    const [surf, setSurf] = useState([])
    useEffect(() => {
        const surfData = []
        const map1 = useLoader(TextureLoader, './sinc.png')
        const depth1 = useLoader(TextureLoader, './sinc_gray.png')

        surfData.push({ map: map1, depth: depth1, domain: { x: [-200, 800], y: [-200, 200], z: [1200, 2000] } })

        const n = 5
        const m = 5
        const img = new ImageData(n, m)
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < m; j++) {
                const idx = i * m + j
                img.data[4 * idx] = 100
                img.data[4 * idx + 1] = 100
                img.data[4 * idx + 2] = 100
                img.data[4 * idx + 3] = 255
            }
        }

        const depth2 = new DataTexture()
        depth2.image = img
        depth2.needsUpdate = true

        const map2 = new DataTexture()
        map2.image = img
        map2.needsUpdate = true

        surfData.push({ map: map2, depth: depth2, domain: { x: [200, 400], y: [-500, 0], z: [1000, 3000] } })
        // @ts-ignore
        setSurf(surfData)
    }, [])

    return <MultiSurfaceContainer scale={scale} axis={'xyequal'} surfaces={surf} />
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SurfaceContainerReactUpdate = ({ scale, ticks, domains, marker, clickMarker, hitbox, surf }: any) => {
    const [map, setMap] = useState<Texture | DataTexture>(new DataTexture())
    const [depth, setDepth] = useState<Texture | DataTexture>(new DataTexture())
    const [clickPos, setClickPos] = useState<Vector3>(new Vector3())
    const [contPos, setContPos] = useState<Vector3>(new Vector3())

    const mainMap = useLoader(TextureLoader, './sinc.png')
    const mainDepth = useLoader(TextureLoader, './sinc_gray.png')

    useEffect(() => {
        let map1 = new Texture()
        let depth1 = new Texture()
        if (surf === 'main') {
            map1 = mainMap
            depth1 = mainDepth
        } else {
            const n = 5
            const m = 5
            const img = new ImageData(n, m)
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < m; j++) {
                    const idx = i * m + j
                    const c = (255 * (i + j)) / (n - 1 + m - 1)
                    img.data[4 * idx] = c
                    img.data[4 * idx + 1] = c
                    img.data[4 * idx + 2] = c
                    img.data[4 * idx + 3] = 255
                }
            }

            depth1 = new DataTexture()
            depth1.image = img
            depth1.flipY = true
            depth1.needsUpdate = true

            map1 = new DataTexture()
            map1.image = img
            map1.flipY = true
            map1.needsUpdate = true
        }

        setMap(map1)
        setDepth(depth1)
    }, [surf])

    const clickContent = (
        <div style={{ width: '300px', height: '70px' }}>
            <div>
                This is a function x = {Math.round(clickPos.x * 1000) / 1000} y = {Math.round(clickPos.y * 1000) / 1000}
            </div>
            <br />
            <div>React style</div>
        </div>
    )
    const contContent = (
        <div style={{ width: '300px', height: '70px' }}>
            <div>
                This is a function x = {Math.round(contPos.x * 1000) / 1000} y = {Math.round(contPos.y * 1000) / 1000}
            </div>
            <br />
            <div>React style</div>
        </div>
    )

    return (
        <Suspense fallback={null}>
            <Grid scale={scale} domains={domains} ticks={ticks} />
            <Surface map={map} depth={depth} scale={scale} />
            <MarkerSurface
                depth={depth}
                scale={scale}
                continousMarker={marker}
                clickMarker={clickMarker}
                showMarkerHitbox={hitbox}
                clickContent={clickContent}
                continousContent={contContent}
                onClickPositionChanged={setClickPos}
                onContinousPositionChanged={setContPos}
                markerStyle={{ background: 'blue' }}
            />
        </Suspense>
    )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SurfaceContainerThreeUpdate = ({ scale, ticks, domains, marker, clickMarker, hitbox, surf }: any) => {
    const [map] = useState<DataTexture>(new DataTexture())
    const [depth] = useState<DataTexture>(new DataTexture())
    const [clickPos, setClickPos] = useState<Vector3>(new Vector3())
    const [contPos, setContPos] = useState<Vector3>(new Vector3())

    const { invalidate } = useThree()

    useEffect(() => {
        if (surf === 'main') {
            const n = 30
            const m = 50
            const img = new ImageData(n, m)
            const img1 = new ImageData(n, m)
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < m; j++) {
                    const idx = i * m + j
                    img.data[4 * idx] = 200
                    img.data[4 * idx + 1] = 200
                    img.data[4 * idx + 2] = 200
                    img.data[4 * idx + 3] = 255
                    img1.data[4 * idx] = idx == (n / 2) * (m / 2) ? 0 : 255
                    img1.data[4 * idx + 1] = 0
                    img1.data[4 * idx + 2] = 0
                    img1.data[4 * idx + 3] = 255
                }
            }
            depth.image = img
            depth.needsUpdate = true

            map.image = img1
            map.needsUpdate = true
        } else {
            const n = 5
            const m = 5
            const img = new ImageData(n, m)
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < m; j++) {
                    const idx = i * m + j
                    img.data[4 * idx] = 100
                    img.data[4 * idx + 1] = 100
                    img.data[4 * idx + 2] = 100
                    img.data[4 * idx + 3] = 255
                }
            }

            depth.image = img
            depth.needsUpdate = true

            map.image = img
            map.needsUpdate = true
        }
        invalidate()
    }, [surf])

    const clickContent = (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
            <li>
                Testing lists x = {Math.round(clickPos.x * 1000) / 1000} y = {Math.round(clickPos.y * 1000) / 1000}
            </li>
        </ul>
    )
    const contContent = (
        <div style={{ background: 'black', color: 'white', width: '300px', height: '70px' }}>
            <div>
                This is a function x = {Math.round(contPos.x * 1000) / 1000} y = {Math.round(contPos.y * 1000) / 1000}
            </div>
            <br />
            <div>React style updating</div>
        </div>
    )
    return (
        <Suspense fallback={null}>
            <Grid scale={scale} domains={domains} ticks={ticks} />
            <Surface map={map} depth={depth} scale={scale} />
            <MarkerSurface
                depth={depth}
                scale={scale}
                continousMarker={marker}
                clickMarker={clickMarker}
                showMarkerHitbox={hitbox}
                onClickPositionChanged={setClickPos}
                clickContent={clickContent}
                onContinousPositionChanged={setContPos}
                continousContent={contContent}
            />
        </Suspense>
    )
}

const App = () => {
    const [scale, set] = useState(new Vector3(1, 1, 0.2))
    const [x, setX] = useState(100)
    const [ticks, setT] = useState(15)
    const [marker, setMarker] = useState(false)
    const [clickMarker, setClickMarker] = useState(true)
    const [hitbox, setHitbox] = useState(false)
    const [surf, setSurf] = useState<'main' | 'test'>('main')
    const [update, setUpdate] = useState<'react' | 'three'>('react')

    const domains = useMemo(
        () => ({
            x: [0, x],
            y: [0, 250],
            z: [100, 200],
        }),
        [x],
    )

    let container = <></>
    if (update === 'three') {
        container = (
            <SurfaceContainerThreeUpdate
                scale={scale}
                ticks={ticks}
                domains={domains}
                marker={marker}
                clickMarker={clickMarker}
                hitbox={hitbox}
                surf={surf}
            />
        )
    } else if (update === 'react') {
        container = (
            <SurfaceContainerReactUpdate
                scale={scale}
                ticks={ticks}
                domains={domains}
                marker={marker}
                clickMarker={clickMarker}
                hitbox={hitbox}
                surf={surf}
            />
        )
    } else {
        container = <SurfaceMultiContainerTest scale={scale} />
    }

    return (
        <div className="canvas">
            <Control
                z={scale.z}
                setZ={(z: number) => set((v) => new Vector3(v.x, v.y, z))}
                x={x}
                setX={setX}
                t={ticks}
                setT={setT}
                c={marker}
                setC={setMarker}
                cm={clickMarker}
                setCm={setClickMarker}
                hb={hitbox}
                setHb={setHitbox}
                surf={surf}
                setSurf={setSurf}
                update={update}
                setUpate={setUpdate}
            />

            <Canvas frameloop="demand" linear flat>
                <ambientLight intensity={1.0} />
                <pointLight intensity={0.1} position={[0.5, 0.5, 2]} />
                <pointLight intensity={0.1} position={[-0.5, -0.5, 2]} />
                <Suspense fallback={null}>{container}</Suspense>
                <PerspectiveCamera position={[-0.5, -1.0, 1.5]} near={0.01} far={1000} makeDefault />
                <OrbitControls target={[0.5, 0.5, 0]} />
                {process.env.NODE_ENV === 'development' && <Stats />}
            </Canvas>

            <GpuCheck />
        </div>
    )
}

export default App
