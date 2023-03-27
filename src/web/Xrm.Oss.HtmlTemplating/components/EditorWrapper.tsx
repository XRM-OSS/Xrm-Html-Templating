import * as React from "react";
import EmailEditor, { EditorRef, EmailEditorProps } from "react-email-editor";


export interface EditorWrapperProps {
    editorProps: EmailEditorProps;
    refCallBack: (editor: EditorRef) => void; 
}

export const EditorWrapper: React.FC<EditorWrapperProps> = React.memo(({ editorProps, refCallBack }) => {
    return (
        <EmailEditor
        { ...editorProps }
        ref={refCallBack}
    />)
});