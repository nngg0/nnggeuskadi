# Intranet NNGG Euskadi

Aplicación web privada para los afiliados de **Nuevas Generaciones Euskadi**, concebida para facilitar la información, la inscripción en actividades y, especialmente, la **participación de los afiliados antes de que las iniciativas estén completamente organizadas**.

## Objetivo

La aplicación parte de un problema sencillo:

> Muchas veces el afiliado conoce una actividad cuando ya está completamente organizada y recibe la convocatoria pocos días antes.

La intranet pretende abrir el proceso anterior.

No debe limitarse a decir:

**“Esto va a ocurrir. Apúntate.”**

También debe permitir decir:

**“Estamos preparando esto. ¿Quieres participar?”**

Por tanto, las dos preguntas fundamentales que debe responder la aplicación son:

1. **¿Qué está pasando?**
2. **¿En qué puedo participar?**

La aplicación no pretende sustituir WhatsApp ni convertirse en una red social interna.

---

## Usuarios

La aplicación estará disponible para todos los afiliados de NNGG Euskadi.

### Ámbitos

- Euskadi
- Álava
- Bizkaia
- Gipuzkoa

No existirán espacios municipales.

Todos los usuarios podrán consultar la actividad de todos los territorios.

La aplicación priorizará automáticamente los contenidos correspondientes al territorio del usuario y los contenidos generales de Euskadi.

---

## Roles

### Afiliado

Puede:

- consultar actividades;
- consultar el calendario;
- inscribirse en actividades;
- cancelar sus inscripciones;
- consultar iniciativas en preparación;
- manifestar interés en participar;
- acceder al repositorio documental;
- consultar su perfil y actividad.

### Dirección Euskadi

Puede gestionar contenidos correspondientes al conjunto de NNGG Euskadi.

### Dirección provincial

Puede gestionar los contenidos correspondientes a su territorio:

- Álava;
- Bizkaia;
- Gipuzkoa.

La arquitectura de permisos debe permitir añadir nuevos roles en el futuro.

---

# Arquitectura principal

La navegación debe ser sencilla y especialmente cómoda desde móvil.

## Navegación principal

### Inicio

Resumen personalizado de la actividad relevante para el usuario.

### Calendario

Todas las actividades programadas.

### Participa

Proyectos e iniciativas en los que el afiliado puede colaborar.

### Documentos

Repositorio documental interno.

### Perfil

Información y actividad personal del usuario.

En móvil se priorizará una barra de navegación inferior con estas cinco secciones.

---

# Inicio

La portada no debe funcionar como una página de noticias.

Debe ser un **panel de acción**.

Orden recomendado:

## Próximamente

Actividades confirmadas relevantes para el usuario.

Cada tarjeta mostrará:

- título;
- fecha;
- hora;
- territorio;
- lugar;
- plazas, cuando proceda;
- estado de inscripción.

---

## En preparación

Uno de los elementos centrales
