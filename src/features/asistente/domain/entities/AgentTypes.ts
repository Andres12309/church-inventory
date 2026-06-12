import type { Href } from "expo-router";

import type { ModuloCodigoValue } from "@/shared/infrastructure/database/schema";

export type AgentAction = {
  id: string;
  label: string;
  icon: string;
  href: Href;
  module?: ModuloCodigoValue;
};

export type AgentMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  actions?: AgentAction[];
  suggestions?: string[];
};

export type AgentContext = {
  orgId: string;
  scopeLabel: string;
  rolNombre: string;
  parroquiaId: string | null;
  tieneAcceso: (codigo: ModuloCodigoValue) => boolean;
};

export type AgentReply = {
  text: string;
  actions: AgentAction[];
  suggestions: string[];
};
