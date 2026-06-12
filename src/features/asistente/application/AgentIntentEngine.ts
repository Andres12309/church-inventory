import { BIENES_ROUTES } from "@/features/bienes/presentation/routes";
import { OFRENDAS_ROUTES } from "@/features/ofrendas/presentation/routes";
import { ORGANIZACIONES_ROUTES } from "@/features/organizaciones/presentation/routes";
import { REPORTES_ROUTES } from "@/features/reportes/presentation/routes";
import { SYNC_ROUTES } from "@/features/sync/presentation/routes";
import { USUARIOS_ROUTES } from "@/features/usuarios/presentation/routes";
import { ModuloCodigo } from "@/shared/infrastructure/database/schema";

import type { AgentContext, AgentReply } from "../domain/entities/AgentTypes";

type IntentRule = {
  id: string;
  patterns: string[];
  weight?: number;
  respond: (ctx: AgentContext) => AgentReply | null;
};

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim();
}

function hasAccess(
  ctx: AgentContext,
  module: (typeof ModuloCodigo)[keyof typeof ModuloCodigo],
): boolean {
  return ctx.tieneAcceso(module);
}

function denied(moduleLabel: string): AgentReply {
  return {
    text: `Tu rol actual no tiene acceso al módulo de ${moduleLabel}. Si lo necesitas, pide a tu administrador que te asigne los permisos correspondientes.`,
    actions: [],
    suggestions: ["¿Qué puedo hacer?", "Ir al inicio", "Ver ajustes"],
  };
}

function buildRules(ctx: AgentContext): IntentRule[] {
  const { orgId, scopeLabel, parroquiaId } = ctx;

  return [
    {
      id: "saludo",
      patterns: [
        "hola",
        "buenas",
        "ayuda",
        "que puedo",
        "qué puedo",
        "como funciona",
        "cómo funciona",
        "empezar",
      ],
      weight: 2,
      respond: () => welcomeReply(ctx),
    },
    {
      id: "inicio",
      patterns: [
        "inicio",
        "dashboard",
        "panel",
        "resumen",
        "principal",
        "home",
      ],
      respond: () => ({
        text: `El **Inicio** muestra tu alcance (${scopeLabel}), totales de bienes y ofrendas, y accesos administrativos. El botón ⚡ flotante abre acciones rápidas.`,
        actions: [
          {
            id: "inicio",
            label: "Ir al inicio",
            icon: "🏠",
            href: "/(protected)/(tabs)",
          },
        ],
        suggestions: [
          "Ver inventario",
          "Sincronizar dispositivos",
          "Exportar Excel",
        ],
      }),
    },
    {
      id: "nuevo-bien",
      patterns: [
        "registrar bien",
        "nuevo bien",
        "agregar bien",
        "crear bien",
        "alta bien",
        "añadir bien",
      ],
      weight: 3,
      respond: () => {
        if (!hasAccess(ctx, ModuloCodigo.INVENTARIO_BIENES)) {
          return denied("inventario");
        }
        return {
          text: "Para **registrar un bien** abre el formulario de alta. Puedes dictar nombre y descripción con el micrófono 🎙️ en cada campo de texto.",
          actions: [
            {
              id: "nuevo-bien",
              label: "Registrar bien",
              icon: "📦",
              href: BIENES_ROUTES.nuevo(orgId),
              module: ModuloCodigo.INVENTARIO_BIENES,
            },
            {
              id: "inventario",
              label: "Ver inventario",
              icon: "📋",
              href: BIENES_ROUTES.listado(orgId),
              module: ModuloCodigo.INVENTARIO_BIENES,
            },
          ],
          suggestions: ["Buscar un bien", "Ir a finanzas"],
        };
      },
    },
    {
      id: "inventario",
      patterns: [
        "inventario",
        "bienes",
        "patrimonio",
        "mobiliario",
        "arte sacro",
        "listado bienes",
        "ver bienes",
      ],
      weight: 2,
      respond: () => {
        if (!hasAccess(ctx, ModuloCodigo.INVENTARIO_BIENES)) {
          return denied("inventario");
        }
        return {
          text: "El **Inventario** está en la pestaña inferior «Inventario». Ahí listas, buscas (también por voz) y editas bienes de tu capilla.",
          actions: [
            {
              id: "inventario",
              label: "Abrir inventario",
              icon: "📋",
              href: BIENES_ROUTES.listado(orgId),
              module: ModuloCodigo.INVENTARIO_BIENES,
            },
            {
              id: "nuevo-bien",
              label: "Registrar bien",
              icon: "➕",
              href: BIENES_ROUTES.nuevo(orgId),
              module: ModuloCodigo.INVENTARIO_BIENES,
            },
          ],
          suggestions: ["Registrar nuevo bien", "¿Cómo dicto por voz?"],
        };
      },
    },
    {
      id: "buscar-bien",
      patterns: ["buscar bien", "encontrar bien", "buscar en inventario"],
      weight: 3,
      respond: () => {
        if (!hasAccess(ctx, ModuloCodigo.INVENTARIO_BIENES)) {
          return denied("inventario");
        }
        return {
          text: "En **Inventario** usa la barra de búsqueda superior. Tiene icono de micrófono para dictar el nombre del bien que buscas.",
          actions: [
            {
              id: "inventario",
              label: "Ir a inventario",
              icon: "🔍",
              href: BIENES_ROUTES.listado(orgId),
              module: ModuloCodigo.INVENTARIO_BIENES,
            },
          ],
          suggestions: ["Registrar bien", "Ver finanzas"],
        };
      },
    },
    {
      id: "nuevo-ingreso",
      patterns: [
        "registrar ofrenda",
        "nuevo ingreso",
        "agregar ofrenda",
        "crear ofrenda",
        "registrar ingreso",
        "anotar ofrenda",
      ],
      weight: 3,
      respond: () => {
        if (!hasAccess(ctx, ModuloCodigo.OFRENDAS)) {
          return denied("finanzas");
        }
        return {
          text: "Para **registrar un ingreso** (ofrenda) usa el formulario en Finanzas. Indica monto, tipo de actividad y puedes dictar la nota con voz.",
          actions: [
            {
              id: "nuevo-ingreso",
              label: "Registrar ingreso",
              icon: "💰",
              href: OFRENDAS_ROUTES.nuevo(orgId),
              module: ModuloCodigo.OFRENDAS,
            },
            {
              id: "finanzas",
              label: "Ver finanzas",
              icon: "📈",
              href: OFRENDAS_ROUTES.dashboard(orgId),
              module: ModuloCodigo.OFRENDAS,
            },
          ],
          suggestions: ["Ver inventario", "Exportar reporte"],
        };
      },
    },
    {
      id: "finanzas",
      patterns: [
        "finanzas",
        "ofrendas",
        "recaudacion",
        "recaudación",
        "ingresos",
        "dinero",
        "misas",
        "colecta",
      ],
      weight: 2,
      respond: () => {
        if (!hasAccess(ctx, ModuloCodigo.OFRENDAS)) {
          return denied("finanzas");
        }
        return {
          text: "**Finanzas** está en la pestaña inferior del mismo nombre. Muestra totales por periodo y el listado de ofrendas registradas.",
          actions: [
            {
              id: "finanzas",
              label: "Abrir finanzas",
              icon: "📈",
              href: OFRENDAS_ROUTES.dashboard(orgId),
              module: ModuloCodigo.OFRENDAS,
            },
            {
              id: "nuevo-ingreso",
              label: "Registrar ingreso",
              icon: "➕",
              href: OFRENDAS_ROUTES.nuevo(orgId),
              module: ModuloCodigo.OFRENDAS,
            },
          ],
          suggestions: ["Registrar ingreso", "Ver reportes Excel"],
        };
      },
    },
    {
      id: "organizaciones",
      patterns: [
        "organizacion",
        "organización",
        "parroquia",
        "capilla",
        "catedral",
        "estructura",
        "jerarquia",
        "jerarquía",
        "arbol",
        "árbol",
      ],
      weight: 2,
      respond: () => {
        if (!hasAccess(ctx, ModuloCodigo.ORGANIZACIONES)) {
          return denied("organizaciones");
        }
        return {
          text: "**Organizaciones** gestiona la jerarquía eclesiástica (diócesis → parroquia → capilla). Desde el inicio también puedes crear capillas si tu rol lo permite.",
          actions: [
            {
              id: "orgs",
              label: "Ver organizaciones",
              icon: "🏛️",
              href: ORGANIZACIONES_ROUTES.dashboard,
              module: ModuloCodigo.ORGANIZACIONES,
            },
            ...(parroquiaId
              ? [
                  {
                    id: "nueva-capilla",
                    label: "Nueva capilla",
                    icon: "⛪",
                    href: ORGANIZACIONES_ROUTES.nuevaCapilla(parroquiaId),
                    module: ModuloCodigo.ORGANIZACIONES,
                  },
                ]
              : []),
          ],
          suggestions: parroquiaId
            ? ["Nueva capilla", "Ver inventario"]
            : ["Ver inventario", "Sincronizar"],
        };
      },
    },
    {
      id: "nueva-capilla",
      patterns: [
        "nueva capilla",
        "crear capilla",
        "agregar capilla",
        "registrar capilla",
      ],
      weight: 3,
      respond: () => {
        if (!hasAccess(ctx, ModuloCodigo.ORGANIZACIONES)) {
          return denied("organizaciones");
        }
        if (!parroquiaId) {
          return {
            text: "Para crear una capilla necesitas una **parroquia padre** en tu alcance. Primero revisa la estructura en Organizaciones o crea la parroquia correspondiente.",
            actions: [
              {
                id: "orgs",
                label: "Ver organizaciones",
                icon: "🏛️",
                href: ORGANIZACIONES_ROUTES.dashboard,
                module: ModuloCodigo.ORGANIZACIONES,
              },
            ],
            suggestions: ["Ver organizaciones", "¿Qué puedo hacer?"],
          };
        }
        return {
          text: "Puedes **registrar una capilla** bajo tu parroquia. En el formulario también puedes dictar nombre y dirección con voz.",
          actions: [
            {
              id: "nueva-capilla",
              label: "Nueva capilla",
              icon: "⛪",
              href: ORGANIZACIONES_ROUTES.nuevaCapilla(parroquiaId),
              module: ModuloCodigo.ORGANIZACIONES,
            },
          ],
          suggestions: ["Ver organizaciones", "Registrar bien"],
        };
      },
    },
    {
      id: "sync",
      patterns: [
        "sincron",
        "sync",
        "p2p",
        "dispositivo",
        "emparejar",
        "wifi",
        "red local",
        "lan",
        "peer",
        "otro celular",
      ],
      weight: 2,
      respond: () => {
        if (!hasAccess(ctx, ModuloCodigo.SYNC)) {
          return denied("sincronización");
        }
        return {
          text: "**Sincronización P2P** intercambia datos entre dos dispositivos en la misma Wi‑Fi (sin internet). Uno se hace visible, el otro escanea y conecta. Requiere app nativa compilada.",
          actions: [
            {
              id: "sync",
              label: "Abrir sincronización",
              icon: "↻",
              href: SYNC_ROUTES.dashboard,
              module: ModuloCodigo.SYNC,
            },
          ],
          suggestions: ["Exportar Excel", "¿Qué puedo hacer?"],
        };
      },
    },
    {
      id: "reportes",
      patterns: [
        "reporte",
        "excel",
        "xlsx",
        "exportar",
        "importar",
        "compartir archivo",
        "hoja de calculo",
      ],
      weight: 2,
      respond: () => {
        if (!hasAccess(ctx, ModuloCodigo.REPORTES)) {
          return denied("reportes");
        }
        return {
          text: "En la pestaña **Reportes** puedes exportar inventario/finanzas a Excel y **importar** archivos de otro dispositivo (con vista previa antes de aplicar).",
          actions: [
            {
              id: "reportes",
              label: "Abrir reportes",
              icon: "📊",
              href: REPORTES_ROUTES.listado,
              module: ModuloCodigo.REPORTES,
            },
          ],
          suggestions: ["Sincronizar por Wi‑Fi", "Ver inventario"],
        };
      },
    },
    {
      id: "usuarios",
      patterns: [
        "usuario",
        "usuarios",
        "registrar usuario",
        "nuevo usuario",
        "crear usuario",
        "pin usuario",
      ],
      weight: 2,
      respond: () => {
        if (!hasAccess(ctx, ModuloCodigo.USUARIOS)) {
          return denied("usuarios");
        }
        return {
          text: "**Usuarios** permite crear accesos locales con username y PIN bajo tu jurisdicción. El listado está en el módulo Usuarios (acceso desde inicio o acciones rápidas).",
          actions: [
            {
              id: "usuarios-nuevo",
              label: "Nuevo usuario",
              icon: "👤",
              href: USUARIOS_ROUTES.nuevo,
              module: ModuloCodigo.USUARIOS,
            },
            {
              id: "usuarios-lista",
              label: "Listar usuarios",
              icon: "📋",
              href: USUARIOS_ROUTES.listado,
              module: ModuloCodigo.USUARIOS,
            },
          ],
          suggestions: ["Ver organizaciones", "Ir al inicio"],
        };
      },
    },
    {
      id: "ajustes",
      patterns: [
        "ajuste",
        "perfil",
        "cerrar sesion",
        "cerrar sesión",
        "logout",
        "version",
        "versión",
        "mantenimiento",
      ],
      respond: () => ({
        text: "**Ajustes** (pestaña inferior) muestra tu perfil, sincronización, mantenimiento de agregados y cierre de sesión.",
        actions: [
          {
            id: "ajustes",
            label: "Ir a ajustes",
            icon: "⚙️",
            href: "/(protected)/(tabs)/ajustes",
          },
        ],
        suggestions: ["Sincronizar", "¿Qué puedo hacer?"],
      }),
    },
    {
      id: "voz",
      patterns: [
        "voz",
        "dictar",
        "microfono",
        "micrófono",
        "hablar",
        "transcribir",
        "speech",
      ],
      weight: 2,
      respond: () => ({
        text: "Varios formularios tienen el botón **🎙️** junto al campo de texto: bienes, ofrendas, organizaciones y búsqueda de inventario. Toca el micrófono, habla y el texto se escribe automáticamente.",
        actions: hasAccess(ctx, ModuloCodigo.INVENTARIO_BIENES)
          ? [
              {
                id: "probar-voz",
                label: "Probar en inventario",
                icon: "🎙️",
                href: BIENES_ROUTES.listado(orgId),
              },
            ]
          : [],
        suggestions: ["Registrar bien", "¿Qué puedo hacer?"],
      }),
    },
  ];
}

function welcomeReply(ctx: AgentContext): AgentReply {
  const actions: AgentReply["actions"] = [];
  const suggestions: string[] = [];

  if (hasAccess(ctx, ModuloCodigo.INVENTARIO_BIENES)) {
    actions.push({
      id: "inv",
      label: "Inventario",
      icon: "📦",
      href: BIENES_ROUTES.listado(ctx.orgId),
      module: ModuloCodigo.INVENTARIO_BIENES,
    });
    suggestions.push("Registrar un bien");
  }
  if (hasAccess(ctx, ModuloCodigo.OFRENDAS)) {
    actions.push({
      id: "fin",
      label: "Finanzas",
      icon: "💰",
      href: OFRENDAS_ROUTES.dashboard(ctx.orgId),
      module: ModuloCodigo.OFRENDAS,
    });
    suggestions.push("Registrar ingreso");
  }
  if (hasAccess(ctx, ModuloCodigo.SYNC)) {
    suggestions.push("Sincronizar dispositivos");
  }
  if (hasAccess(ctx, ModuloCodigo.REPORTES)) {
    suggestions.push("Exportar Excel");
  }

  return {
    text: `Hola. Soy tu **asistente de Fieles Bienes**. Trabajas como **${ctx.rolNombre}** en **${ctx.scopeLabel}**. Pregúntame dónde está algo o qué quieres hacer — por texto o voz.`,
    actions,
    suggestions: suggestions.slice(0, 4),
  };
}

function fallbackReply(ctx: AgentContext, query: string): AgentReply {
  const hint =
    query.length > 0
      ? `No encontré algo exacto para «${query}».`
      : "No entendí la consulta.";
  const welcome = welcomeReply(ctx);
  return {
    text: `${hint} Prueba con otras palabras o elige una acción sugerida.`,
    actions: welcome.actions.slice(0, 3),
    suggestions: welcome.suggestions,
  };
}

function scoreRule(query: string, rule: IntentRule): number {
  let score = 0;
  for (const pattern of rule.patterns) {
    if (query.includes(normalize(pattern))) {
      score += rule.weight ?? 1;
    }
  }
  return score;
}

export function resolveAgentQuery(
  query: string,
  ctx: AgentContext,
): AgentReply {
  const normalized = normalize(query);
  if (!normalized) {
    return welcomeReply(ctx);
  }

  const rules = buildRules(ctx);
  let best: IntentRule | null = null;
  let bestScore = 0;

  for (const rule of rules) {
    const score = scoreRule(normalized, rule);
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }

  if (best && bestScore > 0) {
    const reply = best.respond(ctx);
    if (reply) {
      return reply;
    }
  }

  return fallbackReply(ctx, query.trim());
}

export function getStarterSuggestions(ctx: AgentContext): string[] {
  return welcomeReply(ctx).suggestions;
}
