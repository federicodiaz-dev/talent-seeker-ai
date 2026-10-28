# Talent Seeker

Una aplicación web para revisar candidatos, leer sus entrevistas y ejecutar un
workflow de análisis con Groq desde el navegador. No usa Azure Functions ni servicios
de Microsoft.

## Demo publicada

La versión pública está disponible en:

**https://talent-seeker-ai.vercel.app**

Incluye candidatos de prueba, modo demo y análisis con Groq. En **Configuración** cada
persona puede pegar su propia API key de Groq, reemplazarla cuando se quede sin cuota o
eliminarla. Esa key se guarda únicamente en el `localStorage` de ese navegador y se
envía por HTTPS al endpoint de análisis; no se guarda en el repositorio ni en Vercel.

## Ejecutar

Necesitás [Node.js](https://nodejs.org/) 24. No hay dependencias para instalar.

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

Para el fallback compartido del servidor, abrí `.env` y pegá tu key de Groq:

   ```env
   GROQ_API_KEY=gsk_...
   GROQ_MODEL=openai/gpt-oss-120b
   ```

Después reiniciá la aplicación.

En Vercel, `GROQ_API_KEY` debe configurarse como variable de tipo **Secret** y no debe
subirse el archivo `.env`. El modelo y el endpoint también se pueden cambiar en `.env`.
La key compartida sólo vive en el servidor; las keys personales agregadas desde la UI
quedan en el navegador de quien las cargó. El modo demo sigue disponible desde
Configuración para probar la UI sin consumir créditos.

En el deploy, los resultados se guardan en el navegador para que Vercel no dependa de
un filesystem persistente. Al ejecutar el servidor local también se conserva el flujo
compatible con `output/<candidato>/analysis.json`. Cada resumen incluye obligatoriamente
`decision` (`CONTINUE`, `REJECT` o `HUMAN_REVIEW`), un veredicto legible, riesgos y el
siguiente paso recomendado.

Los candidatos ficticios se definen en `input/sample-candidates.json` y sus entrevistas
extendidas en `input/sample-interview-details.json`.

## Verificación

```powershell
npm test
node --check server.js
```

El backend usa únicamente módulos incluidos en Node.js. La interfaz está en `web/` y no
necesita build.
