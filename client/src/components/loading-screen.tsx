import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';

interface LoadingScreenProps {
    isLoading: boolean;
}

export function LoadingScreen({ isLoading }: LoadingScreenProps) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (!isLoading) {
            const timer = setTimeout(() => setVisible(false), 500); // Wait for fade-out to complete
            return () => clearTimeout(timer);
        }
    }, [isLoading]);

    if (!visible) {
        return null;
    }

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center bg-black transition-opacity duration-500 ${isLoading ? 'opacity-100' : 'opacity-0'
                }`}
            aria-hidden={!isLoading}
        >
            <div className="flex flex-col items-center gap-4">
                <Loader className="h-8 w-8 animate-spin text-blue-400" />
                <p className="text-sm text-slate-400">Initializing Globe...</p>
            </div>
        </div>
    );
}
