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
import { DesignState, DesignStateActionEnum, designStateReducer } from "../domain/DesignState";
import { debounce, localHost } from "../domain/Utils";

export interface AppProps {
  pcfContext: ComponentFramework.Context<IInputs>;
  jsonInput: string | null;
  updateOutputs: (jsonInput: string, htmlOutput: string) => void;
  allocatedHeight: number;
  allocatedWidth: number;
  updatedProperties: string[];
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

let editorReadyFired = false;

export const App: React.FC<AppProps> = React.memo((props) => {
  const editorRef = React.useRef<EditorRef>();
  const [editorReady, setEditorReady] = React.useState(false);
  const [editorProps, setEditorProps] = React.useState<EmailEditorProps>();
  const [defaultDesign, setDefaultDesign] = React.useState(_defaultDesign);

  const [designContext, dispatchDesign] = React.useReducer(designStateReducer, { design: { json: "", html: "" }, isLocked: false } as DesignState);
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  // Init once initially and every time fullscreen activates / deactivates
  React.useEffect(() => { init(); }, [ isFullScreen ]);

  // Load design on external update
  React.useEffect(() => {
    if (!editorReady) {
      return;
    }

    dispatchDesign({
      origin: 'external',
      payload: {
        json: props.jsonInput ?? "",
        html: ""
      },
      type: DesignStateActionEnum.SET
    });
  }, [ props.jsonInput, editorReady, isFullScreen ]);

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

    dispatchDesign({
      origin: 'internal',
      payload: {
        json: designOutput,
        html: htmlOutput
      },
      type: DesignStateActionEnum.SET
    });
  }, []);

  const onEditorReady = async () => {
    // Run only once. MS wires up a middleware in UCI "windowEventListenerBootTask", which interfers with unlayer and makes it post the ready event on every change...
    if (!editorReadyFired) {
      editorReadyFired = true;
      setEditorReady(true);

      // "Unregister" onEditorReady event, MS event middleware causes it to execute more often than necessary
      setEditorProps({ ...editorProps, onReady: undefined });

      editorRef.current!.addEventListener("design:updated", onEditorUpdate);

      if (window.location.hostname !== localHost && props.pcfContext.parameters.customScriptOnReadyFunc.raw) {
        try {
          const funcRef = getExternalScript(props.pcfContext.parameters.customScriptOnReadyFunc.raw);
          
          await funcRef({ editorRef: editorRef.current, webApiClient: WebApiClient });
        }
        catch(ex: any) {
          alert(`Error in your custom onReady func. Error message: ${ex.message || ex}`);
        }
      }
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
        const funcResult = await funcRef({ editorProps: properties, webApiClient: WebApiClient });

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

    propertiesToSet.onReady = onEditorReady;

    setEditorProps(propertiesToSet);
    setDefaultDesign(defaultDesign);
  };

  const unlockEditor = debounce(() => {
    dispatchDesign({
      type: DesignStateActionEnum.UNLOCK
    });
  }, 500);

  const handleDesignChange = async () => {
    if (!designContext.lastOrigin) {
      return;
    }

    if (designContext.lastOrigin === 'external') {
      const design = designContext.design;
      editorRef.current!.loadDesign((design && design.json && JSON.parse(design.json)) || defaultDesign);
    }

    const [json, html] = await getEditorContent();

    if (designContext.lastOrigin === 'internal') {
      unlockEditor();
    }

    props.updateOutputs(json, html);
  };

  React.useEffect(() => { handleDesignChange(); }, [ designContext.design ]);

  React.useEffect(() => {
    if (props.updatedProperties && props.updatedProperties.includes("fullscreen_open")) {
      editorReadyFired = false;
      setIsFullScreen(true);
    }
    else if (props.updatedProperties && props.updatedProperties.includes("fullscreen_close")) {
      editorReadyFired = false;
      setIsFullScreen(false);
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

  const onMaximize = () => {
    props.pcfContext.mode.setFullScreen(true);
  };

  return (
    <div id='oss_htmlroot' style={{ display: "flex", flexDirection: "column", minWidth: "1024px", minHeight: "500px", position: "relative", height: `${props.allocatedHeight > 0 ? props.pcfContext.mode.allocatedHeight : 800}px`, width: `${props.allocatedWidth > 0 ? props.pcfContext.mode.allocatedWidth : 1024}px` }}>
      { !isFullScreen && <IconButton iconProps={{ iconName: "MiniExpand" }} title="Maximize / Minimize" styles={{ root: { position: "absolute", backgroundColor: "#efefef", borderRadius: "5px", right: "10px", bottom: "10px" }}} onClick={onMaximize} /> }
      { editorProps &&
        <EditorWrapper editorProps={editorProps} refCallBack={refCallBack}  />
      }
    </div>
  );
});