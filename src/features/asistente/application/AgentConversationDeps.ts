import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import type { GestionarBien } from '@/features/bienes/application/use-cases/GestionarBien';
import type { ConsultarInventario } from '@/features/bienes/application/use-cases/ConsultarInventario';
import type { CrearCapilla } from '@/features/organizaciones/application/use-cases/CrearCapilla';
import type { ConsultarFinanzas } from '@/features/ofrendas/application/use-cases/ConsultarFinanzas';
import type { RegistrarRecaudacion } from '@/features/ofrendas/application/use-cases/RegistrarRecaudacion';
import type { CompartirReporte } from '@/features/reportes/application/use-cases/CompartirReporte';
import type { GenerarReporteXlsx } from '@/features/reportes/application/use-cases/GenerarReporteXlsx';
import type { CrearUsuarioLocal } from '@/features/usuarios/application/use-cases/CrearUsuarioLocal';
import type { ObtenerOpcionesRegistroUsuario } from '@/features/usuarios/application/use-cases/ObtenerOpcionesRegistroUsuario';

export type AgentConversationDeps = {
  usuario: Usuario;
  rol: Rol;
  permissionService: PermissionService;
  crearCapilla: CrearCapilla;
  registrarRecaudacion: RegistrarRecaudacion;
  consultarFinanzas: ConsultarFinanzas;
  gestionarBien: GestionarBien;
  consultarInventario: ConsultarInventario;
  crearUsuarioLocal: CrearUsuarioLocal;
  obtenerOpcionesRegistroUsuario: ObtenerOpcionesRegistroUsuario;
  generarReporteXlsx: GenerarReporteXlsx;
  compartirReporte: CompartirReporte;
};
