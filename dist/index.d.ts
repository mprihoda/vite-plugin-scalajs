import type { Plugin as VitePlugin } from "vite";
export interface ScalaJSPluginOptions {
    cwd?: string;
    projectID?: string;
    uriPrefix?: string;
    launcher?: string;
}
export default function scalaJSPlugin(options?: ScalaJSPluginOptions): VitePlugin;
