import * as React from 'react';
import { DesignState, DesignStateAction, designStateReducer } from '../domain/DesignState';

export type DesignContextType = {
    designState: DesignState,
    dispatch: React.Dispatch<DesignStateAction>
};

export const DesignContext = React.createContext<DesignContextType | null>(null);

export const DesignProvider: React.FC<React.ReactNode> = ({ children }) => {
    const [designState, dispatch] = React.useReducer(designStateReducer, { design: { json: "", html: "" }, isLocked: false } as DesignState);

    return <DesignContext.Provider value={{ designState: designState, dispatch }}>{children}</DesignContext.Provider>;
};