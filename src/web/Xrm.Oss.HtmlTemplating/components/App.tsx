import * as React from "react";
import * as WebApiClient from "xrm-webapi-client";
import { EmailEditorProps, MergeTag, EditorRef } from "react-email-editor";
import { HtmlTemplate } from "../domain/HtmlTemplate";
import UserInputModal from "./UserInputModal";
import { XtlSnippet } from "../domain/XtlSnippet";
import { IInputs } from "../HTMLWYSIWYGEDITOR/generated/ManifestTypes";
import { IconButton } from "@fluentui/react";
import { loadWebResource } from "../domain/WebResourceLoader";
import { getExternalScript } from "../domain/ScriptCaller";
import { EditorWrapper } from "./EditorWrapper";
import { DesignState, DesignStateAction, DesignStateActionEnum, designStateReducer } from "../domain/DesignState";
import { debounce, localHost } from "../domain/Utils";
import { registerFileUploader } from "../domain/FileUploader";
import { AppState, SetDefaultDesign, SetEditorProps, SetEditorReady, SetIsFullScreen, appStateReducer } from "../domain/AppState";

export interface AppProps {
  pcfContext: ComponentFramework.Context<IInputs>;
  jsonInput: string | null;
  updateOutputs: (jsonInput: string, htmlOutput: string) => void;
  allocatedHeight: number;
  allocatedWidth: number;
  updatedProperties: string[];
}

export interface ImageUploadSettings {
  uploadEntity: string, // "msdyn_knowledgearticleimage"
  uploadEntityFileNameField?: string | null, // "msdyn_filename"
  uploadEntityBodyField: string, // "msdyn_blobfile"
  parentLookupName?: string | null
}

export interface FormContext {
  entityId: string,
  entity: string
}

export interface FunctionContext {
  editorRef: EditorRef,
  getFormContext: () => FormContext,
  webApiClient: typeof WebApiClient
}

const asciiArmorRegex = /xtl_ascii_armor__(.*)?(?=__xtl_ascii_armor)__xtl_ascii_armor/gm;
const _defaultDesign: any = { "counters": { "u_column": 1, "u_row": 1 }, "body": { "rows": [{ "cells": [1], "columns": [{ "contents": [], "values": { "_meta": { "htmlID": "u_column_1", "htmlClassNames": "u_column" } } }], "values": { "backgroundColor": "", "backgroundImage": { "url": "", "fullWidth": true, "repeat": false, "center": true, "cover": false }, "padding": "10px", "columnsBackgroundColor": "", "_meta": { "htmlID": "u_row_1", "htmlClassNames": "u_row" }, "selectable": true, "draggable": true, "deletable": true } }], "values": { "backgroundColor": "#e7e7e7", "backgroundImage": { "url": "", "fullWidth": true, "repeat": false, "center": true, "cover": false }, "contentWidth": "800px", "fontFamily": { "label": "Arial", "value": "arial,helvetica,sans-serif" }, "_meta": { "htmlID": "u_body", "htmlClassNames": "u_body" } } } };

const reviveXtlExpressions = (expression: any) => {
  if (!expression || typeof (expression) !== "string") {
    return expression;
  }

  return expression.replace(asciiArmorRegex, (m, g) => {
    return atob(g);
  });
};

const reviveXtlExpressionJson = (object: { [key: string]: any }) => {
  if (!object) {
    return object;
  }

  const keys = Object.keys(object);

  return keys.reduce((all, cur) => {
    if (Array.isArray(object[cur])) {
      all[cur] = (object[cur] as Array<any>).map(e => reviveXtlExpressionJson(e));
    }
    else if (typeof (object[cur]) === "object") {
      all[cur] = reviveXtlExpressionJson(object[cur]);
    }
    else {
      all[cur] = reviveXtlExpressions(object[cur]);
    }

    return all;
  }, {} as { [key: string]: any });
};

export const App: React.FC<AppProps> = React.memo((props) => {
  const editorRef = React.useRef<EditorRef>();

  const [designContext, dispatchDesign] = React.useReducer(designStateReducer, { design: { json: props.jsonInput ?? ""} } as DesignState);
  const [appState, dispatchAppState] = React.useReducer(appStateReducer, { defaultDesign: undefined, editorProps: undefined, editorReady: false, isFullScreen: false } as AppState)

  const getFormContext: () => FormContext = () => ({
    entityId: (props.pcfContext.mode as any).contextInfo.entityId,
    entity: (props.pcfContext.mode as any).contextInfo.entityTypeName
  });

  // Init once initially and every time fullscreen activates / deactivates
  React.useEffect(() => { init(); }, [ appState.isFullScreen ]);

  React.useEffect(() => {
    if (appState.editorReady) {
      editorBootstrap();
      dispatchDesign({
        origin: 'external',
        payload: {
          json: designContext?.design?.json,
          html: ""
        },
        type: DesignStateActionEnum.SET
      });
    }
  }, [ appState.editorReady ]);

  const delayedDesignDispatch = debounce((design: DesignStateAction) => {
    dispatchDesign(design);
  }, 1000);

  const retrieveMergeTags = (): Promise<Array<MergeTag>> => {
    if (window.location.hostname === localHost) {
      return Promise.resolve([]);
    }

    return WebApiClient.Retrieve({ entityName: "oss_xtlsnippet", queryParams: "?$select=oss_name,oss_uniquename,oss_xtlsnippetid,oss_xtlexpression,_oss_parentsnippet_value&$orderby=oss_name", returnAllPages: true })
      .then(({ value: snippets }: { value: Array<XtlSnippet> }) => {
        const resolveTags = (children?: Array<XtlSnippet>): MergeTag[] => {
          return (children ?? []).reduce((all, cur) => {
            const currentChildren: Array<XtlSnippet> = snippets.filter(s => s._oss_parentsnippet_value === cur.oss_xtlsnippetid);
            const snippetValue: string = cur.oss_uniquename ? `\${{Snippet("${cur.oss_uniquename}")}}` : `\${{${cur.oss_xtlexpression}}}`;
            const asciiArmor = `xtl_ascii_armor__${btoa(snippetValue)}__xtl_ascii_armor`;

            return [
              ...all,
              {
                name: cur.oss_name,
                mergeTags: currentChildren.length ? resolveTags(currentChildren) : undefined,
                value: currentChildren.length ? undefined : asciiArmor,
                sample: cur.oss_name
              } as MergeTag
            ];
          }, [] as MergeTag[]);
        };

        const rootElements = snippets.filter(s => !s._oss_parentsnippet_value);
        const tags = resolveTags(rootElements);

        return tags;
      })
      .catch((e: any) => {
        alert("Seems your user is missing read privileges to the oss_xtlsnippet entity. Please ask your system administrator for security permissions");
        return [];
      });
  };

  const onEditorUpdate = React.useCallback(async () => {
    const [designOutput, htmlOutput] = await getEditorContent();

    delayedDesignDispatch({
      origin: 'internal',
      payload: {
        json: designOutput,
        html: htmlOutput
      },
      type: DesignStateActionEnum.SET
    });
  }, []);

  const onEditorReady = () => {
    dispatchAppState(SetEditorReady(true));
  };

  const editorBootstrap = async () => {
    console.log("[WYSIWYG_PCF] Bootstrapping unlayer editor");

    editorRef.current!.addEventListener("design:updated", onEditorUpdate);

    const functionContext: FunctionContext = {
      editorRef: editorRef.current!,
      getFormContext: getFormContext,
      webApiClient: WebApiClient
    };

    if (window.location.hostname !== localHost && props.pcfContext.parameters.customScriptOnReadyFunc.raw) {
      try {
        const funcRef = getExternalScript(props.pcfContext.parameters.customScriptOnReadyFunc.raw);

        await funcRef(functionContext);
      }
      catch (ex: any) {
        alert(`Error in your custom onReady func. Error message: ${ex.message || ex}`);
      }
    }

    if (props.pcfContext.parameters.imageUploadEntity.raw && props.pcfContext.parameters.imageUploadEntityBodyField.raw) {
      const imageUploadSettings: ImageUploadSettings = {
        uploadEntity: props.pcfContext.parameters.imageUploadEntity.raw,
        uploadEntityFileNameField: props.pcfContext.parameters.imageUploadEntityFileNameField.raw,
        uploadEntityBodyField: props.pcfContext.parameters.imageUploadEntityBodyField.raw,
        parentLookupName: props.pcfContext.parameters.imageUploadEntityParentLookupName.raw
      };

      registerFileUploader(imageUploadSettings, functionContext);
    }
  };

  const refCallBack = (editor: EditorRef) => {
    editorRef.current = editor;
  };

  const init = async () => {
    const customScriptPath = props.pcfContext.parameters.customScriptPath.raw;

    if (customScriptPath && window.location.hostname !== localHost) {
      try {
        await loadWebResource(customScriptPath);
      }
      catch (e: any) {
        props.pcfContext.navigation.openErrorDialog({ message: `An error occured: ${e?.message ?? e}`});
      }
    }

    const tags = await retrieveMergeTags();
    const properties = {
      projectId: props.pcfContext.parameters.projectId.raw ?? undefined,
      displayMode: props.pcfContext.parameters.displayMode.raw ?? undefined,
      options: {
        mergeTags: tags
      }
    } as EmailEditorProps;

    let propertiesToSet = properties;
    let defaultDesign = _defaultDesign;

    if (window.location.hostname !== localHost && props.pcfContext.parameters.customScriptInitFunc.raw) {
      try {
        const funcRef = getExternalScript(props.pcfContext.parameters.customScriptInitFunc.raw);

        const funcResult = await funcRef({ editorProps: properties, getFormContext: getFormContext, webApiClient: WebApiClient });

        if (funcResult && funcResult.editorProps) {
          propertiesToSet = funcResult.editorProps;
        }

        if (funcResult && funcResult.defaultDesign) {
          defaultDesign = funcResult.defaultDesign;
        }
      }
      catch (ex: any) {
        alert(`Error in your custom init func, reverting to default values. Error message: ${ex.message || ex}`);
      }
    }

    dispatchAppState(SetEditorProps(propertiesToSet));
    dispatchAppState(SetDefaultDesign(defaultDesign));
  };

  const processExternalUpdate = () => {
    if (props.jsonInput !== designContext.design.json) {
      delayedDesignDispatch({
        origin: 'external',
        payload: {
          json: props.jsonInput ?? "",
          html: ""
        },
        type: DesignStateActionEnum.SET
      });
    }
  };

  const handleDesignChange = async () => {
    if (!designContext.lastOrigin) {
      return;
    }

    if (designContext.lastOrigin === 'external') {
      const design = designContext.design;
      editorRef.current!.loadDesign((design && design.json && JSON.parse(design.json)) || appState.defaultDesign);
    }

    const [json, html] = await getEditorContent();
    props.updateOutputs(json, html);
  };

  React.useEffect(() => { handleDesignChange(); }, [ designContext.design ]);

  React.useEffect(() => {
    if (props.updatedProperties && props.updatedProperties.includes("fullscreen_open")) {
      dispatchAppState(SetIsFullScreen(true));
    }
    else if (props.updatedProperties && props.updatedProperties.includes("fullscreen_close")) {
      dispatchAppState(SetIsFullScreen(false));
    }
    else if (props.updatedProperties && props.updatedProperties.includes("jsonInputField")) {
      if (appState.editorReady) {
        processExternalUpdate();
      }
    }
  }, [props.updatedProperties]);

  const getEditorContent = (): Promise<[string, string]> => {
    return new Promise((resolve, reject) => {
      editorRef.current!.exportHtml(({ design, html }: { design: { [key: string]: any }, html: string }) => {
        const designOutput = JSON.stringify(reviveXtlExpressionJson(design));
        const htmlOutput = reviveXtlExpressions(html);

        resolve([designOutput, htmlOutput]);
      });
    });
  }

  const onMaximize = debounce(() => {
    props.pcfContext.mode.setFullScreen(true);
  }, 1000);

  return (
    <div id='oss_htmlroot' style={{ display: "flex", flexDirection: "column", minWidth: "1024px", minHeight: "500px", position: "relative", height: `${props.allocatedHeight > 0 ? props.pcfContext.mode.allocatedHeight : 800}px`, width: `${props.allocatedWidth > 0 ? props.pcfContext.mode.allocatedWidth : 1024}px` }}>
      { !appState.isFullScreen && <IconButton iconProps={{ iconName: "MiniExpand" }} title="Maximize / Minimize" styles={{ root: { position: "absolute", backgroundColor: "#efefef", borderRadius: "5px", right: "10px", bottom: "10px" }}} onClick={onMaximize} /> }
      { appState.editorProps && appState.defaultDesign &&
        <EditorWrapper editorProps={{...appState.editorProps, onReady: onEditorReady}} refCallBack={refCallBack}  />
      }
    </div>
  );
});