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
4. **Comparte el Sheet** con el email de la cuenta de servicio (`...@...iam.gserviceaccount.com`) como **Editor** (la app añade filas nuevas cuando la dirección crea actividades o proyectos desde la web; si solo la compartes como Lector, todo funciona salvo el botón «+»).
5. Variables de entorno:
   - `GOOGLE_SHEETS_SPREADSHEET_ID`: el id de la URL `https://docs.google.com/spreadsheets/d/<ID>/edit`.
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: campo `client_email` del JSON.
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: campo `private_key` del JSON (con los `\n`).

Para leer, la app usa un token de solo lectura (`spreadsheets.readonly`). Solo pide el permiso de escritura
(`spreadsheets`) al crear contenido desde la web.

### Alta y edición desde la web (botón «+» y «Editar»)

En **Actos** y **Proyectos**, Administración, la dirección regional y las direcciones provinciales ven un botón «+».
- Administración y dirección regional crean en cualquier territorio; la provincial, **solo en su provincia**.
  El permiso se comprueba en el servidor (`can(user, 'content.create', { territory })`), no solo ocultando el botón.
- Una actividad nueva es una **fila nueva** en `ACTIVIDADES`; un proyecto, una fila en `PROYECTOS` más una fila por
  ámbito en `OPORTUNIDADES`. Los ids siguen la numeración existente (`ACT-043`, `PRY-007`, `OP-012`).
- Las columnas se localizan por cabecera, así que el orden sigue siendo libre. Si falta una columna, no se escribe nada.
- El texto se guarda tal cual (`valueInputOption=RAW`): nunca se interpreta como fórmula.
- Tras crear o editar, la caché del Sheet se invalida y el contenido aparece al momento.
- **Editar** (botón en la ficha del acto o del proyecto, con los mismos permisos): se localiza la fila por `id` y se
  escriben **solo las celdas que cambian**; el resto de la fila (fórmulas, formatos, `visible`, `destacado`…) no se toca.
- Al editar un proyecto, sus ámbitos se pueden renombrar, abrir o cerrar, añadir y quitar. Quitar un ámbito pone
  `visible = no` (no se borra la fila), para que quien ya se apuntó conserve su participación. Los proyectos cerrados u
  ocultos aparecen al final de Proyectos («Cerrados u ocultos») solo para quien puede editarlos, para poder reabrirlos.
- Borrar filas sigue haciéndose en el Sheet.

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
| `tipo` | | Vacío o `acto` = acto normal · `junta` = **junta directiva** (acto interno de NNGG, en gris) |
| `acceso` | | Solo juntas: `abierto` (todos los afiliados, por defecto) · `cerrado` (solo miembros de la Junta Directiva) |

Las columnas `tipo` y `acceso` son opcionales: sin ellas todo son actos normales. Hacen falta para crear juntas desde la web.
Las juntas cerradas **no se envían** a quien no es de la Junta Directiva (ni listas, ni ficha, ni calendario .ics): se
filtran en el servidor. Quién es de la Junta lo marcan Administración o la dirección regional en Miembros.

### PROYECTOS

`id`, `titulo`, `descripcion`, `tipo` (texto libre: Campaña, Formación…), `territorio`,
`estado` (`en_preparacion` · `en_marcha` · `cerrado`), `fecha_inicio`, `fecha_prevista`, `visible`, `destacado`.

Solo `en_preparacion` aparece en «En preparación». `en_marcha` sigue aceptando gente en Participa. `cerrado` se oculta.

### OPORTUNIDADES

`id`, `proyecto_id` (id de PROYECTOS), `nombre` (p. ej. Comunicación), `descripcion`,
`fecha_limite` (opcional), `estado` (`abierta` · `cerrada`), `visible`.

**Sin cupos:** puede apuntarse quien quiera a todos los ámbitos. La organización cierra un ámbito poniendo
`estado = cerrada` (o con una `fecha_limite`). Quien ya estaba apuntado sigue apareciendo.

### DOCUMENTOS

`id`, `titulo`, `descripcion`, `categoria`, `territorio`, `url` (**solo `https://`**, p. ej. un enlace de Drive
compartido con la organización), `fecha`, `destacado`, `visible`.

> Los documentos se abren en su URL: los permisos de acceso al archivo los gestiona Drive.

### CONFIGURACION

| clave | valor |
|---|---|
| `inicio_titulo` | (Ya no se muestra: Inicio saluda con «Hola, nombre») |
| `inicio_subtitulo` | (Ya no se muestra) |
| `categorias_documentos` | Orden de categorías, separadas por comas |
| `campana_principal` | id del proyecto que se muestra como **bloque principal** en Inicio y Participa (p. ej. `PRY-29N`). Vacío = sin bloque |
| `campana_lema` | Lema grande del bloque de campaña, con el estilo de los carteles (p. ej. `POR FIN`). Vacío = sin lema |
| `campana_imagen` | Imagen del bloque de campaña en pantallas anchas: ruta de la app (`/campana/29n-urna.png`) o URL `https` |

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
