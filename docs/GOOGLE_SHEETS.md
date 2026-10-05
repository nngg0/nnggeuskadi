# Google Sheets como CMS

El Sheet es el pequeño CMS de la organización: quien lo edita cambia lo que ven los afiliados (con hasta
`SHEETS_REVALIDATE_SECONDS` de retraso, 60 s por defecto).

> ⚠️ **El Sheet nunca debe contener datos personales de afiliados** (nombres de inscritos, teléfonos, emails…).
> La base de datos decide quién está inscrito. El Sheet solo puede recibir cifras agregadas.

## 1. Crear el Sheet

1. Crea un Google Sheet con **seis pestañas** con estos nombres exactos:
   `ACTIVIDADES`, `PROYECTOS`, `OPORTUNIDADES`, `DOCUMENTOS`, `CONFIGURACION`, `TERRITORIOS`.
2. La **fila 1** de cada pestaña son las cabeceras. Puedes partir de las plantillas CSV de
   [`docs/plantilla-sheet/`](plantilla-sheet/) (Archivo → Importar → «Reemplazar hoja actual»).
3. El orden de las columnas es libre: se buscan por nombre (sin distinguir mayúsculas ni tildes).

## 2. Dar acceso a la aplicación (cuenta de servicio)

1. En <https://console.cloud.google.com>: crea un proyecto → **APIs y servicios** → habilita **Google Sheets API**.
2. **Credenciales → Crear credenciales → Cuenta de servicio**. No necesita roles.
3. En la cuenta de servicio → **Claves → Añadir clave → JSON**. Descarga el archivo (¡no lo subas a GitHub!).
4. **Comparte el Sheet** con el email de la cuenta de servicio (`...@...iam.gserviceaccount.com`) como **Lector**.
5. Variables de entorno:
   - `GOOGLE_SHEETS_SPREADSHEET_ID`: el id de la URL `https://docs.google.com/spreadsheets/d/<ID>/edit`.
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: campo `client_email` del JSON.
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: campo `private_key` del JSON (con los `\n`).

La app solo pide permiso de **lectura** (`spreadsheets.readonly`).

## 3. Estructura

Valores aceptados en todas las hojas:
- **Booleanos**: `sí`/`si`/`TRUE`/`VERDADERO`/`1`/`x` · `no`/`FALSE`/`FALSO`/`0`/vacío.
- **Fechas**: `17/10/2026` o `2026-10-17`. **Fecha y hora**: `15/10/2026 20:00`. Hora de Madrid.
- **Territorio**: `Euskadi`, `Álava` (o `Araba`), `Bizkaia`, `Gipuzkoa`.
- **ids**: letras, números, `-`, `_`, `.` (p. ej. `ACT-031`). No cambies el id de algo que ya tiene inscritos.

### ACTIVIDADES

| Columna | Obligatoria | Notas |
|---|---|---|
| `id` | sí | Único |
| `titulo` | sí | |
| `descripcion` | | Admite saltos de línea |
| `territorio` | sí | |
| `fecha` | sí | |
| `hora` | | `18:30`. Vacía = «Por confirmar» |
| `lugar` | | |
| `plazas` | | Número. Vacío = sin límite |
| `inscripcion_inicio` | | Antes de esta fecha: «todavía no abierta». Sin hora = 00:00 |
| `inscripcion_fin` | | Cierre automático. Sin hora = 23:59 |
| `estado` | | `confirmada` (por defecto), `cerrada` (cierre manual), `cancelada`, `borrador` (oculta) |
| `visible` | | Por defecto sí |
| `destacado` | | Se prioriza en Inicio |

### PROYECTOS

`id`, `titulo`, `descripcion`, `tipo` (texto libre: Campaña, Formación…), `territorio`,
`estado` (`en_preparacion` · `en_marcha` · `cerrado`), `fecha_inicio`, `fecha_prevista`, `visible`, `destacado`.

Solo `en_preparacion` aparece en «En preparación». `en_marcha` sigue aceptando gente en Participa. `cerrado` se oculta.

### OPORTUNIDADES

`id`, `proyecto_id` (id de PROYECTOS), `nombre` (p. ej. Comunicación), `descripcion`,
`plazas` (vacío = abierto), `fecha_limite`, `estado` (`abierta` · `cubierta` · `cerrada`), `visible`.

Una oportunidad deja de admitir personas al cubrir sus plazas, pasar su fecha límite o cambiar de estado.

### DOCUMENTOS

`id`, `titulo`, `descripcion`, `categoria`, `territorio`, `url` (**solo `https://`**, p. ej. un enlace de Drive
compartido con la organización), `fecha`, `destacado`, `visible`.

> Los documentos se abren en su URL: los permisos de acceso al archivo los gestiona Drive.

### CONFIGURACION

| clave | valor |
|---|---|
| `inicio_titulo` | Titular de Inicio |
| `inicio_subtitulo` | Subtítulo de Inicio |
| `categorias_documentos` | Orden de categorías, separadas por comas |

### TERRITORIOS

`id` (`euskadi`, `alava`, `bizkaia`, `gipuzkoa`), `nombre`, `activo`. Un territorio inactivo oculta su contenido.

## Validación

`src/lib/sheets/parse.ts` valida cada fila. Una fila con errores **se descarta** (el resto sigue funcionando) y se
registra en el log del servidor, por ejemplo:

```
[contenido] 1 fila(s) descartadas:
  ACTIVIDADES fila 7: territorio: territorio no reconocido: "Madrid"
```

También se descartan ids duplicados y oportunidades que apuntan a proyectos inexistentes.

## Ver los cambios al momento

Por defecto el Sheet se relee cada 60 s. Para forzarlo (p. ej. desde un botón de Apps Script):

```bash
curl -X POST https://TU-DOMINIO/api/revalidar -H "Authorization: Bearer $INTERNAL_API_TOKEN"
```

## Cifras agregadas en el Sheet (opcional)

En una pestaña aparte (p. ej. `CIFRAS`):

```
=IMPORTDATA("https://TU-DOMINIO/api/agregados?token=TU_INTERNAL_API_TOKEN")
```

Devuelve `tipo,id,total` (inscritos por actividad, personas por oportunidad). **Nunca** devuelve nombres.
Ten en cuenta que el token queda visible para quien pueda editar el Sheet.
