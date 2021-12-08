import { DoubleSide } from "three";
import { DataTexture, Texture, Vector3 } from 'three'

interface IProps {
    map: DataTexture | Texture
    depth: DataTexture | Texture
    scale: Vector3
}

/**
 * Image 
 *
 * Map ~ surface texture
 * Depth ~ bump scale texture (gray scale)
 * Scale ~ vector of how to scale the surface
 * 
 */
const Image = ({map, depth, scale} : IProps) => {

    return (
        <mesh
            position={[0.5 * scale.x, 0.5 * scale.y, 0]}
            scale={scale}
        >
            <planeBufferGeometry 
                attach="geometry" 
                args={[1, 1, depth.image.width + 1, depth.image.height + 1]} 
            />

            <meshStandardMaterial 
                map={map}

                metalness={0.2}
                roughness={0.6}
                flatShading
                side={DoubleSide}
                alphaToCoverage
                fog={false}

                onBeforeCompile={(shader) => setUpShader(shader, depth)}
            />
        </mesh>
    )
}

export default Image




function setUpShader(shader: any, textureDepth: DataTexture | Texture) {

    // uniforms
    shader.uniforms.displacementMap   = { type: "t", value: textureDepth };
    shader.uniforms.displacementScale = { type: "f", value: 1.0 };
    shader.uniforms.displacementBias  = { type: "f", value: 0.0 };
    shader.uniforms.normalZ           = { type: "v3", value: new Vector3( 0, 0, 1 ) };
    const uniforms = `
    uniform sampler2D displacementMap;
    uniform float displacementScale;
    uniform float displacementBias;
    uniform vec3 normalZ;
    varying float vAmount;
    varying vec3 vNormal;
    #ifdef USE_TANGENT
        varying vec3 vTangent;
        varying vec3 vBitangent;
    #endif`;

    // vertex shader

    shader.vertexShader  = `${uniforms}\n${shader.vertexShader}\n`

    // shader.vertexShader = shader.vertexShader.replace("#include <beginnormal_vertex>", "");
    shader.vertexShader = shader.vertexShader.replace("#include <morphnormal_vertex>", "");
    shader.vertexShader = shader.vertexShader.replace("#include <skinnormal_vertex>", "");

    // shader.vertexShader = shader.vertexShader.replace( "#include <displacementmap_vertex>", "");
    shader.vertexShader = shader.vertexShader.replace( "#include <displacementmap_vertex>",
        `
            transformed += normalize( normalZ ) * ( texture2D( displacementMap, vUv ).x * displacementScale + displacementBias );
        `
    );

    shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        `
        #include <project_vertex>
        vAmount = texture2D( displacementMap, vUv ).r;
        vec3 newPosition = position + normalZ * displacementScale * vAmount;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );
        `,
    );

    shader.vertexShader = shader.vertexShader.replace(
        "#include <defaultnormal_vertex>",
        `
        vec3 transformedNormal = objectNormal;
        vNormal = normalize( transformedNormal );`,
    );
}

