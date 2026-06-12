import type { Href } from "expo-router";

import type { ModuloCodigoValue } from "@/shared/infrastructure/database/schema";

export type AgentFlowOption = {
  id: string;
  label: string;
  icon?: string;
};

export type AgentComposerState = {
  enabled: boolean;
  placeholder: string;
  expect: "text" | "option";
};

export type AgentMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  options?: AgentFlowOption[];
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
  options?: AgentFlowOption[];
};

export type FlowId =
  | "idle"
  | "capilla"
  | "ingreso"
  | "gasto"
  | "bien"
  | "navegar"
  | "usuario"
  | "exportar";

export type ConversationState = {
  flow: FlowId;
  step: string;
  data: Record<string, unknown>;
};

export const IDLE_STATE: ConversationState = {
  flow: "idle",
  step: "menu",
  data: {},
};

export type ConversationInput =
  | { kind: "text"; text: string }
  | { kind: "option"; optionId: string; label: string };

export type ConversationTurnResult = {
  userLabel?: string;
  replies: AgentReply[];
  state: ConversationState;
  composer: AgentComposerState;
  navigateTo?: Href;
};
