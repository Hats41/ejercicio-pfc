# Ciclo Local

Ciclo Local reúne tres módulos. **Puntos de acopio** filtra por distrito y material y ubica el punto seleccionado en un mapa de OpenStreetMap. En **Ofertas**, un vecino con cuenta puede publicar material y un recolector puede reservarlo y confirmar el retiro. **Mi actividad** muestra el historial de cada cuenta.

## Ejecutar y verificar

Usa Node.js 22. Ejecuta `npm ci`, `npm test`, `npm run security` y `npm run build`. Sirve `dist/` mediante HTTP. La configuración del cliente usa la URL y clave publicable de Supabase. Una configuración vacía activa el modo demostración con ejemplos locales.

## Esquema en Supabase

| Migración | Entidades | Acceso |
| --- | --- | --- |
| `001_ciclo_local.sql` | `profiles` y `offers` | Supabase Auth identifica la cuenta. Las operaciones de oferta comprueban rol, propiedad y estado. |
| `002_collection_points.sql` | `collection_points` y `collection_point_materials` | Las políticas RLS permiten leer puntos publicados y sus materiales a visitantes y cuentas autenticadas. La escritura corresponde a la administración de la base. |

Para configurar otro proyecto, aplica ambas migraciones de `supabase/migrations` en orden. La segunda registra cinco puntos académicos con coordenadas aproximadas. La prueba `supabase/tests/catalog.sql` comprueba que el catálogo oculte puntos sin publicar y que los roles de cliente carezcan de permisos de escritura.

## Integración y entrega

GitHub Actions muestra en una sola ejecución la compilación web, las pruebas unitarias, la seguridad y la integración con PostgreSQL. El control de validación reúne los cuatro resultados y antecede a las verificaciones de Stage y de producción. Los PR ejecutan las comprobaciones de integración. La rama `test` usa Vercel Preview y `main` identifica la versión pública.

La integración Git de Vercel publica la aplicación. Actions verifica la entrega y el estado de la web. Preview comparte el proyecto Supabase del ejercicio. Usa cuentas y registros ficticios durante las pruebas.
