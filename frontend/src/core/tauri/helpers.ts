import { InvokeArgs, invoke as invokeTauri } from "@tauri-apps/api/core";
import { Command } from "./types";

export const invoke = <T extends InvokeArgs, V = any>(cmd: Command, args?: T) => invokeTauri(cmd, args) as Promise<V>;
