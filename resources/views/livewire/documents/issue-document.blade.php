<div class="min-h-screen bg-gray-50 py-12">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-white shadow rounded-lg">
            <div class="px-6 py-4 border-b border-gray-200">
                <h1 class="text-2xl font-bold text-gray-900">Registrar acto extraprotocolar</h1>
                <p class="mt-1 text-sm text-gray-600">
                    Registra los datos mínimos del acto y genera una constancia técnica con QR.
                </p>
            </div>

            <div class="p-6">
                @if ($successMessage)
                    <div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                        {{ $successMessage }}
                    </div>
                @endif

                <form wire:submit.prevent="save" class="space-y-6">
                    <div>
                        <label for="document_type_id" class="block text-sm font-medium text-gray-700">
                            Tipo de acto extraprotocolar <span class="text-red-500">*</span>
                        </label>
                        <select wire:model="document_type_id" id="document_type_id"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                            <option value="">Seleccione un tipo</option>
                            @foreach ($documentTypes as $type)
                                <option value="{{ $type->id }}">{{ $type->name }} ({{ $type->code }})</option>
                            @endforeach
                        </select>
                        @error('document_type_id')
                            <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                        @enderror
                    </div>

                    <div>
                        <label for="holder_name" class="block text-sm font-medium text-gray-700">
                            Compareciente o persona vinculada <span class="text-red-500">*</span>
                        </label>
                        <input type="text" wire:model="holder_name" id="holder_name"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            placeholder="Nombre según corresponda">
                        @error('holder_name')
                            <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                        @enderror
                    </div>

                    <div>
                        <label for="holder_identity_number" class="block text-sm font-medium text-gray-700">
                            Documento de identidad <span class="text-red-500">*</span>
                        </label>
                        <input type="text" wire:model="holder_identity_number" id="holder_identity_number"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            placeholder="Dato requerido para el registro interno">
                        @error('holder_identity_number')
                            <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                        @enderror
                    </div>

                    <div>
                        <label for="holder_email" class="block text-sm font-medium text-gray-700">
                            Correo electrónico
                        </label>
                        <input type="email" wire:model="holder_email" id="holder_email"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            placeholder="juan@ejemplo.com">
                        <p class="mt-1 text-sm text-gray-500">Opcional. Se enviará una copia de la constancia técnica.</p>
                        @error('holder_email')
                            <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                        @enderror
                    </div>

                    <div>
                        <label for="title" class="block text-sm font-medium text-gray-700">
                            Asunto o referencia del acto <span class="text-red-500">*</span>
                        </label>
                        <input type="text" wire:model="title" id="title"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            placeholder="Referencia interna del acto">
                        @error('title')
                            <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                        @enderror
                    </div>

                    <div>
                        <label for="description" class="block text-sm font-medium text-gray-700">
                            Nota administrativa
                        </label>
                        <textarea wire:model="description" id="description" rows="4"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            placeholder="Resumen operativo. Evita incluir datos personales innecesarios."></textarea>
                        @error('description')
                            <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                        @enderror
                    </div>

                    <p class="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                        Este registro genera una constancia técnica; no reemplaza la identificación, firma,
                        protocolo ni los requisitos legales de la actuación notarial. No es para escrituras públicas.
                    </p>

                    <div class="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                        <a href="{{ route('dashboard') }}"
                            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Cancelar
                        </a>
                        <button type="submit"
                            wire:loading.attr="disabled"
                            class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50">
                            <span wire:loading.remove>Registrar acto</span>
                            <span wire:loading class="flex items-center">
                                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Registrando...
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>