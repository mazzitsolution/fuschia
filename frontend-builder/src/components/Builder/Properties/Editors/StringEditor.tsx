import React, { useState } from 'react'
import { Props, StringSchema } from '@fuchsia/types'
import { LabeledTextInput } from '../../../Shared/primitives/LabeledTextInput'
import { Color, SketchPicker } from 'react-color'
import Box from '@mui/material/Box'
import Popper from '@mui/material/Popper'
import TextInputBinding from '../../../Shared/TextInputBinding'
import { LabeledSelect } from '../../../Shared/primitives/LabeledSelect'
import ColorInputBinding from '../../../Shared/ColorInputBinding'
export type StringEditorProps = Props<StringSchema, string>

const ColorPicker = ({
  title,
  defaultValue,
  onChange,
  componentId,
}: {
  title: string
  componentId: string
  defaultValue: string
  onChange: (value: string) => void
}) => {
  const [color, setColor] = useState<Color>(defaultValue)
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(anchorEl ? null : event.currentTarget)
  }
  const open = Boolean(anchorEl)
  const id = open ? 'simple-popper' : undefined
  return (
    <>
      <div>
        <div style={{ fontSize: '0.75rem' }}>{title}</div>
        <TextInputBinding
          componentId={componentId}
          initialValue={color?.toString() as any}
          onChange={value => {
            onChange(value)
          }}
        />
      </div>
      <button onClick={handleClick}>Color</button>
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
  if (props.schema.enum) {
    return (
      <LabeledSelect
        label={props.schema.title || ''}
        selectedValue={props.initialValue as string}
        onChange={e => props.updateValue(e.target.value, true)}
        options={props.schema.enum.map(item => ({
          label: item,
          value: item,
        }))}
      />
    )
  }
  switch (props.schema.format) {
    case 'textarea':
      return <textarea />
    case 'color':
      return (
        <div>
          <div style={{ fontSize: '0.75rem' }}>{props.schema.title}</div>
          <ColorInputBinding
            componentId={props.componentId}
            initialValue={props.initialValue as any}
            onChange={value => {
              props.updateValue(value, true)
            }}
          />
        </div>
      )
    case 'ipv4':
      return (
        <>
          <LabeledTextInput
            label={props.schema.title || 'undefined'}
            defaultValue={props.initialValue as string}
            onChange={e => props.updateValue(e.target.value, true)}
          />
        </>
      )
    default:
      return (
        <div>
          <div style={{ fontSize: '0.75rem' }}>{props.schema.title}</div>
          <TextInputBinding
            componentId={props.componentId}
            initialValue={props.initialValue as any}
            onChange={value => {
              props.updateValue(value, true)
            }}
          />
        </div>
      )
  }
}

export default StringEditor
