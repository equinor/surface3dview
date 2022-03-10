import React from 'react'

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
const Controller = ({ z, setZ, x, setX, t, setT, c, setC, cm, setCm,hb, setHb, surf, setSurf, update, setUpate }: any) => {
    return (
        <div className="controller">
            <input type="range" min={0.025} max={1} step={0.025} value={z} onChange={({ target }) => setZ(+target.value)} /> <br />
            <input type="number" min={1} max={1000} value={x} onChange={({ target }) => setX(+target.value)} /> <br />
            <input type="range" min={5} max={25} step={2} value={t} onChange={({ target }) => setT(+target.value)} /> <br />
            <label><input type="checkbox" checked={c} onChange={() =>{ setC(!c)}}/> Continuous marker </label><br/>
            <label><input type="checkbox" checked={cm} onChange={() =>{ setCm(!cm)}}/> Double click marker</label><br/>
            <label><input type="checkbox" checked={hb} onChange={() =>{ setHb(!hb)}}/> Show marker hitbox</label><br/>

            <label><input type="radio" checked={update === "react"} onChange={()=>{setUpate("react")}}/> React update</label>
            <label><input type="radio" checked={update === "three"} onChange={()=>{setUpate("three")}}/> Three update</label><br/>

            <label><input type="radio" checked={surf === "main"} onChange={()=>{setSurf("main")}}/> Main</label>
            <label><input type="radio" checked={surf === "test"} onChange={()=>{setSurf("test")}}/> Test</label>
        </div>
    )
}

export default Controller
