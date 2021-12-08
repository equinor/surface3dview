import { Suspense, useState } from 'react'
import { Object3D, Vector3, TextureLoader } from "three";
import { Canvas, useLoader } from '@react-three/fiber'
import { Stats, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Grid, Image } from 'surface-3d-viewer'

import Control from './Control'
import GpuCheck from './GpuCheck'

Object3D.DefaultUp.set(0, 0, 1);



const domains = {
    x: [0, 100],
    y: [0, 250],
    z: [100, 200]
}

const Surface = ({scale}: {scale: Vector3}) => {

    const [map, depth] = useLoader(TextureLoader, ['./sinc.png', './sinc_gray.png'] )

    return <Suspense fallback={null}>
        <Grid scale={scale} domains={domains} />
        <Image map={map} depth={depth} scale={scale} />
    </Suspense>
}

const App = () => {

    const [scale, set] = useState(new Vector3(1, 1, 0.2 ))

    return <div className='canvas'>
        <Control 
            z={scale.z}
            setZ={(z: number) => set( v => new Vector3(v.x, v.y, z))}
        />
        <Canvas frameloop="demand" linear flat >
            <ambientLight intensity={0.5}/>
            <pointLight intensity={0.5} position={[0.5, 0.5, 2]} />
            <pointLight intensity={0.5} position={[-0.5, -0.5, 2]} />
            <Suspense fallback={null}>
                <Surface scale={scale} />
            </Suspense>
            <PerspectiveCamera
                position={ [-0.5, -1.0, 1.5] }
                near={0.01}
                far={1000}
                makeDefault
            />
            <OrbitControls target={[0.5, 0.5, 0]} />
            { process.env.NODE_ENV === 'development' && <Stats /> }
        </Canvas>
        <GpuCheck />
    </div>
}

export default App;
