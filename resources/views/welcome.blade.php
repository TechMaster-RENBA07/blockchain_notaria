<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'Blockchain Notaría') }}</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-screen bg-slate-950 text-white">
    <main class="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div class="max-w-3xl">
            <p class="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Gestión documental · Perú</p>
            <h1 class="text-4xl font-bold tracking-tight sm:text-6xl">Blockchain Notaría</h1>
            <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                Registro técnico de documentos y actuaciones extraprotocolarias:
                cartas notariales, constataciones de hechos, declaraciones juradas,
                poderes simples y autorizaciones.
            </p>
            <div class="mt-9 flex flex-wrap gap-4">
                @auth
                    <a href="{{ route('dashboard') }}" class="rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-200">
                        Ir al panel notarial
                    </a>
                @else
                    <a href="{{ route('login') }}" class="rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-200">
                        Iniciar sesión
                    </a>
                @endauth
            </div>
        </div>
        <section class="mt-16 grid gap-5 md:grid-cols-3">
            <article class="rounded-xl border border-slate-700 bg-slate-900 p-6">
                <h2 class="font-semibold text-cyan-200">Registro</h2>
                <p class="mt-2 text-sm leading-6 text-slate-300">Organiza los datos de referencia y el tipo de acto extraprotocolario.</p>
            </article>
            <article class="rounded-xl border border-slate-700 bg-slate-900 p-6">
                <h2 class="font-semibold text-cyan-200">Integridad técnica</h2>
                <p class="mt-2 text-sm leading-6 text-slate-300">Genera una huella criptográfica y una constancia con QR para consulta.</p>
            </article>
            <article class="rounded-xl border border-slate-700 bg-slate-900 p-6">
                <h2 class="font-semibold text-cyan-200">Privacidad</h2>
                <p class="mt-2 text-sm leading-6 text-slate-300">La aplicación no publica el contenido del expediente en la cadena de bloques.</p>
            </article>
        </section>
        <p class="mt-12 max-w-4xl text-xs leading-5 text-slate-400">
            El registro y su QR no acreditan por sí solos identidad, firma, contenido, fecha cierta ni validez legal.
            No sustituyen la actuación, el protocolo ni los requisitos aplicables a la función notarial. Esta aplicación
            no está destinada a escrituras públicas.
        </p>
    </main>
</body>
</html>
