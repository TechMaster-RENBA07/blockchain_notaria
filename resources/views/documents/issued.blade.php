<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Registro notarial creado') }}
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-3xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                <div class="p-6 text-center">
                    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-2">Registro técnico creado</h3>
                    <p class="text-gray-600">Se generó una constancia técnica con QR y huella criptográfica. El anclaje en blockchain depende de la configuración disponible.</p>
                </div>

                <div class="border-t border-gray-200 px-6 py-6">
                    <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                            <dt class="font-medium text-gray-500">Código de consulta</dt>
                            <dd class="font-mono text-lg font-semibold text-indigo-600 mt-1">{{ $document->verification_code }}</dd>
                        </div>
                        <div>
                            <dt class="font-medium text-gray-500">Compareciente o persona vinculada</dt>
                            <dd class="mt-1">{{ $document->holder_name }}</dd>
                        </div>
                        <div>
                            <dt class="font-medium text-gray-500">Documento de identidad</dt>
                            <dd class="mt-1 font-mono">{{ $document->holder_identity_number }}</dd>
                        </div>
                        <div>
                            <dt class="font-medium text-gray-500">Fecha de registro</dt>
                            <dd class="mt-1">{{ $document->issued_at?->format('d/m/Y H:i') }}</dd>
                        </div>
                        <div>
                            <dt class="font-medium text-gray-500">Tipo</dt>
                            <dd class="mt-1">{{ $document->documentType->name }}</dd>
                        </div>
                        <div>
                            <dt class="font-medium text-gray-500">Huella SHA-256</dt>
                            <dd class="mt-1 font-mono text-xs break-all">{{ $document->content_hash }}</dd>
                        </div>
                    </dl>
                </div>

                <div class="border-t border-gray-200 px-6 py-6">
                    <div class="flex flex-col sm:flex-row gap-4 justify-center">
                        <!-- BOTÓN CORREGIDO AQUÍ -->
                        <a href="{{ asset('storage/' . $document->pdf_path) }}" target="_blank"
                            class="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                            </svg>
                            Descargar PDF
                        </a>

                        <a href="{{ $document->publicUrl() }}" target="_blank"
                            class="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                            </svg>
                            Ver verificación pública
                        </a>

                        <a href="{{ route('documents.issue') }}"
                            class="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                            Registrar otro acto
                        </a>
                    </div>
                </div>

                <div class="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <p class="text-sm text-gray-600 text-center">
                        <strong>Alcance:</strong> La consulta pública solo informa sobre la integridad técnica del registro.
                        No acredita identidad, firma, contenido ni validez notarial. La constancia puede descargarse e imprimirse;
                        @if ($document->holder_email)
                            se envió una copia a {{ $document->holder_email }}.
                        @else
                            no se indicó un correo para enviar una copia.
                        @endif
                    </p>
                </div>
            </div>
        </div>
    </div>
</x-app-layout>
