# ejercicio-pfc
# Ciclo Local

Consulta puntos de acopio ilustrativos. Con una cuenta de Supabase, el vecino publica material disponible y el recolector reserva y confirma el retiro.

## Ejecutar y verificar

Usa Node.js 22. Ejecuta `npm ci`, `npm test`, `npm run security` y `npm run build`. Sirve `dist/` mediante HTTP. La configuración del cliente contiene la URL y clave publicable del proyecto. Aplica la migración si usas otro proyecto Supabase.

GitHub Actions separa build, pruebas unitarias, seguridad e integración PostgreSQL. La base efímera de CI reproduce el contrato mínimo de identidad, mientras que la aplicación publicada usa Supabase Auth real.

## Entornos

Usa la rama `test` para validaciones. Vercel puede publicar esa rama como **Preview** y despliega `main` en producción. Preview comparte el proyecto Supabase de este ejercicio, así que usa cuentas y registros ficticios. Los puntos de acopio son ilustrativos.
