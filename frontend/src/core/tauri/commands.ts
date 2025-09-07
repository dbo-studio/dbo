import { invoke } from "./helpers";
import { Command } from "./types";

export const commands = {
  getBackendHost: (): Promise<string> => invoke(Command.getBackendHost),
};

