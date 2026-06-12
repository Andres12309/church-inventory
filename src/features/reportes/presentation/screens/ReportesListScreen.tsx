import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuthStore } from '@/features/auth/presentation/store/authStore';
import { ModuloCodigo } from '@/shared/infrastructure/database/schema';
import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';
import {
  SocialCard,
  SocialEmpty,
  SocialFormField,
  SocialHeader,
  SocialInfoBanner,
  SocialInput,
  SocialListCard,
  SocialPrimaryButton,
  SocialScreen,
} from '@/shared/presentation/ui/socialUi';

import { resolverCapacidadesReportes } from '../../application/services/ReportesCapabilities';
import type { ReporteGenerado, ReporteTipo } from '../../domain/entities/ReporteGenerado';
import {
  resumenImportacionTotal,
  type ReporteImportPreview,
  type ReporteImportResult,
} from '../../domain/entities/ReporteImportResult';
import { ReporteImportPreviewModal } from '../components/ReporteImportPreviewModal';
import { useReportesUseCases } from '../hooks/useReportesUseCases';
import { etiquetaTipoReporte } from '../routes';

const TIPOS_DESCRIPCION: Record<ReporteTipo, { icon: string; descripcion: string }> = {
  consolidado: {
    icon: '📊',
    descripcion: 'Inventario + finanzas + organizaciones. Ideal para sincronizar entre dispositivos.',
  },
  bienes: {
    icon: '📦',
    descripcion: 'Detalle de bienes con columnas de intercambio para importación.',
  },
  ofrendas: {
    icon: '💰',
    descripcion: 'Recaudaciones e ingresos. Puedes filtrar por rango de fechas al exportar.',
  },
};

function formatearFecha(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function nombreArchivo(uri: string): string {
  const parts = uri.split('/');
  return parts[parts.length - 1] ?? uri;
}

function formatearResumenImportacion(result: ReporteImportResult): string {
  const lineas = [
    `Bienes: +${result.bienes.insertados} nuevos, ${result.bienes.actualizados} actualizados`,
    `Ofrendas: +${result.ofrendas.insertados} nuevas, ${result.ofrendas.actualizados} actualizadas`,
  ];

  const omitidos = result.bienes.omitidos + result.ofrendas.omitidos;
  const fuera = result.bienes.fueraAlcance + result.ofrendas.fueraAlcance;
  if (omitidos > 0) {
    lineas.push(`${omitidos} registros omitidos (versión local más reciente)`);
  }
  if (fuera > 0) {
    lineas.push(`${fuera} registros fuera de tu alcance`);
  }
  if (result.mensajesError.length > 0) {
    lineas.push(`${result.mensajesError.length} advertencias`);
  }

  return lineas.join('\n');
}

export function ReportesListScreen() {
  const usuario = useAuthStore((s) => s.usuarioActual);
  const rol = useAuthStore((s) => s.rolActual);
  const permissionService = useAuthStore((s) => s.permissionService);
  const tieneAcceso = useAuthStore((s) => s.tieneAcceso(ModuloCodigo.REPORTES));

  const { listarReportesEnAlcance, generarReporteXlsx, importarReporteXlsx, compartirReporte } =
    useReportesUseCases();

  const capacidades = useMemo(
    () => (permissionService ? resolverCapacidadesReportes(permissionService) : null),
    [permissionService],
  );

  const [reportes, setReportes] = useState<ReporteGenerado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<ReporteImportPreview | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<ReporteTipo>('consolidado');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const tiposDisponibles = capacidades?.tiposExportacion ?? [];

  useEffect(() => {
    if (tiposDisponibles.length > 0 && !tiposDisponibles.includes(tipoSeleccionado)) {
      setTipoSeleccionado(tiposDisponibles[0]!);
    }
  }, [tipoSeleccionado, tiposDisponibles]);

  const requiereFechas = tipoSeleccionado === 'ofrendas' || tipoSeleccionado === 'consolidado';

  const cargar = useCallback(async () => {
    if (!usuario || !rol || !permissionService || !tieneAcceso) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const items = await listarReportesEnAlcance.execute(usuario, rol, permissionService);
      setReportes(items);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudieron cargar los reportes');
    } finally {
      setIsLoading(false);
    }
  }, [listarReportesEnAlcance, permissionService, rol, tieneAcceso, usuario]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const handleGenerar = useCallback(async () => {
    if (!usuario || !rol || !permissionService || !capacidades?.puedeExportar) {
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const reporte = await generarReporteXlsx.execute(usuario, rol, permissionService, {
        tipo: tipoSeleccionado,
        fechaInicio: fechaInicio.trim() || undefined,
        fechaFin: fechaFin.trim() || undefined,
      });

      setReportes((prev) => [reporte, ...prev]);

      Alert.alert(
        'Reporte generado',
        `Se creó ${nombreArchivo(reporte.fileUri)}. Compártelo con otro dispositivo para sincronizar manualmente.`,
        [
          { text: 'Después', style: 'cancel' },
          {
            text: 'Compartir',
            onPress: () => {
              void compartirReporte.execute(reporte.fileUri).catch((error) => {
                Alert.alert(
                  'No se pudo compartir',
                  error instanceof Error ? error.message : 'Intenta de nuevo desde el historial.',
                );
              });
            },
          },
        ],
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo generar el reporte');
    } finally {
      setIsGenerating(false);
    }
  }, [
    capacidades?.puedeExportar,
    compartirReporte,
    fechaFin,
    fechaInicio,
    generarReporteXlsx,
    permissionService,
    rol,
    tipoSeleccionado,
    usuario,
  ]);

  const handleSeleccionarArchivo = useCallback(async () => {
    if (!usuario || !rol || !permissionService || !capacidades?.puedeImportar) {
      return;
    }

    const pickerResult = await DocumentPicker.getDocumentAsync({
      type: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ],
      copyToCacheDirectory: true,
    });

    if (pickerResult.canceled || !pickerResult.assets?.[0]?.uri) {
      return;
    }

    const asset = pickerResult.assets[0];
    setIsPreviewLoading(true);
    setErrorMessage(null);

    try {
      const preview = await importarReporteXlsx.previsualizar(
        asset.uri,
        asset.name ?? nombreArchivo(asset.uri),
        usuario,
        rol,
        permissionService,
      );
      setImportPreview(preview);
      setPreviewVisible(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo analizar el archivo');
    } finally {
      setIsPreviewLoading(false);
    }
  }, [capacidades?.puedeImportar, importarReporteXlsx, permissionService, rol, usuario]);

  const handleCancelarPreview = useCallback(() => {
    setPreviewVisible(false);
    setImportPreview(null);
  }, []);

  const handleConfirmarImportacion = useCallback(async () => {
    if (!usuario || !rol || !permissionService || !importPreview?.puedeAplicar) {
      return;
    }

    setIsImporting(true);
    setErrorMessage(null);

    try {
      const result = await importarReporteXlsx.aplicar(
        importPreview.fileUri,
        usuario,
        rol,
        permissionService,
      );

      setPreviewVisible(false);
      setImportPreview(null);

      Alert.alert(
        'Importación completada',
        `${resumenImportacionTotal(result)} registros aplicados.\n\n${formatearResumenImportacion(result)}`,
        [{ text: 'Entendido' }],
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo importar el archivo');
    } finally {
      setIsImporting(false);
    }
  }, [importPreview, importarReporteXlsx, permissionService, rol, usuario]);

  const handleCompartir = useCallback(
    async (reporte: ReporteGenerado) => {
      setSharingId(reporte.id);
      setErrorMessage(null);

      try {
        await compartirReporte.execute(reporte.fileUri);
      } catch (error) {
        Alert.alert(
          'No se pudo compartir',
          error instanceof Error ? error.message : 'El archivo puede haber sido eliminado.',
        );
      } finally {
        setSharingId(null);
      }
    },
    [compartirReporte],
  );

  const tipoCards = useMemo(
    () =>
      tiposDisponibles.map((tipo) => {
        const meta = TIPOS_DESCRIPCION[tipo];
        const selected = tipoSeleccionado === tipo;
        return (
          <Pressable
            key={tipo}
            onPress={() => setTipoSeleccionado(tipo)}
            style={({ pressed }) => [
              styles.tipoCard,
              selected && styles.tipoCardSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.tipoIcon}>{meta.icon}</Text>
            <Text style={[styles.tipoLabel, selected && styles.tipoLabelSelected]}>
              {etiquetaTipoReporte(tipo)}
            </Text>
            <Text style={styles.tipoDesc}>{meta.descripcion}</Text>
          </Pressable>
        );
      }),
    [tipoSeleccionado, tiposDisponibles],
  );

  if (!tieneAcceso || !capacidades?.tieneModulo) {
    return (
      <SocialScreen scroll={false}>
        <SocialEmpty
          icon="🔒"
          title="Sin acceso"
          message="Tu perfil no puede usar reportes ni sincronización por archivo."
        />
      </SocialScreen>
    );
  }

  if (isLoading) {
    return (
      <ActivityIndicator
        size="large"
        color={PremiumPalette.primary}
        style={styles.loader}
      />
    );
  }

  return (
    <SocialScreen>
      <SocialHeader
        showBack={false}
        title="Reportes"
        subtitle="Sincronización manual por Excel"
        badge={`${reportes.length} archivos`}
      />

      <SocialInfoBanner
        title="Intercambio entre dispositivos"
        message={`Exporta un XLSX desde un dispositivo y compártelo (WhatsApp, Drive, etc.). En otro dispositivo, impórtalo aquí para actualizar tu SQLite local. Alcance según tu rol: ${capacidades.etiquetaAlcance}.`}
        accent
      />

      {capacidades.puedeExportar ? (
        <SocialCard>
          <Text style={styles.sectionTitle}>Exportar</Text>
          <View style={styles.tipoGrid}>{tipoCards}</View>

          {requiereFechas ? (
            <View style={styles.filtros}>
              <SocialFormField
                label="Fecha inicio (opcional)"
                hint="AAAA-MM-DD — solo afecta hoja Ofrendas"
              >
                <SocialInput
                  value={fechaInicio}
                  onChangeText={setFechaInicio}
                  placeholder="2026-01-01"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </SocialFormField>
              <SocialFormField label="Fecha fin (opcional)" hint="AAAA-MM-DD">
                <SocialInput
                  value={fechaFin}
                  onChangeText={setFechaFin}
                  placeholder="2026-12-31"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </SocialFormField>
            </View>
          ) : null}

          <SocialPrimaryButton
            label={`Exportar ${etiquetaTipoReporte(tipoSeleccionado)}`}
            onPress={() => void handleGenerar()}
            loading={isGenerating}
            disabled={isGenerating || isImporting || isPreviewLoading}
          />
        </SocialCard>
      ) : null}

      {capacidades.puedeImportar ? (
        <SocialCard>
          <Text style={styles.sectionTitle}>Importar / sincronizar</Text>
          <Text style={styles.importHint}>
            Selecciona un `.xlsx` generado por Fieles Bienes. Verás una vista previa con los
            cambios (nuevos, actualizaciones, omitidos) antes de aplicarlos a tu SQLite local.
          </Text>
          <SocialPrimaryButton
            label="Seleccionar Excel para importar"
            onPress={() => void handleSeleccionarArchivo()}
            loading={isPreviewLoading}
            disabled={isPreviewLoading || isImporting || isGenerating}
            variant="accent"
          />
        </SocialCard>
      ) : null}

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <Text style={styles.historyTitle}>Historial de exportaciones</Text>

      {reportes.length === 0 ? (
        <SocialCard>
          <SocialEmpty
            icon="📊"
            title="Sin archivos aún"
            message="Exporta tu primer Excel para compartirlo o conservarlo en el dispositivo."
          />
        </SocialCard>
      ) : (
        reportes.map((reporte) => (
          <SocialListCard
            key={reporte.id}
            title={etiquetaTipoReporte(reporte.tipo)}
            subtitle={reporte.organizacionNombre}
            meta={`${formatearFecha(reporte.generadoAt)} · ${nombreArchivo(reporte.fileUri)}`}
            trailing={sharingId === reporte.id ? '…' : 'Compartir'}
            trailingAccent
            onPress={() => void handleCompartir(reporte)}
          />
        ))
      )}

      <ReporteImportPreviewModal
        visible={previewVisible}
        preview={importPreview}
        isApplying={isImporting}
        onCancel={handleCancelarPreview}
        onConfirm={() => void handleConfirmarImportacion()}
      />
    </SocialScreen>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, marginTop: 48 },
  sectionTitle: {
    color: PremiumPalette.textOnDark,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  tipoGrid: { gap: 10, marginBottom: 12 },
  tipoCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    padding: 14,
    backgroundColor: PremiumPalette.surface,
  },
  tipoCardSelected: {
    borderColor: PremiumPalette.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  pressed: { opacity: 0.85 },
  tipoIcon: { fontSize: 22, marginBottom: 4 },
  tipoLabel: {
    color: PremiumPalette.textOnDark,
    fontSize: 15,
    fontWeight: '700',
  },
  tipoLabelSelected: { color: PremiumPalette.primary },
  tipoDesc: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  filtros: { gap: 8, marginBottom: 12 },
  importHint: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  error: { color: PremiumPalette.danger, fontSize: 13, marginBottom: 10 },
  historyTitle: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 8,
  },
});
