import React, { useState } from 'react'
import { Props, StringSchema } from '@fuchsia/types'
import { LabeledTextInput } from '../../../Shared/primitives/LabeledTextInput'
import { Color, SketchPicker } from 'react-color'
import Box from '@mui/material/Box'
import Popper from '@mui/material/Popper'

export type StringEditorProps = Props<StringSchema, string>

const ColorPicker = ({
  title,
  defaultValue,
  onChange,
}: {
  title: string
  defaultValue: string
  onChange: (value: string) => void
}) => {
  const [color, setColor] = useState<Color>(defaultValue)
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const handleClick = (event: React.FocusEvent<HTMLElement>) => {
    setAnchorEl(anchorEl ? null : event.currentTarget)
  }
  const open = Boolean(anchorEl)
  const id = open ? 'simple-popper' : undefined
  return (
    <>
      <LabeledTextInput
        label={title}
        value={color?.toString()}
        onFocus={handleClick}
      />

      <Popper id={id} open={open} anchorEl={anchorEl} placement="right">
        <Box sx={{ marginLeft: '0.5em' }}>
          <div
            style={{
              position: 'fixed',
              top: '0px',
              right: '0px',
              bottom: '0px',
              left: '0px',
            }}
            onClick={() => setAnchorEl(null)}
          />
          <SketchPicker
            color={color}
            onChange={color => {
              setColor(color.hex)
              onChange(color.hex)
            }}
          />
        </Box>
      </Popper>
    </>
  )
}

const StringEditor = function StringEditor(props: StringEditorProps) {
  switch (props.schema.format) {
    case 'textarea':
      return <textarea />
    case 'color':
      return (
        <ColorPicker
          defaultValue={props.initialValue as string}
          title={props.schema.title || 'undefined'}
          onChange={e => props.updateValue(e, true)}
        />
      )
    default:
      return (
        <LabeledTextInput
          label={props.schema.title || 'undefined'}
          defaultValue={props.initialValue as string}
          onChange={e => props.updateValue(e.target.value, true)}
        />
      )
  }
}

export default StringEditor
