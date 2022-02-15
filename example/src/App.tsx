import React, { Suspense, useState, useMemo, useEffect, useRef } from 'react'
import { Object3D, Vector3, TextureLoader, DataTexture, Vector2, Raycaster, Mesh } from 'three'
import { Canvas, useLoader, useThree } from '@react-three/fiber'
import { Stats, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Grid, Surface } from 'surface-3d-viewer'

import Control from './Control'
import GpuCheck from './GpuCheck'

Object3D.DefaultUp.set(0, 0, 1)

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
const SurfaceContainer = ({ scale, ticks, domains, marker, mousepos }: any) => {

    // const [map, depth] = useLoader(TextureLoader, ['./sinc.png', './sinc_gray.png'])
    const [map, setMap] = useState(new DataTexture());
    const [depth, setDepth] = useState(new DataTexture());
    const meshRef = useRef<Mesh>();

    const [raycaster] = useState(new Raycaster);
    const {camera} = useThree()
    
    useEffect(()=>{
        readImages();
    }, [])

    useEffect(()=>
    {
        raycaster.setFromCamera(mousepos, camera)
        if(meshRef.current){
            const intersects = raycaster.intersectObject(meshRef.current)
            console.log(mousepos)
            console.log(intersects)
        }

    },[mousepos])



    const readImages = async () => {
        await imageDataFromSource('./sinc.png').then(v =>
            {
                const mapn = new DataTexture(); 
                mapn.image = v;
                mapn.flipY = true;
                setMap(mapn);
            }
        )
        await imageDataFromSource('./sinc_gray.png').then(v =>
                { 
                    const depthn = new DataTexture();
                    depthn.image = v;
                    setDepth(depthn);
                }
            )
    }



    return (
        <Suspense fallback={null}>
            <Grid scale={scale} domains={domains} ticks={ticks} />
            <Surface map={map} depth={depth} scale={scale} marker={marker} meshRef={meshRef} />
        </Suspense>
    )
}

async function imageDataFromSource (source: string) {
    const image = Object.assign(new Image(), { src: source });
    await new Promise<void>(resolve => image.addEventListener('load', () => resolve()));
    const context = Object.assign(document.createElement('canvas'), {
       width: image.width,
       height: image.height
    }).getContext('2d');
    if(context){
        context.imageSmoothingEnabled = false;
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height);
    }
    return new ImageData(1,1);
 }

const App = () => {
    const [scale, set] = useState(new Vector3(1, 1, 0.2))
    const [x, setX] = useState(100)
    const [ticks, setT] = useState(15)
    const [marker, setMarker] = useState(false)

    const [point, setPoint] = useState(new Vector2(0,0))
    

    const domains = useMemo(
        () => ({
            x: [0, x],
            y: [0, 250],
            z: [100, 200],
        }),
        [x],
    )

    const handelMouse = (v:React.MouseEvent) =>{
        const canvas = document.querySelector('canvas');

        const cw = canvas?.width;
        const ch = canvas?.height; 
        const bb = canvas?.getBoundingClientRect();

        if(bb == null || cw == null || ch == null) return;

        const x = (v.clientX - bb.left)/(bb.right-bb.left) * 2 - 1
        const y = -1*((v.clientY - bb.top)/(bb.bottom-bb.top) * 2 - 1)

        setPoint(new Vector2(x,y))
    }

    return (
        <div className="canvas">
            <Control z={scale.z} setZ={(z: number) => set((v) => new Vector3(v.x, v.y, z))} x={x} setX={setX} t={ticks} setT={setT} c={marker} setC={setMarker} />
            <div style={{height:'750px', width:'750px'}} onMouseMove={handelMouse}>
            <Canvas frameloop="demand" linear flat >
                <ambientLight intensity={1.0} />
                <pointLight intensity={0.1} position={[0.5, 0.5, 2]} />
                <pointLight intensity={0.1} position={[-0.5, -0.5, 2]} />
                <Suspense fallback={null}>
                    <SurfaceContainer scale={scale} ticks={ticks} domains={domains} marker={marker} mousepos={point}/>
                </Suspense>
                <PerspectiveCamera position={[-0.5, -1.0, 1.5]} near={0.01} far={1000} makeDefault />
                <OrbitControls target={[0.5, 0.5, 0]} />
                {process.env.NODE_ENV === 'development' && <Stats />}
            </Canvas>
            </div>
            <GpuCheck />
        </div>
    )
}

export default App
