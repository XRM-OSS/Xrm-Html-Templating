export const getExternalScript = (namespacedFunction: string): Function => {
    const callPath = namespacedFunction.split(".");

    return callPath.reduce((all, cur) => !!all ? (all as any)[cur] : undefined, window) as any;
};