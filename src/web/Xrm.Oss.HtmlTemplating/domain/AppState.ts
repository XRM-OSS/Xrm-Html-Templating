import { EmailEditorProps } from "react-email-editor";

export interface AppStateAction<T, P> {
    type: T;
    payload: P;
}

type SetEditorReadyType = "SET_EDITOR_READY";
type SetEditorReadyPayload = { editorReady: boolean };
type SetEditorReadyAction = AppStateAction<SetEditorReadyType, SetEditorReadyPayload>;
export const SetEditorReady = (editorReady: boolean): SetEditorReadyAction => ({ type: "SET_EDITOR_READY", payload: { editorReady } });

type SetEditorPropsType = "SET_EDITOR_PROPS";
type SetEditorPropsPayload = { props: EmailEditorProps };
type SetEditorPropsAction = AppStateAction<SetEditorPropsType, SetEditorPropsPayload>;
export const SetEditorProps = (props: EmailEditorProps): SetEditorPropsAction => ({ type: "SET_EDITOR_PROPS", payload: { props } });

type SetDefaultDesignType = "SET_DEFAULT_DESIGN";
type SetDefaultDesignPayload = { defaultDesign: { [key: string]: any } };
type SetDefaultDesignAction = AppStateAction<SetDefaultDesignType, SetDefaultDesignPayload>;
export const SetDefaultDesign = (defaultDesign: {[key: string]: any}): SetDefaultDesignAction => ({ type: "SET_DEFAULT_DESIGN", payload: { defaultDesign } });


type SetIsFullScreenType = "SET_IS_FULLSCREEN";
type SetIsFullScreenPayload = { isFullscreen: boolean };
type SetIsFullScreenAction = AppStateAction<SetIsFullScreenType, SetIsFullScreenPayload>;
export const SetIsFullScreen = (isFullscreen: boolean): SetIsFullScreenAction => ({ type: "SET_IS_FULLSCREEN", payload: { isFullscreen } });


export interface DesignDefinition {
    json: string;
    html: string;
}

export interface AppState {
    editorReady: boolean;
    editorProps?: EmailEditorProps;
    defaultDesign?: {[key: string]: any};
    isFullScreen: boolean;
}

export function appStateReducer(designState: AppState, action: SetEditorReadyAction | SetEditorPropsAction | SetDefaultDesignAction | SetIsFullScreenAction) {
    const { type, payload } = action;

    switch (type) {
        case "SET_DEFAULT_DESIGN":
            return {
                ...designState,
                defaultDesign: payload.defaultDesign
            } as AppState;
        case "SET_EDITOR_PROPS":
            return {
                ...designState,
                editorProps: payload.props
            } as AppState;
        case "SET_EDITOR_READY":
            return {
                ...designState,
                editorReady: payload.editorReady
            } as AppState;
        case "SET_IS_FULLSCREEN":
            return {
                ...designState,
                isFullScreen: payload.isFullscreen,
                editorReady: false
            } as AppState;
        default:
            return designState;
    }
}