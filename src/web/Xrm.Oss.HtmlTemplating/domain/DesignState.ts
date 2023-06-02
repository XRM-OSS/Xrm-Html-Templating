export enum DesignStateActionEnum {
    SET = 'SET'
}

export type Origin = 'internal' | 'external';

export interface DesignStateAction {
    type: DesignStateActionEnum,
    origin?: Origin,
    payload?: DesignDefinition
}

export interface DesignDefinition {
    json: string;
    html: string;
}

export interface DesignState {
    design: DesignDefinition;
    lastOrigin?: Origin 
}

export function designStateReducer(designState: DesignState, action: DesignStateAction) {
    const { type, payload, origin } = action;

    switch (type) {
        case DesignStateActionEnum.SET:
            console.log(`[WYSIWYG_PCF] Editor received event from ${origin}`);

            return {
                ...designState,
                design: payload,
                lastOrigin: origin
            } as DesignState;
        default:
            return designState;
    }
}