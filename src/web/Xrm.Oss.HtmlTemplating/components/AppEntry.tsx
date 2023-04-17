import * as React from "react";
import { App, AppProps } from "./App";
import { DesignProvider } from "./DesignContext";

export const AppEntry: React.FC<AppProps> = (props) => {
    return (
        <DesignProvider>
            <App {...props} />
        </DesignProvider>
    )
};