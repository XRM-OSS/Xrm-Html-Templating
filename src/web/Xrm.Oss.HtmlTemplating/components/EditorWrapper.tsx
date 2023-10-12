import * as React from "react";
import EmailEditor, { EditorRef, EmailEditorProps } from "react-email-editor";


export interface EditorWrapperProps {
    editorProps: EmailEditorProps;
    editorRef: React.RefObject<EditorRef>;
}

export const EditorWrapper: React.FC<EditorWrapperProps> = React.memo(({ editorProps, editorRef }) => {
    return (
        <EmailEditor
        { ...editorProps }
        ref={editorRef}
    />)
});