import * as React from "react";
import * as ReactDOM from "react-dom";
import App from "./App";

const search = unescape(window.location.search);
const config = search.indexOf("{") !== -1 ? JSON.parse(search.substring(6)) as {htmlField: string; jsonField: string} : undefined;

const htmlField = config ? config.htmlField : "oss_html";
const jsonField = config ? config.jsonField : "oss_json";

ReactDOM.render(
    <App htmlField={htmlField} jsonField={jsonField} />,
    document.getElementById("root")
);
