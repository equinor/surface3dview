import { Suspense, useEffect, useState } from 'react'
import { Vector3 } from 'three'
import Surface from './Surface'
import Grid from './Grid'
import { Map, Depth, Domain } from './sharedTypes'

import { mapping, lerp, dist, union } from './utils'

export type SurfaceItem = { map: Map; depth: Depth; domain: Domain }
export type Axis = 'equal' | 'xyequal' | 'uniform'

interface IProps {
    scale: Vector3
    axis: Axis
    surfaces: SurfaceItem[]
}

const defaultDomain: Domain = { x: [0, 1], y: [0, 1], z: [0, 1] }
const defaultScale: Vector3 = new Vector3(1, 1, 1)

const MultiSurfaceContainer = ({ scale, axis, surfaces }: IProps) => {
    const [globalDomain, setGlobalDomain] = useState<Domain>(defaultDomain)
    const [globalScale, setGlobalScale] = useState<Vector3>(defaultScale)

    useEffect(() => {
        if (surfaces.length === 0) {
            setGlobalDomain(defaultDomain)
        } else {
            const unionDomain = { ...surfaces[0].domain }
            for (let i = 1; i < surfaces.length; i++) {
                unionDomain.x = union(unionDomain.x, surfaces[i].domain.x)
                unionDomain.y = union(unionDomain.y, surfaces[i].domain.y)
                unionDomain.z = union(unionDomain.z, surfaces[i].domain.z)
            }
            setGlobalDomain(unionDomain)
        }
    }, [surfaces])

    useEffect(() => {
        let resScale = new Vector3()

        switch (axis) {
            case 'uniform':
                resScale = scale
                break
            case 'xyequal': {
                const xyMaxDist = Math.max(dist(globalDomain.x), dist(globalDomain.y))
                resScale.x = scale.x * (dist(globalDomain.x) / xyMaxDist)
                resScale.y = scale.y * (dist(globalDomain.y) / xyMaxDist)
                resScale.z = scale.z
                break
            }
            case 'equal': {
                const xyzMaxDist = Math.max(dist(globalDomain.x), dist(globalDomain.y), dist(globalDomain.z))
                resScale.x = scale.x * (dist(globalDomain.x) / xyzMaxDist)
                resScale.y = scale.y * (dist(globalDomain.y) / xyzMaxDist)
                resScale.z = scale.z * (dist(globalDomain.z) / xyzMaxDist)
                break
            }
        }

        setGlobalScale(resScale)
    }, [globalDomain, scale])

    return (
        <Suspense fallback={null}>
            <Grid domains={globalDomain} scale={globalScale} />
            {surfaces.map((x, idx) => {
                return <GlobalSurface key={idx} surface={x} globalDomain={globalDomain} globalScale={globalScale} />
            })}
        </Suspense>
    )
}

interface IGlobalSurfaceProps {
    surface: SurfaceItem
    globalDomain: Domain
    globalScale: Vector3

    key: number
}
const GlobalSurface = ({ surface, globalDomain, globalScale }: IGlobalSurfaceProps) => {
    // Map domain coordinates to plotting coordinates
    const fx = mapping(globalDomain.x, [0, globalScale.x])
    const fy = mapping(globalDomain.y, [0, globalScale.y])
    const fz = mapping(globalDomain.z, [0, globalScale.z])

    const p = new Vector3()
    p.x = fx(lerp(surface.domain.x, 0.5))
    p.y = fy(lerp(surface.domain.y, 0.5))
    p.z = fz(surface.domain.z[0])

    const s = new Vector3()
    s.x = fx(surface.domain.x[1]) - fx(surface.domain.x[0])
    s.y = fy(surface.domain.y[1]) - fy(surface.domain.y[0])
    s.z = fz(surface.domain.z[1]) - fz(surface.domain.z[0])

    return <Surface map={surface.map} depth={surface.depth} scale={s} position={p} />
}

export default MultiSurfaceContainer
