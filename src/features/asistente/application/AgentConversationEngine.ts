import type { Href } from 'expo-router';

import { obtenerFechaHoyIso } from '@/features/ofrendas/application/services/OfrendaAccessPolicy';
import { FinanzaNaturaleza } from '@/features/ofrendas/domain/entities/FinanzaNaturaleza';
import { BIENES_ROUTES } from '@/features/bienes/presentation/routes';
import { OFRENDAS_ROUTES } from '@/features/ofrendas/presentation/routes';
import { ORGANIZACIONES_ROUTES } from '@/features/organizaciones/presentation/routes';
import { REPORTES_ROUTES } from '@/features/reportes/presentation/routes';
import { resolverCapacidadesReportes } from '@/features/reportes/application/services/ReportesCapabilities';
import type { ReporteTipo } from '@/features/reportes/domain/entities/ReporteGenerado';
import { SYNC_ROUTES } from '@/features/sync/presentation/routes';
import { USUARIOS_ROUTES } from '@/features/usuarios/presentation/routes';
import { BienEstado, ModuloCodigo } from '@/shared/infrastructure/database/schema';
import { withSqliteLockRetry } from '@/shared/infrastructure/database/sqliteRetry';

import type { AgentConversationDeps } from './AgentConversationDeps';
import { matchCatalogAction } from './AgentActionCatalog';
import type {
  AgentContext,
  AgentFlowOption,
  AgentReply,
  AgentComposerState,
  ConversationInput,
  ConversationState,
  ConversationTurnResult,
} from '../domain/entities/AgentTypes';
import { IDLE_STATE } from '../domain/entities/AgentTypes';

const OPT = {
  cancel: 'flow:cancel',
  confirm: 'flow:confirm',
  skip: 'flow:skip',
  menu: 'flow:menu',
  fechaHoy: 'fecha:hoy',
  navGo: 'nav:go',
  shareReporte: 'export:share',
  periodoTodo: 'export:periodo-todo',
  periodoRango: 'export:periodo-rango',
} as const;

const REPORTE_TIPO_LABEL: Record<ReporteTipo, string> = {
  consolidado: 'Consolidado (inventario + finanzas)',
  bienes: 'Inventario de bienes',
  ofrendas: 'Finanzas / ofrendas',
};

function textComposer(placeholder: string): AgentComposerState {
  return { enabled: true, placeholder, expect: 'text' };
}

function optionComposer(placeholder = 'Elige una opción ↑'): AgentComposerState {
  return { enabled: false, placeholder, expect: 'option' };
}

function reply(text: string, options?: AgentFlowOption[]): AgentReply {
  return { text, options };
}

function turn(
  partial: Omit<ConversationTurnResult, 'replies'> & { reply: AgentReply | AgentReply[] },
): ConversationTurnResult {
  const replies = Array.isArray(partial.reply) ? partial.reply : [partial.reply];
  return {
    userLabel: partial.userLabel,
    replies,
    state: partial.state,
    composer: partial.composer,
    navigateTo: partial.navigateTo,
  };
}

function cancelToMenu(ctx: AgentContext): ConversationTurnResult {
  return turn({
    reply: reply('De acuerdo, volvemos al menú. **¿Qué quieres hacer?**', buildMainMenuOptions(ctx)),
    state: IDLE_STATE,
    composer: optionComposer(),
  });
}

function buildMainMenuOptions(ctx: AgentContext): AgentFlowOption[] {
  const items: AgentFlowOption[] = [];

  if (ctx.tieneAcceso(ModuloCodigo.OFRENDAS)) {
    items.push(
      { id: 'start:ingreso', label: 'Registrar ingreso', icon: '💰' },
      { id: 'start:gasto', label: 'Registrar gasto', icon: '📤' },
      { id: 'start:nav:finanzas', label: 'Ver finanzas', icon: '📈' },
    );
  }
  if (ctx.tieneAcceso(ModuloCodigo.INVENTARIO_BIENES)) {
    items.push(
      { id: 'start:bien', label: 'Registrar bien', icon: '📦' },
      { id: 'start:nav:inventario', label: 'Ver inventario', icon: '📋' },
    );
  }
  if (ctx.tieneAcceso(ModuloCodigo.ORGANIZACIONES) && ctx.parroquiaId) {
    items.push({ id: 'start:capilla', label: 'Nueva capilla', icon: '⛪' });
  }
  if (ctx.tieneAcceso(ModuloCodigo.ORGANIZACIONES)) {
    items.push({ id: 'start:nav:organizaciones', label: 'Organizaciones', icon: '🏛️' });
  }
  if (ctx.tieneAcceso(ModuloCodigo.USUARIOS)) {
    items.push({ id: 'start:usuario', label: 'Nuevo usuario', icon: '👤' });
  }
  if (ctx.tieneAcceso(ModuloCodigo.REPORTES)) {
    items.push({ id: 'start:exportar', label: 'Exportar Excel', icon: '📊' });
    items.push({ id: 'start:nav:reportes', label: 'Ver reportes', icon: '📁' });
  }
  if (ctx.tieneAcceso(ModuloCodigo.SYNC)) {
    items.push({ id: 'start:nav:sync', label: 'Sincronizar P2P', icon: '↻' });
  }
  items.push({ id: 'start:nav:ajustes', label: 'Ajustes', icon: '⚙️' });

  return items;
}

export function buildWelcomeTurn(ctx: AgentContext): ConversationTurnResult {
  return turn({
    reply: reply(
      `Hola 👋 Soy tu asistente en **${ctx.scopeLabel}**.\n\nElige una opción para empezar — te iré guiando paso a paso, como en WhatsApp.`,
      buildMainMenuOptions(ctx),
    ),
    state: IDLE_STATE,
    composer: optionComposer('También puedes escribir: «registrar gasto», «nueva capilla»…'),
  });
}

const NAV_TARGETS: Record<string, { label: string; href: (ctx: AgentContext) => Href }> = {
  inventario: { label: 'Inventario', href: (ctx) => BIENES_ROUTES.listado(ctx.orgId) },
  finanzas: { label: 'Finanzas', href: (ctx) => OFRENDAS_ROUTES.dashboard(ctx.orgId) },
  organizaciones: { label: 'Organizaciones', href: () => ORGANIZACIONES_ROUTES.dashboard },
  reportes: { label: 'Reportes', href: () => REPORTES_ROUTES.listado },
  sync: { label: 'Sincronización P2P', href: () => SYNC_ROUTES.dashboard },
  'usuarios-nuevo': { label: 'Nuevo usuario', href: () => USUARIOS_ROUTES.nuevo },
  ajustes: { label: 'Ajustes', href: () => '/(protected)/(tabs)/ajustes' as Href },
};

function startNavigateFlow(targetKey: string, ctx: AgentContext): ConversationTurnResult {
  const target = NAV_TARGETS[targetKey];
  if (!target) {
    return cancelToMenu(ctx);
  }
  return turn({
    reply: reply(`¿Abro **${target.label}** ahora?`, [
      { id: OPT.navGo, label: 'Sí, abrir', icon: '✅' },
      { id: OPT.cancel, label: 'Cancelar', icon: '✕' },
    ]),
    state: { flow: 'navegar', step: 'confirm', data: { targetKey } },
    composer: optionComposer(),
  });
}

async function startFlowFromOption(
  optionId: string,
  ctx: AgentContext,
  deps: AgentConversationDeps,
): Promise<ConversationTurnResult | null> {
  if (optionId === 'start:capilla') {
    if (!ctx.parroquiaId) {
      return turn({
        reply: reply('No tienes una parroquia asignada para crear capillas.', [
          { id: OPT.menu, label: 'Volver al menú', icon: '🏠' },
        ]),
        state: IDLE_STATE,
        composer: optionComposer(),
      });
    }
    return turn({
      reply: reply(
        'Perfecto, vamos a **registrar una capilla**.\n\n¿Cómo se llama? (mínimo 3 letras)',
      ),
      state: { flow: 'capilla', step: 'nombre', data: { parentId: ctx.parroquiaId } },
      composer: textComposer('Nombre de la capilla…'),
    });
  }

  if (optionId === 'start:ingreso') {
    return turn({
      reply: reply('**Ingreso** 💰\n\n¿Cuánto fue el monto en USD? (ej. 150.50)'),
      state: {
        flow: 'ingreso',
        step: 'monto',
        data: { naturaleza: FinanzaNaturaleza.INGRESO },
      },
      composer: textComposer('Monto en USD…'),
    });
  }

  if (optionId === 'start:gasto') {
    return turn({
      reply: reply('**Gasto** 📤\n\n¿Cuánto fue el monto en USD? (ej. 45.00)'),
      state: {
        flow: 'gasto',
        step: 'monto',
        data: { naturaleza: FinanzaNaturaleza.EGRESO },
      },
      composer: textComposer('Monto en USD…'),
    });
  }

  if (optionId === 'start:bien') {
    return turn({
      reply: reply('**Registrar bien** 📦\n\n¿Cómo se llama el bien?'),
      state: { flow: 'bien', step: 'nombre', data: {} },
      composer: textComposer('Nombre del bien…'),
    });
  }

  if (optionId.startsWith('start:nav:')) {
    const key = optionId.replace('start:nav:', '');
    return startNavigateFlow(key, ctx);
  }

  if (optionId === 'start:usuario') {
    return startUsuarioFlow(ctx, deps);
  }

  if (optionId === 'start:exportar') {
    return startExportarFlow(ctx, deps);
  }

  return null;
}

async function startUsuarioFlow(
  ctx: AgentContext,
  deps: AgentConversationDeps,
): Promise<ConversationTurnResult> {
  try {
    const opciones = await withSqliteLockRetry(() =>
      deps.obtenerOpcionesRegistroUsuario.execute(
        deps.usuario,
        deps.rol,
        deps.permissionService,
      ),
    );

    if (opciones.roles.length === 0) {
      return turn({
        reply: reply('No hay roles disponibles para asignar con tu perfil.', [
          { id: OPT.menu, label: 'Volver al menú', icon: '🏠' },
        ]),
        state: IDLE_STATE,
        composer: optionComposer(),
      });
    }

    const roleOptions = opciones.roles.map((rol) => ({
      id: `rol:${rol.id}`,
      label: rol.nombre,
      icon: '🎭',
    }));

    const orgsByRole: Record<string, { id: string; nombre: string }[]> = {};
    for (const rol of opciones.roles) {
      orgsByRole[rol.id] = (opciones.organizacionesPorRol[rol.id] ?? []).map((org) => ({
        id: org.id,
        nombre: org.nombre,
      }));
    }

    return turn({
      reply: reply(
        '**Nuevo usuario** 👤\n\nPrimero elige el **rol** que tendrá el acceso local:',
        roleOptions,
      ),
      state: {
        flow: 'usuario',
        step: 'rol',
        data: { orgsByRole },
      },
      composer: optionComposer('Elige un rol ↑'),
    });
  } catch (error) {
    return turn({
      reply: reply(
        `❌ ${error instanceof Error ? error.message : 'No se pudieron cargar las opciones'}`,
        [{ id: OPT.menu, label: 'Volver al menú', icon: '🏠' }],
      ),
      state: IDLE_STATE,
      composer: optionComposer(),
    });
  }
}

async function startExportarFlow(
  ctx: AgentContext,
  deps: AgentConversationDeps,
): Promise<ConversationTurnResult> {
  const caps = resolverCapacidadesReportes(deps.permissionService);

  if (!caps.puedeExportar || caps.tiposExportacion.length === 0) {
    return turn({
      reply: reply('No tienes permiso para exportar reportes con tu perfil actual.', [
        { id: OPT.menu, label: 'Volver al menú', icon: '🏠' },
      ]),
      state: IDLE_STATE,
      composer: optionComposer(),
    });
  }

  const tipoOptions = caps.tiposExportacion.map((tipo) => ({
    id: `reporte-tipo:${tipo}`,
    label: REPORTE_TIPO_LABEL[tipo],
    icon: '📊',
  }));

  return turn({
    reply: reply(
      `**Exportar Excel** 📊\n\nAlcance: **${ctx.scopeLabel}** (${caps.etiquetaAlcance}).\n\n¿Qué reporte quieres generar?`,
      tipoOptions,
    ),
    state: { flow: 'exportar', step: 'tipo', data: {} },
    composer: optionComposer('Elige tipo de reporte ↑'),
  });
}

function parseMonto(text: string): number | null {
  const normalized = text.replace(',', '.').replace(/[^\d.]/g, '');
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.round(value * 100) / 100;
}

async function handleCapillaStep(
  state: ConversationState,
  input: ConversationInput,
  ctx: AgentContext,
  deps: AgentConversationDeps,
): Promise<ConversationTurnResult> {
  const data = { ...state.data };

  if (input.kind === 'option') {
    if (input.optionId === OPT.cancel || input.optionId === OPT.menu) {
      return cancelToMenu(ctx);
    }
    if (input.optionId === OPT.confirm && state.step === 'confirm') {
      try {
        const capilla = await withSqliteLockRetry(() =>
          deps.crearCapilla.execute(
            {
              parentId: String(data.parentId),
              nombre: String(data.nombre),
              sectorReferencia: String(data.sectorReferencia),
              ciudad: data.ciudad ? String(data.ciudad) : undefined,
            },
            deps.usuario,
            deps.rol,
            deps.permissionService,
          ),
        );
        return turn({
          userLabel: input.label,
          reply: reply(
            `✅ Capilla **${capilla.nombre}** registrada correctamente.\n\n¿Qué más necesitas?`,
            buildMainMenuOptions(ctx),
          ),
          state: IDLE_STATE,
          composer: optionComposer(),
        });
      } catch (error) {
        return turn({
          userLabel: input.label,
          reply: reply(
            `❌ ${error instanceof Error ? error.message : 'No se pudo crear la capilla'}`,
            [
              { id: OPT.confirm, label: 'Reintentar', icon: '🔄' },
              { id: OPT.cancel, label: 'Cancelar', icon: '✕' },
            ],
          ),
          state: { ...state, step: 'confirm' },
          composer: optionComposer(),
        });
      }
    }
  }

  if (input.kind === 'text') {
    const text = input.text.trim();

    if (state.step === 'nombre') {
      if (text.length < 3) {
        return turn({
          userLabel: text,
          reply: reply('El nombre debe tener **al menos 3 caracteres**. Inténtalo de nuevo.'),
          state,
          composer: textComposer('Nombre de la capilla…'),
        });
      }
      data.nombre = text;
      return turn({
        userLabel: text,
        reply: reply('¿Cuál es el **sector o referencia**? (barrio, calle, zona)'),
        state: { flow: 'capilla', step: 'sector', data },
        composer: textComposer('Sector o dirección de referencia…'),
      });
    }

    if (state.step === 'sector') {
      if (text.length < 3) {
        return turn({
          userLabel: text,
          reply: reply('Indica un sector o referencia un poco más descriptivo (mín. 3 caracteres).'),
          state,
          composer: textComposer('Sector o dirección…'),
        });
      }
      data.sectorReferencia = text;
      return turn({
        userLabel: text,
        reply: reply('¿En qué **ciudad** queda? (opcional — puedes omitir)', [
          { id: OPT.skip, label: 'Omitir ciudad', icon: '⏭️' },
        ]),
        state: { flow: 'capilla', step: 'ciudad', data },
        composer: textComposer('Ciudad (opcional)…'),
      });
    }

    if (state.step === 'ciudad') {
      data.ciudad = text;
      const summary = `📋 **Resumen capilla**\n• Nombre: ${data.nombre}\n• Sector: ${data.sectorReferencia}\n• Ciudad: ${text}`;
      return turn({
        userLabel: text,
        reply: reply(`${summary}\n\n¿Confirmas el registro?`, [
          { id: OPT.confirm, label: 'Sí, registrar', icon: '✅' },
          { id: OPT.cancel, label: 'Cancelar', icon: '✕' },
        ]),
        state: { flow: 'capilla', step: 'confirm', data },
        composer: optionComposer(),
      });
    }
  }

  if (input.kind === 'option' && input.optionId === OPT.skip && state.step === 'ciudad') {
    const summary = `📋 **Resumen capilla**\n• Nombre: ${data.nombre}\n• Sector: ${data.sectorReferencia}`;
    return turn({
      userLabel: input.label,
      reply: reply(`${summary}\n\n¿Confirmas el registro?`, [
        { id: OPT.confirm, label: 'Sí, registrar', icon: '✅' },
        { id: OPT.cancel, label: 'Cancelar', icon: '✕' },
      ]),
      state: { flow: 'capilla', step: 'confirm', data },
      composer: optionComposer(),
    });
  }

  return turn({
    reply: reply('No entendí. Usa las opciones o escribe tu respuesta.'),
    state,
    composer: state.step === 'confirm' ? optionComposer() : textComposer('Tu respuesta…'),
  });
}

async function loadTipoOptions(
  deps: AgentConversationDeps,
  naturaleza: string,
): Promise<AgentFlowOption[]> {
  const tipos = await withSqliteLockRetry(() =>
    deps.consultarFinanzas.listarTiposActividad(deps.permissionService),
  );
  return tipos
    .filter((t) => t.naturaleza === naturaleza && t.activo)
    .map((t) => ({ id: `tipo:${t.id}`, label: t.nombre, icon: '🏷️' }));
}

async function handleFinanzaStep(
  flow: 'ingreso' | 'gasto',
  state: ConversationState,
  input: ConversationInput,
  ctx: AgentContext,
  deps: AgentConversationDeps,
): Promise<ConversationTurnResult> {
  const data = { ...state.data };
  const naturaleza =
    flow === 'gasto' ? FinanzaNaturaleza.EGRESO : FinanzaNaturaleza.INGRESO;
  data.naturaleza = naturaleza;

  if (input.kind === 'option') {
    if (input.optionId === OPT.cancel || input.optionId === OPT.menu) {
      return cancelToMenu(ctx);
    }

    if (input.optionId === OPT.fechaHoy && state.step === 'fecha') {
      data.fecha = obtenerFechaHoyIso();
      return turn({
        userLabel: input.label,
        reply: reply('¿Alguna **nota o descripción**? (opcional)', [
          { id: OPT.skip, label: 'Sin nota', icon: '⏭️' },
        ]),
        state: { flow, step: 'nota', data },
        composer: textComposer('Nota (opcional)…'),
      });
    }

    if (input.optionId === OPT.skip && state.step === 'nota') {
      data.descripcion = null;
      const label = flow === 'gasto' ? 'gasto' : 'ingreso';
      return turn({
        userLabel: input.label,
        reply: reply(buildFinanzaSummary(data, label), [
          { id: OPT.confirm, label: 'Sí, guardar', icon: '✅' },
          { id: OPT.cancel, label: 'Cancelar', icon: '✕' },
        ]),
        state: { flow, step: 'confirm', data },
        composer: optionComposer(),
      });
    }

    if (input.optionId.startsWith('tipo:') && state.step === 'tipo') {
      data.tipoActividadId = input.optionId.replace('tipo:', '');
      data.tipoNombre = input.label;
      return turn({
        userLabel: input.label,
        reply: reply('¿Qué **fecha** tiene este movimiento?', [
          { id: OPT.fechaHoy, label: 'Hoy', icon: '📅' },
          { id: 'fecha:otra', label: 'Otra fecha', icon: '✏️' },
        ]),
        state: { flow, step: 'fecha', data },
        composer: optionComposer(),
      });
    }

    if (input.optionId === 'fecha:otra' && state.step === 'fecha') {
      return turn({
        userLabel: input.label,
        reply: reply('Escribe la fecha en formato **AAAA-MM-DD** (ej. 2026-06-11)'),
        state: { flow, step: 'fecha-texto', data },
        composer: textComposer('AAAA-MM-DD…'),
      });
    }

    if (input.optionId === OPT.confirm && state.step === 'confirm') {
      try {
        await withSqliteLockRetry(() =>
          deps.registrarRecaudacion.guardar(
            {
              organizacionId: ctx.orgId,
              tipoActividadId: String(data.tipoActividadId),
              naturaleza,
              monto: Number(data.monto),
              fecha: String(data.fecha),
              descripcion: data.descripcion ? String(data.descripcion) : null,
            },
            deps.usuario,
            deps.rol,
            deps.permissionService,
          ),
        );
        const label = flow === 'gasto' ? 'Gasto' : 'Ingreso';
        return turn({
          userLabel: input.label,
          reply: reply(
            `✅ **${label}** registrado por **$${Number(data.monto).toFixed(2)}**.\n\n¿Algo más?`,
            buildMainMenuOptions(ctx),
          ),
          state: IDLE_STATE,
          composer: optionComposer(),
        });
      } catch (error) {
        return turn({
          userLabel: input.label,
          reply: reply(
            `❌ ${error instanceof Error ? error.message : 'No se pudo guardar'}`,
            [
              { id: OPT.confirm, label: 'Reintentar', icon: '🔄' },
              { id: OPT.cancel, label: 'Cancelar', icon: '✕' },
            ],
          ),
          state: { ...state, step: 'confirm' },
          composer: optionComposer(),
        });
      }
    }
  }

  if (input.kind === 'text') {
    const text = input.text.trim();

    if (state.step === 'monto') {
      const monto = parseMonto(text);
      if (monto === null) {
        return turn({
          userLabel: text,
          reply: reply('Escribe un monto válido mayor a 0 (ej. **25.50**)'),
          state,
          composer: textComposer('Monto en USD…'),
        });
      }
      data.monto = monto;
      const tipoOptions = await loadTipoOptions(deps, naturaleza);
      if (tipoOptions.length === 0) {
        return turn({
          userLabel: text,
          reply: reply(
            `No hay tipos de ${flow === 'gasto' ? 'gasto' : 'ingreso'} configurados. Crea tipos en Finanzas primero.`,
            [
              { id: 'start:nav:finanzas', label: 'Ir a Finanzas', icon: '📈' },
              { id: OPT.menu, label: 'Menú', icon: '🏠' },
            ],
          ),
          state: IDLE_STATE,
          composer: optionComposer(),
        });
      }
      return turn({
        userLabel: text,
        reply: reply('¿Qué **tipo de actividad** es?', tipoOptions),
        state: { flow, step: 'tipo', data },
        composer: optionComposer('Elige un tipo ↑'),
      });
    }

    if (state.step === 'fecha-texto') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return turn({
          userLabel: text,
          reply: reply('Formato inválido. Usa **AAAA-MM-DD** (ej. 2026-06-11)'),
          state,
          composer: textComposer('AAAA-MM-DD…'),
        });
      }
      data.fecha = text;
      return turn({
        userLabel: text,
        reply: reply('¿Alguna **nota**? (opcional)', [{ id: OPT.skip, label: 'Sin nota', icon: '⏭️' }]),
        state: { flow, step: 'nota', data },
        composer: textComposer('Nota (opcional)…'),
      });
    }

    if (state.step === 'nota') {
      data.descripcion = text;
      const label = flow === 'gasto' ? 'gasto' : 'ingreso';
      return turn({
        userLabel: text,
        reply: reply(buildFinanzaSummary(data, label), [
          { id: OPT.confirm, label: 'Sí, guardar', icon: '✅' },
          { id: OPT.cancel, label: 'Cancelar', icon: '✕' },
        ]),
        state: { flow, step: 'confirm', data },
        composer: optionComposer(),
      });
    }
  }

  return turn({
    reply: reply('Elige una opción o escribe tu respuesta.'),
    state,
    composer: optionComposer(),
  });
}

function buildFinanzaSummary(data: Record<string, unknown>, label: string): string {
  return `📋 **Resumen ${label}**\n• Monto: $${Number(data.monto).toFixed(2)}\n• Tipo: ${data.tipoNombre ?? '—'}\n• Fecha: ${data.fecha ?? '—'}${data.descripcion ? `\n• Nota: ${data.descripcion}` : ''}\n\n¿Guardamos?`;
}

async function handleBienStep(
  state: ConversationState,
  input: ConversationInput,
  ctx: AgentContext,
  deps: AgentConversationDeps,
): Promise<ConversationTurnResult> {
  const data = { ...state.data };

  if (input.kind === 'option') {
    if (input.optionId === OPT.cancel || input.optionId === OPT.menu) {
      return cancelToMenu(ctx);
    }

    if (input.optionId.startsWith('cat:') && state.step === 'categoria') {
      data.categoriaId = input.optionId.replace('cat:', '');
      data.categoriaNombre = input.label;
      return turn({
        userLabel: input.label,
        reply: reply('¿En qué **estado** está el bien?', [
          { id: `estado:${BienEstado.EXCELENTE}`, label: 'Excelente', icon: '✨' },
          { id: `estado:${BienEstado.BUENO}`, label: 'Bueno', icon: '👍' },
          { id: `estado:${BienEstado.REGULAR}`, label: 'Regular', icon: '➖' },
          { id: `estado:${BienEstado.MALO}`, label: 'Malo', icon: '⚠️' },
        ]),
        state: { flow: 'bien', step: 'estado', data },
        composer: optionComposer(),
      });
    }

    if (input.optionId.startsWith('estado:') && state.step === 'estado') {
      data.estado = input.optionId.replace('estado:', '');
      data.estadoLabel = input.label;
      return turn({
        userLabel: input.label,
        reply: reply(
          `📋 **Resumen bien**\n• Nombre: ${data.nombre}\n• Categoría: ${data.categoriaNombre}\n• Estado: ${data.estadoLabel}\n\n¿Confirmas?`,
          [
            { id: OPT.confirm, label: 'Sí, registrar', icon: '✅' },
            { id: OPT.cancel, label: 'Cancelar', icon: '✕' },
          ],
        ),
        state: { flow: 'bien', step: 'confirm', data },
        composer: optionComposer(),
      });
    }

    if (input.optionId === OPT.confirm && state.step === 'confirm') {
      try {
        const bien = await withSqliteLockRetry(() =>
          deps.gestionarBien.guardar(
            {
              organizacionId: ctx.orgId,
              categoriaId: String(data.categoriaId),
              nombre: String(data.nombre),
              estado: data.estado as typeof BienEstado.BUENO,
              cantidad: 1,
              descripcion: null,
            },
            deps.usuario,
            deps.rol,
            deps.permissionService,
          ),
        );
        return turn({
          userLabel: input.label,
          reply: reply(
            `✅ Bien **${bien.nombre}** registrado.\n\n¿Qué sigue?`,
            buildMainMenuOptions(ctx),
          ),
          state: IDLE_STATE,
          composer: optionComposer(),
        });
      } catch (error) {
        return turn({
          userLabel: input.label,
          reply: reply(
            `❌ ${error instanceof Error ? error.message : 'No se pudo registrar'}`,
            [
              { id: OPT.confirm, label: 'Reintentar', icon: '🔄' },
              { id: OPT.cancel, label: 'Cancelar', icon: '✕' },
            ],
          ),
          state: { ...state, step: 'confirm' },
          composer: optionComposer(),
        });
      }
    }
  }

  if (input.kind === 'text' && state.step === 'nombre') {
    const text = input.text.trim();
    if (text.length < 2) {
      return turn({
        userLabel: text,
        reply: reply('El nombre debe tener al menos **2 caracteres**.'),
        state,
        composer: textComposer('Nombre del bien…'),
      });
    }
    data.nombre = text;
    const categorias = await withSqliteLockRetry(() =>
      deps.consultarInventario.listarCategorias(deps.permissionService),
    );
    const catOptions = categorias.map((c) => ({
      id: `cat:${c.id}`,
      label: c.nombre,
      icon: '🏷️',
    }));
    if (catOptions.length === 0) {
      return turn({
        userLabel: text,
        reply: reply('No hay categorías de bienes disponibles.', [
          { id: OPT.menu, label: 'Menú', icon: '🏠' },
        ]),
        state: IDLE_STATE,
        composer: optionComposer(),
      });
    }
    return turn({
      userLabel: text,
      reply: reply('¿Qué **categoría** es?', catOptions),
      state: { flow: 'bien', step: 'categoria', data },
      composer: optionComposer('Elige categoría ↑'),
    });
  }

  return turn({
    reply: reply('Elige una opción o escribe el nombre.'),
    state,
    composer: state.step === 'nombre' ? textComposer('Nombre…') : optionComposer(),
  });
}

function buildUsuarioSummary(data: Record<string, unknown>): string {
  return `📋 **Resumen usuario**\n• Usuario: ${data.username}\n• Nombre: ${data.nombre}\n• Rol: ${data.rolNombre ?? '—'}\n• Organización: ${data.organizacionNombre ?? '—'}\n\n¿Confirmas el registro?`;
}

async function handleUsuarioStep(
  state: ConversationState,
  input: ConversationInput,
  ctx: AgentContext,
  deps: AgentConversationDeps,
): Promise<ConversationTurnResult> {
  const data = { ...state.data };
  const orgsByRole = (data.orgsByRole ?? {}) as Record<string, { id: string; nombre: string }[]>;

  if (input.kind === 'option') {
    if (input.optionId === OPT.cancel || input.optionId === OPT.menu) {
      return cancelToMenu(ctx);
    }

    if (input.optionId.startsWith('rol:') && state.step === 'rol') {
      const roleId = input.optionId.replace('rol:', '');
      data.roleId = roleId;
      data.rolNombre = input.label;
      const orgs = orgsByRole[roleId] ?? [];
      if (orgs.length === 0) {
        return turn({
          userLabel: input.label,
          reply: reply(
            `No hay organizaciones asignables para el rol **${input.label}**.`,
            [{ id: OPT.menu, label: 'Volver al menú', icon: '🏠' }],
          ),
          state: IDLE_STATE,
          composer: optionComposer(),
        });
      }
      const orgOptions = orgs.map((org) => ({
        id: `org:${org.id}`,
        label: org.nombre,
        icon: '🏛️',
      }));
      return turn({
        userLabel: input.label,
        reply: reply('¿A qué **organización** pertenece?', orgOptions),
        state: { flow: 'usuario', step: 'organizacion', data },
        composer: optionComposer('Elige organización ↑'),
      });
    }

    if (input.optionId.startsWith('org:') && state.step === 'organizacion') {
      data.organizacionId = input.optionId.replace('org:', '');
      data.organizacionNombre = input.label;
      return turn({
        userLabel: input.label,
        reply: reply(
          'Escribe el **nombre de usuario** para iniciar sesión (mín. 3 caracteres, solo letras, números, puntos y guiones):',
        ),
        state: { flow: 'usuario', step: 'username', data },
        composer: textComposer('Usuario de acceso…'),
      });
    }

    if (input.optionId === OPT.confirm && state.step === 'confirm') {
      try {
        const usuario = await withSqliteLockRetry(() =>
          deps.crearUsuarioLocal.execute(
            {
              username: String(data.username),
              nombre: String(data.nombre),
              roleId: String(data.roleId),
              organizacionId: String(data.organizacionId),
              pin: String(data.pin),
              pinConfirmacion: String(data.pinConfirmacion),
            },
            deps.usuario,
            deps.rol,
            deps.permissionService,
          ),
        );
        return turn({
          userLabel: input.label,
          reply: reply(
            `✅ Usuario **${usuario.nombre}** (@${usuario.username}) creado.\n\n¿Qué más necesitas?`,
            buildMainMenuOptions(ctx),
          ),
          state: IDLE_STATE,
          composer: optionComposer(),
        });
      } catch (error) {
        return turn({
          userLabel: input.label,
          reply: reply(
            `❌ ${error instanceof Error ? error.message : 'No se pudo crear el usuario'}`,
            [
              { id: OPT.confirm, label: 'Reintentar', icon: '🔄' },
              { id: OPT.cancel, label: 'Cancelar', icon: '✕' },
            ],
          ),
          state: { ...state, step: 'confirm' },
          composer: optionComposer(),
        });
      }
    }
  }

  if (input.kind === 'text') {
    const text = input.text.trim();

    if (state.step === 'username') {
      const username = text.toLowerCase();
      if (username.length < 3) {
        return turn({
          userLabel: text,
          reply: reply('El usuario debe tener **al menos 3 caracteres**.'),
          state,
          composer: textComposer('Usuario de acceso…'),
        });
      }
      if (!/^[a-z0-9._-]+$/.test(username)) {
        return turn({
          userLabel: text,
          reply: reply(
            'Solo se permiten letras, números, puntos, guiones y guion bajo.',
          ),
          state,
          composer: textComposer('Usuario de acceso…'),
        });
      }
      data.username = username;
      return turn({
        userLabel: text,
        reply: reply('¿Cuál es su **nombre completo**? (mín. 3 caracteres)'),
        state: { flow: 'usuario', step: 'nombre', data },
        composer: textComposer('Nombre completo…'),
      });
    }

    if (state.step === 'nombre') {
      if (text.length < 3) {
        return turn({
          userLabel: text,
          reply: reply('El nombre debe tener **al menos 3 caracteres**.'),
          state,
          composer: textComposer('Nombre completo…'),
        });
      }
      data.nombre = text;
      return turn({
        userLabel: text,
        reply: reply('Define un **PIN de 4 dígitos** para el acceso:'),
        state: { flow: 'usuario', step: 'pin', data },
        composer: textComposer('PIN (4 dígitos)…'),
      });
    }

    if (state.step === 'pin') {
      if (!/^\d{4}$/.test(text)) {
        return turn({
          userLabel: '••••',
          reply: reply('El PIN debe ser **exactamente 4 dígitos numéricos**.'),
          state,
          composer: textComposer('PIN (4 dígitos)…'),
        });
      }
      data.pin = text;
      return turn({
        userLabel: '••••',
        reply: reply('**Confirma el PIN** escribiéndolo otra vez:'),
        state: { flow: 'usuario', step: 'pinConfirm', data },
        composer: textComposer('Confirmar PIN…'),
      });
    }

    if (state.step === 'pinConfirm') {
      data.pinConfirmacion = text;
      if (text !== data.pin) {
        return turn({
          userLabel: '••••',
          reply: reply('Los PIN **no coinciden**. Escribe de nuevo la confirmación:'),
          state: { flow: 'usuario', step: 'pinConfirm', data: { ...data, pinConfirmacion: undefined } },
          composer: textComposer('Confirmar PIN…'),
        });
      }
      return turn({
        userLabel: '••••',
        reply: reply(buildUsuarioSummary(data), [
          { id: OPT.confirm, label: 'Sí, crear usuario', icon: '✅' },
          { id: OPT.cancel, label: 'Cancelar', icon: '✕' },
        ]),
        state: { flow: 'usuario', step: 'confirm', data },
        composer: optionComposer(),
      });
    }
  }

  return turn({
    reply: reply('Elige una opción o escribe tu respuesta.'),
    state,
    composer:
      state.step === 'confirm' || state.step === 'rol' || state.step === 'organizacion'
        ? optionComposer()
        : textComposer('Tu respuesta…'),
  });
}

function buildExportSummary(data: Record<string, unknown>): string {
  const tipo = REPORTE_TIPO_LABEL[data.tipo as ReporteTipo] ?? String(data.tipo);
  const periodo =
    data.fechaInicio && data.fechaFin
      ? `${data.fechaInicio} → ${data.fechaFin}`
      : 'Todo el historial disponible';
  return `📋 **Resumen exportación**\n• Tipo: ${tipo}\n• Período: ${periodo}\n\n¿Genero el archivo Excel?`;
}

async function handleExportarStep(
  state: ConversationState,
  input: ConversationInput,
  ctx: AgentContext,
  deps: AgentConversationDeps,
): Promise<ConversationTurnResult> {
  const data = { ...state.data };

  if (input.kind === 'option') {
    if (input.optionId === OPT.cancel || input.optionId === OPT.menu) {
      return cancelToMenu(ctx);
    }

    if (input.optionId.startsWith('reporte-tipo:') && state.step === 'tipo') {
      data.tipo = input.optionId.replace('reporte-tipo:', '');
      data.tipoLabel = input.label;
      return turn({
        userLabel: input.label,
        reply: reply('¿Qué **período** quieres incluir?', [
          { id: OPT.periodoTodo, label: 'Todo el historial', icon: '📅' },
          { id: OPT.periodoRango, label: 'Rango de fechas', icon: '✏️' },
        ]),
        state: { flow: 'exportar', step: 'periodo', data },
        composer: optionComposer(),
      });
    }

    if (input.optionId === OPT.periodoTodo && state.step === 'periodo') {
      data.fechaInicio = undefined;
      data.fechaFin = undefined;
      return turn({
        userLabel: input.label,
        reply: reply(buildExportSummary(data), [
          { id: OPT.confirm, label: 'Sí, generar Excel', icon: '✅' },
          { id: OPT.cancel, label: 'Cancelar', icon: '✕' },
        ]),
        state: { flow: 'exportar', step: 'confirm', data },
        composer: optionComposer(),
      });
    }

    if (input.optionId === OPT.periodoRango && state.step === 'periodo') {
      return turn({
        userLabel: input.label,
        reply: reply('Escribe la **fecha inicial** en formato AAAA-MM-DD:'),
        state: { flow: 'exportar', step: 'fechaInicio', data },
        composer: textComposer('AAAA-MM-DD…'),
      });
    }

    if (input.optionId === OPT.shareReporte && state.step === 'listo') {
      try {
        await deps.compartirReporte.execute(String(data.fileUri));
        return turn({
          userLabel: input.label,
          reply: reply('Listo. ¿Algo más?', buildMainMenuOptions(ctx)),
          state: IDLE_STATE,
          composer: optionComposer(),
        });
      } catch (error) {
        return turn({
          userLabel: input.label,
          reply: reply(
            `❌ ${error instanceof Error ? error.message : 'No se pudo compartir'}`,
            [
              { id: OPT.shareReporte, label: 'Reintentar compartir', icon: '🔄' },
              { id: OPT.menu, label: 'Menú', icon: '🏠' },
            ],
          ),
          state,
          composer: optionComposer(),
        });
      }
    }

    if (input.optionId === OPT.confirm && state.step === 'confirm') {
      try {
        const reporte = await withSqliteLockRetry(() =>
          deps.generarReporteXlsx.execute(
            deps.usuario,
            deps.rol,
            deps.permissionService,
            {
              tipo: data.tipo as ReporteTipo,
              fechaInicio: data.fechaInicio ? String(data.fechaInicio) : undefined,
              fechaFin: data.fechaFin ? String(data.fechaFin) : undefined,
            },
          ),
        );
        data.fileUri = reporte.fileUri;
        return turn({
          userLabel: input.label,
          reply: reply(
            `✅ Excel generado: **${REPORTE_TIPO_LABEL[reporte.tipo]}**.\n\n¿Lo compartimos ahora?`,
            [
              { id: OPT.shareReporte, label: 'Compartir archivo', icon: '📤' },
              { id: OPT.menu, label: 'Menú', icon: '🏠' },
            ],
          ),
          state: { flow: 'exportar', step: 'listo', data },
          composer: optionComposer(),
        });
      } catch (error) {
        return turn({
          userLabel: input.label,
          reply: reply(
            `❌ ${error instanceof Error ? error.message : 'No se pudo generar el reporte'}`,
            [
              { id: OPT.confirm, label: 'Reintentar', icon: '🔄' },
              { id: OPT.cancel, label: 'Cancelar', icon: '✕' },
            ],
          ),
          state: { ...state, step: 'confirm' },
          composer: optionComposer(),
        });
      }
    }
  }

  if (input.kind === 'text') {
    const text = input.text.trim();

    if (state.step === 'fechaInicio') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return turn({
          userLabel: text,
          reply: reply('Formato inválido. Usa **AAAA-MM-DD**.'),
          state,
          composer: textComposer('Fecha inicial…'),
        });
      }
      data.fechaInicio = text;
      return turn({
        userLabel: text,
        reply: reply('Escribe la **fecha final** (AAAA-MM-DD):'),
        state: { flow: 'exportar', step: 'fechaFin', data },
        composer: textComposer('Fecha final…'),
      });
    }

    if (state.step === 'fechaFin') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return turn({
          userLabel: text,
          reply: reply('Formato inválido. Usa **AAAA-MM-DD**.'),
          state,
          composer: textComposer('Fecha final…'),
        });
      }
      if (data.fechaInicio && text < String(data.fechaInicio)) {
        return turn({
          userLabel: text,
          reply: reply('La fecha final no puede ser **anterior** a la inicial.'),
          state,
          composer: textComposer('Fecha final…'),
        });
      }
      data.fechaFin = text;
      return turn({
        userLabel: text,
        reply: reply(buildExportSummary(data), [
          { id: OPT.confirm, label: 'Sí, generar Excel', icon: '✅' },
          { id: OPT.cancel, label: 'Cancelar', icon: '✕' },
        ]),
        state: { flow: 'exportar', step: 'confirm', data },
        composer: optionComposer(),
      });
    }
  }

  return turn({
    reply: reply('Elige una opción o escribe tu respuesta.'),
    state,
    composer:
      state.step === 'fechaInicio' || state.step === 'fechaFin'
        ? textComposer('AAAA-MM-DD…')
        : optionComposer(),
  });
}

function handleNavigateStep(
  state: ConversationState,
  input: ConversationInput,
  ctx: AgentContext,
): ConversationTurnResult {
  const targetKey = String(state.data.targetKey ?? '');
  const target = NAV_TARGETS[targetKey];

  if (input.kind === 'option') {
    if (input.optionId === OPT.cancel || input.optionId === OPT.menu) {
      return cancelToMenu(ctx);
    }
    if (input.optionId === OPT.navGo && target) {
      return turn({
        userLabel: input.label,
        reply: reply(`Listo, abriendo **${target.label}**…`, buildMainMenuOptions(ctx)),
        state: IDLE_STATE,
        composer: optionComposer(),
        navigateTo: target.href(ctx),
      });
    }
  }

  return turn({
    reply: reply('¿Abro la pantalla?', [
      { id: OPT.navGo, label: 'Sí, abrir', icon: '✅' },
      { id: OPT.cancel, label: 'Cancelar', icon: '✕' },
    ]),
    state,
    composer: optionComposer(),
  });
}

async function handleIdleInput(
  input: ConversationInput,
  ctx: AgentContext,
  deps: AgentConversationDeps,
): Promise<ConversationTurnResult> {
  if (input.kind === 'option') {
    if (input.optionId === OPT.menu) {
      return buildWelcomeTurn(ctx);
    }
    const started = await startFlowFromOption(input.optionId, ctx, deps);
    if (started) {
      return { ...started, userLabel: input.label };
    }
  }

  if (input.kind === 'text') {
    const matched = matchCatalogAction(input.text, ctx);
    if (matched) {
      const map: Record<string, string> = {
        'nuevo-ingreso': 'start:ingreso',
        'nuevo-gasto': 'start:gasto',
        'nuevo-bien': 'start:bien',
        'nueva-capilla': 'start:capilla',
        inventario: 'start:nav:inventario',
        finanzas: 'start:nav:finanzas',
        organizaciones: 'start:nav:organizaciones',
        reportes: 'start:exportar',
        sync: 'start:nav:sync',
        'usuarios-nuevo': 'start:usuario',
        ajustes: 'start:nav:ajustes',
        menu: 'flow:menu',
      };
      const startId = map[matched.id];
      if (startId === 'flow:menu') {
        return buildWelcomeTurn(ctx);
      }
      if (startId?.startsWith('start:')) {
        const started = await startFlowFromOption(startId, ctx, deps);
        if (started) {
          return { ...started, userLabel: input.text };
        }
      }
    }

    const lower = input.text.toLowerCase();
    if (lower.includes('hola') || lower.includes('menu') || lower.includes('menú') || lower.includes('ayuda')) {
      return { ...buildWelcomeTurn(ctx), userLabel: input.text };
    }
  }

  return turn({
    userLabel: input.kind === 'text' ? input.text : input.label,
    reply: reply(
      'No estoy seguro de eso. Elige del menú o prueba: **registrar ingreso**, **nueva capilla**, **ver inventario**.',
      buildMainMenuOptions(ctx),
    ),
    state: IDLE_STATE,
    composer: optionComposer('Escribe o elige una opción…'),
  });
}

export async function handleConversationTurn(
  state: ConversationState,
  input: ConversationInput,
  ctx: AgentContext,
  deps: AgentConversationDeps,
): Promise<ConversationTurnResult> {
  if (input.kind === 'option' && input.optionId === OPT.menu) {
    return { ...cancelToMenu(ctx), userLabel: input.label };
  }

  if (state.flow === 'idle') {
    return handleIdleInput(input, ctx, deps);
  }

  if (state.flow === 'capilla') {
    return handleCapillaStep(state, input, ctx, deps);
  }

  if (state.flow === 'ingreso' || state.flow === 'gasto') {
    return handleFinanzaStep(state.flow, state, input, ctx, deps);
  }

  if (state.flow === 'bien') {
    return handleBienStep(state, input, ctx, deps);
  }

  if (state.flow === 'usuario') {
    return handleUsuarioStep(state, input, ctx, deps);
  }

  if (state.flow === 'exportar') {
    return handleExportarStep(state, input, ctx, deps);
  }

  if (state.flow === 'navegar') {
    return handleNavigateStep(state, input, ctx);
  }

  return buildWelcomeTurn(ctx);
}

export { buildMainMenuOptions };
