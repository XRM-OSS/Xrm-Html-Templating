export const loadWebResource = async (path: string) => new Promise((resolve, reject) => {
    const element = document.createElement('script');

    element.src = path;
    element.async = true;
    element.onload = resolve;
    element.onerror = reject;

    document.body.appendChild(element);
});