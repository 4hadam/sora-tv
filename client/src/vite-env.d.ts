/// <reference types="vite/client" />

// Web Worker module declarations for Vite
declare module '*?worker' {
    const workerConstructor: {
        new(): Worker
    }
    export default workerConstructor
}

declare module '*.worker.ts?worker' {
    const workerConstructor: {
        new(): Worker
    }
    export default workerConstructor
}
