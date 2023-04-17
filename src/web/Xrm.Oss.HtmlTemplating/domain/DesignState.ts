export enum DesignStateActionEnum {
    SET = 'SET',
    UNLOCK = 'UNLOCK'
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
    isLocked: boolean;
    lastOrigin: Origin 
}

export function designStateReducer(designState: DesignState, action: DesignStateAction) {
    const { type, payload, origin } = action;

    switch (type) {
        case DesignStateActionEnum.SET:
            if (designState.isLocked && origin !== 'internal') {
                return designState;
            }

            return {
                ...designState,
                design: payload,
                lastOrigin: origin,
                isLocked: origin === 'internal'
            } as DesignState;
        case DesignStateActionEnum.UNLOCK:
            return {
                ...designState,
                isLocked: false
            } as DesignState;
        default:
            return designState;
    }
}