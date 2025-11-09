import React, {useCallback} from 'react'
import {useDropzone} from 'react-dropzone'

export default function FileDropzone({onCsvText}) {
  const onDrop = useCallback(acceptedFiles => {
    const file = acceptedFiles[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => onCsvText(e.target.result)
    reader.readAsText(file)
  }, [onCsvText])

  const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop, accept: {'text/csv':[]}})

  return (
    <div {...getRootProps()} className="border-dashed border-2 p-6 rounded-lg text-center cursor-pointer">
      <input {...getInputProps()} />
      {isDragActive ? <p>Drop the file here ...</p> : <p>📤 Drag & drop CSV or click to browse</p>}
    </div>
  )
}
