import React from 'react'

const Controller = ({z, setZ}: any) => {

    return (
        <div className='controller'>
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
