declare module "react-email-editor" {
    interface EmailEditorProps {
        onLoad?: () => void;
    }

    export default class EmailEditor extends React.Component<EmailEditorProps> {
        public exportHtml: (callBack: ((data: {design: any, html: string}) => void)) => void;
        public loadDesign: (data: any) => void;
        public saveDesign: (callBack: ((design: any) => void)) => void;
    }
}
