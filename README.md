# surface-3d-viewer

> 3D surface viewer basedupon three &amp; fiber

[![NPM](https://img.shields.io/npm/v/surface-3d-viewer.svg)](https://npm.equinor.com/package/surface-3d-viewer) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save surface-3d-viewer
```

## Usage

```tsx
import React from 'react'

import { Canvas, useLoader } from '@react-three/fiber'
import { Object3D, Vector3, TextureLoader } from "three";

import { Grid, Surface } from 'surface-3d-viewer'

Object3D.DefaultUp.set(0, 0, 1);

const scale = new Vector3(1, 1, 1)
const domains = {x: [0, 1], y: [0, 1], z: [0, 1]}

const SurfaceContainer = () => {

    const [map, depth] = useLoader(TextureLoader, ['./sinc.png', './sinc_gray.png'] )

    return <Suspense fallback={null}>
        <Grid scale={scale} domains={domains} ticks={15} />
        <Surface map={map} depth={depth} scale={scale} />
    </Suspense>
}

const App = ({scale, ticks, domains}: any) => {

    return <Canvas frameloop="demand" linear flat >
        <SurfaceContainer />
    </Canvas>
```

## Example
[Github Pages](https://equinor.github.io/surface3dview/)
