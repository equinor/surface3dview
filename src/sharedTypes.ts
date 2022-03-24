import { Texture, DataTexture } from 'three'

export type Map = Texture | DataTexture
export type Depth = Texture | DataTexture
export type Domain = { [xyz in 'x' | 'y' | 'z']: [number, number] }