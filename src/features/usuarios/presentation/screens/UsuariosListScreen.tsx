import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuthStore } from '@/features/auth/presentation/store/authStore';
import { ModuloCodigo } from '@/shared/infrastructure/database/schema';
import { FloatingActionButton } from '@/shared/presentation/ui/PrimaryButton';
import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';
import {
  SocialCard,
  SocialEmpty,
  SocialHeader,
  SocialPrimaryButton,
  SocialScreen,
} from '@/shared/presentation/ui/socialUi';

import type { UsuarioListadoItem } from '../../domain/entities/UsuarioListadoItem';
import { useUsuariosUseCases } from '../hooks/useUsuariosUseCases';
import { USUARIOS_ROUTES } from '../routes';

export function UsuariosListScreen() {
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuarioActual);
  const rol = useAuthStore((s) => s.rolActual);
  const permissionService = useAuthStore((s) => s.permissionService);
  const tieneAcceso = useAuthStore((s) => s.tieneAcceso(ModuloCodigo.USUARIOS));

  const { listarUsuariosEnAlcance } = useUsuariosUseCases();

  const [usuarios, setUsuarios] = useState<UsuarioListadoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!usuario || !rol || !permissionService || !tieneAcceso) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const items = await listarUsuariosEnAlcance.execute(usuario, rol, permissionService);
      setUsuarios(items);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudieron cargar los usuarios');
    } finally {
      setIsLoading(false);
    }
  }, [listarUsuariosEnAlcance, permissionService, rol, tieneAcceso, usuario]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!tieneAcceso) {
    return (
      <SocialScreen scroll={false}>
        <SocialEmpty
          icon="🔒"
          title="Sin acceso"
          message="Tu perfil no puede consultar usuarios del sistema."
        />
      </SocialScreen>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={PremiumPalette.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SocialScreen>
        <SocialHeader
          title="Usuarios"
          subtitle="Personas con acceso local en tu alcance jerárquico"
          badge={`${usuarios.length} activos`}
        />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        {usuarios.length === 0 ? (
          <SocialCard>
            <SocialEmpty
              icon="👤"
              title="Sin usuarios"
              message="Aún no hay usuarios registrados en tu alcance."
            />
            <SocialPrimaryButton
              label="+ Registrar usuario"
              onPress={() => router.push(USUARIOS_ROUTES.nuevo)}
            />
          </SocialCard>
        ) : (
          usuarios.map((item) => (
            <SocialCard key={item.id}>
              <Text style={styles.nombre}>{item.nombre}</Text>
              <Text style={styles.meta}>
                {item.rolNombre} · {item.organizacionNombre}
              </Text>
              <Text style={styles.codigo}>{item.organizacionCodigo}</Text>
            </SocialCard>
          ))
        )}
      </SocialScreen>

      {usuarios.length > 0 ? (
        <FloatingActionButton
          label="+"
          onPress={() => router.push(USUARIOS_ROUTES.nuevo)}
          accessibilityLabel="Registrar usuario"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PremiumPalette.canvas },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PremiumPalette.canvas,
  },
  error: { color: PremiumPalette.danger, fontSize: 13 },
  nombre: { color: PremiumPalette.textOnDark, fontSize: 16, fontWeight: '700' },
  meta: { color: PremiumPalette.textMutedOnDark, fontSize: 13, marginTop: 4 },
  codigo: { color: PremiumPalette.primary, fontSize: 12, fontWeight: '700', marginTop: 2 },
});
