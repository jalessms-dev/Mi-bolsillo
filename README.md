# Mi Bolsillo — despliegue en Netlify

Opción A (sin instalar nada, recomendada):
1. Crea una cuenta en github.com y un repositorio nuevo llamado "mi-bolsillo".
2. Sube TODOS los archivos (estructura plana, sin carpetas).
3. Entra a app.netlify.com → Add new site → Import an existing project → GitHub → elige el repositorio.
4. Netlify detecta la configuración (netlify.toml) automáticamente. Pulsa Deploy.
5. En 1-2 minutos tendrás tu URL pública (ej: mi-bolsillo.netlify.app).

Opción B (con Node.js instalado):
1. npm install
2. npm run build
3. Arrastra la carpeta "dist" a app.netlify.com/drop

Nota: los datos se guardan en el navegador de cada dispositivo (localStorage).
Usa el botón "Copiar datos para Google Sheets" como respaldo entre dispositivos.
