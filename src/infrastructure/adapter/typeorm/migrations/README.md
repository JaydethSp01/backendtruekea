# Migraciones TypeORM

En **producción** el proyecto usa por defecto `DB_SYNCHRONIZE=false` cuando `NODE_ENV=production`, para no alterar el esquema automáticamente en cada arranque (doce factores / paridad segura).

## Opciones

1. **Migraciones versionadas (recomendado)**  
   Genera y aplica migraciones con el CLI de TypeORM según tu versión, y guarda los archivos en esta carpeta.

2. **Primera puesta en marcha (solo si aún no hay migraciones)**  
   Documentar y usar **una sola vez** `DB_SYNCHRONIZE=true` en el entorno de despliegue para crear tablas, luego volver a `false`.  
   Esto debe hacerse de forma controlada y nunca como estado permanente en producción.

Para desarrollo local, `DB_SYNCHRONIZE` suele ser `true` por defecto (cuando no es production).
