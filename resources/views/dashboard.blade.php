<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Panel notarial') }}
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                <div class="p-6 text-gray-900">
                    <p class="text-sm font-semibold uppercase tracking-wide text-indigo-700">Gestión extraprotocolar</p>
                    <h3 class="mt-2 text-2xl font-semibold">Bienvenida, {{ auth()->user()->name }}</h3>
                    <p class="mt-2 text-gray-600">
                        Registra y consulta la integridad técnica de documentos notariales extraprotocolarios.
                        No se gestionan escrituras públicas en este módulo.
                    </p>
                    <a href="{{ route('documents.issue') }}"
                        class="mt-6 inline-flex items-center rounded-md bg-indigo-700 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-800">
                        Registrar acto extraprotocolar
                    </a>
                </div>
            </div>
            <div class="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
                La huella criptográfica y el QR permiten consultar la integridad técnica del registro.
                No acreditan identidad, firma, contenido ni validez notarial y no reemplazan los requisitos legales aplicables.
            </div>
            <div class="mt-6 rounded-lg bg-white p-6 shadow-sm">
                <h3 class="font-semibold text-gray-900">Actos previstos</h3>
                <ul class="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                    <li>Carta notarial</li>
                    <li>Constatación de hechos</li>
                    <li>Declaración jurada</li>
                    <li>Poder simple</li>
                    <li>Autorización</li>
                    <li>Otro acto extraprotocolar</li>
                </ul>
                </div>
            </div>
        </div>
    </div>
</x-app-layout>
