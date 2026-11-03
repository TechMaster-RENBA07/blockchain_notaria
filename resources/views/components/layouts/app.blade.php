<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{ $title ?? config('app.name', 'Laravel') }}</title>

        <!-- Aquí se carga el CSS compilado por Vite -->
        @vite(['resources/css/app.css', 'resources/js/app.js'])

        <!-- Estilos extra de Livewire -->
        @livewireStyles
    </head>
    <body class="font-sans antialiased bg-gray-100">
        <div class="min-h-screen">
            <!-- Aquí se inyecta el contenido de tus páginas -->
            {{ $slot }}
        </div>

        @livewireScripts
    </body>
</html>
