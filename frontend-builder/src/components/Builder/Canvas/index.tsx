import React, { useContext, useCallback } from 'react'
import styled from '@emotion/styled'
import type { Layer as LayerType } from '@fuchsia/types'

import CanvasContext from '../canvas-context'
import AppContext from '../context'
import Layer from './Layer'
import KeyboardEvents from './KeyboardEvents'

const Wrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--canvasBg);
`

const Backdrop = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`

const Objects = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
`

const Canvas: React.FC = function Canvas() {
  const { body } = useContext(AppContext)
  const { objects } = body

  const { state: canvasState, onChange: setCanvasState } =
    useContext(CanvasContext)

  const handleDeselect = useCallback(() => {
    console.log('CLICKING!!')

    setCanvasState({
      ...canvasState,
      selection: [],
    })
  }, [canvasState, setCanvasState])

  return (
    <Wrapper>
      <KeyboardEvents />
      <Backdrop onMouseDown={handleDeselect} />
      <Objects>
        {objects.map(obj => (
          <Layer key={obj.id} layer={obj as LayerType} />
        ))}
      </Objects>
    </Wrapper>
  )
}

export default Canvas
