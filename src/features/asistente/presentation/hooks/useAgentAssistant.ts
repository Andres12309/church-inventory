import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';

import { useAuthStore } from '@/features/auth/presentation/store/authStore';
import { useBienesUseCases } from '@/features/bienes/presentation/hooks/useBienesUseCases';
import { useDashboardStore } from '@/features/dashboard/presentation/store/dashboardStore';
import { useOfrendasUseCases } from '@/features/ofrendas/presentation/hooks/useOfrendasUseCases';
import { useOrganizacionesUseCases } from '@/features/organizaciones/presentation/hooks/useOrganizacionesUseCases';
import { useReportesUseCases } from '@/features/reportes/presentation/hooks/useReportesUseCases';
import { useUsuariosUseCases } from '@/features/usuarios/presentation/hooks/useUsuariosUseCases';
import { runSerializedSqlite } from '@/shared/infrastructure/database/sqliteRetry';

import type { AgentConversationDeps } from '../../application/AgentConversationDeps';
import { buildWelcomeTurn, handleConversationTurn } from '../../application/AgentConversationEngine';
import type {
  AgentComposerState,
  AgentContext,
  AgentMessage,
  AgentReply,
  ConversationState,
} from '../../domain/entities/AgentTypes';
import { IDLE_STATE } from '../../domain/entities/AgentTypes';

const DEFAULT_COMPOSER: AgentComposerState = {
  enabled: false,
  placeholder: 'Elige una opción…',
  expect: 'option',
};

function toMessage(reply: AgentReply): AgentMessage {
  return {
    id: uuidv4(),
    role: 'assistant',
    text: reply.text,
    options: reply.options,
  };
}

export function useAgentAssistant() {
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuarioActual);
  const rol = useAuthStore((s) => s.rolActual);
  const permissionService = useAuthStore((s) => s.permissionService);
  const tieneAcceso = useAuthStore((s) => s.tieneAcceso);
  const scopeLabel = useDashboardStore((s) => s.scopeLabel);
  const parroquiaId = useDashboardStore((s) => s.parroquiaId);

  const { crearCapilla } = useOrganizacionesUseCases();
  const { consultarFinanzas, registrarRecaudacion } = useOfrendasUseCases();
  const { consultarInventario, gestionarBien } = useBienesUseCases();
  const { crearUsuarioLocal, obtenerOpcionesRegistroUsuario } = useUsuariosUseCases();
  const { generarReporteXlsx, compartirReporte } = useReportesUseCases();

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

  const deps = useMemo((): AgentConversationDeps | null => {
    if (!usuario || !rol || !permissionService) {
      return null;
    }
    return {
      usuario,
      rol,
      permissionService,
      crearCapilla,
      registrarRecaudacion,
      consultarFinanzas,
      gestionarBien,
      consultarInventario,
      crearUsuarioLocal,
      obtenerOpcionesRegistroUsuario,
      generarReporteXlsx,
      compartirReporte,
    };
  }, [
    compartirReporte,
    consultarFinanzas,
    consultarInventario,
    crearCapilla,
    crearUsuarioLocal,
    generarReporteXlsx,
    gestionarBien,
    obtenerOpcionesRegistroUsuario,
    permissionService,
    registrarRecaudacion,
    rol,
    usuario,
  ]);

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [conversationState, setConversationState] = useState<ConversationState>(IDLE_STATE);
  const conversationStateRef = useRef<ConversationState>(IDLE_STATE);
  const [composer, setComposer] = useState<AgentComposerState>(DEFAULT_COMPOSER);
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);
  const welcomeSent = useRef(false);

  useEffect(() => {
    if (!context || welcomeSent.current) {
      return;
    }

    welcomeSent.current = true;
    const welcome = buildWelcomeTurn(context);
    setMessages([toMessage(welcome.replies[0])]);
    setConversationState(welcome.state);
    conversationStateRef.current = welcome.state;
    setComposer(welcome.composer);
  }, [context]);

  const applyTurn = useCallback(
    (result: Awaited<ReturnType<typeof handleConversationTurn>>) => {
    setConversationState(result.state);
    conversationStateRef.current = result.state;
    setComposer(result.composer);

      setMessages((prev) => {
        const next = [...prev];
        if (result.userLabel) {
          next.push({
            id: uuidv4(),
            role: 'user',
            text: result.userLabel,
          });
        }
        for (const reply of result.replies) {
          next.push(toMessage(reply));
        }
        return next;
      });

      if (result.navigateTo) {
        router.push(result.navigateTo);
      }
    },
    [router],
  );

  const processInput = useCallback(
    async (input: Parameters<typeof handleConversationTurn>[1]) => {
      if (!context || !deps || isProcessingRef.current) {
        return;
      }

      isProcessingRef.current = true;
      setIsProcessing(true);
      try {
        const result = await runSerializedSqlite(() =>
          handleConversationTurn(
            conversationStateRef.current,
            input,
            context,
            deps,
          ),
        );
        applyTurn(result);
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    },
    [applyTurn, context, deps],
  );

  const submitQuery = useCallback(
    (rawQuery: string) => {
      const text = rawQuery.trim();
      if (!text) {
        return;
      }
      void processInput({ kind: 'text', text });
    },
    [processInput],
  );

  const selectOption = useCallback(
    (optionId: string, label: string) => {
      void processInput({ kind: 'option', optionId, label });
    },
    [processInput],
  );

  return {
    context,
    messages,
    composer,
    isProcessing,
    submitQuery,
    selectOption,
  };
}
