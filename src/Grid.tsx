import React, { useEffect, useState } from 'react'
import { Vector3 } from 'three'
import { Text, Line } from "@react-three/drei";

import { useThree, useFrame } from '@react-three/fiber'
import { scaleLinear } from 'd3-scale'


const TICKS = 15
const ORIGIN = new Vector3(0, 0, 0)
const ONES = new Vector3(1, 1, 1)
const X = new Vector3(1, 0, 0)
const Y = new Vector3(0, 1, 0)
const Z = new Vector3(0, 0, 1)
const FADE_FACTOR = 0.001

interface IGridLines { 
    scale: Vector3,
    domains: { [xyz: string]: [number, number] | number[] }

    lineStyle?: { color: React.CSSProperties['color'] }
    tickStyle?: { strokeColor: React.CSSProperties['color'], outlineColor: React.CSSProperties['color'] }
}

const GridPlanes = ({scale, domains, ...props}: IGridLines) => {

    const [pXY, setXY] = useState(ORIGIN)
    const [pYZ, setYZ] = useState(ORIGIN)
    const [pZX, setZX] = useState(ORIGIN)

    // scaled vectors
    const [sX, setSX] = useState(X)
    const [sY, setSY] = useState(Y)
    const [sZ, setSZ] = useState(Z)

    useEffect(() => { setSX( X.clone().multiplyScalar( scale.x )) }, [scale.x])
    useEffect(() => { setSY( Y.clone().multiplyScalar( scale.y )) }, [scale.y])
    useEffect(() => { setSZ( Z.clone().multiplyScalar( scale.z )) }, [scale.z])

    // ticks
    const [tickX, setTickX] = useState<{ticks: number[], values: number[]}>({ ticks: [], values: [] })
    const [tickY, setTickY] = useState<{ticks: number[], values: number[]}>({ ticks: [], values: [] })
    const [tickZ, setTickZ] = useState<{ticks: number[], values: number[]}>({ ticks: [], values: [] })

    useEffect(() => {
        const scale = scaleLinear().domain(domains.x)
        const ticks = scale.ticks(TICKS * ONES.dot(sX)).slice(1)
        if ( ticks[ticks.length - 1] / domains.x[1] > 0.975 ) ticks.pop()
        setTickX( { ticks, values: ticks.map(scale) } )
    }, [domains.x, sX])

    useEffect(() => {
        const scale = scaleLinear().domain(domains.y)
        const ticks = scale.ticks(TICKS * ONES.dot(sY)).slice(1)
        if ( ticks[ticks.length - 1] / domains.y[1] > 0.975 ) ticks.pop()
        setTickY( { ticks, values: ticks.map(scale) } )
    }, [domains.y, sY])

    useEffect(() => {
        const scale = scaleLinear().domain(domains.z)
        const ticks = scale.ticks(TICKS * ONES.dot(sZ))
        setTickZ( { ticks, values: ticks.map(scale) } )
    }, [domains.z, sZ])

    // render
    return (
        <React.Fragment>
            { /* xy */ }
            <Lines position={pXY} 
                setPosition={setXY} 
                v1={sX} v2={sY} scale={scale} 
                v1_ticks={tickX.values} v2_ticks={tickY.values}
                style={props.lineStyle}
            /> 
            <Labels 
                position={pZX === ORIGIN ? pXY.clone().add(sY) : pXY } 
                v={sX} tangent={pZX === ORIGIN ? sY : sY.clone().multiplyScalar(-1)}
                ticks={tickX} style={props.tickStyle}
            />

            { /* yz */ }
            <Lines position={pYZ} 
                setPosition={setYZ} 
                v1={sY} v2={sZ} scale={scale} 
                v1_ticks={tickY.values} v2_ticks={tickZ.values}
                style={props.lineStyle}
            />
            <Labels 
                position={pYZ === ORIGIN ? pXY.clone().add(sX) : pXY } 
                v={sY} tangent={pYZ === ORIGIN ? sX : sX.clone().multiplyScalar(-1)}
                ticks={tickY} style={props.tickStyle}
            />

            { /* zx */ }
            <Lines position={pZX} 
                setPosition={setZX} 
                v1={sZ} v2={sX} scale={scale} 
                v1_ticks={tickZ.values} v2_ticks={tickX.values}
                style={props.lineStyle}
            />
            <LabelsZ sX={sX} sY={sY} sZ={sZ} pZX={pZX} pYZ={pYZ} ticks={tickZ} style={props.tickStyle} />
        </React.Fragment>
    )
}

export default React.memo(GridPlanes)


/*
 * Smooth animations
 */

function useFadeIn(p: Vector3): [ Vector3, number ] {

    const [opacity, setOpacity] = useState(0)
    const [position, setPosition] = useState(p)

    // Use useRef for mutable variables that we want to persist
    // without triggering a re-render on their change
    const requestRef = React.useRef<any>();
    const previousTimeRef = React.useRef<any>();

    // fade in
    const animate = (time: any) => {
        if (previousTimeRef.current) {
            const deltaTime = time - previousTimeRef.current;
            setOpacity(o => Math.min(1, (o + deltaTime * FADE_FACTOR)) );

            if(deltaTime * FADE_FACTOR < 1)
                requestRef.current = requestAnimationFrame(animate)
        }
        else requestRef.current = requestAnimationFrame(animate);
        previousTimeRef.current = time;
    }

    useEffect(() => {
        setOpacity(0);
        setPosition(p);

        requestRef.current = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(requestRef.current);
    }, [p.x, p.y, p.z]); // eslint-disable-line

    return [position, opacity]
}


/* 
 * Grid lines
 */

interface ILines { 
    position: Vector3
    setPosition: (fn: any) => void
    scale: Vector3
    v1: Vector3
    v2: Vector3
    v1_ticks: number[]
    v2_ticks: number[]
    style?: { color: React.CSSProperties['color'] }
}

const Lines = ({position, setPosition, v1, v2, scale, v1_ticks, v2_ticks, style}: ILines) => {

    const [lineGeometrys, set] = useState<Vector3[][]>([])
    const [endGeometrys, setEnds] = useState<Vector3[][]>([])
    const [normal, ] = useState(new Vector3().crossVectors(v1, v2).normalize())

    const { camera } = useThree()

    // build geometry
    useEffect(() => {
        const geos: Vector3[][] = []

        v1_ticks.forEach( x => {
            const p = v1.clone().multiplyScalar(x)
            geos.push( [p, p.clone().add(v2)] )
        })
    
        v2_ticks.forEach( x => {
            const p = v2.clone().multiplyScalar(x)
            geos.push( [p, p.clone().add(v1)] )
        })
        set( geos )

        const endGeos = []
        endGeos.push( [ORIGIN, v1] )
        endGeos.push( [v1, v2.clone().add(v1)] )
        endGeos.push( [ORIGIN, v2] )
        endGeos.push( [v2, v1.clone().add(v2)] )
        setEnds( endGeos )

    }, [v1, v2, v1_ticks, v2_ticks])

    // check if plane needs to move
    useFrame(() => {

        let _normal = normal.clone()
        if( position === ORIGIN )
            _normal.multiplyScalar(-1)

        const cOriginToCamera = new Vector3().subVectors(camera.position, position)
        let rNormalDotOriginToCamera = cOriginToCamera.dot(_normal);

        let cOriginToCenter = scale.clone().multiplyScalar(0.5).sub(position)
        if (cOriginToCenter.dot(_normal) < 0)
            rNormalDotOriginToCamera *= -1;

        if( rNormalDotOriginToCamera < 0 )
            setPosition( (p: Vector3) => p === ORIGIN ? normal.clone().multiply(scale) : ORIGIN )
    })

    useEffect(() => {
        setPosition( (p: Vector3) => p === ORIGIN ? ORIGIN : normal.clone().multiply(scale) )
    }, [normal, scale, setPosition])

    const [p, opacity] = useFadeIn(position)

    return (
        <group position={p}>
            { lineGeometrys.map( (points, i) => 
                <Line
                    key={i} 
                    points={points}
                    color={style?.color || 'black'} 
                    linewidth={1} 
                    opacity={opacity * 0.5}

                    polygonOffset
                    polygonOffsetFactor={5}
                />
            ) }

            { endGeometrys.map( (points, i) => 
                <Line 
                    key={i} 
                    points={points}
                    color={'black'} 
                    linewidth={1.5} 
                    opacity={opacity}
                />
            ) }

        </group>
    )
}

/* 
 * Labeling
 */

interface ILabelY { 
    sX: Vector3
    sY: Vector3
    sZ: Vector3
    pZX: Vector3
    pYZ: Vector3
    ticks: { ticks: number[], values: number[] }
    style?: IGridLines['tickStyle']
}

const LabelsZ = ({sX, sY, sZ, pZX, pYZ, ticks, style}: ILabelY) => {

    // find zLabel axis
    const { camera } = useThree()
    const [labelZ, setLabelZ] = useState(pZX)
    const [tagentZ, setTangetZ] = useState(sX)

    useEffect(() => {
        const arr = [ pZX, pZX.clone().add(sX), pYZ, pYZ.clone().add(sY) ]
                        .map( v => camera.position.distanceTo(v) )

        var index = arr.indexOf(Math.min(...arr));
        if( index === 0 ) { setLabelZ(pZX); setTangetZ(sX.clone().multiplyScalar(-1)); }
        else if( index === 1 ) { setLabelZ(pZX.clone().add(sX)); setTangetZ(sX); }
        else if( index === 2 ) {setLabelZ(pYZ); setTangetZ(sY.clone().multiplyScalar(-1)); }
        else if( index === 3 ) {setLabelZ(pYZ.clone().add(sY)); setTangetZ(sY); }
    }, [sX, sY, pYZ, pZX] ) // eslint-disable-line

    return  <Labels position={labelZ} v={sZ} ticks={ticks} tangent={tagentZ} style={style} />
}


interface ILabelsPlane { 
    position: Vector3
    tangent: Vector3
    v: Vector3
    ticks: { ticks: number[], values: number[] }
    style?: IGridLines['tickStyle']
}

const Labels = ({position: p, v, ticks, tangent, style}: ILabelsPlane) => {

    const { camera } = useThree()
    const [invert, set] = useState(false)
    const [position, opacity] = useFadeIn(p)

    // Change text rotation
    useFrame(() => {
        const pX = new Vector3(0, 0.,-1)
                    .unproject( camera )
                    .sub(new Vector3(1, 0, -1)
                    .unproject( camera ))
                    .projectOnPlane( Z )

        set(pX.dot(tangent) > 0);
    })

    const anchorX = invert ? 'right' : 'left'

    return (
        <group 
            position={position} 
        >
            { ticks.ticks.map( (x, i) => 
                <Tick 
                    key={x}
                    x={x}
                    position={v.clone().multiplyScalar( ticks.values[i] )}
                    anchorX={anchorX}
                    opacity={opacity}
                    style={style}
                />
            )}
        </group>
    )
}

interface ITick { 
    x: number
    anchorX: 'right' | 'left'
    position: Vector3
    opacity: number
    style?: IGridLines['tickStyle']
}

const Tick = ({x, anchorX, position, opacity, style}: ITick) => {

    const { camera } = useThree()
    const ref = React.useRef<Text>()

    // Change text rotation
    useFrame(() => {
        // @ts-ignore
        if( ref.current ) ref.current.quaternion.copy( camera.quaternion )
    })

    let t = x.toString()
    if( anchorX === 'right' ) t += '-'
    else t = '-' + t

    return (
        <Text 
            ref={ref}
            position={position}
            anchorX={anchorX} 
            anchorY="middle"
            outlineColor={style?.outlineColor || 'white'}
            outlineWidth={0.0025}
            outlineOpacity={opacity}
            fontSize={0.025}
            strokeWidth={1}
            strokeColor={style?.strokeColor || 'black'}
            strokeOpacity={opacity}

            children={t}
            fillOpacity={0}
        />
    )
}