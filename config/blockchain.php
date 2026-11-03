<?php

declare(strict_types=1);

return [
    'difficulty' => (int) env('BLOCKCHAIN_DIFFICULTY', 2),
    'genesis_message' => env('BLOCKCHAIN_GENESIS', 'Genesis Block - Blockchain Notaria'),
];
