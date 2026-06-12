import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useAuthStore } from '@/features/auth/presentation/store/authStore';
import { useDashboardStore } from '@/features/dashboard/presentation/store/dashboardStore';

import { getStarterSuggestions, resolveAgentQuery } from '../../application/AgentIntentEngine';
import type { AgentContext, AgentMessage } from '../../domain/entities/AgentTypes';

function createAssistantMessage(
  text: string,
  actions?: AgentMessage['actions'],
  suggestions?: string[],
): AgentMessage {
  return {
    id: uuidv4(),
    role: 'assistant',
    text,
    actions,
    suggestions,
  };
}

export function useAgentAssistant() {
  const usuario = useAuthStore((s) => s.usuarioActual);
  const rol = useAuthStore((s) => s.rolActual);
  const tieneAcceso = useAuthStore((s) => s.tieneAcceso);
  const scopeLabel = useDashboardStore((s) => s.scopeLabel);
  const parroquiaId = useDashboardStore((s) => s.parroquiaId);

  const context = useMemo((): AgentContext | null => {
    if (!usuario || !rol) {
      return null;
    }

    return {
      orgId: usuario.organizacionId,
      scopeLabel: scopeLabel || 'tu organización',
      rolNombre: rol.nombre,
      parroquiaId,
      tieneAcceso,
    };
  }, [parroquiaId, rol, scopeLabel, tieneAcceso, usuario]);

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const welcomeSent = useRef(false);

  useEffect(() => {
    if (!context || welcomeSent.current) {
      return;
    }

    welcomeSent.current = true;
    const welcome = resolveAgentQuery('', context);
    setMessages([createAssistantMessage(welcome.text, welcome.actions, welcome.suggestions)]);
  }, [context]);

  const starterSuggestions = useMemo(
    () => (context ? getStarterSuggestions(context) : []),
    [context],
  );

  const submitQuery = useCallback(
    (rawQuery: string) => {
      const query = rawQuery.trim();
      if (!query || !context) {
        return;
      }

      const userMessage: AgentMessage = {
        id: uuidv4(),
        role: 'user',
        text: query,
      };

      const reply = resolveAgentQuery(query, context);
      const assistantMessage = createAssistantMessage(reply.text, reply.actions, reply.suggestions);

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
    },
    [context],
  );

  return {
    context,
    messages,
    starterSuggestions,
    submitQuery,
  };
}
