export declare const config: {
    tmdbApiKey: string;
    vixsrcDomain: string;
    vixcloudDomain: string;
};
export declare const AVAILABLE_LANGUAGES: {
    code: string;
    label: string;
    flag: string;
}[];
export interface UserConfig {
    vixEnabled: boolean;
    vixLang: string;
    cinemacityEnabled: boolean;
    cinemacityLang: string;
    animeunityEnabled: boolean;
}
export declare const DEFAULT_CONFIG: UserConfig;
export declare function encodeConfig(cfg: UserConfig): string;
export declare function decodeConfig(token: string): UserConfig;
//# sourceMappingURL=config.d.ts.map