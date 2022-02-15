import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useState } from 'react';
import { DoubleSide, DataTexture, Texture, Vector3, Shader, BufferGeometry, PlaneBufferGeometry } from 'three'
import { Text } from './Text'

interface IProps {
    map: DataTexture
    depth: DataTexture
    scale: Vector3

    marker?: boolean

    metalness?: number
    roughness?: number
    flatShading?: boolean
}

/**
 * Surface
 *
 * Map ~ surface texture
 * Depth ~ bump scale texture (gray scale)
 * Scale ~ vector of how to scale the surface
 */
const Surface = ({ map, depth, scale,...props }: IProps) => {
    const [markerPos, setMarkerPos] = useState(new Vector3(0, 0, 0))
    const [textPos, settextPos] = useState(markerPos)
    const [textValue, setTextValue] = useState(0);
    const [geom, setGeom] = useState(new PlaneBufferGeometry())
    const marker = useRef(new BufferGeometry().setFromPoints([markerPos, markerPos]))

    // visible would not work with setting undefined hence explisitly use true/false
    const renderMarker = props.marker ? true : false;
    
    const handleMouseHover = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        setMarkerPos(e.point)
    };

    const onMouseHover = renderMarker ? handleMouseHover : undefined;

    useEffect(
        () => {
            const pos = marker.current.getAttribute("position")
            const pa = pos.array as number[]



            const z = markerPos.z + Math.max((scale.z - markerPos.z), 0.1) ;
            settextPos(new Vector3(markerPos.x, markerPos.y, z))

            pa[0] = markerPos.x
            pa[3] = markerPos.x

            pa[1] = markerPos.y
            pa[4] = markerPos.y

            pa[2] = markerPos.z
            pa[5] = z
            pos.needsUpdate = true;

            
            setTextValue(Math.round(markerPos.z * 1000) / 1000);

        }, [markerPos, scale]
    )

    const r = depth.image.width / depth.image.height;
    const t = 2000;
    const y = Math.floor(Math.sqrt(t / r))
    const x = Math.floor(r * y);

    // const x = depth.image.width
    // const y = depth.image.height

    useEffect(
        () => {
            if (depth.image.data == null) {
                return;
            }
            console.log([x, y])

            const geomn = new PlaneBufferGeometry(1, 1, x, y)
            const pos = geomn.getAttribute("position");
            const pa = pos.array as number[];
            const w = x + 1;
            const h = y + 1;
            for (let j = 0; j < h; j++) {
                for (let i = 0; i < w; i++) {
                    const idx = j * w + i;
                    const imgI = Math.floor((depth.image.width - 1) * i / (w - 1))
                    const imgJ = Math.floor((depth.image.height - 1) * j / (h - 1))
                    const idxmap = imgJ * depth.image.width + imgI
                    let d = depth.image.data[4 * idxmap] / 255
                    if (isNaN(d))
                        d = 0;
                    pa[3 * idx + 2] = d;
                }
            }

            setGeom(geomn);
        }, [depth]
    )


    return (
        <Suspense fallback={null}>
            <mesh position={[0.5 * scale.x, 0.5 * scale.y, 0]} scale={scale} onPointerMove={onMouseHover} geometry={geom}>
                <meshStandardMaterial
                    map={map}
                    metalness={0.1}
                    roughness={0.6}
                    side={DoubleSide}
                    alphaToCoverage
                    {...props}
                />

            </mesh>

            <line_ key={marker.current.uuid} geometry={marker.current} visible={renderMarker}>
                <meshBasicMaterial
                    attach="material"
                    color={'black'}
                    polygonOffset
                    polygonOffsetFactor={GRIDOffsetFactor}
                    polygonOffsetUnits={GRIDOffsetUnits}
                />
            </line_>

            <Tick x={textValue} anchorX={'right'} position={textPos} visible={renderMarker}/>


        </Suspense>
    )
}

interface ITick {
    x: number
    anchorX: 'right' | 'left'
    position: Vector3

    visible?:boolean
}

const Tick = ({ x, anchorX, position, ...props } : ITick) => {
    const { camera } = useThree()
    const ref = useRef<Text>()

    // Change text rotation
    useFrame(() => {
        // @ts-ignore
        if (ref.current) ref.current.quaternion.copy(camera.quaternion)
    })

    let t = x.toString()
    if (anchorX === 'right') t += '-'
    else t = '-' + t

    return (
        <Text
            ref={ref}
            position={position}
            anchorX={anchorX}
            anchorY="middle"
            outlineColor={'white'}
            outlineWidth={0.0025}
            fontSize={0.025}
            strokeWidth={1}
            strokeColor={'black'}
            fillOpacity={0}
            {...props}
        >
            {t}
        </Text>
    )
}


export default Surface


const GRIDOffsetFactor = 10
const GRIDOffsetUnits = 1

function setUpShader(shader: Shader, textureDepth: DataTexture | Texture) {
    // uniforms
    shader.uniforms.displacementMap = { value: textureDepth }
    shader.uniforms.displacementScale = { value: 1.0 }
    shader.uniforms.displacementBias = { value: 0.0 }
    shader.uniforms.normalZ = { value: new Vector3(0, 0, 1) }
    const uniforms = `
    uniform sampler2D displacementMap;
    uniform float displacementScale;
    uniform float displacementBias;
    uniform vec3 normalZ;
    varying float vAmount;

    #ifdef FLAT_SHADED
        varying vec3 vNormal;
    #endif

    #ifdef USE_TANGENT
        varying vec3 vTangent;
        varying vec3 vBitangent;
    #endif`

    // vertex shader

    shader.vertexShader = `${uniforms}\n${shader.vertexShader}\n`

    // shader.vertexShader = shader.vertexShader.replace("#include <beginnormal_vertex>", "");
    shader.vertexShader = shader.vertexShader.replace('#include <morphnormal_vertex>', '')
    shader.vertexShader = shader.vertexShader.replace('#include <skinnormal_vertex>', '')

    // shader.vertexShader = shader.vertexShader.replace( "#include <displacementmap_vertex>", "");
    shader.vertexShader = shader.vertexShader.replace(
        '#include <displacementmap_vertex>',
        `
            transformed += normalize( normalZ ) * ( texture2D( displacementMap, vUv ).x * displacementScale + displacementBias );
        `,
    )

    shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `
        #include <project_vertex>
        vAmount = texture2D( displacementMap, vUv ).r;
        vec3 newPosition = position + normalZ * displacementScale * vAmount;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );
        `,
    )

    shader.vertexShader = shader.vertexShader.replace(
        '#include <defaultnormal_vertex>',
        `
        vec3 transformedNormal = objectNormal;
        vNormal = normalize( transformedNormal );`,
    )
}
