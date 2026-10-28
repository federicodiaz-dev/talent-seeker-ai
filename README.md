# Talent Seeker

Una aplicación web local para revisar candidatos, leer sus entrevistas y ejecutar un
workflow de análisis con Groq desde el navegador. No usa Azure Functions ni servicios
de Microsoft.

## Ejecutar

Necesitás [Node.js](https://nodejs.org/) 20 o superior. No hay dependencias para instalar.

En Windows, hacé doble clic en `start.bat`. También podés iniciarla desde una terminal:

```powershell
npm.cmd start
```

Después abrí [http://localhost:3000](http://localhost:3000).

## Agregar candidatos

Creá una carpeta dentro de `input/` usando el nombre del candidato:

```text
input/
  jane_doe/
    theory_interview.md
    challenge_interview.md
    work_experience.md
```

La aplicación detecta las carpetas automáticamente. Los tres archivos son opcionales;
la UI muestra cuáles están disponibles y cuáles siguen pendientes. Podés copiar
`input/_template_folder` como punto de partida.

## Motor de análisis

1. Abrí `.env` y pegá tu key de Groq:

   ```env
   GROQ_API_KEY=gsk_...
   GROQ_MODEL=openai/gpt-oss-120b
   ```

2. Reiniciá la aplicación.

La key se utiliza solamente en `server.js`: nunca se envía ni queda visible en el
navegador. El modelo y el endpoint también se pueden cambiar en `.env`. El modo demo
sigue disponible desde Configuración para probar la UI sin consumir créditos.

Los resultados se guardan localmente en `output/<candidato>/analysis.json`. Cada resumen
incluye obligatoriamente `decision` (`CONTINUE`, `REJECT` o `HUMAN_REVIEW`), un veredicto
legible, riesgos y el siguiente paso recomendado.

Los candidatos ficticios se definen en `input/sample-candidates.json` y sus entrevistas
extendidas en `input/sample-interview-details.json`.

## Verificación

```powershell
npm test
node --check server.js
```

El backend usa únicamente módulos incluidos en Node.js. La interfaz está en `web/` y no
necesita build.
