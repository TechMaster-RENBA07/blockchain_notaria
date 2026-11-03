<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

class DocumentAlreadyOnChainException extends Exception
{
    public function __construct(string $message = 'El documento ya está anclado en la cadena de bloques')
    {
        parent::__construct($message);
    }
}
