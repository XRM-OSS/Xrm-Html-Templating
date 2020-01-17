import * as React from "react";
import * as ReactDOM from "react-dom";
import App from "./App";
import WebApiClient from "xrm-webapi-client";
import { XtlSnippet } from "../domain/XtlSnippet";
import { MergeTags, MergeTag } from "react-email-editor";

const search = unescape(window.location.search);
const config = search.indexOf("{") !== -1 ? JSON.parse(search.substring(6)) as {htmlField: string; jsonField: string} : undefined;

const htmlField = config ? config.htmlField : "oss_html";
const jsonField = config ? config.jsonField : "oss_json";

WebApiClient.Retrieve({ entityName: "oss_xtlsnippet", queryParams: "?$select=oss_name,oss_xtlsnippetid,oss_xtlexpression,_oss_parentsnippet_value&$orderby=oss_name", returnAllPages: true})
.then(({ value: snippets}: {value: Array<XtlSnippet>}) => {
    const resolveTags = (data: Array<XtlSnippet>, children?: Array<XtlSnippet>, parent?: XtlSnippet): MergeTags => {
        return (children || data).reduce((all, cur) => {
            const currentChildren = data.filter(s => s._oss_parentsnippet_value === cur.oss_xtlsnippetid);

            if (parent) {
                if (currentChildren.length) {
                    return {
                        ...all,
                        [cur.oss_xtlsnippetid]: {
                            name: cur.oss_name,
                            mergeTags: resolveTags(data, currentChildren, cur)
                        }
                    };
                }
                else {
                    return {
                        ...all,
                        [cur.oss_xtlsnippetid]: {
                            name: cur.oss_name,
                            value: `\${{${cur.oss_xtlexpression}}}`
                        }
                    };
                }
            }

            if (cur._oss_parentsnippet_value) {
                return all;
            }

            if (currentChildren.length && !cur._oss_parentsnippet_value) {
                all[cur.oss_xtlsnippetid] = {
                    name: cur.oss_name,
                    mergeTags: resolveTags(data, currentChildren, cur)
                };
            }
            else {
                all[cur.oss_xtlsnippetid] = {
                    name: cur.oss_name,
                    value: `\${{${cur.oss_xtlexpression}}}`
                };
            }

            return all;
        }, {} as MergeTags);
    };

    const mergeTags = resolveTags(snippets);

    ReactDOM.render(
        <App snippets={mergeTags} htmlField={htmlField} jsonField={jsonField} />,
        document.getElementById("root")
    );
})
.catch((e: any) => {
    alert("Seems your user is missing read privileges to the oss_xtlsnippet entity. Please ask your system administrator for security permissions");
});
