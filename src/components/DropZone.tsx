type DropZoneProps = {
  onFiles: (files: File[]) => void
  busy?: boolean
}

export function DropZone({ onFiles, busy }: DropZoneProps) {
  function take(list: FileList | File[] | null) {
    if (!list) return
    const files = [...list].filter((f) => f.type.startsWith('image/'))
    if (files.length) onFiles(files)
  }

  return (
    <label
      className={`dropzone ${busy ? 'is-busy' : ''}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        take(e.dataTransfer.files)
      }}
    >
      <input
        type="file"
        accept="image/*"
        multiple
        hidden
        disabled={busy}
        onChange={(e) => {
          take(e.target.files)
          e.target.value = ''
        }}
      />
      <span className="dropzone-kicker">Memories reel</span>
      <span className="dropzone-title">写真をドロップ</span>
      <span className="dropzone-sub">
        顔を検出して Ken Burns の行き先を仮決めします。点をドラッグして直せます。
      </span>
    </label>
  )
}
