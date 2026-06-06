SELECT 'CREATE DATABASE qrtable_catalog'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'qrtable_catalog')\gexec

SELECT 'CREATE DATABASE qrtable_order'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'qrtable_order')\gexec

SELECT 'CREATE DATABASE qrtable_payment'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'qrtable_payment')\gexec

SELECT 'CREATE DATABASE qrtable_saas'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'qrtable_saas')\gexec
