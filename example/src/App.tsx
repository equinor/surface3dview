import { Suspense, useState, useMemo } from 'react'
import { Object3D, Vector3, TextureLoader } from 'three'
import { Canvas, useLoader } from '@react-three/fiber'
import { Stats, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Grid, Surface } from 'surface-3d-viewer'

import Control from './Control'
import GpuCheck from './GpuCheck'

Object3D.DefaultUp.set(0, 0, 1)

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
const SurfaceContainer = ({ scale, ticks, domains }: any) => {
    const [map, depth] = useLoader(TextureLoader, ['./sinc.png', './sinc_gray.png'])

    return (
        <Suspense fallback={null}>
            <Grid scale={scale} domains={domains} ticks={ticks} />
            <Surface map={map} depth={depth} scale={scale} />
        </Suspense>
    )
}

const App = () => {
    const [scale, set] = useState(new Vector3(1, 1, 0.2))
    const [x, setX] = useState(100)
    const [ticks, setT] = useState(15)

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
            <Control z={scale.z} setZ={(z: number) => set((v) => new Vector3(v.x, v.y, z))} x={x} setX={setX} t={ticks} setT={setT} />
            <Canvas frameloop="demand" linear flat>
                <ambientLight intensity={1.0} />
                <pointLight intensity={0.1} position={[0.5, 0.5, 2]} />
                <pointLight intensity={0.1} position={[-0.5, -0.5, 2]} />
                <Suspense fallback={null}>
                    <SurfaceContainer scale={scale} ticks={ticks} domains={domains} />
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
