/**
 * Configuración única v1 — Jerarquía eclesiástica, roles, permisos y usuarios demo.
 * Basado en: Diócesis/Catedral (Obispo) → Parroquia (Párroco) → Capilla (Encargado).
 *
 * **OTA (EAS Update):** editar este archivo y publicar. `ensureHierarchySeed` sincroniza:
 * - INSERT/UPDATE orgs y usuarios con id `seed-org-*` / `seed-user-*`
 * - Desactiva los que quites del array (no borra usuarios creados en la app)
 * - Actualiza PIN, username, nombre, rol y organizacionId en cada arranque de login
 */

import type {
  ModuloCodigoValue,
  UserRoleCodigoValue,
} from "@/shared/infrastructure/database/schema";
import {
  ModuloCodigo,
  UserRoleCodigo,
} from "@/shared/infrastructure/database/schema";

/** Prefijos de IDs gestionados por OTA desde `ensureHierarchySeed`. */
export const HIERARCHY_SEED_PREFIX = {
  org: "seed-org-",
  user: "seed-user-",
} as const;

export type HierarchyScope = "full" | "subtree" | "single";

export type DemoOrgSeed = {
  readonly id: string;
  readonly nivelCodigo: "diocesis" | "parroquia" | "capilla";
  readonly parentId: string | null;
  readonly nombre: string;
  readonly codigoInterno: string;
  /** Por defecto true. Pon `false` para desactivar vía OTA sin quitar del array. */
  readonly activo?: boolean;
};

export type DemoUserSeed = {
  readonly id: string;
  readonly username: string;
  readonly nombre: string;
  readonly roleCodigo: UserRoleCodigoValue;
  readonly organizacionId: string;
  readonly pin: string;
  readonly emoji: string;
  readonly descripcion: string;
  /** Por defecto true. Pon `false` para desactivar vía OTA sin quitar del array. */
  readonly activo?: boolean;
};

export type NivelOrganizacionCodigo = "diocesis" | "parroquia" | "capilla";

const HIERARCHY_ORGANIZACIONES: DemoOrgSeed[] = [
  {
    id: "seed-org-catedral",
    nivelCodigo: "diocesis",
    parentId: null,
    nombre: "Sede Principal",
    codigoInterno: "ROOT-001",
  },
  // {
  //   id: "seed-org-parroquia-carmen",
  //   nivelCodigo: "parroquia",
  //   parentId: "seed-org-catedral",
  //   nombre: "Parroquia El Carmen",
  //   codigoInterno: "PAR-001",
  // },
  // {
  //   id: "seed-org-capilla-cisne",
  //   nivelCodigo: "capilla",
  //   parentId: "seed-org-parroquia-carmen",
  //   nombre: "Capilla Virgen del Cisne",
  //   codigoInterno: "CAP-001",
  // },
];

const HIERARCHY_USUARIOS: DemoUserSeed[] = [
  {
    id: "seed-user-sistema",
    username: "AndDev",
    nombre: "Admin Sistema",
    roleCodigo: UserRoleCodigo.SUPER_ADMIN,
    organizacionId: "seed-org-catedral",
    pin: "1868",
    emoji: "🛡️",
    descripcion: "Control total del dispositivo y la jerarquía",
  },
  // {
  //   id: "seed-user-obispo",
  //   username: "obispo",
  //   nombre: "Mons. Obispo Andrés",
  //   roleCodigo: UserRoleCodigo.OBISPO,
  //   organizacionId: "seed-org-catedral",
  //   pin: "1111",
  //   emoji: "✝️",
  //   descripcion: "Administra parroquias y capillas de la catedral",
  // },
  // {
  //   id: "seed-user-parroco",
  //   username: "parroco",
  //   nombre: "Padre Juan",
  //   roleCodigo: UserRoleCodigo.PARROCO,
  //   organizacionId: "seed-org-parroquia-carmen",
  //   pin: "2222",
  //   emoji: "⛪",
  //   descripcion: "Administra capillas de su parroquia",
  // },
  // {
  //   id: "seed-user-encargado",
  //   username: "encargado",
  //   nombre: "Carlos Encargado",
  //   roleCodigo: UserRoleCodigo.ENCARGADO_CAPILLA,
  //   organizacionId: "seed-org-capilla-cisne",
  //   pin: "3333",
  //   emoji: "🕯️",
  //   descripcion: "Inventario y finanzas de su capilla",
  // },
];

export const HIERARCHY_V1 = {
  niveles: [
    {
      codigo: "capilla" as NivelOrganizacionCodigo,
      nombre: "Capilla",
      orden: 1,
      esHoja: true,
    },
    {
      codigo: "parroquia" as NivelOrganizacionCodigo,
      nombre: "Parroquia",
      orden: 2,
      esHoja: false,
    },
    {
      codigo: "diocesis" as NivelOrganizacionCodigo,
      nombre: "Catedral / Diócesis",
      orden: 3,
      esHoja: false,
    },
  ],
  /** Inventario y finanzas operativos solo en capilla; parroquia/catedral consolidan subárbol. */
  consolidacion: {
    nivelOperativo: "capilla" as NivelOrganizacionCodigo,
    nivelesConsolidadores: [
      "parroquia",
      "diocesis",
    ] as NivelOrganizacionCodigo[],
  },
  roles: [
    {
      codigo: UserRoleCodigo.SUPER_ADMIN,
      nombre: "Administrador de Sistema",
      nivelMinimoOrden: null as number | null,
      scope: "full" as HierarchyScope,
      /** Nivel de org asignada al usuario (gestión). Varios usuarios pueden compartir la misma org. */
      orgAsignacionNivel: null as NivelOrganizacionCodigo | null,
      /** Niveles de organización que puede crear en el módulo Organizaciones */
      creaOrganizacionNiveles: [
        "diocesis",
        "parroquia",
        "capilla",
      ] as NivelOrganizacionCodigo[],
    },
    {
      codigo: UserRoleCodigo.OBISPO,
      nombre: "Obispo",
      nivelMinimoOrden: 3,
      scope: "subtree" as HierarchyScope,
      orgAsignacionNivel: "diocesis" as NivelOrganizacionCodigo,
      creaOrganizacionNiveles: [
        "parroquia",
        "capilla",
      ] as NivelOrganizacionCodigo[],
    },
    {
      codigo: UserRoleCodigo.PARROCO,
      nombre: "Párroco",
      nivelMinimoOrden: 2,
      scope: "subtree" as HierarchyScope,
      orgAsignacionNivel: "parroquia" as NivelOrganizacionCodigo,
      creaOrganizacionNiveles: ["capilla"] as NivelOrganizacionCodigo[],
    },
    {
      codigo: UserRoleCodigo.ENCARGADO_CAPILLA,
      nombre: "Encargado de Capilla",
      nivelMinimoOrden: 1,
      scope: "single" as HierarchyScope,
      orgAsignacionNivel: "capilla" as NivelOrganizacionCodigo,
      creaOrganizacionNiveles: [] as NivelOrganizacionCodigo[],
    },
  ],
  permisos: [
    {
      role: UserRoleCodigo.SUPER_ADMIN,
      modulos: [
        ModuloCodigo.CONFIGURACION,
        ModuloCodigo.USUARIOS,
        ModuloCodigo.ORGANIZACIONES,
        ModuloCodigo.INVENTARIO_BIENES,
        ModuloCodigo.OFRENDAS,
        ModuloCodigo.SYNC,
        ModuloCodigo.REPORTES,
      ],
    },
    {
      role: UserRoleCodigo.OBISPO,
      modulos: [
        ModuloCodigo.USUARIOS,
        ModuloCodigo.ORGANIZACIONES,
        ModuloCodigo.INVENTARIO_BIENES,
        ModuloCodigo.OFRENDAS,
        ModuloCodigo.SYNC,
        ModuloCodigo.REPORTES,
      ],
    },
    {
      role: UserRoleCodigo.PARROCO,
      modulos: [
        ModuloCodigo.USUARIOS,
        ModuloCodigo.ORGANIZACIONES,
        ModuloCodigo.INVENTARIO_BIENES,
        ModuloCodigo.OFRENDAS,
        ModuloCodigo.SYNC,
        ModuloCodigo.REPORTES,
      ],
    },
    {
      role: UserRoleCodigo.ENCARGADO_CAPILLA,
      modulos: [
        ModuloCodigo.ORGANIZACIONES,
        ModuloCodigo.INVENTARIO_BIENES,
        ModuloCodigo.OFRENDAS,
        ModuloCodigo.SYNC,
        ModuloCodigo.REPORTES,
      ],
    },
  ] satisfies Array<{
    role: UserRoleCodigoValue;
    modulos: ModuloCodigoValue[];
  }>,
  rolesAsignables: [
    {
      creador: UserRoleCodigo.SUPER_ADMIN,
      puedeCrear: [
        UserRoleCodigo.OBISPO,
        UserRoleCodigo.PARROCO,
        UserRoleCodigo.ENCARGADO_CAPILLA,
      ],
    },
    {
      creador: UserRoleCodigo.OBISPO,
      puedeCrear: [UserRoleCodigo.PARROCO, UserRoleCodigo.ENCARGADO_CAPILLA],
    },
    {
      creador: UserRoleCodigo.PARROCO,
      puedeCrear: [UserRoleCodigo.ENCARGADO_CAPILLA],
    },
  ],
  organizaciones: HIERARCHY_ORGANIZACIONES,
  usuarios: HIERARCHY_USUARIOS,
};

export const DEMO_PINS_REFERENCIA = HIERARCHY_V1.usuarios.map((u) => ({
  usuario: u.nombre,
  rol: u.roleCodigo,
  pin: u.pin,
}));
