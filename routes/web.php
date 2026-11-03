<?php

use App\Http\Controllers\IssuedDocumentDownloadController;
use App\Http\Controllers\PublicDocumentVerificationController;
use App\Livewire\Documents\IssueDocument;
use App\Models\Document;
use Illuminate\Support\Facades\Route;

Route::view('/', 'welcome');
Route::get('/verificar/{verificationCode}', PublicDocumentVerificationController::class)
    ->middleware('throttle:30,1')
    ->where('verificationCode', '[A-Za-z0-9-]{1,64}')
    ->name('documents.verify');

Route::view('dashboard', 'dashboard')
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::view('profile', 'profile')
    ->middleware(['auth'])
    ->name('profile');

// Documentos - Emisión y descarga
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/documentos/emitir', IssueDocument::class)
        ->name('documents.issue');

    Route::get('/documentos/{document}/pdf', IssuedDocumentDownloadController::class)
        ->name('documents.pdf')
        ->where('document', '[0-9]+');

    Route::get('/documentos/{document}/emitido', function (Document $document) {
        return view('documents.issued', compact('document'));
    })->name('documents.issued');
});

require __DIR__.'/auth.php';
