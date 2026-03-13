declare module 'sonner' {
    import * as React from 'react'
    export type ToasterProps = React.HTMLAttributes<HTMLDivElement> & {
        theme?: 'light' | 'dark' | 'system'
    }
    export const Toaster: React.FC<ToasterProps>
    export default Toaster
}
