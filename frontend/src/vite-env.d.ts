/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_PUBLIC_SERVER_URL: string;
	readonly VITE_VERSION: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
