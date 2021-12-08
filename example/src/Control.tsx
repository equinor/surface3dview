import React from 'react'

const style = {
    position: 'absolute', 
    zIndex: 50, 
    padding: 8, 
    borderRight: '1px solid black',
    borderBottom: '1px solid black',
    borderRadius: '16px 0px'
}

const Controller = ({z, setZ}: any) => {

    return (
        <div style={style as any} >
            <input 
                type='range'
                min={0.025} 
                max={1} 
                step={0.025} 
                value={z}
                onChange={({target}) => setZ( +target.value )}
            />
        </div>
    )
}

export default Controller
