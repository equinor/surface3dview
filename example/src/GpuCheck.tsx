import { Suspense, useEffect } from 'react'
import { useDetectGPU } from '@react-three/drei'

const GpuCheck = () => {
    const gpu = useDetectGPU()

    useEffect(() => {
        if (!gpu.tier) alert('No hardware acceleration found')
    }, [])

    return null
}

const Main = () => (
    <Suspense fallback={null}>
        <GpuCheck />
    </Suspense>
)

export default Main
