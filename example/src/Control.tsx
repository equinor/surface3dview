import React from 'react'

const Controller = ({z, setZ, t, setT}: any) => {

    return (
        <div className='controller'>
            <input 
                type='range'
                min={0.025} 
                max={1} 
                step={0.025} 
                value={z}
                onChange={({target}) => setZ( +target.value )}
            /> <br />
            <input 
                type='range'
                min={5} 
                max={25} 
                step={2} 
                value={t}
                onChange={({target}) => setT( +target.value )}
            />
        </div>
    )
}

export default Controller