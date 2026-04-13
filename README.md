# Itinerario — Planificador de viaje

App web para planificar viajes, con calendario visual, eventos múltiples por día y persistencia cifrada en `localStorage` + sincronización remota cifrada.

## Stack

- React 18 + Vite
- `crypto-js` para AES + PBKDF2
- CSS vanilla (sin frameworks)
- Responsive (desktop y móvil)

## Características

- **Calendario visual** con rangos de fechas coloreados por destino y leyenda visible.
- **Iconos por día** que indican los tipos de evento programados (vuelo, tren, traslado, hotel, actividad) sin abrir el detalle.
- **Múltiples eventos por día**, ordenados cronológicamente al abrir el detalle.
- **5 tipos de evento** con campos específicos: Vuelo, Tren, Traslado, Hotel, Actividad.
- **Campos comunes**: costo, ubicación en Maps (link directo), adjunto (PDF o imagen, embebido en base64).
- **Todo editable**: destinos y eventos.
- **Autenticación por credenciales de build**: usuario y contraseña validados localmente con hash/prueba cifrada.
- **Sincronización automática por operación**: cada cambio guarda local y además sincroniza el vault cifrado en remoto.

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

En desarrollo, la ruta `/api/vault-sync` escribe/lee `public/shared-vault.json` en tiempo real.

## Build de producción

La semilla de cifrado y las credenciales de acceso se inyectan en build time mediante variables de entorno:

```bash
TRIP_CRYPTO_SEED="tu-semilla-secreta-larga-y-unica" TRIP_AUTH_USERNAME="us" TRIP_AUTH_PASSWORD="pass" npm run build
```

`TRIP_AUTH_USERNAME` y `TRIP_AUTH_PASSWORD` son obligatorias para build.
Si no se define `TRIP_CRYPTO_SEED`, se usa `dev-seed-change-me` (solo desarrollo).

La semilla se combina con la contraseña del usuario como salt de PBKDF2. Cambiarla invalida todos los vaults existentes.

El usuario y contraseña no se guardan en texto plano en el código de la app: en build se transforman a hash + prueba cifrada para validación local.

## Netlify (sin servidor dedicado)

Este proyecto usa Netlify Functions + Netlify Blobs para persistir el JSON cifrado remoto.

1. Definí estas variables en Netlify (Site configuration > Environment variables):
  - `TRIP_AUTH_USERNAME`
  - `TRIP_AUTH_PASSWORD`
  - `TRIP_CRYPTO_SEED`
2. Deployá normalmente.
3. La app sincroniza automáticamente el vault cifrado con `/api/vault-sync` en cada operación.
4. El botón `Borrar todo` elimina también el vault remoto (`DELETE /api/vault-sync`).
5. Si falla el borrado remoto, no se borra local para evitar desincronización.

## Vista previa del build

```bash
npm run preview
```

Nota: en modo preview estático no hay escritura del endpoint local `/api/vault-sync`.
Para probar sincronización en tiempo real local, usá `npm run dev`.

## Backup cifrado en JSON

- Se mantiene soporte para exportar/importar JSON cifrado manualmente.
- En desarrollo local, el endpoint `/api/vault-sync` persiste en `public/shared-vault.json`.
- En Netlify, el endpoint persiste en Blobs.
- El fallback por `shared-vault.json` se usa solo en desarrollo para evitar reintroducir datos viejos en producción.
- Todo el contenido funcional (destinos, eventos, costos, archivos adjuntos) queda cifrado dentro de `vaultCipher`.

## Modelo de datos

```js
{
  destinations: [
    { id, name, startDate, endDate, color }
  ],
  events: [
    {
      id,
      type: 'flight' | 'train' | 'transfer' | 'hotel' | 'activity',
      date: 'YYYY-MM-DD',
      data: { /* campos específicos del tipo + cost + mapLocation */ },
      attachment: { name, type, size, dataUrl } | null
    }
  ]
}
```

## Notas de seguridad

- Los adjuntos se guardan como data URL dentro del JSON cifrado. Archivos grandes impactan el tamaño del vault.
- Si olvidás la contraseña no hay recuperación: el botón "Borrar todo" limpia el vault y permite empezar de cero.
- El bloqueo (`🔒 Bloquear`) descarga la data en memoria y vuelve a la pantalla de login.
- La data remota almacenada (archivo local o blob remoto) está cifrada; sin credenciales válidas no se puede descifrar el contenido útil.
