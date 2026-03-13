import { IPTVChannel } from "./schema";
import { channelsByCountry } from "./iptv-channels";

export type { IPTVChannel } from "./schema";

export function getChannelsByCountry(country: string, category?: string | null): IPTVChannel[] {
    const arr = (channelsByCountry as Record<string, IPTVChannel[]>)[country] || [];
    if (!category || category === 'all-channels') return arr;
    const lower = category.toLowerCase();
    return arr.filter((ch) => (ch.category || '').toLowerCase() === lower);
}

export function getChannelsByCategory(category: string): IPTVChannel[] {
    const out: IPTVChannel[] = [];
    const lower = category.toLowerCase();
    for (const countryArr of Object.values(channelsByCountry)) {
        for (const ch of countryArr) {
            if ((ch.category || '').toLowerCase() === lower) out.push(ch);
        }
    }
    return out;
}

export function normalizeYouTubeUrl(u: string): string {
    try {
        const url = new URL(u);
        const host = url.hostname.toLowerCase();
        if (host.includes('youtu.be')) {
            const id = url.pathname.replace(/^\//, '');
            if (id) return `https://www.youtube.com/watch?v=${id}`;
        }
        if (host.includes('youtube')) {
            const v = url.searchParams.get('v');
            if (v) return `https://www.youtube.com/watch?v=${v}`;
        }
    } catch (e) {
        // ignore and return original
    }
    return u;
}
