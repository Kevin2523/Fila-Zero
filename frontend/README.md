# Fila-Cero

Proyecto Angular basado en el documento `Fila-Zero.docx` y el mockup enviado. Incluye tres experiencias:

- Vista pública de ocupación: `/publica/clinica-san-rafael`
- Portal del cliente después de escanear QR: `/cliente/clinica-san-rafael`
- Panel privado administrativo: `/admin/dashboard` y `/admin/filas`

## Requisitos

- Node.js compatible con Angular. Recomendado: Node 22 LTS.
- npm.
- MySQL o MariaDB para importar el script desde phpMyAdmin.

## Ejecutar

```bash
npm install
npm start
```

Luego abre:

```text
http://localhost:4200/
```

En PowerShell, si npm aparece bloqueado por políticas de scripts, usa:

```bash
npm.cmd install
npm.cmd start
```

## Base de datos

El script para phpMyAdmin está en:

```text
database/fila_cero.sql
```

Importa ese archivo desde phpMyAdmin. Crea la base `fila_cero`, tablas de roles, usuarios, establecimientos, filas, turnos, eventos y una vista pública de ocupación.

## QR

El QR de demostración está en:

```text
public/qr-clinica-san-rafael.svg
```

En producción, ese QR debe apuntar a la URL real del establecimiento:

```text
https://tu-dominio.com/cliente/clinica-san-rafael
```

La vista pública no asigna turnos. La asignación debe hacerse únicamente desde la ruta del QR presencial.
