
import { ThreeEvent, useFrame, useLoader, useThree } from '@react-three/fiber';
import { type } from 'os';
import { Suspense, useEffect, useRef, useState } from 'react';
import { DoubleSide, DataTexture, Texture, Vector3, Vector2, Shape, BufferGeometry, PlaneBufferGeometry, CanvasTexture, LinearFilter, ClampToEdgeWrapping, SpriteMaterial, Sprite, ShapeGeometry, TextureLoader, ShapeBufferGeometry, Shader, MeshStandardMaterial, DepthTexture } from 'three'
import { Html } from './Html'
import { imageDataFromSource } from './utils'


interface IProps {
    map: DataTexture | Texture
    depth: DataTexture | Texture
    scale: Vector3

    clickMarker?: boolean
    continousMarker?: boolean
    positionToMarkerText?: (x: number, y: number) => string
    showMarkerHitbox?: boolean

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
const Surface = ({ map, depth, scale, ...props }: IProps) => {
    const [markerGeom, setMarkerGeom] = useState(new PlaneBufferGeometry())

    useEffect(
        () => {
            // depth.onUpdate = () => {
            //     console.log("hello")
            //     updateDepth(depth)
            // }

            // console.log("ewwrewrewr")
            updateDepth(depth)

            // return () => {
            //     depth.onUpdate = () => { };
            // };
        }, [depth]
    )

    const updateDepth = (depth: Texture | DataTexture) => {
        let image = depth.image

        if(!(image instanceof ImageData))
        {
            try {
                image = imageDataFromSource(image, 1)
            } catch (error) {
                image = null
            }
        }

        if(image != null)
        {
            updateMarkerGeometry(image);
        }
    }

    const updateMarkerGeometry = (image: ImageData) => {
        const t = 2000;
        const n = image.width;
        const m = image.height;

        let x = image.width;
        let y = image.height;
        if (x * y > t) {
            const r = n / m;
            y = Math.floor(Math.sqrt(t / r))
            x = Math.floor(r * y);
        }

        const geomn = new PlaneBufferGeometry(1, 1, x - 1, y - 1)
        const pos = geomn.getAttribute("position");
        const pa = pos.array as number[];

        for (let j = 0; j < y; j++) {
            for (let i = 0; i < x; i++) {
                const di = Math.floor(i * (n - 1) / (x - 1))
                const dj = Math.floor(j * (m - 1) / (y - 1))
                const didx = dj * n + di;

                let d = image.data[4 * didx + 1];
                if (isNaN(d))
                    d = 0;

                const idx = j * x + i;
                pa[3 * idx + 2] = d / 255;
            }
        }

        setMarkerGeom(geomn);
    }

    const [continousMarkerPos, setContinousMarkerPos] = useState(new Vector3(0, 0, 0))
    const [clickMarkerPos, setClickMarkerPos] = useState(new Vector3(0, 0, 0))
    const [renderContinousMarker, setRenderContinousMarker] = useState(false);
    const [renderClickMarker, setRenderClickMarker] = useState(false);

    const [mouseClicked, setMouseClicked] = useState(false);
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | undefined>(undefined);

    const useContinousMarker = props.continousMarker;
    const useClickMarker = props.clickMarker;

    const handleMouseHover = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        setContinousMarkerPos(e.point)
    };

    const handleMouseEnter = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        setRenderContinousMarker(true)
    }

    const handleMouseExit = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        setRenderContinousMarker(false)
    }

    const handleMouseDownClick = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        // Register double click.
        if (mouseClicked) {
            setClickMarkerPos(e.point)
            setRenderClickMarker(true)
            if (timeoutId) clearTimeout(timeoutId);
            setMouseClicked(false)
        }
        else {
            setMouseClicked(true);
            // According to this it is not possible to fetch double click timing from the OS
            // https://stackoverflow.com/questions/8333764/can-i-query-detect-the-double-click-speed-for-a-webpage-user
            setTimeoutId(setTimeout(() => setMouseClicked(false), 500)); // 0.5 s is default doubleclick time in windows
        }
    }

    const onMouseHover = useContinousMarker ? handleMouseHover : undefined;
    const onMouseEnter = useContinousMarker ? handleMouseEnter : undefined;
    const onMouseExit = useContinousMarker ? handleMouseExit : undefined;

    const onMouseDownClick = useClickMarker ? handleMouseDownClick : undefined;

    // Normal surface using shader to set depth
    const surface = <mesh position={[0.5 * scale.x, 0.5 * scale.y, 0]} scale={scale}>
        <planeBufferGeometry attach="geometry" args={[1, 1, depth.image.width - 1, depth.image.height - 1]} />
        <meshStandardMaterial
            // key={depth.uuid}
            map={map}
            wireframe
            metalness={0.1}
            roughness={0.6}
            side={DoubleSide}
            alphaToCoverage
            onBeforeCompile={(shader) => setUpShader(shader, depth)}
            {...props}
        />
    </mesh>

    // Low resolution surface for raycasting
    const markerSurface = <mesh position={[0.5 * scale.x, 0.5 * scale.y, 0]} scale={scale} onPointerDown={onMouseDownClick} onPointerMove={onMouseHover} onPointerEnter={onMouseEnter} onPointerLeave={onMouseExit} geometry={markerGeom}>
        <meshBasicMaterial
            transparent={!props.showMarkerHitbox}
            opacity={props.showMarkerHitbox ? 1 : 0}
            wireframe
            color={"purple"}
            side={DoubleSide}
        />
    </mesh>


    return (
        <Suspense fallback={null}>
            {surface}
            {markerSurface}
            <Marker position={continousMarkerPos} visible={useContinousMarker && renderContinousMarker} positionToMarkerText={props.positionToMarkerText} />
            <Marker position={clickMarkerPos} visible={useClickMarker && renderClickMarker} positionToMarkerText={props.positionToMarkerText} onCloseMarkerClick={(v) => setRenderClickMarker(false)} />

        </Suspense>
    )
}

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

interface IMarkerProps {
    position: Vector3

    positionToMarkerText?: (x: number, y: number) => string
    onCloseMarkerClick?: React.MouseEventHandler<HTMLButtonElement>
    visible?: boolean
}

const Marker = ({ position, ...props }: IMarkerProps) => {

    const [textPos, setTextPos] = useState(position)
    const [textValue, setTextValue] = useState('');
    const line = useRef(new BufferGeometry().setFromPoints([position, position]))

    useEffect(
        () => {
            const pos = line.current.getAttribute("position")
            const pa = pos.array as number[]

            const z = position.z + Math.max((0.5 - position.z), 0.1);
            setTextPos(new Vector3(position.x, position.y, z))

            pa[0] = position.x
            pa[3] = position.x

            pa[1] = position.y
            pa[4] = position.y

            pa[2] = position.z
            pa[5] = z
            pos.needsUpdate = true;

            let txt = ''
            if (props.positionToMarkerText) {
                txt = props.positionToMarkerText(position.x, position.y)
            }
            else {
                txt = (Math.round(position.z * 1000) / 1000).toString()
            }
            setTextValue(txt);
        }, [position]
    )



    return (
        <Suspense fallback={null}>
            <line_ key={line.current.uuid} geometry={line.current}  {...props}>
                <meshBasicMaterial
                    attach="material"
                    color={'black'}
                    polygonOffset
                    polygonOffsetFactor={GRIDOffsetFactor}
                    polygonOffsetUnits={GRIDOffsetUnits}
                />
            </line_>

            <Billboard name={textValue.toString()} position={textPos} onCloseButtonClick={props.onCloseMarkerClick} {...props} />
        </Suspense>
    )
}

interface IBillboard {
    position: Vector3,
    name: string

    visible?: boolean
    onCloseButtonClick?: React.MouseEventHandler<HTMLButtonElement>
}

const Billboard = ({ position, name, ...props }: IBillboard) => {
    // Cound not get visible prop on Html to work.
    if (!props.visible) {
        return (<></>)
    }
    return (
        <Html position={position} center>
            <div style={{ background: 'white', width: '300px', height: '60px', boxShadow: '0px 0px 5px 0px black', borderRadius: "20px", display: 'grid', gridTemplateColumns: '20px auto 20px', gridTemplateRows: '20px auto 20px' }}>
                <div style={{ gridColumn: '2', gridRow: '2' }}>
                    {name}
                </div>
                <button style={{ gridColumn: '3', gridRow: '0' }} type='button' onClick={props.onCloseButtonClick}>
                </button>
            </div>
        </Html>
    )
}


export default Surface

const GRIDOffsetFactor = 10
const GRIDOffsetUnits = 1