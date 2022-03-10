import React from 'react'

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
const Controller = ({ z, setZ, x, setX, t, setT, c, setC, cm, setCm,hb, setHb, surf, setSurf }: any) => {
    return (
        <div className="controller">
            <input type="range" min={0.025} max={1} step={0.025} value={z} onChange={({ target }) => setZ(+target.value)} /> <br />
            <input type="number" min={1} max={1000} value={x} onChange={({ target }) => setX(+target.value)} /> <br />
            <input type="range" min={5} max={25} step={2} value={t} onChange={({ target }) => setT(+target.value)} /> <br />
            <input type="checkbox" checked={c} onChange={() =>{ setC(!c)}}/> <br/>
            <input type="checkbox" checked={cm} onChange={() =>{ setCm(!cm)}}/><br/>
            <input type="checkbox" checked={hb} onChange={() =>{ setHb(!hb)}}/><br/>

            <input type="radio" checked={surf === "main"} onChange={()=>{setSurf("main")}}/>
            <input type="radio" checked={surf === "test"} onChange={()=>{setSurf("test")}}/>
        </div>
    )
}

export default Controller
