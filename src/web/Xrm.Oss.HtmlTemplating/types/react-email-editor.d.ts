declare module "react-email-editor" {
    interface EmailEditorProps {
        onLoad?: () => void;
        style?: React.CSSProperties;
        minHeight?: string;
        options?: {
            customCSS?: Array<string>;
            customJS?: Array<string>;
            mergeTags?: MergeTags;
        };
        projectId?: number;
    }

    export interface MergeTag {
        name: string;
        value?: string;
        mergeTags?: MergeTags
    }

    export interface MergeTags {
        [key: string]: MergeTag;
    }

    export default class EmailEditor extends React.Component<EmailEditorProps> {       
        public tools?: any;
        public appearance?: any;
        public onDesignLoad?: (data: any) => void;
        public exportHtml: (callBack: ((data: {design: any, html: string}) => void)) => void;
        public loadDesign: (data: any) => void;
        public saveDesign: (callBack: ((design: any) => void)) => void;
    }
}
