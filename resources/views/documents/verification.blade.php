<x-guest-layout>
    <main class="mx-auto max-w-3xl px-4 py-12">
        <section class="overflow-hidden rounded-xl bg-white shadow-sm">
            <div class="border-b border-gray-200 px-6 py-6">
                <p class="text-sm font-semibold uppercase tracking-wide text-indigo-700">Consulta pública</p>
                <h1 class="mt-2 text-2xl font-bold text-gray-900">Integridad técnica del registro</h1>
            </div>

            <div class="space-y-6 p-6">
                @if ($result === 'not_found')
                    <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800" role="status">
                        No se encontró un registro con ese código de consulta.
                    </div>
                @else
                    @php
                        $resultLabels = [
                            'valid' => 'Los datos registrados mantienen su integridad técnica.',
                            'revoked' => 'El registro figura como revocado.',
                            'expired' => 'El registro figura como vencido.',
                            'tampered' => 'No se pudo confirmar la integridad del registro.',
                        ];
                        $resultStyles = $result === 'valid'
                            ? 'border-green-200 bg-green-50 text-green-800'
                            : 'border-amber-200 bg-amber-50 text-amber-900';
                    @endphp
                    <div class="rounded-lg border p-4 {{ $resultStyles }}" role="status">
                        {{ $resultLabels[$result] ?? 'Estado no disponible.' }}
                    </div>

                    <dl class="grid gap-4 sm:grid-cols-2">
                        <div>
                            <dt class="text-sm text-gray-500">Código</dt>
                            <dd class="mt-1 font-mono font-semibold">{{ $document->verification_code }}</dd>
                        </div>
                        <div>
                            <dt class="text-sm text-gray-500">Tipo de acto</dt>
                            <dd class="mt-1 font-semibold">{{ $document->documentType->name }}</dd>
                        </div>
                        <div>
                            <dt class="text-sm text-gray-500">Fecha de registro</dt>
                            <dd class="mt-1">{{ $document->issued_at?->format('d/m/Y H:i') ?? '—' }}</dd>
                        </div>
                        <div>
                            <dt class="text-sm text-gray-500">Huella de los datos</dt>
                            <dd class="mt-1">{{ $contentIntact ? 'Coincide' : 'No coincide' }}</dd>
                        </div>
                        <div>
                            <dt class="text-sm text-gray-500">Firma criptográfica</dt>
                            <dd class="mt-1">{{ $signatureValid ? 'Verificada' : 'No verificada' }}</dd>
                        </div>
                        <div>
                            <dt class="text-sm text-gray-500">Anclaje en cadena</dt>
                            <dd class="mt-1">
                                @if ($chainVerified)
                                    Confirmado · red local simulada
                                @elseif ($chainRecord)
                                    No se pudo confirmar
                                @else
                                    No registrado
                                @endif
                            </dd>
                        </div>
                    </dl>
                @endif

                <p class="border-t border-gray-200 pt-5 text-sm leading-6 text-gray-600">
                    Esta consulta informa únicamente sobre la integridad técnica de los datos del registro.
                    No acredita identidad, firma, contenido, fecha cierta ni validez legal; no reemplaza la
                    actuación, el protocolo ni los requisitos aplicables a la función notarial. No corresponde
                    a una escritura pública.
                </p>
            </div>
        </section>
    </main>
</x-guest-layout>
