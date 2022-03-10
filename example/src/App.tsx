import { Suspense, useState, useMemo, useEffect } from 'react'
import { Object3D, Vector3, TextureLoader, DataTexture, Texture } from 'three'
import { Canvas, useLoader } from '@react-three/fiber'
import { Stats, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Grid, Surface } from 'surface-3d-viewer'

import Control from './Control'
import GpuCheck from './GpuCheck'

Object3D.DefaultUp.set(0, 0, 1)

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
const SurfaceContainer = ({ scale, ticks, domains, marker, clickMarker, hitbox, surf }: any) => {
    const map = useLoader(TextureLoader, './sinc.png')
    const depth = useLoader(TextureLoader, './sinc_gray.png')
    console.log(surf)
    // const [map,setMap] = useState<Texture|DataTexture>(new DataTexture())
    // const [depth,setDepth] = useState<Texture|DataTexture>(new DataTexture())

    // const mainMap = useLoader(TextureLoader, './sinc.png')
    // const mainDepth = useLoader(TextureLoader, './sinc_gray.png')

    // useEffect(()=>{
    //     let map1 = new Texture();
    //     let depth1 = new Texture();
    //     if (surf === "main") {
    //         console.log("ssssssssss")
    //         map1 = mainMap
    //         console.log("trreter")
    //         depth1 = mainDepth;
    //         console.log("ttttttttttttt")
    
    //         // const n = 20;
    //         // const m = 20;
    //         // const img = new ImageData(n, m);
    //         // for (let i = 0; i < n; i++) {
    //         //     for (let j = 0; j < m; j++) {
    //         //         const idx = i * m + j;
    //         //         img.data[4 * idx] = 200;
    //         //         img.data[4 * idx + 1] = 200;
    //         //         img.data[4 * idx + 2] = 200;
    //         //         img.data[4 * idx + 3] = 255;
    //         //     }
    //         // }
    
    //         // depth.image = img;
    //         // depth.needsUpdate = true;
    
    //         // map.image = img;
    //         // map.needsUpdate = true;
    //     }
    //     else {
    //         const n = 5;
    //         const m = 5;
    //         const img = new ImageData(n, m);
    //         for (let i = 0; i < n; i++) {
    //             for (let j = 0; j < m; j++) {
    //                 const idx = i * m + j;
    //                 img.data[4 * idx] = 100;
    //                 img.data[4 * idx + 1] = 100;
    //                 img.data[4 * idx + 2] = 100;
    //                 img.data[4 * idx + 3] = 255;
    //             }
    //         }
    
    //         depth1 = new DataTexture();
    //         depth1.image = img;
    //         depth1.needsUpdate = true;
    
    //         map1 = new DataTexture();
    //         map1.image = img;
    //         map1.needsUpdate = true;
    //         setMap(map1)
    //     }
    //     setMap(map1)
    //     setDepth(depth1) 
    //     console.log("dfgsfdg")
    // }, [surf])
    

    const pToM = (x: number, y: number) => `This is a function x = ${Math.round(x * 1000) / 1000} y = ${Math.round(y * 1000) / 1000}`

    // const test = (x:number,y:number) => <div style={{background:'black'}}>This is a function x = {Math.round(x * 1000) / 1000} y = {Math.round(y * 1000) / 1000}</div>

    return (
        <Suspense fallback={null}>
            <Grid scale={scale} domains={domains} ticks={ticks} />
            <Surface map={map} depth={depth} scale={scale} continousMarker={marker} clickMarker={clickMarker} positionToMarkerText={pToM} showMarkerHitbox={hitbox} />
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
    const [surf, setSurf] = useState<"main"|"test">("main")

    const domains = useMemo(
        () => ({
            x: [0, x],
            y: [0, 250],
            z: [100, 200],
        }),
        [x],
    )

    return (
        <div className="canvas">
            <Control z={scale.z} setZ={(z: number) => set((v) => new Vector3(v.x, v.y, z))} x={x} setX={setX} t={ticks} setT={setT} c={marker} setC={setMarker} cm={clickMarker} setCm={setClickMarker} hb={hitbox} setHb={setHitbox} surf={surf} setSurf={setSurf} />

            <Canvas frameloop="demand" linear flat >
                <ambientLight intensity={1.0} />
                <pointLight intensity={0.1} position={[0.5, 0.5, 2]} />
                <pointLight intensity={0.1} position={[-0.5, -0.5, 2]} />
                <Suspense fallback={null}>
                    <SurfaceContainer scale={scale} ticks={ticks} domains={domains} marker={marker} clickMarker={clickMarker} hitbox={hitbox} surf={surf} />
                </Suspense>
                <PerspectiveCamera position={[-0.5, -1.0, 1.5]} near={0.01} far={1000} makeDefault />
                <OrbitControls target={[0.5, 0.5, 0]} />
                {process.env.NODE_ENV === 'development' && <Stats />}
            </Canvas>

            <GpuCheck />
        </div>
    )
}

export default App
