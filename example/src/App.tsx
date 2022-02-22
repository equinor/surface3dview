import { Suspense, useState, useMemo, useEffect } from 'react'
import { Object3D, Vector3, TextureLoader, DataTexture, Texture } from 'three'
import { Canvas, useLoader } from '@react-three/fiber'
import { Stats, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Grid, Surface } from 'surface-3d-viewer'

import Control from './Control'
import GpuCheck from './GpuCheck'

Object3D.DefaultUp.set(0, 0, 1)

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
const SurfaceContainer = ({ scale, ticks, domains, marker, clickMarker }: any) => {

    const map = useLoader(TextureLoader, './sinc.png')
    const [depth, setDepth] = useState(null);

    useEffect(() => {
        readImages();
    }, [])

    const readImages = async () => {
        await imageDataFromSource('./sinc_gray.png').then(v => {
            if(v == null) return;
            const depthn=
            {
                n: v.width,
                m:v.height,
                data: new Array<number>()
            };
            for(let i=0;i<v.data.length/4; i++){
                depthn.data.push(v.data[4*i]/255);
            }
            // @ts-ignore
            setDepth(depthn);
        }
        ).catch((e)=>{console.log(e)})
    }

    const pToM = (x:number,y:number) => `This is a function x = ${Math.round(x * 1000) / 1000} y = ${Math.round(y * 1000) / 1000}`

    // const test = (x:number,y:number) => <div style={{background:'black'}}>This is a function x = {Math.round(x * 1000) / 1000} y = {Math.round(y * 1000) / 1000}</div>

    return (
        <Suspense fallback={null}>
            <Grid scale={scale} domains={domains} ticks={ticks} />
            <Surface map={map} depth={depth} scale={scale} continousMarker={marker} clickMarker={clickMarker} positionToMarkerText={pToM} />
        </Suspense>
    )
}

async function imageDataFromSource(source: string) {
    const image = Object.assign(new Image(), { src: source });
    await new Promise<void>(resolve => image.addEventListener('load', () => resolve()));
    const context = Object.assign(document.createElement('canvas'), {
        width: image.width,
        height: image.height
    }).getContext('2d');
    if (context) {
        context.imageSmoothingEnabled = false;
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height);
    }
    return null;
}

const App = () => {
    const [scale, set] = useState(new Vector3(1, 1, 0.2))
    const [x, setX] = useState(100)
    const [ticks, setT] = useState(15)
    const [marker, setMarker] = useState(false)
    const [clickMarker, setClickMarker] = useState(true)

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
            <Control z={scale.z} setZ={(z: number) => set((v) => new Vector3(v.x, v.y, z))} x={x} setX={setX} t={ticks} setT={setT} c={marker} setC={setMarker} cm={clickMarker} setCm={setClickMarker} />

            <Canvas frameloop="demand" linear flat >
                <ambientLight intensity={1.0} />
                <pointLight intensity={0.1} position={[0.5, 0.5, 2]} />
                <pointLight intensity={0.1} position={[-0.5, -0.5, 2]} />
                <Suspense fallback={null}>
                    <SurfaceContainer scale={scale} ticks={ticks} domains={domains} marker={marker} clickMarker={clickMarker} />
                </Suspense>
                <PerspectiveCamera position={[-0.5, -1.0, 1.5]} near={0.01} far={1000} makeDefault />
                <OrbitControls target={[0.5, 0.5, 0]}/>
                {process.env.NODE_ENV === 'development' && <Stats />}
            </Canvas>

            <GpuCheck />
        </div>
    )
}

export default App
