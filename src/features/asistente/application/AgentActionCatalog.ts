import type { Href } from 'expo-router';

import { BIENES_ROUTES } from '@/features/bienes/presentation/routes';
import { FinanzaNaturaleza } from '@/features/ofrendas/domain/entities/FinanzaNaturaleza';
import { OFRENDAS_ROUTES } from '@/features/ofrendas/presentation/routes';
import { ORGANIZACIONES_ROUTES } from '@/features/organizaciones/presentation/routes';
import { REPORTES_ROUTES } from '@/features/reportes/presentation/routes';
import { SYNC_ROUTES } from '@/features/sync/presentation/routes';
import { USUARIOS_ROUTES } from '@/features/usuarios/presentation/routes';
import { ModuloCodigo, type ModuloCodigoValue } from '@/shared/infrastructure/database/schema';

import type { AgentContext } from '../domain/entities/AgentTypes';

export type AgentActionCategory = 'operar' | 'consultar' | 'admin' | 'sistema';

export type AgentCatalogAction = {
  id: string;
  label: string;
  icon: string;
  category: AgentActionCategory;
  module?: ModuloCodigoValue;
  keywords: string[];
  weight?: number;
  requiresParroquia?: boolean;
  href: (ctx: AgentContext) => Href | null;
  hint?: string;
};

function hasAccess(ctx: AgentContext, module: ModuloCodigoValue): boolean {
  return ctx.tieneAcceso(module);
}

export const AGENT_ACTION_CATALOG: AgentCatalogAction[] = [
  {
    id: 'nuevo-ingreso',
    label: 'Registrar ingreso',
    icon: '💰',
    category: 'operar',
    module: ModuloCodigo.OFRENDAS,
    weight: 3,
    keywords: [
      'registrar ingreso',
      'nuevo ingreso',
      'registrar ofrenda',
      'nueva ofrenda',
      'agregar ofrenda',
      'crear ofrenda',
      'anotar ofrenda',
      'colecta',
    ],
    href: (ctx) => OFRENDAS_ROUTES.nuevo(ctx.orgId, FinanzaNaturaleza.INGRESO),
    hint: 'Formulario de ingreso con monto, tipo y nota dictable.',
  },
  {
    id: 'nuevo-gasto',
    label: 'Registrar gasto',
    icon: '📤',
    category: 'operar',
    module: ModuloCodigo.OFRENDAS,
    weight: 3,
    keywords: [
      'registrar gasto',
      'nuevo gasto',
      'agregar gasto',
      'crear gasto',
      'anotar gasto',
      'registrar egreso',
      'nuevo egreso',
      'gasto capilla',
      'pago mantenimiento',
    ],
    href: (ctx) => OFRENDAS_ROUTES.nuevo(ctx.orgId, FinanzaNaturaleza.EGRESO),
    hint: 'Formulario de egreso: mantenimiento, servicios, material litúrgico…',
  },
  {
    id: 'nuevo-bien',
    label: 'Registrar bien',
    icon: '📦',
    category: 'operar',
    module: ModuloCodigo.INVENTARIO_BIENES,
    weight: 3,
    keywords: [
      'registrar bien',
      'nuevo bien',
      'agregar bien',
      'crear bien',
      'alta bien',
      'anadir bien',
      'añadir bien',
    ],
    href: (ctx) => BIENES_ROUTES.nuevo(ctx.orgId),
    hint: 'Alta de patrimonio con foto y descripción dictable.',
  },
  {
    id: 'inventario',
    label: 'Inventario',
    icon: '📋',
    category: 'consultar',
    module: ModuloCodigo.INVENTARIO_BIENES,
    weight: 2,
    keywords: [
      'inventario',
      'bienes',
      'patrimonio',
      'mobiliario',
      'arte sacro',
      'listado bienes',
      'ver bienes',
      'buscar bien',
      'encontrar bien',
    ],
    href: (ctx) => BIENES_ROUTES.listado(ctx.orgId),
    hint: 'Lista y búsqueda por voz de bienes de tu alcance.',
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    icon: '📈',
    category: 'consultar',
    module: ModuloCodigo.OFRENDAS,
    weight: 2,
    keywords: [
      'finanzas',
      'ofrendas',
      'recaudacion',
      'recaudación',
      'ingresos',
      'gastos',
      'egresos',
      'saldo',
      'dinero',
      'misas',
    ],
    href: (ctx) => OFRENDAS_ROUTES.dashboard(ctx.orgId),
    hint: 'Ingresos, gastos, saldo y movimientos del período.',
  },
  {
    id: 'organizaciones',
    label: 'Organizaciones',
    icon: '🏛️',
    category: 'admin',
    module: ModuloCodigo.ORGANIZACIONES,
    weight: 2,
    keywords: [
      'organizacion',
      'organización',
      'parroquia',
      'capilla',
      'catedral',
      'estructura',
      'jerarquia',
      'jerarquía',
      'arbol',
      'árbol',
    ],
    href: () => ORGANIZACIONES_ROUTES.dashboard,
    hint: 'Árbol diócesis → parroquia → capilla.',
  },
  {
    id: 'nueva-capilla',
    label: 'Nueva capilla',
    icon: '⛪',
    category: 'admin',
    module: ModuloCodigo.ORGANIZACIONES,
    weight: 3,
    requiresParroquia: true,
    keywords: ['nueva capilla', 'crear capilla', 'agregar capilla', 'registrar capilla'],
    href: (ctx) =>
      ctx.parroquiaId ? ORGANIZACIONES_ROUTES.nuevaCapilla(ctx.parroquiaId) : null,
    hint: 'Alta de capilla bajo tu parroquia.',
  },
  {
    id: 'usuarios-nuevo',
    label: 'Nuevo usuario',
    icon: '👤',
    category: 'admin',
    module: ModuloCodigo.USUARIOS,
    weight: 2,
    keywords: ['nuevo usuario', 'crear usuario', 'registrar usuario', 'pin usuario'],
    href: () => USUARIOS_ROUTES.nuevo,
    hint: 'Acceso local con username y PIN.',
  },
  {
    id: 'usuarios-lista',
    label: 'Usuarios',
    icon: '👥',
    category: 'admin',
    module: ModuloCodigo.USUARIOS,
    weight: 2,
    keywords: ['usuarios', 'listar usuarios', 'ver usuarios'],
    href: () => USUARIOS_ROUTES.listado,
    hint: 'Listado de accesos bajo tu jurisdicción.',
  },
  {
    id: 'reportes',
    label: 'Reportes Excel',
    icon: '📊',
    category: 'admin',
    module: ModuloCodigo.REPORTES,
    weight: 2,
    keywords: [
      'reporte',
      'excel',
      'xlsx',
      'exportar',
      'importar',
      'compartir archivo',
      'hoja de calculo',
    ],
    href: () => REPORTES_ROUTES.listado,
    hint: 'Exportar e importar inventario y finanzas.',
  },
  {
    id: 'sync',
    label: 'Sincronizar P2P',
    icon: '↻',
    category: 'admin',
    module: ModuloCodigo.SYNC,
    weight: 2,
    keywords: [
      'sincron',
      'sync',
      'p2p',
      'dispositivo',
      'emparejar',
      'wifi',
      'red local',
      'otro celular',
    ],
    href: () => SYNC_ROUTES.dashboard,
    hint: 'Intercambio en la misma Wi‑Fi, sin internet.',
  },
  {
    id: 'inicio',
    label: 'Ir al inicio',
    icon: '🏠',
    category: 'sistema',
    keywords: ['inicio', 'dashboard', 'panel', 'resumen', 'principal', 'home'],
    href: () => '/(protected)/(tabs)' as Href,
    hint: 'Totales y accesos rápidos de tu alcance.',
  },
  {
    id: 'ajustes',
    label: 'Ajustes',
    icon: '⚙️',
    category: 'sistema',
    keywords: [
      'ajuste',
      'ajustes',
      'perfil',
      'cerrar sesion',
      'cerrar sesión',
      'logout',
      'version',
      'versión',
      'mantenimiento',
    ],
    href: () => '/(protected)/(tabs)/ajustes' as Href,
    hint: 'Perfil, actualizaciones y cierre de sesión.',
  },
  {
    id: 'ayuda-voz',
    label: 'Dictado por voz',
    icon: '🎙️',
    category: 'sistema',
    keywords: ['voz', 'dictar', 'microfono', 'micrófono', 'hablar', 'transcribir', 'speech'],
    href: (ctx) =>
      hasAccess(ctx, ModuloCodigo.INVENTARIO_BIENES)
        ? BIENES_ROUTES.listado(ctx.orgId)
        : hasAccess(ctx, ModuloCodigo.OFRENDAS)
          ? OFRENDAS_ROUTES.dashboard(ctx.orgId)
          : null,
    hint: 'Botón 🎙️ en formularios y búsqueda de inventario.',
  },
  {
    id: 'menu',
    label: 'Ver acciones',
    icon: '⚡',
    category: 'sistema',
    keywords: [
      'hola',
      'buenas',
      'ayuda',
      'que puedo',
      'qué puedo',
      'como funciona',
      'cómo funciona',
      'empezar',
      'menu',
      'menú',
      'acciones',
    ],
    weight: 2,
    href: () => null,
    hint: 'Panel de acciones según tu rol.',
  },
];

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').trim();
}

function isActionAvailable(action: AgentCatalogAction, ctx: AgentContext): boolean {
  if (action.module && !hasAccess(ctx, action.module)) {
    return false;
  }
  if (action.requiresParroquia && !ctx.parroquiaId) {
    return false;
  }
  return action.href(ctx) !== null || action.id === 'menu';
}

export function getAvailableActions(ctx: AgentContext): AgentCatalogAction[] {
  return AGENT_ACTION_CATALOG.filter((action) => isActionAvailable(action, ctx));
}

function scoreAction(query: string, action: AgentCatalogAction): number {
  let score = 0;
  for (const keyword of action.keywords) {
    if (query.includes(normalize(keyword))) {
      score += action.weight ?? 1;
    }
  }
  return score;
}

export function matchCatalogAction(
  query: string,
  ctx: AgentContext,
): AgentCatalogAction | null {
  const normalized = normalize(query);
  if (!normalized) {
    return null;
  }

  const available = getAvailableActions(ctx);
  let best: AgentCatalogAction | null = null;
  let bestScore = 0;

  for (const action of available) {
    const score = scoreAction(normalized, action);
    if (score > bestScore) {
      bestScore = score;
      best = action;
    }
  }

  return bestScore > 0 ? best : null;
}
