import { useCallback, useEffect } from 'react'
import Color from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { isTextContentEmpty } from '@/overlay/OverlayObjectStore'
import type { TextAlign as PdfTextAlign, TextOverlayObject } from '@/overlay/OverlayObject'

export type RichTextEditorHandle = {
  toggleBold: () => void
  toggleItalic: () => void
  toggleUnderline: () => void
  toggleStrike: () => void
  toggleBulletList: () => void
  toggleOrderedList: () => void
  indent: () => void
  outdent: () => void
  setTextAlign: (align: PdfTextAlign) => void
  setTextColor: (color: string) => void
  commit: () => string | null
  focus: () => void
  selectAll: () => void
}

export type RichTextEditorState = {
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  bulletList: boolean
  orderedList: boolean
}

type RichTextBoxProps = {
  object: TextOverlayObject
  editing: boolean
  scale: number
  onChangeContent: (objectId: string, contentHtml: string) => void
  onCommitContent: (objectId: string, contentHtml: string) => void
  onDeleteIfEmpty: (objectId: string) => void
  onFinishEditing: () => void
  onRegisterEditor: (handle: RichTextEditorHandle | null) => void
  onEditorStateChange: (state: RichTextEditorState) => void
}

const extensions = [
  StarterKit.configure({
    bulletList: {
      keepMarks: true,
      keepAttributes: false,
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: false,
    },
  }),
  Underline,
  TextStyle,
  Color,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
]

export function RichTextBox({
  object,
  editing,
  scale,
  onChangeContent,
  onCommitContent,
  onDeleteIfEmpty,
  onFinishEditing,
  onRegisterEditor,
  onEditorStateChange,
}: RichTextBoxProps) {
  const updateEditorState = useCallback(
    (editorInstance: Editor) => {
      onEditorStateChange({
        bold: editorInstance.isActive('bold'),
        italic: editorInstance.isActive('italic'),
        underline: editorInstance.isActive('underline'),
        strike: editorInstance.isActive('strike'),
        bulletList: editorInstance.isActive('bulletList'),
        orderedList: editorInstance.isActive('orderedList'),
      })
    },
    [onEditorStateChange],
  )
  const editor = useEditor(
    {
      extensions,
      content: object.contentHtml || '<p></p>',
      editorProps: {
        attributes: {
          class: 'rich-text-editor-content',
          spellcheck: 'false',
        },
      },
      onUpdate: ({ editor: updatedEditor }) => {
        onChangeContent(object.id, updatedEditor.getHTML())
        updateEditorState(updatedEditor)
      },
      onSelectionUpdate: ({ editor: updatedEditor }) => {
        updateEditorState(updatedEditor)
      },
      onFocus: ({ editor: focusedEditor }) => {
        updateEditorState(focusedEditor)
      },
      onBlur: ({ editor: blurredEditor }) => {
        const contentHtml = blurredEditor.getHTML()
        onCommitContent(object.id, contentHtml)
        updateEditorState(blurredEditor)

        if (isTextContentEmpty(contentHtml)) {
          onDeleteIfEmpty(object.id)
        }

        onFinishEditing()
      },
    },
    [object.id, updateEditorState],
  )

  const commit = useCallback(() => {
    if (!editor) {
      return null
    }

    const contentHtml = editor.getHTML()
    onCommitContent(object.id, contentHtml)

    if (isTextContentEmpty(contentHtml)) {
      onDeleteIfEmpty(object.id)
    }

    onFinishEditing()
    editor.commands.blur()
    return contentHtml
  }, [editor, object.id, onCommitContent, onDeleteIfEmpty, onFinishEditing])

  useEffect(() => {
    if (!editor || !editing) {
      onRegisterEditor(null)
      return
    }

    const handle: RichTextEditorHandle = {
      toggleBold: () => editor.chain().focus().toggleBold().run(),
      toggleItalic: () => editor.chain().focus().toggleItalic().run(),
      toggleUnderline: () => editor.chain().focus().toggleUnderline().run(),
      toggleStrike: () => editor.chain().focus().toggleStrike().run(),
      toggleBulletList: () => editor.chain().focus().toggleBulletList().run(),
      toggleOrderedList: () => editor.chain().focus().toggleOrderedList().run(),
      indent: () => editor.chain().focus().sinkListItem('listItem').run(),
      outdent: () => editor.chain().focus().liftListItem('listItem').run(),
      setTextAlign: (align) => editor.chain().focus().setTextAlign(align).run(),
      setTextColor: (color) => editor.chain().focus().setColor(color).run(),
      commit,
      focus: () => editor.commands.focus('end'),
      selectAll: () => editor.chain().focus().selectAll().run(),
    }

    onRegisterEditor(handle)
    // Entering edit mode (double-click or new box): focus reliably first, then select all so
    // it's obvious the box is editable and the text can be replaced immediately.
    requestAnimationFrame(() => {
      editor.commands.focus('end')
      editor.commands.selectAll()
    })

    return () => onRegisterEditor(null)
  }, [commit, editing, editor, onRegisterEditor])

  // fontSize/padding are stored in PDF units; scale them so the on-screen box matches the
  // zoom level (and stays consistent with the flattened output, which renders in PDF units).
  const hasBorder = !!object.style.borderColor && object.style.borderColor !== 'transparent'
  const style = {
    fontSize: `${object.style.fontSize * scale}px`,
    color: object.style.textColor,
    backgroundColor: object.style.backgroundColor,
    // Only render a border when a non-transparent color is chosen, matching the flattened PDF.
    border: hasBorder ? `${scale}px solid ${object.style.borderColor}` : undefined,
    padding: `${object.style.padding * scale}px`,
    textAlign: object.style.textAlign,
  }

  if (editing) {
    return (
      <div className="rich-text-box rich-text-box-editing" style={style}>
        <EditorContent editor={editor} />
      </div>
    )
  }

  return (
    <div
      className="rich-text-box"
      style={style}
      dangerouslySetInnerHTML={{ __html: object.contentHtml || '<p></p>' }}
    />
  )
}
